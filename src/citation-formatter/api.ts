/**
 * Side-effect-free public API for Citation Formatter.
 */

export {
    formatCitations,
    manageCitations,
    manageCitationsWithResult,
} from "#me/app/format.ts";
export {
    findUsedCitationTemplates,
    formatCitationWikitext,
} from "#me/domain/formatter.ts";
export { normalizeEnglishDate } from "#me/domain/citation.ts";
export { findNameOverrideFields } from "#me/domain/manager.ts";

export type { CitationFormatResult } from "#me/domain/formatter.ts";
export type {
    NameOverrideField,
    NameOverrideOccurrence,
    NameOverrideUpdate,
    NameOverrideUsageItem,
} from "#me/domain/manager.ts";
export type {
    CitationLayout,
    CitationTemplateData,
    CitationTemplateDataMap,
} from "#me/domain/types.ts";
