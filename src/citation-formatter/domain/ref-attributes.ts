/**
 * Encoding helpers for citation reference attributes.
 */

export interface ReferenceNameEscapeOptions {
    /**
     * Whether an existing amp entity may use non-lowercase spelling.
     */
    caseInsensitiveAmpEntity?: boolean;
}

/**
 * Decodes entities recognized in reference names and groups.
 *
 * @param value - Entered attribute value.
 * @returns Decoded attribute text.
 */
export function decodeReferenceAttribute(value: string): string {
    return value
        .replace(/&quot;/giu, '"')
        .replace(/&amp;/giu, "&")
        .replace(/&#0*38;/giu, "&")
        .replace(/&#x0*26;/giu, "&");
}

/**
 * Escapes arbitrary text for a quoted HTML-like attribute.
 *
 * @param value - Raw attribute value.
 * @returns Escaped attribute text.
 */
export function escapeQuotedAttribute(value: string): string {
    return value.replace(/&/gu, "&amp;").replace(/"/gu, "&quot;");
}

/**
 * Escapes a reference name while preserving a literal ampersand.
 *
 * @param value - Raw reference name.
 * @param options - Existing-entity matching behavior.
 * @returns Reference name safe for a quoted attribute.
 */
export function escapeReferenceName(
    value: string,
    options: ReferenceNameEscapeOptions = {},
): string {
    const ampEntity = options.caseInsensitiveAmpEntity
        ? /&amp;/giu
        : /&amp;/gu;
    return value.replace(ampEntity, "&").replace(/"/gu, "&quot;");
}

/**
 * Builds an optional, escaped reference-group attribute.
 *
 * @param value - Raw reference group.
 * @returns Leading-space group attribute or an empty string.
 */
export function formatReferenceGroupAttribute(value: string): string {
    return value === "" ? "" : ` group="${escapeQuotedAttribute(value)}"`;
}

/**
 * Removes optional matching quote marks around an R-template name.
 *
 * @param value - Entered reference name.
 * @returns Unquoted reference name.
 */
export function stripOptionalReferenceNameQuotes(value: string): string {
    return value.trim().replace(/^(?:"([\s\S]*)"|'([\s\S]*)')$/u, "$1$2");
}
