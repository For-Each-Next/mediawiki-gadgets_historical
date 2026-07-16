/**
 * Supported English Wikipedia CS1/CS2 citation templates.
 */
export const SUPPORTED_CITATION_TEMPLATES = [
    "Citation",
    "Cite arXiv",
    "Cite AV media",
    "Cite AV media notes",
    "Cite bioRxiv",
    "Cite book",
    "Cite CiteSeerX",
    "Cite conference",
    "Cite document",
    "Cite encyclopedia",
    "Cite episode",
    "Cite interview",
    "Cite journal",
    "Cite magazine",
    "Cite mailing list",
    "Cite map",
    "Cite medRxiv",
    "Cite news",
    "Cite newsgroup",
    "Cite podcast",
    "Cite press release",
    "Cite report",
    "Cite serial",
    "Cite sign",
    "Cite speech",
    "Cite SSRN",
    "Cite tech report",
    "Cite thesis",
    "Cite tweet",
    "Cite web",
    "Cite video game",
] as const;

const CANONICAL_TEMPLATE_NAMES = new Map(
    SUPPORTED_CITATION_TEMPLATES.map(function indexCanonicalName(name) {
        return [normalizeTemplateName(name), name] as const;
    }),
);

const SUPPORTED_TEMPLATE_SET = new Set(CANONICAL_TEMPLATE_NAMES.keys());

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
 * Returns the canonical display casing of a supported template name.
 *
 * @param value - Entered or normalized template title.
 * @returns Canonically cased template name.
 */
export function getCanonicalTemplateName(value: string): string {
    const normalized = normalizeTemplateName(value);
    return CANONICAL_TEMPLATE_NAMES.get(normalized) || normalized;
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
