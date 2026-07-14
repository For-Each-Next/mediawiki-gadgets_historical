/**
 * Exports wikitext builders for video game stubs.
 */

export { buildAggScoresText } from "./aggregate-scores.ts";
export {
    buildCategoryLinks,
    buildCategoryText,
    buildStubTagText,
    getCategoryLinks,
    getStubTagRows,
    sortCategoryRowsByProse,
} from "./categories.ts";
export { buildDefaultSortKey, buildDefaultSortText } from "./default-sort.ts";
export { buildFooterTemplateText } from "./footer.ts";
export { buildInfoboxText } from "./infobox.ts";
export { buildLeadNameText } from "./lead-name.ts";
export { buildNavboxText, buildReviewedNavboxText } from "./navboxes.ts";
export { buildNoteTaText } from "./note-ta.ts";
export { buildReferencesText } from "./references.ts";
