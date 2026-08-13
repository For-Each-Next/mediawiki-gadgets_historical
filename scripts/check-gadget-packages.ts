/** Compatibility entry point for reusable gadget package contracts. */

import { pathToFileURL } from "node:url";
import { checkGadgetPackageContracts } from "#repository-check/packages";
import type { PackageContractResult } from "#repository-check/types";

export type { PackageContractResult };

/** Validates deployable packages below a workspace source directory. */
export async function checkGadgetPackages(
    workspaceRoot: string,
): Promise<PackageContractResult> {
    return checkGadgetPackageContracts(workspaceRoot);
}

/** Runs validation when this module is the process entry point. */
async function main(): Promise<void> {
    const result = await checkGadgetPackages(process.cwd());
    if (result.problems.length > 0) {
        throw new Error(
            `Gadget package contract failed:\n${result.problems.join("\n")}`,
        );
    }
    console.log(`Validated ${result.gadgetCount} gadget packages.`);
}

const entryUrl =
    process.argv[1] == null ? null : pathToFileURL(process.argv[1]).href;
if (entryUrl === import.meta.url) {
    await main();
}
