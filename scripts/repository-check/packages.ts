/** Coordinates reusable deployable-package checks. */

import {
    inspectWorkspacePackages,
    isGadgetPackage,
    type WorkspaceDiscovery,
} from "../workspace/index.ts";
import { checkArtifactCollisions } from "./artifacts.ts";
import { checkBrowserEntry } from "./browser-entry.ts";
import { checkEntryModules } from "./entry-modules.ts";
import { checkCurrentLicenseMaps } from "./licensing.ts";
import { checkPackageDocumentation } from "./package-documentation.ts";
import { checkPackageLicense } from "./package-license.ts";
import { checkPackageMetadata } from "./package-metadata.ts";
import { checkPackageStructure } from "./package-structure.ts";
import type { PackageContractResult } from "./types.ts";

export interface PackageCheckOptions {
    checkCurrentLicenseMaps?: boolean;
    includeDiscoveryProblems?: boolean;
}

/** Validates every deployable package discovered below `src/`. */
export async function checkGadgetPackageContracts(
    workspaceRoot: string,
    options: PackageCheckOptions = {},
): Promise<PackageContractResult> {
    const discovery = await inspectWorkspacePackages(workspaceRoot);
    return checkDiscoveredGadgetPackages(workspaceRoot, discovery, options);
}

/** Validates gadgets from an already-parsed workspace discovery. */
export async function checkDiscoveredGadgetPackages(
    workspaceRoot: string,
    discovery: WorkspaceDiscovery,
    options: PackageCheckOptions = {},
): Promise<PackageContractResult> {
    const gadgets = discovery.packages.filter(isGadgetPackage);
    const packageProblems = await Promise.all(
        gadgets.map(checkOneGadgetPackage),
    );
    const mapProblems =
        options.checkCurrentLicenseMaps === false
            ? []
            : await checkCurrentLicenseMaps(workspaceRoot, gadgets);
    return {
        gadgetCount: gadgets.length,
        problems: [
            ...(options.includeDiscoveryProblems === false
                ? []
                : discovery.problems),
            ...packageProblems.flat(),
            ...checkArtifactCollisions(gadgets),
            ...mapProblems,
        ],
    };
}

/** Runs responsibility-specific checks for one gadget. */
async function checkOneGadgetPackage(
    gadget: Parameters<typeof checkPackageMetadata>[0],
): Promise<string[]> {
    const results = await Promise.all([
        Promise.resolve(checkPackageMetadata(gadget)),
        checkPackageStructure(gadget),
        checkBrowserEntry(gadget),
        checkEntryModules(gadget),
        checkPackageDocumentation(gadget),
        checkPackageLicense(gadget),
    ]);
    return results.flat();
}
