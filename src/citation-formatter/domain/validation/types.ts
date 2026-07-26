/** Site-specific settings used by the citation draft validator. */
export interface CitationValidationConfig {
    additionalParameters: readonly string[];
    dateStyle: "english" | "chinese";
    numberedParameters: readonly string[];
    wikiIds: readonly string[];
}
