/**
 * Builds category links and stub templates from reviewed category data.
 */

import { buildTemplateCall, uniqueValues } from "../shared/utils.ts";


/**
 * Builds category wikitext links from review rows.
 *
 * @param rows - Category review rows.
 * @returns Category link wikitext.
 */
export function buildCategoryLinks(rows: Array<any>): Array<string> {
    return rows.filter(isRenderableCategoryRow).map(buildCategoryLink);
}


/**
 * Builds category wikitext from accepted article metadata.
 *
 * @param params - Normalized article parameters.
 * @returns Category wikitext.
 */
export function buildCategoryText(params: any): string {
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
 * @param params - Normalized article parameters.
 * @returns Category links.
 */
export function getCategoryLinks(params: any): Array<string> {
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
 * @param params - Normalized article parameters.
 * @returns Stub tag wikitext.
 */
export function buildStubTagText(params: any): string {
    const stubTags = getStubTagRows(params)
        .filter((row) => row.enabled)
        .map((row) => row.stubTag);
    const result = uniqueValues(stubTags).map(buildTemplateCall).join("\n");

    return result;
}


/**
 * Gets unique stub-tag review rows in related prose order.
 *
 * @param params - Normalized article parameters.
 * @returns Stub-tag review rows.
 */
export function getStubTagRows(params: any): Array<any> {
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

    return stubTags.map(function callback(stubTag) {
        return {
            enabled: rows.some(function callback(row) {
                return (
                    normalizeStubTag(row.stubTag) === stubTag &&
                    row.stubTagEnabled === true
                );
            }),
            stubTag,
        };
    });
}


/**
 * Defines the module-level get reviewed stub tag rows.
 */
function getReviewedStubTagRows(rows) {
    const stubTags = uniqueValues(
        rows.map((row) => normalizeStubTag(row.stubTag)),
    );

    return stubTags.filter(Boolean).map(function callback(stubTag) {
        return {
            enabled: rows.some(function callback(row) {
                return (
                    normalizeStubTag(row.stubTag) === stubTag &&
                    row.enabled !== false
                );
            }),
            stubTag,
        };
    });
}


/**
 * Defines the module-level is renderable category row.
 */
function isRenderableCategoryRow(row) {
    return (
        row.enabled !== false && normalizeCategoryTitle(row.category) !== ""
    );
}


/**
 * Defines the module-level has stub tag.
 */
function hasStubTag(row) {
    return (
        normalizeCategoryTitle(row.category) !== "" &&
        normalizeStubTag(row.stubTag) !== ""
    );
}


/**
 * Sorts category rows by the first related mention in generated prose.
 *
 * @param rows - Category review rows.
 * @param prose - Generated article prose.
 * @returns Prose-ordered category rows.
 */
export function sortCategoryRowsByProse(
    rows: Array<any>,
    prose: string,
): Array<any> {
    const normalizedProse = normalizeRelatedText(stripLeadTitleText(prose));

    if (normalizedProse === "") {
        return rows;
    }

    return rows
        .map(function callback(row, index) {
            return {
                index,
                position: getCategoryProsePosition(row, normalizedProse),
                row,
            };
        })
        .sort(function callback(left, right) {
            if (left.position === right.position) {
                return left.index - right.index;
            }

            return left.position - right.position;
        })
        .map((item) => item.row);
}


/**
 * Defines the module-level get category prose position.
 */
function getCategoryProsePosition(row, prose) {
    const titles = uniqueValues([
        normalizeCategoryTitle(row.category),
        normalizeCategoryTitle(row.originalCategory),
    ]);
    const positions = titles
        .flatMap(getCategorySearchTerms)
        .map((term) => prose.indexOf(term))
        .filter((position) => position >= 0);

    return selectValue(
        positions.length === 0,
        function trueBranch() {
            return Number.POSITIVE_INFINITY;
        },
        function falseBranch() {
            return Math.min(...positions);
        },
    );
}


/**
 * Defines the module-level get category search terms.
 */
function getCategorySearchTerms(category) {
    const normalized = normalizeRelatedText(category);
    const gameSuffix = new RegExp(
        ["(?:电子游戏|電子遊戲", "|游戏|遊戲)$"].join(""),
        "u",
    );
    const stem = normalized.replace(gameSuffix, "");

    return uniqueValues([normalized, stem]).filter(Boolean);
}


/**
 * Defines the module-level strip lead title text.
 */
function stripLeadTitleText(prose) {
    return trimValue(prose)
        .replace(/^《[^》]+》(?:（[^）]+）)?/u, "")
        .replace(/^''[^']+''(?:（[^）]+）)?/u, "");
}


/**
 * Defines the module-level normalize related text.
 */
function normalizeRelatedText(value) {
    return foldChineseVariants(
        trimValue(value)
            .replace(/\[\[([^|\]]+\|)?([^\]]+)\]\]/gu, "$2")
            .replace(/[\s\u200e\u200f]/gu, "")
            .toLocaleLowerCase(),
    );
}


/**
 * Defines the module-level fold chinese variants.
 */
function foldChineseVariants(value) {
    return value
        .replace(/電/gu, "电")
        .replace(/體/gu, "体")
        .replace(/遊/gu, "游")
        .replace(/戲/gu, "戏")
        .replace(/鬥/gu, "斗");
}


/**
 * Defines the module-level build category link.
 */
function buildCategoryLink(row) {
    return `[[Category:${normalizeCategoryTitle(row.category)}]]`;
}


/**
 * Defines the module-level normalize category title.
 */
function normalizeCategoryTitle(value) {
    return trimValue(value)
        .replace(/^Category:/iu, "")
        .trim();
}


/**
 * Defines the module-level normalize stub tag.
 */
function normalizeStubTag(value) {
    return trimValue(value).replace(/^\{\{/u, "").replace(/\}\}$/u, "").trim();
}


/**
 * Defines the module-level trim value.
 */
function trimValue(value) {
    return value == null ? "" : String(value).trim();
}


/**
 * Selects a lazily evaluated value for a condition.
 *
 * @param condition - Condition to evaluate.
 * @param trueBranch - Branch used when the condition is
 * true.
 * @param falseBranch - Branch used when the condition is
 * false.
 * @returns Value returned by the selected branch.
 */
function selectValue(
    condition: unknown,
    trueBranch: (...args: any[]) => any,
    falseBranch: (...args: any[]) => any,
): any {
    if (condition) {
        return trueBranch();
    }

    return falseBranch();
}
