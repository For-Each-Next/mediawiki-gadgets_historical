/* eslint-disable */

/**
 * Exports the create-vg-stub article data-flow API.
 */

export {
    createArticleData,
    formatArticleFormField,
    getArticleSourceFields,
    isArticleListField,
} from "./processor.js";
export { createDataRecord, createDataValue } from "./data-record.js";
export { defineArticleModule } from "./module.js";
export { ARTICLE_MODULES } from "./modules/index.js";
export { buildArticleProse } from "../wikitext/prose.js";
