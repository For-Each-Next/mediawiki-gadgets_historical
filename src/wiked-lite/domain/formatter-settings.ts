/** Formatter choices shared by the dialog and storage adapter. */

import type {
    FirstParameterLayout,
    FormatterOptions,
    SubsequentParameterLayout,
} from "#gadget/domain/formatter.ts";

export interface FormatterSettings {
    fullPageReferencePreviews: boolean;
    formatter: FormatterOptions;
    highlightMissing: boolean;
    referencePreviews: boolean;
    resolveRedirects: boolean;
}

export type EditorFeatureSettings = Pick<
    FormatterSettings,
    "fullPageReferencePreviews" | "highlightMissing" | "referencePreviews"
>;

/** Creates choices used when no saved configuration is valid. */
export function createDefaultFormatterSettings(): FormatterSettings {
    return {
        fullPageReferencePreviews: false,
        formatter: {
            firstParameterLayout: "preserve",
            fullWidthRatio: 5 / 3,
            indentPipes: false,
            normalizeConversion: false,
            subsequentParameterLayout: "preserve",
        },
        highlightMissing: false,
        referencePreviews: true,
        resolveRedirects: false,
    };
}

/** Copies editor behaviors from a formatter configuration. */
export function getEditorFeatureSettings(
    settings: FormatterSettings,
): EditorFeatureSettings {
    return {
        fullPageReferencePreviews: settings.fullPageReferencePreviews,
        highlightMissing: settings.highlightMissing,
        referencePreviews: settings.referencePreviews,
    };
}

/** Replaces editor behaviors while preserving formatter choices. */
export function withEditorFeatureSettings(
    settings: FormatterSettings,
    features: EditorFeatureSettings,
): FormatterSettings {
    return { ...settings, ...features };
}

/** Validates and copies one persisted formatter configuration. */
export function parseFormatterSettings(
    value: unknown,
): FormatterSettings | undefined {
    if (!isRecord(value) || !isRecord(value.formatter)) {
        return undefined;
    }
    const formatter = value.formatter;
    if (
        !isFirstParameterLayout(formatter.firstParameterLayout) ||
        !isFullWidthRatio(formatter.fullWidthRatio) ||
        typeof formatter.indentPipes !== "boolean" ||
        typeof formatter.normalizeConversion !== "boolean" ||
        !isSubsequentParameterLayout(formatter.subsequentParameterLayout) ||
        typeof value.fullPageReferencePreviews !== "boolean" ||
        typeof value.highlightMissing !== "boolean" ||
        typeof value.referencePreviews !== "boolean" ||
        typeof value.resolveRedirects !== "boolean"
    ) {
        return undefined;
    }
    return {
        fullPageReferencePreviews: value.fullPageReferencePreviews,
        formatter: {
            firstParameterLayout: formatter.firstParameterLayout,
            fullWidthRatio: formatter.fullWidthRatio,
            indentPipes: formatter.indentPipes,
            normalizeConversion: formatter.normalizeConversion,
            subsequentParameterLayout: formatter.subsequentParameterLayout,
        },
        highlightMissing: value.highlightMissing,
        referencePreviews: value.referencePreviews,
        resolveRedirects: value.resolveRedirects,
    };
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value != null && !Array.isArray(value);
}

function isFirstParameterLayout(
    value: unknown,
): value is FirstParameterLayout {
    return (
        value === "align-separator" ||
        value === "compact" ||
        value === "preserve"
    );
}

function isSubsequentParameterLayout(
    value: unknown,
): value is SubsequentParameterLayout {
    return (
        value === "align-columns" ||
        value === "align-columns-completely" ||
        value === "compact" ||
        value === "preserve"
    );
}

function isFullWidthRatio(value: unknown): value is number {
    return value === 5 / 3 || value === 2;
}
