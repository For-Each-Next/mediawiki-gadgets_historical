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
 * @param leadSectionLabel - Localized article-lead label.
 * @returns Formatted source and operation counts.
 */
export function formatCitations(
    text: string,
    layout: CitationLayout = "block",
    leadSectionLabel: string = "Lead",
): CitationFormatResult {
    return formatCitationWikitext(
        text,
        templateData,
        layout,
        leadSectionLabel,
    );
}

/**
 * Applies manager edits and regenerates citation names.
 *
 * @param text - Article source wikitext.
 * @param updates - Edited reference-name overrides.
 * @param useCompactReferences - Whether reuse calls should use `{{r}}`.
 * @param layout - Citation-template output layout.
 * @param leadSectionLabel - Localized article-lead label.
 * @returns Managed source wikitext.
 */
export function manageCitations(
    text: string,
    updates: NameOverrideUpdate[],
    useCompactReferences: boolean,
    layout: CitationLayout = "block",
    leadSectionLabel: string = "Lead",
): string {
    return manageCitationsWithResult(
        text,
        updates,
        useCompactReferences,
        layout,
        leadSectionLabel,
    ).text;
}

/**
 * Applies manager edits while retaining citation-formatting counts.
 *
 * @param text - Article source wikitext.
 * @param updates - Edited reference-name overrides.
 * @param useCompactReferences - Whether reuse calls should use `{{r}}`.
 * @param layout - Citation-template output layout.
 * @param leadSectionLabel - Localized article-lead label.
 * @returns Managed source wikitext and formatting counts.
 */
export function manageCitationsWithResult(
    text: string,
    updates: NameOverrideUpdate[],
    useCompactReferences: boolean,
    layout: CitationLayout = "block",
    leadSectionLabel: string = "Lead",
): CitationFormatResult {
    const overridden = applyNameOverrides(text, updates);
    const formatted = formatCitations(overridden, layout, leadSectionLabel);
    if (useCompactReferences) {
        formatted.text = compactReferenceCalls(formatted.text);
    } else {
        formatted.text = expandCompactReferenceCalls(formatted.text);
    }
    return formatted;
}
