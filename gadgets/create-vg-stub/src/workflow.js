/* eslint-disable */

/**
 * Coordinates form data, review handlers, and final wikitext.
 */

import { createArticleData as flushRawArticleData } from "./article/index.js";
import {
    buildCategoryRows,
    buildFallbackCategoryRows,
} from "./handlers/categories.js";
import {
    resolveNavboxTitles,
    resolveReviewedNavboxRows,
} from "./handlers/navboxes.js";
import { fetchSourceReferences } from "./sources/source-references.js";
import {
    buildDefaultSortKey,
    buildNavboxText,
    buildReviewedNavboxText,
    sortCategoryRowsByProse,
} from "./wikitext/index.js";
import { trimFieldValue } from "./shared/form-values.js";
import { buildArticleWikitext } from "./wikitext/article.js";
import { countGeneratedProseSinographs } from "./wikitext/prose-count.js";
import { buildSentence1Text } from "./wikitext/sentence.js";
import { formatText } from "./shared/text-templates.js";

/**
 * Builds normalized article data from raw form values.
 *
 * @param {object} form - Raw dialog form values.
 * @param {object} [options] - Article builder options.
 * @param {string} [options.defaultName] - Fallback article title.
 * @returns {object} Normalized article data.
 */
export function flushArticleData(form, options = {}) {
    const articleData = flushRawArticleData(form, options);

    return articleData;
}

/**
 * Builds final article wikitext from normalized article data.
 *
 * @param {object} articleData - Normalized article data.
 * @returns {string} Generated Chinese Wikipedia wikitext.
 */
export function buildStubText(articleData) {
    const wikitextData = prepareWikitextData(articleData);
    const text = buildArticleWikitext(wikitextData);

    return text;
}

/**
 * Builds final article text and processed data from a form.
 *
 * @param {object} form - Dialog form values.
 * @param {object} citationStore - Citation fetch/cache store.
 * @param {object} [options] - Article builder options.
 * @param {string} [options.defaultName] - Fallback article title.
 * @returns {Promise<object>} Generated text and article data.
 */
export async function buildStubFromForm(form, citationStore, options = {}) {
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
 * @param {object} form - Dialog form values.
 * @param {object} citationStore - Citation fetch/cache store.
 * @param {object} [options] - Article builder options.
 * @returns {Promise<string>} Generated article wikitext.
 */
export async function buildStubTextFromForm(
    form,
    citationStore,
    options = {},
) {
    return (await buildStubFromForm(form, citationStore, options)).text;
}

/**
 * Builds or resolves editable navbox review rows.
 *
 * @param {object} form - Dialog form values.
 * @param {boolean} rebuild - Whether to regenerate from the series field.
 * @returns {Promise<Array<object>>} Resolved navbox rows.
 */
export async function prepareNavboxRows(form, rebuild) {
    const shouldGenerate =
        rebuild ||
        !Array.isArray(form.navboxRows) ||
        (form.navboxRows.length === 0 && trimFieldValue(form.series) !== "");
    const titles = shouldGenerate
        ? await resolveNavboxTitles(form.series)
        : [];
    const values = shouldGenerate
        ? buildNavboxText(titles).split("\n").filter(Boolean)
        : form.navboxRows;

    return resolveReviewedNavboxRows(values);
}

/**
 * Sends article metadata through the category handler for interface review.
 *
 * @param {object} form - Current form values.
 * @param {Array<object>} previousRows - Existing reviewed category rows.
 * @param {object} [options] - Workflow options.
 * @param {object} [options.article] - Raw article-data options.
 * @param {object} [options.categories] - Category resolver options.
 * @returns {Promise<Array<object>>} Reviewed category rows.
 */
export async function prepareCategoryRows(
    form,
    previousRows = [],
    options = {},
) {
    const articleForm = {
        ...form,
        categoryRows: [],
    };
    const articleData = flushArticleData(articleForm, options.article || {});
    const rows = await buildCategoryRows(
        form,
        articleData,
        previousRows,
        options.categories || {},
    );

    return sortCategoryRowsByProse(rows, articleData.prose.text);
}

/**
 * Gets a live generated fragment for one preview group.
 *
 * @param {object} form - Dialog form values.
 * @param {string} key - Preview group key.
 * @param {object} [options] - Article builder options.
 * @returns {string} Preview wikitext, or an empty string.
 */
export function getArticleFieldPreview(form, key, options = {}) {
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
 * @param {object} form - Dialog form values.
 * @param {object} field - Dialog field definition.
 * @param {string} field.key - Form field key.
 * @param {object} [options] - Article builder options.
 * @param {string} [options.defaultName] - Fallback article title.
 * @returns {string|undefined} Placeholder text.
 */
export function getArticleFieldPlaceholder(form, field, options = {}) {
    if (field.key === "name") {
        return options.defaultName;
    }

    if (field.key === "wikidataId") {
        return trimFieldValue(form.enwikiTitle) === ""
            ? "Enter enwiki title first"
            : "No connected Wikidata item";
    }

    if (field.key !== "sortKey") {
        return undefined;
    }

    const normalized = flushArticleData(form, options).form;

    return buildDefaultSortKey({
        english: normalized.englishName,
        original: normalized.originalName,
        title: normalized.name,
    });
}

/**
 * Counts generated prose from current form values.
 *
 * @param {object} form - Dialog form values.
 * @param {object} [options] - Article builder options.
 * @returns {number} Hanzi-equivalent sinograph count.
 */
export function getFormProseSinographs(form, options = {}) {
    return countGeneratedProseSinographs(flushArticleData(form, options));
}

/**
 * Gets reviewed navbox text or generates it from the series field.
 *
 * @param {object} form - Dialog form values.
 * @returns {Promise<string>} Navbox wikitext.
 */
async function getFormNavboxText(form) {
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
 * @param {object} articleData - Normalized article data.
 * @returns {object} Wikitext-ready article data.
 */
function prepareWikitextData(articleData) {
    const categoryRows =
        articleData.categoryRows.length > 0
            ? articleData.categoryRows
            : buildFallbackCategoryRows(articleData);
    const result = {
        ...articleData,
        categoryRows,
    };

    return result;
}

/**
 * Builds combined generated prose for the attribution preview.
 *
 * @param {object} articleData - Normalized article data.
 * @returns {string} Attribution preview wikitext.
 */
function buildAttributionPreviewText(articleData) {
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
