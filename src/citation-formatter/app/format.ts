/**
 * Coordinates local metadata and pure wikitext formatting.
 */

import templateData from "#me/domain/data/index.ts";
import {
    applyNameOverrides,
    compactReferenceCalls,
    expandCompactReferenceCalls,
    type NameOverrideUpdate,
} from "#me/domain/manager.ts";
import {
    formatCitationWikitext,
    type CitationFormatResult,
} from "#me/domain/formatter.ts";

/**
 * Formats an article source string with generated local TemplateData.
 *
 * @param text - Article source wikitext.
 * @returns Formatted source and operation counts.
 */
export function formatCitations(text: string): CitationFormatResult {
    return formatCitationWikitext(text, templateData);
}

/**
 * Applies manager edits and regenerates citation names.
 *
 * @param text - Article source wikitext.
 * @param updates - Edited reference-name overrides.
 * @param compact - Whether reuse calls should use R.
 * @returns Managed source wikitext.
 */
export function manageCitations(
    text: string,
    updates: NameOverrideUpdate[],
    compact: boolean,
): string {
    const overridden = applyNameOverrides(text, updates);
    const formatted = formatCitations(overridden).text;
    if (compact) {
        return compactReferenceCalls(formatted);
    }
    return expandCompactReferenceCalls(formatted);
}
