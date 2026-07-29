/**
 * Normalizes external article identifiers and builds lookup links.
 */

import { msg } from "#gadget/i18n/index.ts";
import * as wikitext from "#shared/wikitext";

const { trimValue } = wikitext;

/**
 * Removes a trailing parenthesized disambiguator from a page title.
 *
 * @param title - Page title.
 * @returns Base page title.
 */
export function getBasePageTitle(title: string): string {
    return trimValue(title).replace(/ \(.+?\)$/u, "");
}

/**
 * Creates blank external identifiers for the Enwiki lookup tip.
 *
 * @returns Blank identifier values.
 */
export function createBlankEnwikiMetadata(): any {
    return {
        metacriticId: "",
        openCriticId: "",
        pageExists: null,
        steamId: "",
    };
}

/**
 * Formats the Enwiki-to-Wikidata lookup outcome.
 *
 * @param pageExists - Whether the English Wikipedia page exists.
 * @returns Lookup status text.
 */
export function getWikidataLookupStatus(pageExists: boolean | null): string {
    if (pageExists === false) {
        return msg("metadata.noEnwikiPage");
    }

    if (pageExists === true) {
        return msg("metadata.notConnected");
    }

    return msg("metadata.lookupFailed");
}

/**
 * Creates fixed Enwiki tip slots with a shared placeholder value.
 *
 * @param value - Placeholder text.
 * @returns Tip slot definitions.
 */
export function createEnwikiTipPlaceholders(value: string): Array<any> {
    return ["Wikidata", "Metacritic", "OpenCritic", "Steam"].map(
        function createPlaceholder(label) {
            return {
                label,
                value,
                url: "",
            };
        },
    );
}

/**
 * Normalizes an English Wikipedia field value.
 *
 * @param value - Raw field value.
 * @returns Normalized title or trimmed value.
 */
export function normalizeEnwikiTitleValue(value: any): string {
    return extractEnwikiTitleFromUrl(value) || trimValue(value);
}

/**
 * Extracts an English Wikipedia title from a pasted URL.
 *
 * @param value - Raw pasted value.
 * @returns English Wikipedia page title, or an empty string.
 */
export function extractEnwikiTitleFromUrl(value: any): string {
    const text = trimValue(value);

    if (text === "") {
        return "";
    }

    try {
        const url = new URL(text);
        const host = url.hostname.toLowerCase();

        if (host !== "en.wikipedia.org" && host !== "en.m.wikipedia.org") {
            return "";
        }

        const prefix = "/wiki/";

        if (!url.pathname.startsWith(prefix)) {
            return "";
        }

        return decodeURIComponent(url.pathname.slice(prefix.length))
            .replace(/_/gu, " ")
            .trim();
    } catch (_error) {
        return "";
    }
}

/**
 * Builds a Google site search for a Wikidata item.
 *
 * @param title - Page title without a disambiguation suffix.
 * @returns Search URL.
 */
export function buildWikidataSearchUrl(title: string): string {
    return buildGoogleSiteSearchUrl(title, "wikidata.org/wiki");
}

/**
 * Builds a Metacritic game URL.
 *
 * @param id - Metacritic game ID.
 * @returns Game URL.
 */
export function buildMetacriticUrl(id: string): string {
    return `https://www.metacritic.com/game/${encodeURIComponent(id)}/`;
}

/**
 * Builds a Google site search for a Metacritic game page.
 *
 * @param title - Game title without a disambiguation suffix.
 * @returns Search URL.
 */
export function buildMetacriticSearchUrl(title: string): string {
    const query = `"${getBasePageTitle(title)}" site:metacritic.com`;
    return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

/**
 * Builds an OpenCritic game URL.
 *
 * @param id - OpenCritic game ID.
 * @returns Game URL.
 */
export function buildOpenCriticUrl(id: string): string {
    return `https://opencritic.com/game/${encodeURIComponent(id)}/-`;
}

/**
 * Builds a Google site search for an OpenCritic game page.
 *
 * @param title - Game title without a disambiguation suffix.
 * @returns Search URL.
 */
export function buildOpenCriticSearchUrl(title: string): string {
    return buildGoogleSiteSearchUrl(title, "opencritic.com/game");
}

/**
 * Builds a Steam store application URL.
 *
 * @param id - Steam application ID.
 * @returns Store URL.
 */
export function buildSteamUrl(id: string): string {
    return `https://store.steampowered.com/app/${encodeURIComponent(id)}/`;
}

/**
 * Builds a Google site search for a Steam application page.
 *
 * @param title - Game title without a disambiguation suffix.
 * @returns Search URL.
 */
export function buildSteamSearchUrl(title: string): string {
    return buildGoogleSiteSearchUrl(title, "store.steampowered.com/app");
}

/**
 * Builds a Google site search URL.
 *
 * @param title - Page title without a disambiguation suffix.
 * @param site - Site or path restriction.
 * @returns Search URL.
 */
export function buildGoogleSiteSearchUrl(title: string, site: string): string {
    const query = `"${getBasePageTitle(title)}" site:${site}`;
    return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}
