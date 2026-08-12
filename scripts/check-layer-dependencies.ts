/** Compatibility entry point for project source-boundary checks. */

import { pathToFileURL } from "node:url";
import {
    checkSourceBoundaries,
    type SourceBoundaryResult,
} from "./repository-check/index.ts";

export interface LayerCheckResult extends SourceBoundaryResult {}

/** Checks every source TypeScript file for dependency violations. */
export async function checkLayerDependencies(
    workspaceRoot: string,
): Promise<LayerCheckResult> {
    return checkSourceBoundaries(workspaceRoot);
}

/** Runs validation when this module is the process entry point. */
async function main(): Promise<void> {
    const result = await checkLayerDependencies(process.cwd());
    if (result.problems.length > 0) {
        throw new Error(
            `Source boundary check failed:\n${result.problems.join("\n")}`,
        );
    }
    console.log(`Checked source boundaries in ${result.fileCount} files.`);
}

const entryUrl =
    process.argv[1] == null ? null : pathToFileURL(process.argv[1]).href;
if (entryUrl === import.meta.url) {
    await main();
}
