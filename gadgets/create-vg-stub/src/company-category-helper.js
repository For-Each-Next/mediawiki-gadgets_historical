/* eslint-disable */

/**
 * Prepares and saves company video game categories.
 */

import { addEditSummarySuffix } from "./edit-summary.js";
import { buildDefaultSortText } from "./fragments/defaultsort.js";

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

  return [
    "{{portal|电子游戏}}",
    "",
    `本分類收錄由[[${company}]]開發、發行的電子遊戲作品。`,
    "",
    defaultSort,
    ...parentCategories,
    "[[Category:各公司电子游戏]]",
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
 * @param {object} [api] - MediaWiki API client.
 * @returns {Promise<void>} Resolves after the category is saved.
 */
export async function saveCompanyCategory(
  category,
  text,
  api = new mw.Api(),
) {
  return saveCategoryPage(
    category,
    text,
    "Create company video game category",
    api,
  );
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
  summary = "Create video game category",
  api = new mw.Api(),
) {
  await api.postWithToken("csrf", {
    action: "edit",
    createonly: true,
    summary: addEditSummarySuffix(summary),
    text,
    title: `${CATEGORY_NAMESPACE}${category}`,
  });
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
