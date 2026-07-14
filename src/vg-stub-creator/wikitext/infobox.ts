/**
 * Builds video game infobox wikitext.
 */

import { buildTemplateText } from "../shared/utils.ts";

const NAME_MARKETS = ["ww", "hans", "hant", "cn", "tw", "hk"];


/**
 * Builds an Infobox VG template.
 *
 * @param params - Infobox parameters.
 * @param params.name - Article title.
 * @param params.englishName - English title.
 * @param params.japaneseName - Japanese title.
 * @param params.originalLanguage - Original title language
 * code.
 * @param params.originalName - Original title.
 * @param params.officialNames - Official name rows.
 * @param params.commonNames - Common name rows.
 * @returns Infobox template wikitext.
 */
export function buildInfoboxText(params: any): string {
    return buildTemplateText(
        "Infobox VG",
        [
            ["onlysourced", "no"],
            ["title", normalizeValue(params.name)],
            ["original", buildOriginalNameText(params)],
            ["japanese", buildJapaneseNameText(params)],
            ["english", buildEnglishNameText(params)],
            ["official", buildVgnText(params.officialNames)],
            ["common", buildVgnText(params.commonNames)],
        ],
        "block",
    );
}


/**
 * Builds the original title parameter for non-Japanese original names.
 *
 * @param params - Infobox parameters.
 * @param params.originalLanguage - Original title language
 * code.
 * @param params.originalName - Original title.
 * @returns Original title parameter.
 */
function buildOriginalNameText(params: any): string | undefined {
    const language = normalizeValue(params.originalLanguage);
    const name = normalizeValue(params.originalName);

    if (
        name == null ||
        language == null ||
        language === "ja" ||
        isSameBaseTitle(name, params.name)
    ) {
        return undefined;
    }

    return `${language}:${name}`;
}


/**
 * Builds the Japanese title parameter.
 *
 * @param params - Infobox parameters.
 * @param params.japaneseName - Japanese title.
 * @param params.originalLanguage - Original title language
 * code.
 * @param params.originalName - Original title.
 * @returns Japanese title parameter.
 */
function buildJapaneseNameText(params: any): string | undefined {
    const japaneseName = normalizeValue(params.japaneseName);

    if (japaneseName != null) {
        if (isSameBaseTitle(japaneseName, params.name)) {
            return undefined;
        }

        return japaneseName;
    }

    if (normalizeValue(params.originalLanguage) !== "ja") {
        return undefined;
    }

    const originalName = normalizeValue(params.originalName);

    return selectValue(
        isSameBaseTitle(originalName, params.name),
        function trueBranch() {
            return undefined;
        },
        function falseBranch() {
            return originalName;
        },
    );
}


/**
 * Builds the English title parameter.
 *
 * @param params - Infobox parameters.
 * @param params.englishName - English title.
 * @param params.name - Article title.
 * @returns English title parameter.
 */
function buildEnglishNameText(params: any): string | undefined {
    const englishName = normalizeValue(params.englishName);

    return isSameBaseTitle(englishName, params.name) ? undefined : englishName;
}


/**
 * Builds a vgn template from localized name rows.
 *
 * @param rows - Localized name rows.
 * @returns vgn template wikitext.
 */
function buildVgnText(rows: Array<any>): string | undefined {
    const entries = (rows || []).flatMap(buildVgnEntries);

    if (entries.length === 0) {
        return undefined;
    }

    return buildTemplateText(
        "vgn",
        entries.map((entry) => [1, entry]),
    );
}


/**
 * Builds vgn entries for one localized name row.
 *
 * @param row - Localized name row.
 * @param row.name - Localized name.
 * @param row.markets - Selected market codes.
 * @param row.ref - Reference tag appended to each name.
 * @returns vgn entries.
 */
function buildVgnEntries(row: any): Array<string> {
    const name = normalizeValue(row.name);

    if (name == null) {
        return [];
    }

    const ref = normalizeValue(row.ref) || "";
    const markets = getSelectedMarkets(row);

    if (markets.length === 0) {
        return [`${name}${ref}`];
    }

    return markets.map((market) => `${market}:${name}${ref}`);
}


/**
 * Gets selected market codes for one localized name row.
 *
 * @param row - Localized name row.
 * @param row.markets - Selected market codes.
 * @returns Selected market codes.
 */
function getSelectedMarkets(row: any): Array<string> {
    if (Array.isArray(row.markets)) {
        return NAME_MARKETS.filter((market) => row.markets.includes(market));
    }

    return NAME_MARKETS.filter((market) => row[market] === true);
}


/**
 * Normalizes a user-entered string.
 *
 * @param value - Raw value.
 * @returns Trimmed value, or undefined when empty.
 */
function normalizeValue(value: string): string | undefined {
    if (value == null) {
        return undefined;
    }

    const trimmedValue = String(value).trim();

    return trimmedValue === "" ? undefined : trimmedValue;
}


/**
 * Checks whether a title value duplicates the article's base title.
 *
 * @param value - Title value.
 * @param articleTitle - Article title.
 * @returns Whether the titles are equivalent.
 */
function isSameBaseTitle(value: string, articleTitle: string): boolean {
    if (value == null) {
        return false;
    }

    return (
        normalizeTitleForComparison(value) ===
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
