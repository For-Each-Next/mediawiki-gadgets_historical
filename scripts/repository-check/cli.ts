/** Runs the coordinated project-level repository check. */

import { pathToFileURL } from "node:url";
import { checkRepository } from "./repository.ts";

/** Validates the current workspace and prints a compact summary. */
async function main(): Promise<void> {
    const result = await checkRepository(process.cwd());
    if (result.problems.length > 0) {
        throw new Error(
            `Repository check failed:\n${result.problems.join("\n")}`,
        );
    }
    console.log(
        `Validated ${result.gadgetCount} gadgets, ` +
            `${result.sourceFileCount} source files, and ` +
            `${result.markdownFileCount} Markdown files.`,
    );
}

const entryUrl =
    process.argv[1] == null ? null : pathToFileURL(process.argv[1]).href;
if (entryUrl === import.meta.url) {
    await main();
}
