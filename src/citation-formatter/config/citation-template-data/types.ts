/** Metadata fields retained from citation-template TemplateData. */
export interface CitationTemplateData {
    aliases: Record<string, string[]>;
    canonicalName?: string;
    dateParams?: string[];
    paramOrder: string[];
}

/** Citation metadata keyed by normalized template name. */
export type CitationTemplateDataMap = Record<string, CitationTemplateData>;
