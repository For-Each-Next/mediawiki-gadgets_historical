/**
 * Applies final author labels and serializes ordered citation metadata.
 */

import type { CitationParam, CitationTemplate } from "./types.ts";

/**
 * Formats a citation with one parameter per line.
 *
 * @param citation - Canonical citation.
 * @returns Block-style template text.
 */
export function formatBlockCitation(citation: CitationTemplate): string {
    const authorCount = countAuthors(citation.params);
    const rows = citation.params
        .filter((param) => param.value !== "")
        .map(function formatParam(param) {
            const name = getOutputParamName(
                param,
                citation.params,
                authorCount,
            );
            return `  | ${name} = ${param.value}`;
        });
    if (rows.length === 0) {
        return `{{${citation.name}}}`;
    }
    return [`{{${citation.name}`, ...rows, "}}"].join("\n");
}

/**
 * Counts populated canonical last-name slots.
 *
 * @param params - Canonical citation parameters.
 * @returns Number of author slots.
 */
function countAuthors(params: CitationParam[]): number {
    const result = params.filter(function isPopulatedLast(param) {
        return /^last(?:\d+)?$/u.test(param.name) && param.value !== "";
    }).length;
    return result;
}

/**
 * Chooses structured or unstructured author labels for output.
 *
 * @param param - Canonical parameter being formatted.
 * @param params - All canonical citation parameters.
 * @param authorCount - Number of populated author slots.
 * @returns Output parameter name.
 */
function getOutputParamName(
    param: CitationParam,
    params: CitationParam[],
    authorCount: number,
): string {
    const match = param.name.match(/^(last|first)(\d*)$/u);
    if (match == null) {
        return param.name;
    }
    const index = match[2] || "1";
    const suffix = index === "1" ? "" : index;
    const hasFirst = params.some(
        (candidate) =>
            candidate.name === `first${suffix}` && candidate.value !== "",
    );
    if (match[1] === "last" && !hasFirst) {
        const result =
            authorCount === 1 && index === "1" ? "author" : `author${index}`;
        return result;
    }
    if (authorCount > 1 && index === "1") {
        return `${match[1]}1`;
    }
    return param.name;
}
