/** Coordinates one complete minified gadget build. */

import { assertUniqueWorkspaceArtifacts } from "./artifacts.ts";
import { loadGadgetBuildPlan } from "./build-plan.ts";
import {
    planIndividualOutput,
    prepareIndividualOutput,
    resolveGadgetOutputRoot,
    writeIndividualOutput,
} from "./individual-output.ts";
import type { OutputCleanupPlan } from "./retired-output.ts";
import { formatMediaWikiOutput } from "./mediawiki.ts";
import { createMinifiedBundle } from "./minified-bundle.ts";
import type { GadgetBuildPlan } from "./types.ts";

/** Builds the minified distributable for a workspace gadget. */
export async function buildGadget(packageRoot: string): Promise<void> {
    const plan = await loadGadgetBuildPlan(packageRoot);
    await assertUniqueWorkspaceArtifacts(packageRoot);
    const outputRoot = resolveGadgetOutputRoot(plan);
    await buildPlannedGadget(plan, outputRoot);
}

/** Builds a validated gadget plan into a selected output root. */
export async function buildPlannedGadget(
    plan: GadgetBuildPlan,
    outputRoot: string,
): Promise<string> {
    const output = await generatePlannedGadget(plan);
    return writePlannedGadget(plan, outputRoot, output);
}

/** Generates one gadget payload without mutating build output. */
export async function generatePlannedGadget(
    plan: GadgetBuildPlan,
): Promise<string> {
    const minifiedCode = await createMinifiedBundle(plan);
    return formatMediaWikiOutput(
        minifiedCode,
        plan.metadata,
        plan.config.headerDescription,
        plan.config.headerAuthor === true,
    );
}

/** Cleans owned paths and writes a generated gadget payload. */
export async function writePlannedGadget(
    plan: GadgetBuildPlan,
    outputRoot: string,
    output: string,
    cleanupPlan?: OutputCleanupPlan,
): Promise<string> {
    const cleanup =
        cleanupPlan ?? (await planIndividualOutput(plan, outputRoot));
    await prepareIndividualOutput(plan, outputRoot, cleanup);
    return writeIndividualOutput(plan, outputRoot, output);
}
