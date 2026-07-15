/**
 * Coordinates form data, review handlers, and final wikitext.
 */

import { createArticleData as flushRawArticleData } from "#stub/article";
import {
    buildCategoryRows,
    buildFallbackCategoryRows,
} from "#stub/handlers/categories.ts";
import {
    resolveNavboxTitles,
    resolveReviewedNavboxRows,
} from "#stub/handlers/navboxes.ts";
import { fetchSourceReferences } from "#stub/sources";
import {
    buildArticleWikitext,
    buildDefaultSortKey,
    buildNavboxText,
    buildReviewedNavboxText,
    buildSentence1Text,
    countGeneratedProseSinographs,
    formatText,
    sortCategoryRowsByProse,
} from "#stub/wiki";
import { trimFieldValue } from "#stub/local/form-values.ts";
import { msg } from "#stub/i18n";

/**
 * Builds normalized article data from raw form values.
 *
 * @param form - Raw dialog form values.
 * @param options - Article builder options.
 * @param options.defaultName - Fallback article title.
 * @returns Normalized article data.
 */
export function flushArticleData(form: any, options: any = {}): any {
    const articleData = flushRawArticleData(form, options);

    return articleData;
}

/**
 * Builds final article wikitext from normalized article data.
 *
 * @param articleData - Normalized article data.
 * @returns Generated Chinese Wikipedia wikitext.
 */
export function buildStubText(articleData: any): string {
    const wikitextData = prepareWikitextData(articleData);
    const text = buildArticleWikitext(wikitextData);

    return text;
}

/**
 * Builds final article text and processed data from a form.
 *
 * @param form - Dialog form values.
 * @param citationStore - Citation fetch/cache store.
 * @param options - Article builder options.
 * @param options.defaultName - Fallback article title.
 * @returns Generated text and article data.
 */
export async function buildStubFromForm(
    form: any,
    citationStore: any,
    options: any = {},
): Promise<any> {
    const [sourceReferences, navboxText] = await Promise.all([
        fetchSourceReferences(form, citationStore),
        getFormNavboxText(form),
    ]);
    const articleData = flushArticleData(
        {
            ...form,
            navboxText,
            sourceReferences,
        },
        options,
    );

    const result = {
        articleData,
        text: buildStubText(articleData),
    };

    return result;
}

/**
 * Builds final article text from a form.
 *
 * @param form - Dialog form values.
 * @param citationStore - Citation fetch/cache store.
 * @param options - Article builder options.
 * @returns Generated article wikitext.
 */
export async function buildStubTextFromForm(
    form: any,
    citationStore: any,
    options: any = {},
): Promise<string> {
    return (await buildStubFromForm(form, citationStore, options)).text;
}

/**
 * Builds or resolves editable navbox review rows.
 *
 * @param form - Dialog form values.
 * @param rebuild - Whether to regenerate from the series
 * field.
 * @returns Resolved navbox rows.
 */
export async function prepareNavboxRows(
    form: any,
    rebuild: boolean,
): Promise<Array<any>> {
    const shouldGenerate =
        rebuild ||
        !Array.isArray(form.navboxRows) ||
        (form.navboxRows.length === 0 && trimFieldValue(form.series) !== "");
    const titles = await selectValue(
        shouldGenerate,
        async function trueBranch() {
            return await resolveNavboxTitles(form.series);
        },
        async function falseBranch() {
            return [];
        },
    );
    const values = selectValue(
        shouldGenerate,
        function trueBranch() {
            return buildNavboxText(titles).split("\n").filter(Boolean);
        },
        function falseBranch() {
            return form.navboxRows;
        },
    );

    return resolveReviewedNavboxRows(values);
}

/**
 * Handles prepare category rows.
 *
 * Sends article metadata through the category handler for interface
 * review.
 *
 * @param form - Current form values.
 * @param previousRows - Existing reviewed category
 * rows.
 * @param options - Workflow options.
 * @param options.article - Raw article-data options.
 * @param options.categories - Category resolver options.
 * @returns Reviewed category rows.
 */
