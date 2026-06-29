/* eslint-disable */

/**
 * Prepares and saves company video game categories.
 */

import { addEditSummarySuffix } from "../editing/summary.js";
import {
    addTalkPageBanner,
    connectWikidataSitelink,
} from "../editing/pre-save.js";
import { buildDefaultSortText } from "../wikitext/default-sort.js";
import { fetchEnwikiMetadata } from "../sources/crosswiki.js";
import { formatText, getTextTemplate } from "../shared/text-templates.js";

const CATEGORY_NAMESPACE = "Category:";

/**
 * Builds the initial wikitext for a company video game category.
 *
 * @param {string} company - Company page title.
 * @param {boolean} parentCategoryExists - Whether Category:<company> exists.
 * @returns {string} Category page wikitext.
 */
export function buildCompanyCategoryText(company, parentCategoryExists) {
    const parentCategories = parentCategoryExists
        ? [`[[Category:${company}]]`]
        : [];
    const defaultSort = buildDefaultSortText({
        title: company,
    });
    const portal = getTextTemplate("shared.portal");
    const description = formatText("handlers.companyCategoryDescription", {
        company,
    });
    const allCompanies = getTextTemplate("handlers.allCompaniesCategory");

    return [
        `{{portal|${portal}}}`,
        "",
        description,
        "",
        defaultSort,
        ...parentCategories,
        `[[Category:${allCompanies}]]`,
    ].join("\n");
}

/**
 * Builds editable category text after checking the optional parent category.
 *
 * @param {object} row - Company category review row.
 * @param {string} row.company - Company page title.
 * @param {object} [api] - MediaWiki API client.
 * @returns {Promise<string>} Prefilled category page text.
 */
export async function prepareCompanyCategoryText(row, api = new mw.Api()) {
    return buildCompanyCategoryText(
        row.company,
        await categoryExists(api, row.company),
    );
}

/**
 * Creates a company category page.
 *
 * @param {string} category - Category title without namespace.
 * @param {string} text - Category page wikitext.
 * @param {string} [englishCategory] - English Wikipedia category title.
 * @param {object} [options] - Save and lookup clients.
 * @param {object} [options.api] - MediaWiki API client.
 * @param {Function} [options.fetchMetadata] - Enwiki metadata fetcher.
 * @param {object} [options.wikidataApi] - Wikidata API client.
 * @returns {Promise<void>} Resolves after the category is saved.
 */
export async function saveCompanyCategory(
    category,
    text,
    englishCategory = "",
    options = {},
) {
    const api = options.api || new mw.Api();
    const englishTitle = normalizeEnglishCategoryTitle(englishCategory);
    const metadata =
        englishTitle === ""
            ? null
            : await (options.fetchMetadata || fetchEnwikiMetadata)(
                  englishTitle,
              );

    await saveCategoryPage(
        category,
        text,
        buildCompanyCategorySummary(category, englishTitle, metadata),
        api,
    );

    const categoryTitle = `${CATEGORY_NAMESPACE}${category}`;

    if (metadata != null && metadata.pageExists !== false) {
        const wikidataApi =
            options.wikidataApi ||
            new mw.ForeignApi("https://www.wikidata.org/w/api.php");

        if (String(metadata.wikidataId || "").trim() === "") {
            await createWikidataCategoryItem(
                wikidataApi,
                englishTitle,
                categoryTitle,
            );
        } else {
            await connectWikidataSitelink(
                wikidataApi,
                metadata.wikidataId,
                categoryTitle,
            );
        }
    }

    await addTalkPageBanner(api, categoryTitle);
}

/**
 * Builds the edit summary for creating a company category.
 *
 * @param {string} category - Category title without namespace.
 * @param {string} englishTitle - English Wikipedia category title.
 * @param {object|null} metadata - English Wikipedia metadata.
 * @param {string} [metadata.wikidataId] - Wikidata entity ID.
 * @returns {string} Edit summary before the gadget suffix.
 */
function buildCompanyCategorySummary(category, englishTitle, metadata) {
    const links = [
        buildEnwikiSummaryLink(englishTitle),
        buildWikidataSummaryLink(metadata?.wikidataId),
    ].filter(Boolean);
    const suffix =
        links.length === 0
            ? ""
            : `, also see ${links.map((link) => `'${link}'`).join(" and ")}`;

    return `create '${CATEGORY_NAMESPACE}${category}'${suffix}`;
}

/**
 * Builds an English Wikipedia summary link.
 *
 * @param {string} title - English Wikipedia page title.
 * @returns {string} Summary link, or an empty string.
 */
function buildEnwikiSummaryLink(title) {
    const value = String(title || "").trim();

    return value === "" ? "" : `[[:w:en:${value}]]`;
}

/**
 * Builds a Wikidata summary link.
 *
 * @param {string} id - Wikidata entity ID.
 * @returns {string} Summary link, or an empty string.
 */
function buildWikidataSummaryLink(id) {
    const value = String(id || "").trim();

    return value === "" ? "" : `[[:d:${value}]]`;
}

/**
 * Creates a Wikidata item linking matching English and Chinese categories.
 *
 * @param {object} api - Wikidata API client.
 * @param {string} englishTitle - English Wikipedia category title.
 * @param {string} chineseTitle - Chinese Wikipedia category title.
 * @returns {Promise<void>} Resolves after the item is created.
 */
export async function createWikidataCategoryItem(
    api,
    englishTitle,
    chineseTitle,
) {
    await api.postWithToken("csrf", {
        action: "wbeditentity",
        data: JSON.stringify({
            sitelinks: {
                enwiki: {
                    site: "enwiki",
                    title: englishTitle,
                },
                zhwiki: {
                    site: "zhwiki",
                    title: chineseTitle,
                },
            },
        }),
        new: "item",
        summary: addEditSummarySuffix(
            `connect [[${englishTitle}]] and [[${chineseTitle}]]`,
        ),
    });
}

/**
 * Creates a category page.
 *
 * @param {string} category - Category title without namespace.
 * @param {string} text - Category page wikitext.
 * @param {string} [summary] - Edit summary before the gadget suffix.
 * @param {object} [api] - MediaWiki API client.
 * @returns {Promise<void>} Resolves after the category is saved.
 */
export async function saveCategoryPage(
    category,
    text,
    summary = "",
    api = new mw.Api(),
) {
    const categoryTitle = `${CATEGORY_NAMESPACE}${category}`;
    const params = {
        action: "edit",
        createonly: true,
        summary: addEditSummarySuffix(summary || `create '${categoryTitle}'`),
        text,
        title: categoryTitle,
    };

    await api.postWithToken("csrf", params);
}

/**
 * Checks whether the matching company parent category exists.
 *
 * @param {object} api - MediaWiki API client.
 * @param {string} company - Company page title.
 * @returns {Promise<boolean>} Whether the category exists.
 */
async function categoryExists(api, company) {
    try {
        const response = await api.get({
            action: "query",
            formatversion: "2",
            titles: `${CATEGORY_NAMESPACE}${company}`,
        });
        const pages = response?.query?.pages || [];
        const page = Array.isArray(pages) ? pages[0] : Object.values(pages)[0];

        return page != null && page.missing == null;
    } catch (_error) {
        return false;
    }
}

/**
 * Normalizes an English Wikipedia company-category title.
 *
 * @param {string} title - User-entered English category name.
 * @returns {string} Canonical English category title, or an empty string.
 */
function normalizeEnglishCategoryTitle(title) {
    const value = String(title || "").trim();

    if (value === "") {
        return "";
    }

    return /^Category:/iu.test(value) ? value : `Category:${value}`;
}
