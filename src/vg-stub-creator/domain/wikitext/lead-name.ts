/**
 * Builds the lead article name for video game stubs.
 */

import { buildTemplateText } from "../../../shared";
import { formatText } from "./text-templates.ts";

const ITALIC_LANGUAGE_CODES = new Set(["en", "fr"]);

/**
 * Builds the lead article name text.
 *
 * @param params - Lead name parameters.
 * @param params.englishName - English game title.
 * @param params.name - Article title.
 * @param params.originalLanguage - Original title language
 * code.
 * @param params.originalName - Original game title.
 * @param params.sourceTags - Source reference tags keyed by
 * field.
 * @returns Lead name wikitext.
 */
export function buildLeadNameText(params: any): string {
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
 * @param params - Lead name parameters.
 * @param params.englishName - English game title.
 * @param params.originalLanguage - Original title language
 * code.
 * @param params.originalName - Original game title.
 * @param params.sourceTags - Source reference tags keyed by
 * field.
 * @returns Parenthesized title text, or an empty string.
 */
function buildVariantNameText(params: any): string {
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
 * @param variant - Variant title parameters.
 * @param variant.code - Language code.
 * @param variant.name - Variant title.
 * @param variant.ref - Source reference tag.
 * @returns Parenthesized variant title text.
 */
function buildVariantNameVariantText(variant: any): string {
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
 * @param language - Language code.
 * @param text - Localized title text.
 * @returns Langx template wikitext.
 */
function buildLangxTemplate(language: string, text: string): string {
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
 * @param language - Language code.
 * @returns Langx italic parameter, or an empty string.
 */
function buildLangxItalicParam(language: string): string {
    return ITALIC_LANGUAGE_CODES.has(language) ? "yes" : undefined;
}

/**
 * Checks whether a variant name duplicates the article's base title.
 *
 * @param variantName - Original or English title.
 * @param articleTitle - Article title.
 * @returns Whether the names are equivalent.
 */
function isSameBaseTitle(variantName: string, articleTitle: string): boolean {
    return (
        normalizeTitleForComparison(variantName) ===
        normalizeTitleForComparison(articleTitle)
    );
}

/**
 * Normalizes a title for duplicate-name comparisons.
 *
 * @param title - Title text.
 * @returns Normalized title.
 */
function normalizeTitleForComparison(title: string): string {
    return String(title || "")
        .trim()
        .replace(/ \(.+?\)$/u, "");
}
