/* eslint-disable */

/**
 * Builds the lead article name for video game stubs.
 */

import { buildTemplateText } from "../shared/utils.js";
import { formatText } from "../shared/text-templates.js";

const ITALIC_LANGUAGE_CODES = new Set(["en", "fr"]);

/**
 * Builds the lead article name text.
 *
 * @param {object} params - Lead name parameters.
 * @param {string} params.englishName - English game title.
 * @param {string} params.name - Article title.
 * @param {string} params.originalLanguage - Original title language code.
 * @param {string} params.originalName - Original game title.
 * @param {object} params.sourceTags - Source reference tags keyed by field.
 * @returns {string} Lead name wikitext.
 */
export function buildLeadNameText(params) {
    const values = {
        foreignTitle: buildVariantNameText(params),
        name: params.name,
    };
    const text = formatText("prose.titles", values);

    return text;
}

/**
 * Builds parenthesized original or English title text.
 *
 * @param {object} params - Lead name parameters.
 * @param {string} params.englishName - English game title.
 * @param {string} params.originalLanguage - Original title language code.
 * @param {string} params.originalName - Original game title.
 * @param {object} params.sourceTags - Source reference tags keyed by field.
 * @returns {string} Parenthesized title text, or an empty string.
 */
function buildVariantNameText(params) {
    if (params.originalName !== "") {
        if (isSameBaseTitle(params.originalName, params.name)) {
            return "";
        }

        return buildVariantNameVariantText({
            code: params.originalLanguage,
            name: params.originalName,
            ref: params.sourceTags.originalName || "",
        });
    }

    if (params.englishName !== "") {
        if (isSameBaseTitle(params.englishName, params.name)) {
            return "";
        }

        return buildVariantNameVariantText({
            code: "en",
            name: params.englishName,
            ref: params.sourceTags.englishName || "",
        });
    }

    return "";
}

/**
 * Builds parenthesized variant title text.
 *
 * @param {object} variant - Variant title parameters.
 * @param {string} variant.code - Language code.
 * @param {string} variant.name - Variant title.
 * @param {string} variant.ref - Source reference tag.
 * @returns {string} Parenthesized variant title text.
 */
function buildVariantNameVariantText(variant) {
    const values = {
        sourceTag: variant.ref,
        title: buildLangxTemplate(variant.code, variant.name),
    };
    const text = formatText("prose.foreignTitle", values);

    return text;
}

/**
 * Builds a langx template call.
 *
 * @param {string} language - Language code.
 * @param {string} text - Localized title text.
 * @returns {string} Langx template wikitext.
 */
function buildLangxTemplate(language, text) {
    return buildTemplateText("langx", [
        [1, language],
        [2, text],
        ["italic", buildLangxItalicParam(language)],
        ["label", "none"],
    ]);
}

/**
 * Builds the langx italic parameter for selected languages.
 *
 * @param {string} language - Language code.
 * @returns {string} Langx italic parameter, or an empty string.
 */
function buildLangxItalicParam(language) {
    return ITALIC_LANGUAGE_CODES.has(language) ? "yes" : undefined;
}

/**
 * Checks whether a variant name duplicates the article's base title.
 *
 * @param {string} variantName - Original or English title.
 * @param {string} articleTitle - Article title.
 * @returns {boolean} Whether the names are equivalent.
 */
function isSameBaseTitle(variantName, articleTitle) {
    return (
        normalizeTitleForComparison(variantName) ===
        normalizeTitleForComparison(articleTitle)
    );
}

/**
 * Normalizes a title for duplicate-name comparisons.
 *
 * @param {string} title - Title text.
 * @returns {string} Normalized title.
 */
function normalizeTitleForComparison(title) {
    return String(title || "")
        .trim()
        .replace(/ \(.+?\)$/u, "");
}
