/**
 * TemplateData fields used by the formatter.
 */
export interface CitationTemplateData {
    aliases: Record<string, string[]>;
    dateParams?: string[];
    paramOrder: string[];
}

/**
 * Canonicalized template parameter.
 */
export interface CitationParam {
    name: string;
    value: string;
}

/**
 * Parsed citation template.
 */
export interface CitationTemplate {
    name: string;
    params: CitationParam[];
}

/**
 * Template metadata keyed by normalized template name.
 */
export type CitationTemplateDataMap = Record<string, CitationTemplateData>;

/**
 * One replacement in a source string.
 */
export interface TextReplacement {
    end: number;
    start: number;
    text: string;
}
