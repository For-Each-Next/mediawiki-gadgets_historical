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

const indexCanonicalName = function indexCanonicalName(name: string) {
    return [normalizeTemplateIdentity(name), name] as const;
};
const canonicalTemplateEntries =
    SUPPORTED_CITATION_TEMPLATES.map(indexCanonicalName);
const CANONICAL_TEMPLATE_NAMES = new Map(canonicalTemplateEntries);
const CANONICAL_TEMPLATE_KEY_NAMES = new Map(
    SUPPORTED_CITATION_TEMPLATES.map(
        (name) => [normalizeTemplateName(name), name] as const,
    ),
);

const SUPPORTED_TEMPLATE_SET = new Set(
    SUPPORTED_CITATION_TEMPLATES.map(normalizeTemplateIdentity),
);

/**
 * Normalizes a template title for comparison and metadata lookup.
 *
 * @param value - Entered template title.
 * @returns Normalized template name.
 */
export function normalizeTemplateName(value: string): string {
    return normalizeTemplateDisplayName(value).toLocaleLowerCase("en-US");
}

/**
 * Normalizes title syntax while preserving meaningful letter casing.
 *
 * @param value - Value to process.
 * @returns Value.
 */
function normalizeTemplateDisplayName(value: string): string {
    return value
        .trim()
        .replace(/^template\s*:/iu, "")
        .replace(/[_\s]+/gu, " ");
}

/**
 * Normalizes syntax and MediaWiki's first-character title casing.
 *
 * @param value - Value to process.
 * @returns Normalized syntax with MediaWiki title casing.
 */
function normalizeTemplateIdentity(value: string): string {
    const entered = normalizeTemplateDisplayName(value);
    if (entered === "") {
        return "";
    }
    return entered[0].toLocaleUpperCase("en-US") + entered.slice(1);
}

/**
 * Returns the canonical display casing of an editable template name.
 *
 * @param value - Entered or normalized template title.
 * @returns Canonically cased template name.
 */
export function getCanonicalTemplateName(value: string): string {
    const identity = normalizeTemplateIdentity(value);
    const supported = CANONICAL_TEMPLATE_NAMES.get(identity);
    if (supported != null) {
        return supported;
    }
    return identity;
}

/**
 * Returns a canonical display name for a stored lowercase metadata key.
 *
 * @param value - Value to process.
 * @returns Canonical display name for a lowercase metadata key.
 */
export function getCanonicalTemplateNameFromKey(value: string): string {
    const normalized = normalizeTemplateName(value);
    if (value === normalized) {
        const supported = CANONICAL_TEMPLATE_KEY_NAMES.get(normalized);
        if (supported != null) {
            return supported;
        }
    }
    return getCanonicalTemplateName(value);
}

/**
 * Returns whether a template is in the supported CS1 set.
 *
 * @param value - Entered template title.
 * @returns Whether the template is supported.
 */
export function isCitationTemplate(value: string): boolean {
    return SUPPORTED_TEMPLATE_SET.has(normalizeTemplateIdentity(value));
}

/**
 * Returns whether a citation template can be edited as a source draft.
 *
 * @param value - Value to process.
 * @returns Whether a citation template can be edited as a source draft.
 */
export function isEditableCitationTemplate(value: string): boolean {
    return isCitationTemplate(value) || isCitePrefixedTemplate(value);
}

/**
 * Returns whether an editable template lacks local TemplateData.
 *
 * @param value - Value to process.
 * @returns Whether an editable template lacks local TemplateData.
 */
export function isMetadataFreeCitationTemplate(value: string): boolean {
    return !isCitationTemplate(value) && isCitePrefixedTemplate(value);
}

/**
 * Returns whether a title uses the Cite template-name family.
 *
 * @param value - Value to process.
 * @returns Whether a title uses the Cite template-name family.
 */
export function isCitePrefixedTemplate(value: string): boolean {
    const normalized = normalizeTemplateName(value);
    return /^cite(?:\s|$)/u.test(normalized);
}
