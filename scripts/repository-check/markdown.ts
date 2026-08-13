/** Enforces the repository's authored Markdown source width. */

import { readFile } from "node:fs/promises";
import { collectAuthoredFiles } from "#workspace/files";
import { formatWorkspacePath } from "#workspace/paths";
import type { CheckResult } from "./types.ts";

const MAX_MARKDOWN_LINE_LENGTH = 79;

/** Checks every authored Markdown file for oversized source lines. */
export async function checkMarkdownLines(
    workspaceRoot: string,
): Promise<CheckResult> {
    const files = await collectAuthoredFiles(workspaceRoot, {
        extensions: new Set([".md"]),
    });
    const results = await Promise.all(
        files.map((file) => checkMarkdownFile(workspaceRoot, file)),
    );
    return { checkedCount: files.length, problems: results.flat() };
}

/** Checks one Markdown source file. */
async function checkMarkdownFile(
    workspaceRoot: string,
    file: string,
): Promise<string[]> {
    const source = await readFile(file, "utf8");
    const displayPath = formatWorkspacePath(workspaceRoot, file);
    return source.split("\n").flatMap((line, index) => {
        const length = [...line].length;
        return length > MAX_MARKDOWN_LINE_LENGTH
            ? [
                  `${displayPath}:${index + 1}: ${length} characters ` +
                      `(maximum ${MAX_MARKDOWN_LINE_LENGTH}).`,
              ]
            : [];
    });
}
