/**
 * Builds NoteTA-lite conversion wikitext for video game stubs.
 */

import { buildTemplateText, type TemplateParam } from "../../../shared";

const SIMPLIFIED_MARKETS = ["hans", "cn"];
const HONG_KONG_MARKETS = ["hk"];
const TAIWAN_MARKETS = ["hant", "tw"];

/**
 * Builds a NoteTA-lite template.
 *
 * @param params - NoteTA parameters.
 * @param params.entries - User-editable NoteTA rows.
 * @param params.namesRemoved - Whether generated name
 * conversion
 * was removed.
 * @param params.officialNames - Official name rows.
 * @returns NoteTA-lite template wikitext.
 */
export function buildNoteTaText(params: any = {}): string {
    const manualEntries = normalizeNoteTaEntries(params.entries);
    const entries = getNoteTaEntries(manualEntries);
    const conversionText = getNoteTaConversionText(entries, params);

    const text = buildTemplateText(
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

    return text;
}

/** Gets manual NoteTA rows or the default group row. */
function getNoteTaEntries(manualEntries: Array<any>): Array<any> {
    let entries = [{ key: "G1", value: "Games" }];

    if (manualEntries.length > 0) {
        entries = manualEntries;
    }

    return entries;
}

/** Gets generated official-name conversion text when needed. */
function getNoteTaConversionText(entries, params): string | undefined {
    const suppressed =
        hasEditableNameConversionEntry(entries) ||
        params.namesRemoved === true;
    let text;

    if (!suppressed) {
        text = buildOfficialNameConversionText(params.officialNames);
    }

    return text;
}

/**
 * Handles has editable name conversion entry.
 *
 * Checks whether editable rows already include the generated name
 * conversion.
 *
 * @param entries - Normalized NoteTA rows.
 * @returns Whether name conversion has an editable row.
 *
 */
function hasEditableNameConversionEntry(entries: Array<any>): boolean {
    return entries.some(function callback(entry) {
        return entry.source === "names" || trimNoteTaText(entry.key) === "1";
    });
}

/**
 * Formats one NoteTA row as a template parameter tuple.
 *
 * @param entry - NoteTA row.
 * @returns Template parameter tuple.
 */
function formatNoteTaTemplateParam(entry: any): TemplateParam {
    const key = getTemplateParamKey(entry.key);
    const value =
        key == null ? escapeAnonymousParamValue(entry.value) : entry.value;

    return [key, value];
}

/**
 * Escapes equals signs in anonymous template parameters.
 *
 * @param value - Anonymous parameter value.
 * @returns Escaped parameter value.
 */
function escapeAnonymousParamValue(
    value: string | undefined,
): string | undefined {
    return value == null ? undefined : value.replace(/=/gu, "{{=}}");
}

/**
 * Normalizes user-editable NoteTA rows.
 *
 * @param entries - User-entered NoteTA rows.
 * @returns Normalized non-empty rows.
 */
function normalizeNoteTaEntries(entries: Array<any>): Array<any> {
    if (!Array.isArray(entries)) {
        return [];
    }

    return entries
        .map(function callback(entry) {
            return {
                key: trimNoteTaText(entry?.key),
                modified: entry?.modified === true,
                source: trimNoteTaText(entry?.source),
                value: trimNoteTaText(entry?.value),
            };
        })
        .filter((entry) => entry.key !== "" || entry.value !== "");
}

/**
 * Sorts named conversion groups before anonymous conversion rows.
 *
 * @param entries - NoteTA row objects.
 * @returns Sorted NoteTA row objects.
 */
export function sortNoteTaEntries(entries: Array<any>): Array<any> {
    return entries
        .map(function callback(entry, index) {
            return {
                ...entry,
                index,
            };
        })
        .sort(compareNoteTaEntries)
        .map(({ index: _index, ...entry }) => entry);
}

/**
 * Compares NoteTA rows by template source order.
 *
 * @param a - First NoteTA row.
 * @param b - Second NoteTA row.
 * @returns Sort order.
 */
function compareNoteTaEntries(a: any, b: any): number {
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
 * @param entry - NoteTA row.
 * @returns Sort rank.
 */
function getNoteTaEntryRank(entry: any): any {
    const key = trimNoteTaText(entry.key);
    const groupMatch = key.match(/^G([1-9]\d*)$/u);
    const numberMatch = key.match(/^[1-9]\d*$/u);

    if (key === "T") {
        return createNoteTaRank(0, 0);
    }

    if (groupMatch != null) {
        return createNoteTaRank(1, Number(groupMatch[1]));
    }

    if (numberMatch != null) {
        return createNoteTaRank(2, Number(key));
    }

    if (key === "") {
        return createNoteTaRank(3, entry.index);
    }

    return createNoteTaRank(4, entry.index);
}

/** Creates a sortable NoteTA row rank. */
function createNoteTaRank(group: number, number: number): any {
    return { group, number };
}

/**
 * Converts a row key to the template parameter key.
 *
 * @param key - User-entered row key.
 * @returns Template parameter key.
 */
function getTemplateParamKey(key: string | null): string | null {
    const text = trimNoteTaText(key);

    return text === "" ? null : text;
}

/**
 * Trims NoteTA row text.
 *
 * @param value - Raw row text.
 * @returns Trimmed text.
 */
function trimNoteTaText(value: any): string {
    return String(value || "").trim();
}

/**
 * Builds a Simplified/Traditional conversion rule from official names.
 *
 * @param rows - Official name rows.
 * @returns Conversion rule, if both variants exist.
 */
export function buildOfficialNameConversionText(
    rows: Array<any>,
): string | undefined {
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
 * @param region - Chinese variant region code.
 * @param value - Localized official name.
 * @returns Conversion entry.
 */
function buildConversionEntry(
    region: string,
    value: string | undefined,
): string | undefined {
    return value == null ? undefined : `zh-${region}:${value};`;
}

/**
 * Finds the first official name selected for any market in a group.
 *
 * @param rows - Official name rows.
 * @param markets - Market keys to match.
 * @returns Official name.
 */
function findOfficialName(
    rows: Array<any> = [],
    markets: Array<string>,
): string | undefined {
    return (
        rows.find((row) => hasAnyMarket(row, markets))?.name?.trim() ||
        undefined
    );
}

/**
 * Checks whether a localized name row targets any market in a group.
 *
 * @param row - Official name row.
 * @param row.markets - Selected market codes.
 * @param markets - Market keys to match.
 * @returns Whether any requested market is selected.
 */
function hasAnyMarket(row: any, markets: Array<string>): boolean {
    if (Array.isArray(row.markets)) {
        return markets.some((market) => row.markets.includes(market));
    }

    return markets.some((market) => row[market] === true);
}
