/* eslint-disable */

/**
 * Builds category links and stub templates from reviewed category data.
 */

import { buildTemplateCall, uniqueValues } from "../shared/utils.js";

/**
 * Builds category wikitext links from review rows.
 *
 * @param {Array<object>} rows - Category review rows.
 * @returns {Array<string>} Category link wikitext.
 */
export function buildCategoryLinks(rows) {
    return rows.filter(isRenderableCategoryRow).map(buildCategoryLink);
}

/**
 * Builds category wikitext from accepted article metadata.
 *
 * @param {object} params - Normalized article parameters.
 * @returns {string} Category wikitext.
 */
export function buildCategoryText(params) {
    const categoryText = getCategoryLinks(params).join("\n");

    if (categoryText === "") {
        return "";
    }

    const result = `${params.defaultSortText}\n${categoryText}`;

    return result;
}

/**
 * Gets category links from reviewed rows.
 *
 * @param {object} params - Normalized article parameters.
 * @returns {Array<string>} Category links.
 */
export function getCategoryLinks(params) {
    const result = buildCategoryLinks(params.categoryRows || []);

    return result;
}

/**
 * Builds stub tag wikitext from accepted article metadata.
 *
 * @param {object} params - Normalized article parameters.
 * @returns {string} Stub tag wikitext.
 */
export function buildStubTagText(params) {
    const stubTags = (params.categoryRows || [])
        .filter(isRenderableStubTagRow)
        .map((row) => row.stubTag)
        .filter(Boolean);
    const result = uniqueValues(stubTags)
        .map(buildTemplateCall)
        .join("\n");

    return result;
}

function isRenderableCategoryRow(row) {
    return row.enabled !== false && normalizeCategoryTitle(row.category) !== "";
}

function isRenderableStubTagRow(row) {
    return (
        isRenderableCategoryRow(row) &&
        row.stubTagEnabled === true &&
        trimValue(row.stubTag) !== ""
    );
}

function buildCategoryLink(row) {
    return `[[Category:${normalizeCategoryTitle(row.category)}]]`;
}

function normalizeCategoryTitle(value) {
    return trimValue(value).replace(/^Category:/iu, "").trim();
}

function trimValue(value) {
    return value == null ? "" : String(value).trim();
}
