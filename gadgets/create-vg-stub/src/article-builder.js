/* eslint-disable */

/**
 * Builds article data, previews, navboxes, and final wikitext.
 */

import { createArticleData } from "./article/index.js";
import { fetchSourceReferences } from "./source-references.js";
import {
    buildDefaultSortKey,
    buildNavboxText,
    buildReviewedNavboxText,
    resolveReviewedNavboxRows,
} from "./fragments/index.js";
import { trimFieldValue } from "./form-values.js";
import { countGeneratedProseSinographs } from "./prose-count.js";
import { buildArticleWikitext } from "./wikitext.js";

/**
 * Builds normalized article data from raw form values.
 *
 * @param {object} form - Raw dialog form values.
 * @param {object} [options] - Article builder options.
 * @param {string} [options.defaultName] - Fallback article title.
 * @returns {object} Normalized article hub output.
 */
export function createArticleParams(form, options = {}) {
    return createArticleData(form, options);
}

/**
 * Builds final article wikitext from normalized article data.
 *
 * @param {object} params - Normalized article hub output.
 * @returns {string} Generated Chinese Wikipedia wikitext.
 */
export function buildStubText(params) {
    return buildArticleWikitext(params);
}

/**
 * Builds final article text and hub data from a form.
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
    const params = createArticleParams(
        {
            ...form,
            navboxText,
            sourceReferences,
        },
        options,
    );

    return {
        params,
        text: buildStubText(params),
    };
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
    const values =
        rebuild || !Array.isArray(form.navboxRows)
            ? (await buildNavboxText(form.series)).split("\n").filter(Boolean)
            : form.navboxRows;

    return resolveReviewedNavboxRows(values);
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
        const params = createArticleParams(form, options);

        if (key === "names") {
            return params.parts.names.wikitext.leadName;
        }

        if (key === "score") {
            return params.prose.fragments.scores;
        }

        if (key === "attribution") {
            return buildAttributionPreviewText(params);
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

    const normalized = createArticleParams(form, options).form;

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
    return countGeneratedProseSinographs(createArticleParams(form, options));
}

/**
 * Gets reviewed navbox text or generates it from the series field.
 *
 * @param {object} form - Dialog form values.
 * @returns {Promise<string>} Navbox wikitext.
 */
async function getFormNavboxText(form) {
    if (!Array.isArray(form.navboxRows)) {
        return buildNavboxText(form.series);
    }

    return buildReviewedNavboxText(form.navboxRows);
}

/**
 * Builds combined generated prose for the attribution preview.
 *
 * @param {object} params - Normalized article data.
 * @returns {string} Attribution preview wikitext.
 */
function buildAttributionPreviewText(params) {
    const fragments = params.prose.fragments;
    const introText = `${fragments.yearGenre}${fragments.companies}`;

    if (introText === "") {
        return fragments.platformSeries;
    }

    return `……是${introText}。${fragments.platformSeries}`;
}
