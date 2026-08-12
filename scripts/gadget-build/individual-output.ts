/** Owns paths, cleanup, and writes for one minified gadget artifact. */

import { writeFile } from "node:fs/promises";
import { basename, parse, resolve } from "node:path";
import { createGadgetArtifactFilenames } from "./artifact-names.ts";
import { ensureBuildDirectory, validateBuildDirectory } from "./output.ts";
import {
    cleanPlannedOutput,
    planOutputCleanup,
    type OutputCleanupPlan,
} from "./retired-output.ts";
import type { GadgetBuildPlan } from "./types.ts";

/** Resolves and validates the configured shared output root. */
export function resolveGadgetOutputRoot(plan: GadgetBuildPlan): string {
    const outputRoot = resolve(plan.packageRoot, plan.config.outputDirectory);
    const expectedRoot = resolve(plan.packageRoot, "../../dist");
    const filesystemRoot = parse(outputRoot).root;
    if (
        outputRoot === filesystemRoot ||
        outputRoot === resolve(plan.packageRoot) ||
        outputRoot !== expectedRoot
    ) {
        throw new Error(
            "Gadget output must use the shared workspace dist directory.",
        );
    }
    return outputRoot;
}

/** Validates one gadget's complete cleanup set without mutating it. */
export async function planIndividualOutput(
    plan: GadgetBuildPlan,
    outputRoot: string,
): Promise<OutputCleanupPlan> {
    await validateBuildDirectory(outputRoot, "Shared output root");
    const filenames = Object.values(
        createGadgetArtifactFilenames(plan.config.outputName),
    );
    return planOutputCleanup(outputRoot, filenames, {
        directoryName: requirePackageDirectoryName(plan),
        filenames,
        label: "Retired gadget output directory",
    });
}

/** Removes current and retired outputs owned by one gadget. */
export async function prepareIndividualOutput(
    plan: GadgetBuildPlan,
    outputRoot: string,
    cleanupPlan?: OutputCleanupPlan,
): Promise<void> {
    const cleanup =
        cleanupPlan ?? (await planIndividualOutput(plan, outputRoot));
    await ensureBuildDirectory(outputRoot, "Shared output root");
    await cleanPlannedOutput(outputRoot, cleanup);
}

/** Writes the final MediaWiki artifact and returns its exact path. */
export async function writeIndividualOutput(
    plan: GadgetBuildPlan,
    outputRoot: string,
    output: string,
): Promise<string> {
    const filenames = createGadgetArtifactFilenames(plan.config.outputName);
    const outputPath = resolve(outputRoot, filenames.minified);
    await writeFile(outputPath, output);
    return outputPath;
}

/** Requires the package manifest name to match its directory. */
function requirePackageDirectoryName(plan: GadgetBuildPlan): string {
    const directoryName = basename(resolve(plan.packageRoot));
    if (plan.metadata.name !== directoryName) {
        throw new Error(
            "package.json name must match its package directory before build.",
        );
    }
    return directoryName;
}
