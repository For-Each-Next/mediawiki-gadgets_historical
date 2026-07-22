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
import type { CitationLayout } from "#me/domain/types.ts";

/**
 * Formats an article source string with generated local TemplateData.
 *
 * @param text - Article source wikitext.
 * @param layout - Citation-template output layout.
 * @returns Formatted source and operation counts.
 */
export function formatCitations(
    text: string,
    layout: CitationLayout = "block",
): CitationFormatResult {
    return formatCitationWikitext(text, templateData, layout);
}

/**
 * Applies manager edits and regenerates citation names.
 *
 * @param text - Article source wikitext.
 * @param updates - Edited reference-name overrides.
 * @param compact - Whether reuse calls should use R.
 * @param layout - Citation-template output layout.
 * @returns Managed source wikitext.
 */
export function manageCitations(
    text: string,
    updates: NameOverrideUpdate[],
    compact: boolean,
    layout: CitationLayout = "block",
): string {
    const overridden = applyNameOverrides(text, updates);
    const formatted = formatCitations(overridden, layout).text;
    if (compact) {
        return compactReferenceCalls(formatted);
    }
    return expandCompactReferenceCalls(formatted);
}
