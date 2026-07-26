import type { CitationValidationConfig } from "./types.ts";

/**
 * Zhwiki CS1 aliases that are not present in English TemplateData.
 *
 * Shared TemplateData remains the per-template whitelist.
 * The entries below add aliases retained by zhwiki's CS1 whitelist.
 */
export const ZHWIKI_CITATION_VALIDATION: CitationValidationConfig = {
    additionalParameters: [
        "eventurl",
        "ignoreisbnerror",
        "lastauthoramp",
        "laydate",
        "laysource",
        "laysummary",
        "layurl",
        "mapurl",
        "publicationdate",
        "publicationplace",
        "sectionurl",
        "serieslink",
        "seriesno",
        "seriesnumber",
        "template doc demo",
        "timecaption",
        "title_zh",
        "trans_chapter",
        "trans_title",
        "transcripturl",
    ],
    dateStyle: "chinese",
    wikiIds: ["zhwiki"],
};
