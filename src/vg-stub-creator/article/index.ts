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
// noinspection ES6PreferShortImport -- keep explicit .ts extension.
export { ARTICLE_MODULES } from "./modules/index.ts";
export { buildArticleProse } from "../wikitext/prose.ts";
