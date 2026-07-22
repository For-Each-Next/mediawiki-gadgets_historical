/**
 * Applies final author labels and serializes ordered citation metadata.
 */

import type { CitationParam, CitationTemplate } from "./types.ts";
import { getCanonicalTemplateName } from "./templates.ts";

/**
 * Formats a citation with one parameter per line.
 *
 * @param citation - Canonical citation.
 * @returns Block-style template text.
 */
export function formatBlockCitation(citation: CitationTemplate): string {
    const templateName = getCanonicalTemplateName(citation.name);
    const outputParams = buildOutputParams(citation);
    const mapCallback = function formatParam(param: CitationParam) {
        return `  | ${param.name} = ${param.value}`;
    };
    const rows = outputParams.map(mapCallback);
    if (rows.length === 0) {
        return `{{${templateName}}}`;
    }
    return [`{{${templateName}`, ...rows, "}}"].join("\n");
}

/**
 * Formats a citation on one line with spaced parameter separators.
 *
 * @param citation - Canonical citation.
 * @returns Inline-style template text.
 */
export function formatInlineCitation(citation: CitationTemplate): string {
    const templateName = getCanonicalTemplateName(citation.name);
    const outputParams = buildOutputParams(citation);
    const mapCallback = function formatParam(param: CitationParam) {
        return `${param.name} = ${param.value}`;
    };
    const params = outputParams.map(mapCallback);
    if (params.length === 0) {
        return `{{${templateName}}}`;
    }
    return `{{${templateName} | ${params.join(" | ")}}}`;
}

/**
 * Removes empty parameters and applies final output labels.
 *
 * @param citation - Canonical citation.
 * @returns Populated parameters with output-ready names.
 */
function buildOutputParams(citation: CitationTemplate): CitationParam[] {
    const authorCount = countAuthors(citation.params);
    const mapCallback = function buildOutputParam(
        param: CitationParam,
    ): CitationParam {
        const name = getOutputParamName(param, citation.params, authorCount);
        return { name, value: param.value };
    };
    const result = citation.params
        .filter((param) => param.value !== "")
        .map(mapCallback);
    return result;
}

/**
 * Counts populated canonical last-name slots.
 *
 * @param params - Canonical citation parameters.
 * @returns Number of author slots.
 */
function countAuthors(params: CitationParam[]): number {
    const filterCallback = function isPopulatedLast(param: CitationParam) {
        return /^last(?:\d+)?$/u.test(param.name) && param.value !== "";
    };
    const result = params.filter(filterCallback).length;
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
    const hasFirst = params.some(function isPopulatedFirst(candidate) {
        return candidate.name === `first${suffix}` && candidate.value !== "";
    });
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
