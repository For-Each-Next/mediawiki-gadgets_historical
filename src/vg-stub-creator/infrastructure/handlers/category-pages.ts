/**
 * Prepares and saves company video game categories.
 */

import { addEditSummarySuffix } from "#stub/editing/summary.ts";
import {
    addTalkPageBanner,
    connectWikidataSitelink,
} from "#stub/editing/pre-save.ts";
import { buildDefaultSortText, formatText, getTextTemplate } from "#stub/wiki";
import { fetchEnwikiMetadata } from "#stub/sources/crosswiki.ts";

const CATEGORY_NAMESPACE = "Category:";

/**
 * Builds the initial wikitext for a company video game category.
 *
 * @param company - Company page title.
 * @param parentCategoryExists - Whether Category:<company>
 * exists.
 * @returns Category page wikitext.
 */
export function buildCompanyCategoryText(
    company: string,
    parentCategoryExists: boolean,
): string {
    const parentCategories = [];

    if (parentCategoryExists) {
        parentCategories.push(`[[Category:${company}]]`);
    }
    const defaultSort = buildDefaultSortText({
        title: company,
    });
    const portal = getTextTemplate("shared.portal");
    const description = formatText("handlers.companyCategoryDescription", {
        company,
    });
    const allCompanies = getTextTemplate("handlers.allCompaniesCategory");

    const result = [
        `{{portal|${portal}}}`,
        "",
        description,
        "",
        defaultSort,
        ...parentCategories,
        `[[Category:${allCompanies}]]`,
    ].join("\n");
    return result;
}

/**
 * Handles prepare company category text.
 *
 * Builds editable category text after checking the optional parent
 * category.
 *
 * @param row - Company category review row.
 * @param row.company - Company page title.
 * @param api - MediaWiki API client.
 * @returns Prefilled category page text.
 */
export async function prepareCompanyCategoryText(
    row: any,
    api: any = new mw.Api(),
): Promise<string> {
    const result = buildCompanyCategoryText(
        row.company,
        await categoryExists(api, row.company),
    );
    return result;
}

/**
 * Creates a company category page.
 *
 * @param category - Category title without namespace.
 * @param text - Category page wikitext.
 * @param englishCategory - English Wikipedia category title.
 * @param options - Save and lookup clients.
 * @param options.api - MediaWiki API client.
 * @param options.fetchMetadata - Enwiki metadata fetcher.
 * @param options.onProgress - Operation progress callback.
 * @param options.wikidataApi - Wikidata API client.
 * @returns Resolves after the category is saved.
 */
export async function saveCompanyCategory(
    category: string,
    text: string,
    englishCategory: string = "",
    options: any = {},
): Promise<void> {
    const api = options.api || new mw.Api();
    const englishTitle = normalizeEnglishCategoryTitle(englishCategory);
    const metadata = await fetchCompanyCategoryMetadata(englishTitle, options);

    await saveCompanyCategoryPage({
        api,
        category,
        englishTitle,
        metadata,
        options,
        text,
    });
    const categoryTitle = `${CATEGORY_NAMESPACE}${category}`;

    await connectCompanyCategory(
        categoryTitle,
        englishTitle,
        metadata,
        options,
    );
    await addCompanyCategoryTalkBanner(categoryTitle, api, options);
}

/**
 * Fetches optional English-category metadata.
 *
 * @param englishTitle - English title value.
 * @param options - Operation options.
 * @returns Optional English-category metadata.
 */
async function fetchCompanyCategoryMetadata(
    englishTitle: string,
    options: {
        fetchMetadata: (title: string, options?: unknown) => Promise<unknown>;
    },
) {
    if (englishTitle === "") {
        return null;
    }

    const fetchMetadata = options.fetchMetadata || fetchEnwikiMetadata;
    const metadata = await fetchMetadata(englishTitle);

    return metadata;
}

/**
 * Saves the primary company-category page.
 *
 * @param context - Operation context.
 */
async function saveCompanyCategoryPage(context: {
    api: mw.Api;
    category: string;
    englishTitle: string;
    metadata: { pageExists: boolean; wikidataId: string };
    options: { onProgress?: (step: string, status: string) => void };
    text: string;
}): Promise<void> {
    try {
        await saveCategoryPage(
            context.category,
            context.text,
            buildCompanyCategorySummary(
                context.category,
                context.englishTitle,
                context.metadata,
            ),
            context.api,
        );
        context.options.onProgress?.("create", "complete");
    } catch (error) {
        context.options.onProgress?.("create", "failed");
        throw error;
    }
}

/**
 * Connects a category to Wikidata when English metadata exists.
 *
 * @param categoryTitle - Category title value.
 * @param englishTitle - English title value.
 * @param metadata - Article metadata.
 * @param options - Operation options.
 */