export async function prepareCategoryRows(
    form: any,
    previousRows: Array<any> = [],
    options: any = {},
): Promise<Array<any>> {
    const articleForm = {
        ...form,
        categoryRows: [],
    };
    const articleData = flushArticleData(articleForm, options.article || {});
    const rows = await buildCategoryRows(
        articleData,
        previousRows,
        options.categories || {},
    );

    return sortCategoryRowsByProse(rows, articleData.prose.text);
}

/**
 * Gets a live generated fragment for one preview group.
 *
 * @param form - Dialog form values.
 * @param key - Preview group key.
 * @param options - Article builder options.
 * @returns Preview wikitext, or an empty string.
 */
export function getArticleFieldPreview(
    form: any,
    key: string,
    options: any = {},
): string {
    try {
        const articleData = flushArticleData(form, options);

        if (key === "names") {
            return articleData.records.names.wikitext.leadName;
        }

        if (key === "score") {
            return articleData.prose.fragments.sentence3;
        }

        if (key === "attribution") {
            return buildAttributionPreviewText(articleData);
        }

        return "";
    } catch (_error) {
        return "";
    }
}

/**
 * Gets generated placeholder text for one form field.
 *
 * @param form - Dialog form values.
 * @param field - Dialog field definition.
 * @param field.key - Form field key.
 * @param options - Article builder options.
 * @param options.defaultName - Fallback article title.
 * @returns Placeholder text.
 */
export function getArticleFieldPlaceholder(
    form: any,
    field: any,
    options: any = {},
): string | undefined {
    if (field.key === "name") {
        return options.defaultName;
    }

    if (field.key === "wikidataId") {
        const result = selectValue(
            trimFieldValue(form.enwikiTitle) === "",
            function trueBranch() {
                return msg("metadata.enterEnwikiTitle");
            },
            function falseBranch() {
                return msg("metadata.noWikidataItem");
            },
        );
        return result;
    }

    if (field.key !== "sortKey") {
        return undefined;
    }

    const normalized = flushArticleData(form, options).form;

    const result = buildDefaultSortKey({
        english: normalized.englishName,
        original: normalized.originalName,
        title: normalized.name,
    });
    return result;
}

/**
 * Counts generated prose from current form values.
 *
 * @param form - Dialog form values.
 * @param options - Article builder options.
 * @returns Hanzi-equivalent sinograph count.
 */
export function getFormProseSinographs(form: any, options: any = {}): number {
    return countGeneratedProseSinographs(flushArticleData(form, options));
}

/**
 * Gets reviewed navbox text or generates it from the series field.
 *
 * @param form - Dialog form values.
 * @returns Navbox wikitext.
 */
async function getFormNavboxText(form: any): Promise<string> {
    if (!Array.isArray(form.navboxRows)) {
        const titles = await resolveNavboxTitles(form.series);
        const text = buildNavboxText(titles);

        return text;
    }

    return buildReviewedNavboxText(form.navboxRows);
}

/**
 * Supplies fallback review data before invoking pure wikitext builders.
 *
 * @param articleData - Normalized article data.
 * @returns Wikitext-ready article data.
 */
function prepareWikitextData(articleData: any): any {
    const categoryRows = selectValue(
        articleData.categoryRows.length > 0,
        function trueBranch() {
            return articleData.categoryRows;
        },
        function falseBranch() {
            return buildFallbackCategoryRows(articleData);
        },
    );
    const result = {
        ...articleData,
        categoryRows,
    };

    return result;
}

/**
 * Builds combined generated prose for the attribution preview.
 *
 * @param articleData - Normalized article data.
 * @returns Attribution preview wikitext.
 */
function buildAttributionPreviewText(articleData: any): string {
    const fragments = articleData.prose.fragments;
    const sentence1 = fragments.sentence1;

    if (sentence1.s1a.yearGenre === "") {
        return fragments.sentence2;
    }

    const sentence1a = formatText("prose.sentence1a", {
        titles: "……",
        yearGenre: sentence1.s1a.yearGenre,
    });
    const previewSentence1 = buildSentence1Text(sentence1a, sentence1.s1b);
    const preview = `${previewSentence1}${fragments.sentence2}`;

    return preview;
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
