/* eslint-disable */

/**
 * Builds NoteTA-lite conversion wikitext for video game stubs.
 */

import { buildTemplateText } from "../shared/utils.js";

const SIMPLIFIED_MARKETS = ["hans", "cn"];
const HONG_KONG_MARKETS = ["hk"];
const TAIWAN_MARKETS = ["hant", "tw"];

/**
 * Builds a NoteTA-lite template.
 *
 * @param {object} params - NoteTA parameters.
 * @param {Array<object>} [params.entries] - User-editable NoteTA rows.
 * @param {boolean} [params.namesRemoved] - Whether generated name conversion was removed.
 * @param {Array<object>} [params.officialNames] - Official name rows.
 * @returns {string} NoteTA-lite template wikitext.
 */
export function buildNoteTaText(params = {}) {
    const manualEntries = normalizeNoteTaEntries(params.entries);
    const entries =
        manualEntries.length > 0
            ? manualEntries
            : [{ key: "G1", value: "Games" }];
    const conversionText =
        hasEditableNameConversionEntry(entries) || params.namesRemoved === true
            ? undefined
            : buildOfficialNameConversionText(params.officialNames);

    return buildTemplateText(
        "NoteTA-lite",
        sortNoteTaEntries([
            ...entries,
            {
                key: "1",
                value: conversionText,
            },
        ]).map(formatNoteTaTemplateParam),
        "block",
    );
}

/**
 * Checks whether editable rows already include the generated name conversion.
 *
 * @param {Array<object>} entries - Normalized NoteTA rows.
 * @returns {boolean} Whether name conversion has an editable row.
 */
function hasEditableNameConversionEntry(entries) {
    return entries.some(
        (entry) =>
            entry.source === "names" || trimNoteTaText(entry.key) === "1",
    );
}

/**
 * Formats one NoteTA row as a template parameter tuple.
 *
 * @param {object} entry - NoteTA row.
 * @returns {Array<string|null>} Template parameter tuple.
 */
function formatNoteTaTemplateParam(entry) {
    const key = getTemplateParamKey(entry.key);
    const value =
        key == null ? escapeAnonymousParamValue(entry.value) : entry.value;

    return [key, value];
}

/**
 * Escapes equals signs in anonymous template parameters.
 *
 * @param {string|undefined} value - Anonymous parameter value.
 * @returns {string|undefined} Escaped parameter value.
 */
function escapeAnonymousParamValue(value) {
    return value == null ? undefined : value.replace(/=/gu, "{{=}}");
}

/**
 * Normalizes user-editable NoteTA rows.
 *
 * @param {Array<object>} [entries] - User-entered NoteTA rows.
 * @returns {Array<object>} Normalized non-empty rows.
 */
function normalizeNoteTaEntries(entries) {
    if (!Array.isArray(entries)) {
        return [];
    }

    return entries
        .map((entry) => ({
            key: trimNoteTaText(entry?.key),
            modified: entry?.modified === true,
            source: trimNoteTaText(entry?.source),
            value: trimNoteTaText(entry?.value),
        }))
        .filter((entry) => entry.key !== "" || entry.value !== "");
}

/**
 * Sorts named conversion groups before anonymous conversion rows.
 *
 * @param {Array<object>} entries - NoteTA row objects.
 * @returns {Array<object>} Sorted NoteTA row objects.
 */
export function sortNoteTaEntries(entries) {
    return entries
        .map((entry, index) => ({
            ...entry,
            index,
        }))
        .sort(compareNoteTaEntries)
        .map(({ index: _index, ...entry }) => entry);
}

/**
 * Compares NoteTA rows by template source order.
 *
 * @param {object} a - First NoteTA row.
 * @param {object} b - Second NoteTA row.
 * @returns {number} Sort order.
 */
function compareNoteTaEntries(a, b) {
    const rankA = getNoteTaEntryRank(a);
    const rankB = getNoteTaEntryRank(b);

    return (
        rankA.group - rankB.group ||
        rankA.number - rankB.number ||
        a.index - b.index
    );
}

/**
 * Gets a sortable rank for one NoteTA row.
 *
 * @param {object} entry - NoteTA row.
 * @returns {object} Sort rank.
 */
function getNoteTaEntryRank(entry) {
    const key = trimNoteTaText(entry.key);
    const groupMatch = key.match(/^G([1-9]\d*)$/u);
    const numberMatch = key.match(/^[1-9]\d*$/u);

    if (key === "T") {
        return {
            group: 0,
            number: 0,
        };
    }

    if (groupMatch != null) {
        return {
            group: 1,
            number: Number(groupMatch[1]),
        };
    }

    if (numberMatch != null) {
        return {
            group: 2,
            number: Number(key),
        };
    }

    if (key === "") {
        return {
            group: 3,
            number: entry.index,
        };
    }

    return {
        group: 4,
        number: entry.index,
    };
}

/**
 * Converts a row key to the template parameter key.
 *
 * @param {string|null} key - User-entered row key.
 * @returns {string|null} Template parameter key.
 */
function getTemplateParamKey(key) {
    const text = trimNoteTaText(key);

    return text === "" ? null : text;
}

/**
 * Trims NoteTA row text.
 *
 * @param {*} value - Raw row text.
 * @returns {string} Trimmed text.
 */
function trimNoteTaText(value) {
    return String(value || "").trim();
}

/**
 * Builds a Simplified/Traditional conversion rule from official names.
 *
 * @param {Array<object>} [rows] - Official name rows.
 * @returns {string|undefined} Conversion rule, if both variants exist.
 */
export function buildOfficialNameConversionText(rows) {
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
