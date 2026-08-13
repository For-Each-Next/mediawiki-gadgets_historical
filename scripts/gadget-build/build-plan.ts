/** Creates validated gadget and workspace build plans. */

import { lstat, realpath } from "node:fs/promises";
import { resolve } from "node:path";
import { compareText } from "#workspace/files";
import { discoverGadgetPackages } from "#workspace/packages";
import { requireContainedPath } from "#workspace/paths";
import { resolveBuildConfig } from "./build-config.ts";
import { createBuildContext } from "./context.ts";
import { loadPackageNotices } from "./notices.ts";
import {
    loadPackageMetadata,
    validatePackageMetadata,
} from "./package-metadata.ts";
import type {
    BuildContextOptions,
    GadgetBuildPlan,
    WorkspaceBuildPlan,
} from "./types.ts";

/** Loads one package and resolves the values needed for its build. */
export async function loadGadgetBuildPlan(
    packageRoot: string,
    now: Date = new Date(),
): Promise<GadgetBuildPlan> {
    const metadata = await loadPackageMetadata(packageRoot);
    return createGadgetBuildPlan(packageRoot, metadata, now);
}

/** Builds a plan from metadata already read by workspace discovery. */
export async function createGadgetBuildPlan(
    packageRoot: string,
    metadataValue: unknown,
    now: Date,
): Promise<GadgetBuildPlan> {
    const metadata = validatePackageMetadata(packageRoot, metadataValue);
    const config = resolveBuildConfig(metadata);
    await validateEntryPoint(packageRoot, config.entryPoint);
    const notices = await loadPackageNotices(packageRoot, metadata, config);
    return {
        buildTime: requireBuildTime(now),
        config,
        metadata,
        notices,
        packageRoot: resolve(packageRoot),
    };
}

/** Requires a browser entry to be a real package-contained file. */
async function validateEntryPoint(
    packageRoot: string,
    entryPoint: string,
): Promise<void> {
    const root = resolve(packageRoot);
    const path = requireContainedPath(
        root,
        resolve(root, entryPoint),
        "Gadget build entry point",
    );
    const [entry, realRoot, realEntry] = await Promise.all([
        lstat(path),
        realpath(root),
        realpath(path),
    ]);
    requireContainedPath(realRoot, realEntry, "Gadget build entry point");
    if (!entry.isFile() || entry.isSymbolicLink()) {
        throw new Error("Gadget build entry point must be a real file.");
    }
}

/** Creates one stable plan for every deployable workspace package. */
export async function loadWorkspaceBuildPlan(
    workspaceRoot: string,
    options: BuildContextOptions = {},
): Promise<WorkspaceBuildPlan> {
    const root = resolve(workspaceRoot);
    const context = createBuildContext(options);
    const packages = await discoverGadgetPackages(root);
    if (packages.length === 0) {
        throw new Error("The workspace does not contain any gadget packages.");
    }
    const gadgets = await Promise.all(
        packages.map((item) =>
            createGadgetBuildPlan(item.directory, item.metadata, context.now),
        ),
    );
    gadgets.sort(comparePlans);
    validateConfiguredOutputRoot(root, gadgets);
    return {
        context,
        gadgets,
        outputRoot: context.outputRoot ?? resolve(root, "dist"),
        workspaceRoot: root,
    };
}

/** Requires packages to target the workspace `dist/` root. */
export function validateConfiguredOutputRoot(
    workspaceRoot: string,
    plans: GadgetBuildPlan[],
): void {
    const expectedRoot = resolve(workspaceRoot, "dist");
    for (const plan of plans) {
        const configuredRoot = resolve(
            plan.packageRoot,
            plan.config.outputDirectory,
        );
        if (configuredRoot !== expectedRoot) {
            throw new Error(
                `${plan.metadata.name} must use its package directory and ` +
                    "the shared workspace dist directory.",
            );
        }
    }
}

/** Converts a build Date to the injected ISO value after validation. */
function requireBuildTime(now: Date): string {
    if (Number.isNaN(now.getTime())) {
        throw new TypeError("Build time must be a valid Date.");
    }
    return now.toISOString();
}

/** Orders build plans by package name using code-unit order. */
function comparePlans(left: GadgetBuildPlan, right: GadgetBuildPlan): number {
    return compareText(left.metadata.name, right.metadata.name);
}
