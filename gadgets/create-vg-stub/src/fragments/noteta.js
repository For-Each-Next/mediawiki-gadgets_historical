/* eslint-disable */

/**
 * Builds NoteTA-lite conversion wikitext for video game stubs.
 */

import { buildTemplateText } from "../utils.js";

const SIMPLIFIED_MARKETS = ["hans", "cn"];
const HONG_KONG_MARKETS = ["hk"];
const TAIWAN_MARKETS = ["hant", "tw"];

/**
 * Builds a NoteTA-lite template.
 *
 * @param {object} params - NoteTA parameters.
 * @param {Array<object>} [params.officialNames] - Official name rows.
 * @returns {string} NoteTA-lite template wikitext.
 */
export function buildNoteTaText(params = {}) {
    return buildTemplateText(
        "NoteTA-lite",
        [
            ["G1", "Games"],
            [null, buildOfficialNameConversionText(params.officialNames)],
        ],
        "block",
    );
}

/**
 * Builds a Simplified/Traditional conversion rule from official names.
 *
 * @param {Array<object>} [rows] - Official name rows.
 * @returns {string|undefined} Conversion rule, if both variants exist.
 */
function buildOfficialNameConversionText(rows) {
    const simplifiedName = findOfficialName(rows, SIMPLIFIED_MARKETS);
    const hongKongName = findOfficialName(rows, HONG_KONG_MARKETS);
    const taiwanName = findOfficialName(rows, TAIWAN_MARKETS);

    if (
        simplifiedName == null ||
        (hongKongName == null && taiwanName == null)
    ) {
        return undefined;
    }

    return [
        buildConversionEntry("cn", simplifiedName),
        buildConversionEntry("hk", hongKongName),
        buildConversionEntry("tw", taiwanName),
    ]
        .filter(Boolean)
        .join(" ");
}

/**
 * Builds one NoteTA conversion entry.
 *
 * @param {string} region - Chinese variant region code.
 * @param {string|undefined} value - Localized official name.
 * @returns {string|undefined} Conversion entry.
 */
function buildConversionEntry(region, value) {
    return value == null ? undefined : `zh-${region}:${value};`;
}

/**
 * Finds the first official name selected for any market in a group.
 *
 * @param {Array<object>} rows - Official name rows.
 * @param {Array<string>} markets - Market keys to match.
 * @returns {string|undefined} Official name.
 */
function findOfficialName(rows = [], markets) {
    return (
        rows.find((row) => hasAnyMarket(row, markets))?.name?.trim() ||
        undefined
    );
}

/**
 * Checks whether a localized name row targets any market in a group.
 *
 * @param {object} row - Official name row.
 * @param {Array<string>} [row.markets] - Selected market codes.
 * @param {Array<string>} markets - Market keys to match.
 * @returns {boolean} Whether any requested market is selected.
 */
function hasAnyMarket(row, markets) {
    if (Array.isArray(row.markets)) {
        return markets.some((market) => row.markets.includes(market));
    }

    return markets.some((market) => row[market] === true);
}
