/**
 * Enforces the repository's maximum authored Markdown line length.
 */

import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative, sep } from "node:path";
import { pathToFileURL } from "node:url";

const EXCLUDED_DIRECTORIES = new Set([".git", "dist", "node_modules"]);
const MAX_MARKDOWN_LINE_LENGTH = 79;

export interface MarkdownLineCheckResult {
    fileCount: number;
    problems: string[];
}

/**
 * Checks every repository Markdown file for oversized source lines.
 *
 * @param workspaceRoot - Repository root to inspect.
 * @returns Checked file count and line-length violations.
 */
export async function checkMarkdownLines(
    workspaceRoot: string,
): Promise<MarkdownLineCheckResult> {
    const files = await collectMarkdownFiles(workspaceRoot);
    const results = await Promise.all(
        files.map((file) => checkMarkdownFile(workspaceRoot, file)),
    );

    return {
        fileCount: files.length,
        problems: results.flat(),
    };
}

/**
 * Recursively collects authored Markdown files.
 *
 * @param directory - Directory to visit.
 * @returns Markdown file paths.
 */
async function collectMarkdownFiles(directory: string): Promise<string[]> {
    const entries = await readdir(directory, { withFileTypes: true });
    const files: string[] = [];
    for (const entry of entries) {
        if (entry.isDirectory() && EXCLUDED_DIRECTORIES.has(entry.name)) {
            continue;
        }
        const path = join(directory, entry.name);
        if (entry.isDirectory()) {
            files.push(...(await collectMarkdownFiles(path)));
        } else if (extname(entry.name).toLocaleLowerCase() === ".md") {
            files.push(path);
        }
    }
    return files;
}

/**
 * Checks one Markdown file for oversized lines.
 *
 * @param workspaceRoot - Repository root used for display paths.
 * @param file - Markdown file path.
 * @returns File-scoped line-length violations.
 */
async function checkMarkdownFile(
    workspaceRoot: string,
    file: string,
): Promise<string[]> {
    const source = await readFile(file, "utf8");
    const displayPath = relative(workspaceRoot, file).split(sep).join("/");
    const problems: string[] = [];
    const lines = source.split("\n");
    for (const [index, line] of lines.entries()) {
        const length = [...line].length;
        if (length > MAX_MARKDOWN_LINE_LENGTH) {
            problems.push(
                `${displayPath}:${index + 1}: ${length} characters ` +
                    `(maximum ${MAX_MARKDOWN_LINE_LENGTH}).`,
            );
        }
    }
    return problems;
}

/**
 * Runs Markdown validation when this module is the process entry point.
 */
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
