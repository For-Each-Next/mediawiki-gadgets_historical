/* eslint-disable */

/**
 * Fetches localized official game names from Steam citations.
 */

import { trimFieldValue } from "./form-values.js";

/**
 * Fetches Simplified and Traditional Chinese Steam names.
 *
 * @param {string} sourceUrl - Steam store app URL.
 * @param {object} citationStore - Citation fetch/cache store.
 * @returns {Promise<Array<object>>} Localized official name rows.
 */
export async function fetchSteamNameRows(sourceUrl, citationStore) {
    getSteamAppId(sourceUrl);
    const rows = await Promise.all(
        [
            {
                language: "schinese",
                markets: ["hans"],
            },
            {
                language: "tchinese",
                markets: ["hant"],
            },
        ].map((item) => fetchSteamNameRow(sourceUrl, item, citationStore)),
    );

    return rows.filter(Boolean);
}

/**
 * Fetches one localized Steam name through generated citation text.
 *
 * @param {string} sourceUrl - Steam store app URL.
 * @param {object} item - Steam language metadata.
 * @param {object} citationStore - Citation fetch/cache store.
 * @returns {Promise<object|undefined>} Localized official name row.
 */
async function fetchSteamNameRow(sourceUrl, item, citationStore) {
    const localizedUrl = buildSteamLocalizedSourceUrl(
        sourceUrl,
        item.language,
    );
    const citation = await citationStore.fetch(localizedUrl);
    const name = cleanSteamNameTitle(getTemplateParam(citation, "title"));

    if (name === "") {
        return undefined;
    }

    return {
        markets: item.markets,
        name,
        official: true,
        sourceUrl: localizedUrl,
    };
}

/**
 * Validates and extracts a Steam app ID.
 *
 * @param {string} sourceUrl - Steam store app URL.
 * @returns {string} Steam app ID.
 */
function getSteamAppId(sourceUrl) {
    const match = trimFieldValue(sourceUrl).match(/\/app\/(\d+)(?:[/?#]|$)/u);

    if (match == null) {
        throw new Error("Enter a Steam app URL.");
    }

    return match[1];
}

/**
 * Adds a Steam language query to a store URL.
 *
 * @param {string} sourceUrl - Steam store app URL.
 * @param {string} language - Steam language key.
 * @returns {string} Localized Steam store URL.
 */
function buildSteamLocalizedSourceUrl(sourceUrl, language) {
    const url = new URL(trimFieldValue(sourceUrl));

    url.searchParams.set("l", language);

    return url.toString();
}

/**
 * Gets a named template parameter from citation wikitext.
 *
 * @param {string} template - Citation template wikitext.
 * @param {string} key - Template parameter key.
 * @returns {string} Template parameter value.
 */
function getTemplateParam(template, key) {
    const pattern = new RegExp(
        `(?:^|\\|)\\s*${escapeRegExp(key)}\\s*=\\s*([^|}]*)`,
        "u",
    );
    const match = String(template).match(pattern);

    return trimFieldValue(match?.[1] || "");
}

/**
 * Escapes text for use inside a regular expression.
 *
 * @param {string} text - Raw text.
 * @returns {string} Escaped text.
 */
function escapeRegExp(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

/**
 * Cleans a Steam citation title into a displayed game name.
 *
 * @param {string} title - Citation title.
 * @returns {string} Game name.
 */
function cleanSteamNameTitle(title) {
    return trimFieldValue(title)
        .replace(/^Steam - /u, "")
        .replace(/^Steam 上的 /u, "")
        .replace(/ on Steam$/u, "");
}
