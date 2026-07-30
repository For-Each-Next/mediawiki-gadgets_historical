/**
 * Side-effect-free citation operations for composition and tests.
 */

import templateData from "#gadget/domain/data/index.ts";
import {
    applyNameOverrides,
    compactReferenceCalls,
    expandCompactReferenceCalls,
    type NameOverrideUpdate,
} from "#gadget/domain/manager.ts";
import {
    formatCitationWikitext,
    type CitationFormatResult,
} from "#gadget/domain/formatter.ts";
import type {
    CitationLayout,
    CitationTemplateDataMap,
} from "#gadget/domain/types.ts";

export interface CitationManagementContext {
    leadSectionLabel?: string;
    runtimeTemplateData?: CitationTemplateDataMap;
}

/** Formats article wikitext with generated local TemplateData. */
export function formatCitations(
    text: string,
    layout: CitationLayout = "block",
    leadSectionLabel: string = "Lead",
    runtimeTemplateData: CitationTemplateDataMap = {},
): CitationFormatResult {
    const activeTemplateData = { ...runtimeTemplateData, ...templateData };
    return formatCitationWikitext(
        text,
        activeTemplateData,
        layout,
        leadSectionLabel,
    );
}

/** Applies name edits, formatting, and the selected reuse-tag style. */
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

/** Applies manager edits while retaining citation-formatting counts. */
export function manageCitationsWithResult(
    text: string,
    updates: NameOverrideUpdate[],
    useCompactReferences: boolean,
    layout: CitationLayout = "block",
    context: CitationManagementContext | string = "Lead",
): CitationFormatResult {
    const overridden = applyNameOverrides(text, updates);
    const leadSectionLabel =
        typeof context === "string"
            ? context
            : (context.leadSectionLabel ?? "Lead");
    const runtimeTemplateData =
        typeof context === "string" ? {} : (context.runtimeTemplateData ?? {});
    const formatted = formatCitations(
        overridden,
        layout,
        leadSectionLabel,
        runtimeTemplateData,
    );
    formatted.text = useCompactReferences
        ? compactReferenceCalls(formatted.text)
        : expandCompactReferenceCalls(formatted.text);
    return formatted;
}

export {
    findUsedCitationTemplates,
    findUsedMetadataFreeCitationTemplates,
    formatCitationWikitext,
} from "#gadget/domain/formatter.ts";
export { normalizeEnglishDate } from "#gadget/domain/citation.ts";
export { findNameOverrideFields } from "#gadget/domain/manager.ts";

export type { CitationFormatResult } from "#gadget/domain/formatter.ts";
export type {
    NameOverrideField,
    NameOverrideOccurrence,
    NameOverrideUpdate,
    NameOverrideUsageItem,
} from "#gadget/domain/manager.ts";
export type {
    CitationLayout,
    CitationTemplateData,
    CitationTemplateDataMap,
} from "#gadget/domain/types.ts";
