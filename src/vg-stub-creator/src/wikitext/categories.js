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
    const rows = sortCategoryRowsByProse(
        params.categoryRows || [],
        params.prose?.text || "",
    );
    const result = buildCategoryLinks(rows);

    return result;
}

/**
 * Builds stub tag wikitext from accepted article metadata.
 *
 * @param {object} params - Normalized article parameters.
 * @returns {string} Stub tag wikitext.
 */
export function buildStubTagText(params) {
    const stubTags = getStubTagRows(params)
        .filter((row) => row.enabled)
        .map((row) => row.stubTag);
    const result = uniqueValues(stubTags).map(buildTemplateCall).join("\n");

    return result;
}

/**
 * Gets unique stub-tag review rows in related prose order.
 *
 * @param {object} params - Normalized article parameters.
 * @returns {Array<object>} Stub-tag review rows.
 */
export function getStubTagRows(params) {
    if (Array.isArray(params.stubTagRows)) {
        return getReviewedStubTagRows(params.stubTagRows);
    }

    const rows = sortCategoryRowsByProse(
        params.categoryRows || [],
        params.prose?.text || "",
    ).filter(hasStubTag);
    const stubTags = uniqueValues(
        rows.map((row) => normalizeStubTag(row.stubTag)),
    );

    return stubTags.map((stubTag) => ({
        enabled: rows.some(
            (row) =>
                normalizeStubTag(row.stubTag) === stubTag &&
                row.stubTagEnabled === true,
        ),
        stubTag,
    }));
}

function getReviewedStubTagRows(rows) {
    const stubTags = uniqueValues(
        rows.map((row) => normalizeStubTag(row.stubTag)),
    );

    return stubTags
        .filter(Boolean)
        .map((stubTag) => ({
            enabled: rows.some(
                (row) =>
                    normalizeStubTag(row.stubTag) === stubTag &&
                    row.enabled !== false,
            ),
            stubTag,
        }));
}

function isRenderableCategoryRow(row) {
    return (
        row.enabled !== false && normalizeCategoryTitle(row.category) !== ""
    );
}

function hasStubTag(row) {
    return (
        normalizeCategoryTitle(row.category) !== "" &&
        normalizeStubTag(row.stubTag) !== ""
    );
}

/**
 * Sorts category rows by the first related mention in generated prose.
 *
 * @param {Array<object>} rows - Category review rows.
 * @param {string} prose - Generated article prose.
 * @returns {Array<object>} Prose-ordered category rows.
 */
export function sortCategoryRowsByProse(rows, prose) {
    const normalizedProse = normalizeRelatedText(stripLeadTitleText(prose));

    if (normalizedProse === "") {
        return rows;
    }

    return rows
        .map((row, index) => ({
            index,
            position: getCategoryProsePosition(row, normalizedProse),
            row,
        }))
        .sort((left, right) => {
            if (left.position === right.position) {
                return left.index - right.index;
            }

            return left.position - right.position;
        })
        .map((item) => item.row);
}

function getCategoryProsePosition(row, prose) {
    const titles = uniqueValues([
        normalizeCategoryTitle(row.category),
        normalizeCategoryTitle(row.originalCategory),
    ]);
    const positions = titles
        .flatMap(getCategorySearchTerms)
        .map((term) => prose.indexOf(term))
        .filter((position) => position >= 0);

    return positions.length === 0
        ? Number.POSITIVE_INFINITY
        : Math.min(...positions);
}

function getCategorySearchTerms(category) {
    const normalized = normalizeRelatedText(category);
    const stem = normalized.replace(/(?:电子游戏|電子遊戲|游戏|遊戲)$/u, "");

    return uniqueValues([normalized, stem]).filter(Boolean);
}

function stripLeadTitleText(prose) {
    return trimValue(prose)
        .replace(/^《[^》]+》(?:（[^）]+）)?/u, "")
        .replace(/^''[^']+''(?:（[^）]+）)?/u, "");
}

function normalizeRelatedText(value) {
    return foldChineseVariants(
        trimValue(value)
            .replace(/\[\[([^|\]]+\|)?([^\]]+)\]\]/gu, "$2")
            .replace(/[\s\u200e\u200f]/gu, "")
            .toLocaleLowerCase(),
    );
}

function foldChineseVariants(value) {
    return value
        .replace(/電/gu, "电")
        .replace(/體/gu, "体")
        .replace(/遊/gu, "游")
        .replace(/戲/gu, "戏")
        .replace(/鬥/gu, "斗");
}

function buildCategoryLink(row) {
    return `[[Category:${normalizeCategoryTitle(row.category)}]]`;
}

function normalizeCategoryTitle(value) {
    return trimValue(value)
        .replace(/^Category:/iu, "")
        .trim();
}

function normalizeStubTag(value) {
    return trimValue(value)
        .replace(/^\{\{/u, "")
        .replace(/\}\}$/u, "")
        .trim();
}

function trimValue(value) {
    return value == null ? "" : String(value).trim();
}
