/** Compatibility entry point for authored Markdown width checks. */

import { pathToFileURL } from "node:url";
import { checkMarkdownLines as checkLines } from "#repository-check/markdown";

export interface MarkdownLineCheckResult {
    fileCount: number;
    problems: string[];
}

/** Checks every repository Markdown file for oversized source lines. */
export async function checkMarkdownLines(
    workspaceRoot: string,
): Promise<MarkdownLineCheckResult> {
    const result = await checkLines(workspaceRoot);
    return { fileCount: result.checkedCount, problems: result.problems };
}

/** Runs validation when this module is the process entry point. */
async function main(): Promise<void> {
    const result = await checkMarkdownLines(process.cwd());
    if (result.problems.length > 0) {
        throw new Error(
            `Markdown line check failed:\n${result.problems.join("\n")}`,
        );
    }
    console.log(`Checked line lengths in ${result.fileCount} Markdown files.`);
}

const entryUrl =
    process.argv[1] == null ? null : pathToFileURL(process.argv[1]).href;
if (entryUrl === import.meta.url) {
    await main();
}
