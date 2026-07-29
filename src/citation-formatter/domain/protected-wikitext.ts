/**
 * Protected wikitext ranges skipped by citation transformations.
 */

export type WikitextRange = readonly [start: number, end: number];

/**
 * Literal tags historically skipped by end-to-end citation formatting.
 */
export const CITATION_FORMATTING_LITERAL_TAGS = [
    "nowiki",
    "pre",
    "syntaxhighlight",
    "source",
    "code",
] as const;

/**
 * Literal tags historically skipped by citation-management transforms.
 */
export const CITATION_MANAGEMENT_LITERAL_TAGS = [
    "nowiki",
    "pre",
    "source",
    "syntaxhighlight",
] as const;

/**
 * Literal tags skipped while discovering editable article sources.
 */
export const SOURCE_DISCOVERY_LITERAL_TAGS = [
    "nowiki",
    "pre",
    "source",
    "syntaxhighlight",
    "math",
    "code",
    "templatedata",
    "templatestyles",
    "graph",
    "timeline",
    "score",
    "mapframe",
] as const;

/** Finds ranges protected from end-to-end citation formatting. */
export function findCitationFormattingProtectedRanges(
    text: string,
): WikitextRange[] {
    return findProtectedWikitextRanges(text, CITATION_FORMATTING_LITERAL_TAGS);
}

/** Finds ranges protected from citation-management transformations. */
export function findCitationManagementProtectedRanges(
    text: string,
): WikitextRange[] {
    return findProtectedWikitextRanges(text, CITATION_MANAGEMENT_LITERAL_TAGS);
}

/** Finds ranges protected while discovering editable sources. */
export function findSourceDiscoveryProtectedRanges(
    text: string,
): WikitextRange[] {
    return findProtectedWikitextRanges(text, SOURCE_DISCOVERY_LITERAL_TAGS);
}

/**
 * Finds comments and selected literal-tag regions.
 *
 * @param text - Article wikitext.
 * @param literalTags - Literal tag names protected by the caller.
 * @returns Protected ranges in source order.
 */
export function findProtectedWikitextRanges(
    text: string,
    literalTags: readonly string[],
): WikitextRange[] {
    const tagAlternatives = literalTags.join("|");
    const literalPattern =
        tagAlternatives === ""
            ? ""
            : String.raw`|<(${tagAlternatives})\b[^>]*>` +
              String.raw`[\s\S]*?<\/\1\s*>`;
    const pattern = new RegExp(
        String.raw`<!--[\s\S]*?-->${literalPattern}`,
        "giu",
    );
    return Array.from(text.matchAll(pattern), (match) => [
        match.index,
        match.index + match[0].length,
    ]);
}

/**
 * Checks whether a source offset lies inside a protected range.
 *
 * @param index - Source offset.
 * @param ranges - Protected source ranges.
 * @returns Whether the offset is protected.
 */
export function isInWikitextRanges(
    index: number,
    ranges: readonly WikitextRange[],
): boolean {
    return ranges.some(([start, end]) => index >= start && index < end);
}

/**
 * Masks ranges with spaces while retaining every source offset.
 *
 * @param text - Article wikitext.
 * @param ranges - Non-overlapping protected ranges in source order.
 * @returns Offset-preserving masked text.
 */
export function maskWikitextRanges(
    text: string,
    ranges: readonly WikitextRange[],
): string {
    const parts: string[] = [];
    let cursor = 0;
    for (const [start, end] of ranges) {
        parts.push(text.slice(cursor, start), " ".repeat(end - start));
        cursor = end;
    }
    parts.push(text.slice(cursor));
    return parts.join("");
}
