/**
 * Preserves authored TypeScript documentation through readable bundles.
 */

import { readFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { OnLoadArgs, OnLoadResult, Plugin } from "esbuild";
import ts from "typescript";

const JSDOC_SENTINEL = " @preserve __GADGET_BUILD_JSDOC__";
const JSDOC_PREFIX = `/**${JSDOC_SENTINEL}`;

/**
 * Marks JSDoc as legal comments before esbuild reads it.
 *
 * @returns A plugin for the readable bundle.
 */
export function createDocumentationCommentPreserver(): Plugin {
    return {
        name: "preserve-documentation-comments",
        setup(build) {
            build.onLoad({ filter: /\.ts$/ }, loadDocumentedTypeScript);
        },
    };
}

/**
 * Removes the temporary preservation marker from bundled JSDoc.
 *
 * @param source - Bundled JavaScript containing marked documentation.
 * @returns JavaScript with ordinary JSDoc comment openings.
 */
export function restoreDocumentationComments(source: string): string {
    return source.replaceAll(JSDOC_PREFIX, "/**");
}

/**
 * Rejects text that contains the builder's reserved marker.
 *
 * @param path - Source path used in the diagnostic.
 * @param source - Authored source or injected text.
 */
export function assertNoDocumentationMarker(
    path: string,
    source: string,
): void {
    if (source.includes(JSDOC_SENTINEL)) {
        throw new Error(`${path} contains the reserved JSDoc build marker.`);
    }
}

/**
 * Loads one TypeScript module with its real JSDoc comments marked.
 *
 * @param args - Args value.
 * @returns TypeScript module with its real JSDoc comments marked.
 */
async function loadDocumentedTypeScript(
    args: OnLoadArgs,
): Promise<OnLoadResult> {
    const { path } = args;
    const source = await readFile(path, "utf8");
    return {
        contents: markDocumentationComments(path, source),
        loader: "ts",
        resolveDir: dirname(path),
    };
}

/**
 * Marks syntax-recognized leading JSDoc comments in one module.
 *
 * @param path - File path.
 * @param source - Source text.
 * @returns Resulting text.
 */
function markDocumentationComments(path: string, source: string): string {
    assertNoDocumentationMarker(path, source);
    const sourceFile = ts.createSourceFile(
        path,
        source,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TS,
    );
    const positions = new Set<number>();
    collectDocumentationPositions(sourceFile, source, positions);
    return insertSentinels(source, positions);
}

/**
 * Collects leading JSDoc positions from a TypeScript tree.
 *
 * @param node - Syntax or DOM node.
 * @param source - Source text.
 * @param positions - Positions value.
 */
function collectDocumentationPositions(
    node: ts.Node,
    source: string,
    positions: Set<number>,
): void {
    const comments = ts.getLeadingCommentRanges(source, node.pos) ?? [];
    for (const comment of comments) {
        if (
            comment.end - comment.pos > 4 &&
            source.startsWith("/**", comment.pos)
        ) {
            positions.add(comment.pos + 3);
        }
    }
    ts.forEachChild(node, function collectChild(child) {
        collectDocumentationPositions(child, source, positions);
    });
}

/**
 * Inserts preservation markers from the end to keep offsets stable.
 *
 * @param source - Source text.
 * @param positions - Positions value.
 * @returns Resulting text.
 */
function insertSentinels(source: string, positions: Set<number>): string {
    const descending = [...positions].sort((left, right) => right - left);
    let result = source;
    for (const position of descending) {
        result =
            result.slice(0, position) +
            JSDOC_SENTINEL +
            result.slice(position);
    }
    return result;
}
