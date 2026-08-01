/** Wikitext replacements owned by Citation Formatter. */

import type { TextReplacement } from "./types.ts";

/**
 * Applies non-overlapping replacements from the end of a string.
 *
 * @param text - Text to process.
 * @param replacements - Source replacements.
 * @returns Resulting text.
 */
export function applyReplacements(
    text: string,
    replacements: TextReplacement[],
): string {
    const replaceText = function replaceText(
        result: string,
        replacement: TextReplacement,
    ) {
        const before = result.slice(0, replacement.start);
        const after = result.slice(replacement.end);
        return `${before}${replacement.text}${after}`;
    };
    return [...replacements]
        .sort((left, right) => right.start - left.start)
        .reduce(replaceText, text);
}
