/* eslint-disable */

/**
 * Builds and resolves English Wikipedia to zhwiki creation handoff URLs.
 */

import { trimFieldValue } from "../shared/form-values.js";

export const ZHWIKI_API_URL = "https://zh.wikipedia.org/w/api.php";
export const ZHWIKI_ORIGIN = "https://zh.wikipedia.org";
export const ZHWIKI_ACTIVATION_PARAM = "create-vg-stub";
export const ZHWIKI_ENWIKI_TITLE_PARAM = "create-vg-stub-enwiki-title";

/**
 * Removes English Wikipedia's generic video-game disambiguator.
 *
 * @param {string} title - English Wikipedia page title.
 * @returns {string} Base title for the zhwiki creation page.
 */
export function removeEnwikiVideoGameSuffix(title) {
    return trimFieldValue(title).replace(/\s+\(video game\)$/iu, "");
}

/**
 * Builds the fallback zhwiki article title from an English Wikipedia title.
 *
 * @param {string} enwikiTitle - English Wikipedia page title.
 * @returns {string} zhwiki creation title.
 */
export function buildZhwikiCreationTitle(enwikiTitle) {
    return removeEnwikiVideoGameSuffix(enwikiTitle);
}

/**
 * Resolves the zhwiki creation title, adding a Chinese disambiguator on clash.
 *
 * @param {string} enwikiTitle - English Wikipedia page title.
 * @param {object} api - zhwiki MediaWiki API client.
 * @returns {Promise<string>} zhwiki creation title.
 */
export async function resolveZhwikiCreationTitle(enwikiTitle, api) {
    const baseTitle = buildZhwikiCreationTitle(enwikiTitle);

    if (baseTitle === "") {
        return "";
    }

    if (await fetchZhwikiPageExists(api, baseTitle)) {
        return `${baseTitle} (遊戲)`;
    }

    return baseTitle;
}

/**
 * Checks whether a zhwiki article exists.
 *
 * @param {object} api - zhwiki MediaWiki API client.
 * @param {string} title - zhwiki page title.
 * @returns {Promise<boolean>} Whether the page exists.
 */
export async function fetchZhwikiPageExists(api, title) {
    const response = await api.get({
        action: "query",
        formatversion: "2",
        titles: title,
    });
    const pages = response?.query?.pages || [];
    const page = Array.isArray(pages) ? pages[0] : Object.values(pages)[0];

    return page != null && page.missing == null && page.invalid == null;
}

/**
 * Builds the zhwiki edit URL that opens the creation gadget.
 *
 * @param {string} enwikiTitle - English Wikipedia page title.
 * @param {string} [targetTitle] - Resolved zhwiki target title.
 * @returns {string} zhwiki edit URL.
 */
export function buildZhwikiCreationUrl(enwikiTitle, targetTitle) {
    const title = trimFieldValue(targetTitle) || buildZhwikiCreationTitle(enwikiTitle);
    const url = new URL(
        `/wiki/${encodeURIComponent(title.replace(/ /gu, "_"))}`,
        ZHWIKI_ORIGIN,
    );

    url.searchParams.set("action", "edit");
    url.searchParams.set("redlink", "1");
    url.searchParams.set(ZHWIKI_ACTIVATION_PARAM, "1");
    url.searchParams.set(ZHWIKI_ENWIKI_TITLE_PARAM, trimFieldValue(enwikiTitle));

    return url.toString();
}

/**
 * Reads zhwiki activation form values from a URL query string.
 *
 * @param {string|URLSearchParams} search - URL query string or params.
 * @returns {object|null} Initial form values, or null when not activated.
 */
export function readZhwikiActivationForm(search) {
    const params =
        search instanceof URLSearchParams
            ? search
            : new URLSearchParams(String(search || ""));

    if (params.get(ZHWIKI_ACTIVATION_PARAM) !== "1") {
        return null;
    }

    const enwikiTitle = trimFieldValue(
        params.get(ZHWIKI_ENWIKI_TITLE_PARAM) || "",
    );

    if (enwikiTitle === "") {
        return null;
    }

    return {
        enwikiTitle,
    };
}
