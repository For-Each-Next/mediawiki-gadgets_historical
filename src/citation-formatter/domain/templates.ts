/**
 * Supported English Wikipedia CS1/CS2 citation templates.
 */
export const SUPPORTED_CITATION_TEMPLATES = [
    "citation",
    "cite arxiv",
    "cite av media",
    "cite av media notes",
    "cite biorxiv",
    "cite book",
    "cite citeseerx",
    "cite conference",
    "cite document",
    "cite encyclopedia",
    "cite episode",
    "cite interview",
    "cite journal",
    "cite magazine",
    "cite mailing list",
    "cite map",
    "cite medrxiv",
    "cite news",
    "cite newsgroup",
    "cite podcast",
    "cite press release",
    "cite report",
    "cite serial",
    "cite sign",
    "cite speech",
    "cite ssrn",
    "cite tech report",
    "cite thesis",
    "cite web",
    "cite video game",
] as const;

const SUPPORTED_TEMPLATE_SET = new Set<string>(SUPPORTED_CITATION_TEMPLATES);

/**
 * Normalizes a template title for comparison and metadata lookup.
 *
 * @param value - Entered template title.
 * @returns Normalized template name.
 */
export function normalizeTemplateName(value: string): string {
    const result = value
        .trim()
        .replace(/^template\s*:/iu, "")
        .replace(/[_\s]+/gu, " ")
        .toLocaleLowerCase("en-US");
    return result;
}

/**
 * Returns whether a template is in the supported CS1 set.
 *
 * @param value - Entered template title.
 * @returns Whether the template is supported.
 */
export function isCitationTemplate(value: string): boolean {
    return SUPPORTED_TEMPLATE_SET.has(normalizeTemplateName(value));
}
