/** Owns paths, cleanup, and writes for the aggregate userscript. */

import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { AGGREGATE_OUTPUT_FILENAME } from "./artifact-names.ts";
import { ensureBuildDirectory, validateBuildDirectory } from "./output.ts";
import {
    cleanPlannedOutput,
    planOutputCleanup,
    type OutputCleanupPlan,
} from "./retired-output.ts";

const RETIRED_ALL_OUTPUT_FILENAME = "mediawiki_gadgets.user.js";
const RETIRED_ALL_OUTPUT_DIRECTORY = "mediawiki-gadgets";
const RETIRED_ALL_FLAT_OUTPUT_FILENAME = "user.js";

/** Validates aggregate cleanup targets without mutating them. */
export async function planAggregateOutput(
    outputRoot: string,
): Promise<OutputCleanupPlan> {
    await validateBuildDirectory(outputRoot, "Shared output root");
    return planOutputCleanup(
        outputRoot,
        [
            AGGREGATE_OUTPUT_FILENAME,
            RETIRED_ALL_FLAT_OUTPUT_FILENAME,
            RETIRED_ALL_OUTPUT_FILENAME,
        ],
        {
            directoryName: RETIRED_ALL_OUTPUT_DIRECTORY,
            filenames: [RETIRED_ALL_OUTPUT_FILENAME],
            label: "Retired aggregate output directory",
        },
    );
}

/** Cleans owned aggregate outputs after source generation succeeds. */
export async function prepareAggregateOutput(
    outputRoot: string,
    cleanupPlan?: OutputCleanupPlan,
): Promise<void> {
    const cleanup = cleanupPlan ?? (await planAggregateOutput(outputRoot));
    await ensureBuildDirectory(outputRoot, "Shared output root");
    await cleanPlannedOutput(outputRoot, cleanup);
}

/** Writes the generated aggregate and returns its exact path. */
export async function writeAggregateOutput(
    outputRoot: string,
    userscript: string,
): Promise<string> {
    const outputPath = resolve(outputRoot, AGGREGATE_OUTPUT_FILENAME);
    await writeFile(outputPath, userscript);
    return outputPath;
}