async function connectCompanyCategory(
    categoryTitle: string,
    englishTitle: string,
    metadata: { pageExists: boolean; wikidataId: string },
    options: {
        wikidataApi: mw.ForeignApi;
        onProgress: (arg0: string, arg1: string) => void;
    },
): Promise<void> {
    if (metadata == null || metadata.pageExists === false) {
        return;
    }
    const wikidataApi =
        options.wikidataApi ||
        new mw.ForeignApi("https://www.wikidata.org/w/api.php");

    try {
        options.onProgress?.("wikidata", "running");
        await saveCompanyCategorySitelink(
            wikidataApi,
            englishTitle,
            categoryTitle,
            metadata.wikidataId,
        );
        options.onProgress?.("wikidata", "complete");
    } catch (error) {
        options.onProgress?.("wikidata", "failed");
        throw error;
    }
}

/**
 * Creates or updates the category's Wikidata sitelink.
 *
 * @param api - MediaWiki API client.
 * @param english - English value.
 * @param category - Category value.
 * @param id - Id value.
 */
async function saveCompanyCategorySitelink(
    api: unknown,
    english: string,
    category: string,
    id: string,
) {
    if (String(id || "").trim() === "") {
        await createWikidataCategoryItem(api, english, category);
        return;
    }

    await connectWikidataSitelink(api, id, category);
}

/**
 * Adds the WikiProject banner to the category talk page.
 *
 * @param categoryTitle - Category title value.
 * @param api - MediaWiki API client.
 * @param options - Operation options.
 */
async function addCompanyCategoryTalkBanner(
    categoryTitle: string,
    api: unknown,
    options: { onProgress: (arg0: string, arg1: string) => void },
) {
    try {
        options.onProgress?.("talk-banner", "running");
        await addTalkPageBanner(api, categoryTitle);
        options.onProgress?.("talk-banner", "complete");
    } catch (error) {
        options.onProgress?.("talk-banner", "failed");
        throw error;
    }
}

/**
 * Builds the edit summary for creating a company category.
 *
 * @param category - Category title without namespace.
 * @param englishTitle - English Wikipedia category title.
 * @param metadata - English Wikipedia metadata.
 * @param metadata.wikidataId - Wikidata entity ID.
 * @returns Edit summary before the gadget suffix.
 */
function buildCompanyCategorySummary(
    category: string,
    englishTitle: string,
    metadata: any,
): string {
    const links = [
        buildEnwikiSummaryLink(englishTitle),
        buildWikidataSummaryLink(metadata?.wikidataId),
    ].filter(Boolean);
    if (links.length > 0) {
        return `see ${links.map((link) => `'${link}'`).join(" and ")}`;
    }

    return `create '${CATEGORY_NAMESPACE}${category}'`;
}

/**
 * Builds an English Wikipedia summary link.
 *
 * @param title - English Wikipedia page title.
 * @returns Summary link, or an empty string.
 */
function buildEnwikiSummaryLink(title: string): string {
    const value = String(title || "").trim();

    return value === "" ? "" : `[[:w:en:${value}]]`;
}

/**
 * Builds a Wikidata summary link.
 *
 * @param id - Wikidata entity ID.
 * @returns Summary link, or an empty string.
 */
function buildWikidataSummaryLink(id: string): string {
    const value = String(id || "").trim();

    return value === "" ? "" : `[[:d:${value}]]`;
}

/**
 * Handles create wikidata category item.
 *
 * Creates a Wikidata item linking matching English and Chinese
 * categories.
 *
 * @param api - Wikidata API client.
 * @param englishTitle - English Wikipedia category title.
 * @param chineseTitle - Chinese Wikipedia category title.
 * @returns Resolves after the item is created.
 */
export async function createWikidataCategoryItem(
    api: any,
    englishTitle: string,
    chineseTitle: string,
): Promise<void> {
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
 * @param category - Category title without namespace.
 * @param text - Category page wikitext.
 * @param summary - Edit summary before the gadget suffix.
 * @param api - MediaWiki API client.
 * @returns Resolves after the category is saved.
 */
export async function saveCategoryPage(
    category: string,
    text: string,
    summary: string = "",
    api: any = new mw.Api(),
): Promise<void> {
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
 * @param api - MediaWiki API client.
 * @param company - Company page title.
 * @returns Whether the category exists.
 */
async function categoryExists(api: any, company: string): Promise<boolean> {
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
 * @param title - User-entered English category name.
 * @returns Canonical English category title, or an empty
 * string.
 */
function normalizeEnglishCategoryTitle(title: string): string {
    const value = String(title || "").trim();

    if (value === "") {
        return "";
    }

    return /^Category:/iu.test(value) ? value : `Category:${value}`;
}
