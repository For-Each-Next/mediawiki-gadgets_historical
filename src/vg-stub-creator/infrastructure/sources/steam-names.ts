/**
 * Fetches localized official game names from Steam citations.
 */

import { trimFieldValue } from "../../shared/form-values.ts";

/**
 * Fetches localized Steam names.
 *
 * @param sourceUrl - Steam store app URL.
 * @param citationStore - Citation fetch/cache store.
 * @param options - Fetch options.
 * @param options.includeJapanese - Whether to fetch
 * Japanese.
 * @returns Localized official name rows.
 */
export async function fetchSteamNameRows(
    sourceUrl: string,
    citationStore: any,
    options: any = {},
): Promise<Array<any>> {
    getSteamAppId(sourceUrl);
    const languages = buildSteamLanguages(options.includeJapanese === true);
    const rows = await Promise.all(
        languages.map(function callback(item) {
            return fetchSteamNameRow(sourceUrl, item, citationStore);
        }),
    );

    return rows.filter(Boolean);
}

/** Builds the Steam language requests for a lookup. */
function buildSteamLanguages(includeJapanese: boolean): Record<string, any>[] {
    const languages: Record<string, any>[] = [
        {
            label: "Simplified",
            language: "schinese",
            markets: ["hans"],
        },
        {
            label: "Traditional",
            language: "tchinese",
            markets: ["hant"],
        },
    ];

    if (includeJapanese) {
        languages.push({
            label: "Japanese",
            language: "japanese",
            markets: [],
            previewOnly: true,
        });
    }

    return languages;
}

/**
 * Fetches one localized Steam name through generated citation text.
 *
 * @param sourceUrl - Steam store app URL.
 * @param item - Steam language metadata.
 * @param citationStore - Citation fetch/cache store.
 * @returns Localized official name row.
 */
async function fetchSteamNameRow(
    sourceUrl: string,
    item: any,
    citationStore: any,
): Promise<any | undefined> {
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
        label: item.label,
        markets: item.markets,
        name,
        official: true,
        previewOnly: Boolean(item.previewOnly),
        sourceUrl: localizedUrl,
    };
}

/**
 * Validates and extracts a Steam app ID.
 *
 * @param sourceUrl - Steam store app URL.
 * @returns Steam app ID.
 */
function getSteamAppId(sourceUrl: string): string {
    const match = trimFieldValue(sourceUrl).match(/\/app\/(\d+)(?:[/?#]|$)/u);

    if (match == null) {
        throw new Error("Enter a Steam app URL.");
    }

    return match[1];
}

/**
 * Adds a Steam language query to a store URL.
 *
 * @param sourceUrl - Steam store app URL.
 * @param language - Steam language key.
 * @returns Localized Steam store URL.
 */
function buildSteamLocalizedSourceUrl(
    sourceUrl: string,
    language: string,
): string {
    const url = new URL(trimFieldValue(sourceUrl));

    url.searchParams.set("l", language);

    return url.toString();
}

/**
 * Gets a named template parameter from citation wikitext.
 *
 * @param template - Citation template wikitext.
 * @param key - Template parameter key.
 * @returns Template parameter value.
 */
function getTemplateParam(template: string, key: string): string {
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
 * @param text - Raw text.
 * @returns Escaped text.
 */
function escapeRegExp(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

/**
 * Cleans a Steam citation title into a displayed game name.
 *
 * @param title - Citation title.
 * @returns Game name.
 */
function cleanSteamNameTitle(title: string): string {
    return trimFieldValue(title)
        .replace(/^Steam - /u, "")
        .replace(/^Steam 上的 /u, "")
        .replace(/ on Steam$/u, "");
}
