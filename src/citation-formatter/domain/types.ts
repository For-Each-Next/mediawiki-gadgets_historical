import type {
    CitationTemplateData,
    CitationTemplateDataMap,
} from "#shared/citation";

export type { CitationTemplateData, CitationTemplateDataMap };

/**
 * Canonicalized template parameter.
 */
export interface CitationParam {
    name: string;
    positional?: boolean;
    value: string;
}

/**
 * Parsed citation template.
 */
export interface CitationTemplate {
    name: string;
    params: CitationParam[];
}

/** Supported citation-template serialization layouts. */
export type CitationLayout = "block" | "inline";

/**
 * One replacement in a source string.
 */
export interface TextReplacement {
    end: number;
    start: number;
    text: string;
}
