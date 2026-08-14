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
    largeFont: boolean;
    referencePreviews: boolean;
    resolveRedirects: boolean;
    resolveTemplateRedirects: boolean;
    smallReferenceText: boolean;
}

export type EditorFeatureSettings = Pick<
    FormatterSettings,
    | "fullPageReferencePreviews"
    | "highlightMissing"
    | "largeFont"
    | "referencePreviews"
    | "smallReferenceText"
>;

/** Creates choices used when no saved configuration is valid. */
export function createDefaultFormatterSettings(): FormatterSettings {
    return {
        fullPageReferencePreviews: false,
        formatter: {
            characterWidthRatio: "5:3",
            firstParameterLayout: "align-values",
            formatFirstParameter: false,
            formatSubsequentParameters: false,
            indentBlockTemplates: false,
            indentSpaces: 2,
            normalizeConversion: false,
            skipFirstLevelIndentation: false,
            subsequentParameterLayout: "align-names",
        },
        highlightMissing: false,
        largeFont: false,
        referencePreviews: true,
        resolveRedirects: false,
        resolveTemplateRedirects: false,
        smallReferenceText: true,
    };
}

/** Copies editor behaviors from a formatter configuration. */
export function getEditorFeatureSettings(
    settings: FormatterSettings,
): EditorFeatureSettings {
    return {
        fullPageReferencePreviews: settings.fullPageReferencePreviews,
        highlightMissing: settings.highlightMissing,
        largeFont: settings.largeFont,
        referencePreviews: settings.referencePreviews,
        smallReferenceText: settings.smallReferenceText,
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
    if (!isRecord(value)) {
        return undefined;
    }
    const formatter = parseFormatterOptions(value.formatter);
    const features = parseEditorFeatures(value);
    if (formatter == null || features == null) {
        return undefined;
    }
    return { ...features, formatter };
}

function parseFormatterOptions(value: unknown): FormatterOptions | undefined {
    if (!isRecord(value)) {
        return undefined;
    }
    if (
        !isCharacterWidthRatio(value.characterWidthRatio) ||
        !isFirstParameterLayout(value.firstParameterLayout) ||
        typeof value.formatFirstParameter !== "boolean" ||
        typeof value.formatSubsequentParameters !== "boolean" ||
        typeof value.indentBlockTemplates !== "boolean" ||
        !isIndentSpaces(value.indentSpaces) ||
        typeof value.normalizeConversion !== "boolean" ||
        !isOptionalBoolean(value.skipFirstLevelIndentation) ||
        !isSubsequentParameterLayout(value.subsequentParameterLayout)
    ) {
        return undefined;
    }
    return {
        characterWidthRatio: value.characterWidthRatio,
        firstParameterLayout: value.firstParameterLayout,
        formatFirstParameter: value.formatFirstParameter,
        formatSubsequentParameters: value.formatSubsequentParameters,
        indentBlockTemplates: value.indentBlockTemplates,
        indentSpaces: value.indentSpaces,
        normalizeConversion: value.normalizeConversion,
        skipFirstLevelIndentation: value.skipFirstLevelIndentation === true,
        subsequentParameterLayout: value.subsequentParameterLayout,
    };
}

function parseEditorFeatures(
    value: Record<string, unknown>,
): Omit<FormatterSettings, "formatter"> | undefined {
    if (
        typeof value.fullPageReferencePreviews !== "boolean" ||
        typeof value.highlightMissing !== "boolean" ||
        typeof value.largeFont !== "boolean" ||
        typeof value.referencePreviews !== "boolean" ||
        typeof value.resolveRedirects !== "boolean" ||
        typeof value.resolveTemplateRedirects !== "boolean" ||
        typeof value.smallReferenceText !== "boolean"
    ) {
        return undefined;
    }
    return {
        fullPageReferencePreviews: value.fullPageReferencePreviews,
        highlightMissing: value.highlightMissing,
        largeFont: value.largeFont,
        referencePreviews: value.referencePreviews,
        resolveRedirects: value.resolveRedirects,
        resolveTemplateRedirects: value.resolveTemplateRedirects,
        smallReferenceText: value.smallReferenceText,
    };
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value != null && !Array.isArray(value);
}

function isFirstParameterLayout(
    value: unknown,
): value is FirstParameterLayout {
    return value === "align-values" || value === "compact";
}

function isSubsequentParameterLayout(
    value: unknown,
): value is SubsequentParameterLayout {
    return (
        value === "align-names" ||
        value === "align-names-and-values" ||
        value === "compact"
    );
}

function isCharacterWidthRatio(value: unknown): value is "2:1" | "5:3" {
    return value === "2:1" || value === "5:3";
}

function isIndentSpaces(value: unknown): value is number {
    return Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 4;
}

function isOptionalBoolean(value: unknown): value is boolean | undefined {
    return value === undefined || typeof value === "boolean";
}
