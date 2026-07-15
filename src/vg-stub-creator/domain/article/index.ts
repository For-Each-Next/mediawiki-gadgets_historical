/**
 * Exports the vg-stub-creator article data-flow API.
 */

export {
    createArticleData,
    formatArticleFormField,
    getArticleSourceFields,
    isArticleListField,
} from "./processor.ts";
export { createDataRecord, createDataValue } from "./data-record.ts";
export { defineArticleModule } from "./module.ts";
export {
    completeMetadataFieldValue,
    isCompletableMetadataField,
} from "#stub/data";
export { ARTICLE_MODULES } from "#stub/modules";
export { buildArticleProse } from "#stub/wiki";
export type {
    AggregateScoreMetadata,
    AggregateScoreRecord,
    SourceTags,
} from "./contracts.ts";
