/** Formatter choices shared by the dialog and storage adapter. */

import type {
    FirstParameterLayout,
    FormatterOptions,
    SubsequentParameterLayout,
} from "#gadget/domain/formatter.ts";

export interface FormatterSettings {
    formatter: FormatterOptions;
    highlightMissing: boolean;
    resolveRedirects: boolean;
}

/** Creates choices used when no saved configuration is valid. */
export function createDefaultFormatterSettings(): FormatterSettings {
    return {
        formatter: {
            firstParameterLayout: "preserve",
            fullWidthRatio: 5 / 3,
            indentPipes: false,
            normalizeConversion: false,
            subsequentParameterLayout: "preserve",
        },
        highlightMissing: false,
        resolveRedirects: false,
    };
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
        typeof value.highlightMissing !== "boolean" ||
        typeof value.resolveRedirects !== "boolean"
    ) {
        return undefined;
    }
    return {
        formatter: {
            firstParameterLayout: formatter.firstParameterLayout,
            fullWidthRatio: formatter.fullWidthRatio,
            indentPipes: formatter.indentPipes,
            normalizeConversion: formatter.normalizeConversion,
            subsequentParameterLayout: formatter.subsequentParameterLayout,
        },
        highlightMissing: value.highlightMissing,
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
