/** Site-specific settings used by the citation draft validator. */
export interface CitationValidationConfig {
    additionalParameters: readonly string[];
    dateStyle: "english" | "chinese";
    wikiIds: readonly string[];
}
