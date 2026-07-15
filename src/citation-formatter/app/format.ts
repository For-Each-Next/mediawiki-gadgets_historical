/**
 * Coordinates local metadata and pure wikitext formatting.
 */

import templateData from "#me/domain/data/index.ts";
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
