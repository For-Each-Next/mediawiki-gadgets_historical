/**
 * Side-effect-free citation operations for composition and tests.
 */

// eslint-disable-next-line max-len
import { citationTemplateData as templateData } from "#gadget/config/citation-template-data/index.ts";
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
import {
    DEFAULT_TEMPLATE_NAME_CONTEXT,
    type TemplateNameContext,
} from "#gadget/domain/templates.ts";

export interface CitationManagementContext {
    leadSectionLabel?: string;
    runtimeTemplateData?: CitationTemplateDataMap;
    templateNameContext?: TemplateNameContext;
}

/**
 * Formats article wikitext with generated local TemplateData.
 *
 * @param text - Text to process.
 * @param layout - Citation layout.
 * @param leadSectionLabel - Lead section label value.
 * @param runtimeTemplateData - Runtime template data value.
 * @returns Article wikitext formatted with local TemplateData.
 */
export function formatCitations(
    text: string,
    layout: CitationLayout = "block",
    leadSectionLabel: string = "Lead",
    runtimeTemplateData: CitationTemplateDataMap = {},
    templateNameContext: TemplateNameContext = DEFAULT_TEMPLATE_NAME_CONTEXT,
): CitationFormatResult {
    const activeTemplateData = { ...runtimeTemplateData, ...templateData };
    return formatCitationWikitext(
        text,
        activeTemplateData,
        layout,
        leadSectionLabel,
        templateNameContext,
    );
}

/**
 * Applies name edits, formatting, and the selected reuse-tag style.
 *
 * @param text - Text to process.
 * @param updates - Updates value.
 * @param useCompactReferences - Use compact references value.
 * @param layout - Citation layout.
 * @param leadSectionLabel - Lead section label value.
 * @returns Resulting text.
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
 * @param text - Text to process.
 * @param updates - Updates value.
 * @param useCompactReferences - Use compact references value.
 * @param layout - Citation layout.
 * @param context - Context value.
 * @returns Operation result.
 */
export function manageCitationsWithResult(
    text: string,
    updates: NameOverrideUpdate[],
    useCompactReferences: boolean,
    layout: CitationLayout = "block",
    context: CitationManagementContext | string = "Lead",
): CitationFormatResult {
    const templateNameContext =
        typeof context === "string"
            ? DEFAULT_TEMPLATE_NAME_CONTEXT
            : (context.templateNameContext ?? DEFAULT_TEMPLATE_NAME_CONTEXT);
    const overridden = applyNameOverrides(text, updates, templateNameContext);
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
        templateNameContext,
    );
    formatted.text = useCompactReferences
        ? compactReferenceCalls(formatted.text, templateNameContext)
        : expandCompactReferenceCalls(formatted.text, templateNameContext);
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
