/**
 * Describes the zhwiki-activation module.
 *
 * Builds and resolves English Wikipedia to zhwiki creation handoff
 * URLs.
 */

import { trimFieldValue } from "../shared/form-values.ts";

export const ZHWIKI_API_URL = "https://zh.wikipedia.org/w/api.php";
export const ZHWIKI_ORIGIN = "https://zh.wikipedia.org";
export const ZHWIKI_ACTIVATION_PARAM = "vg-stub-creator";
export const ZHWIKI_ENWIKI_TITLE_PARAM = "vg-stub-creator-enwiki-title";


/**
 * Removes English Wikipedia's generic video-game disambiguator.
 *
 * @param title - English Wikipedia page title.
 * @returns Base title for the zhwiki creation page.
 */
export function removeEnwikiVideoGameSuffix(title: string): string {
    return trimFieldValue(title).replace(/\s+\(video game\)$/iu, "");
}


/**
 * Handles build zhwiki creation title.
 *
 * Builds the fallback zhwiki article title from an English Wikipedia
 * title.
 *
 * @param enwikiTitle - English Wikipedia page title.
 * @returns zhwiki creation title.
 *
 */
export function buildZhwikiCreationTitle(enwikiTitle: string): string {
    return removeEnwikiVideoGameSuffix(enwikiTitle);
}


/**
 * Handles resolve zhwiki creation title.
 *
 * Resolves the zhwiki creation title, adding a Chinese disambiguator on
 * clash.
 *
 * @param enwikiTitle - English Wikipedia page title.
 * @param api - zhwiki MediaWiki API client.
 * @returns zhwiki creation title.
 *
 */
export async function resolveZhwikiCreationTitle(
    enwikiTitle: string,
    api: any,
): Promise<string> {
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
 * @param api - zhwiki MediaWiki API client.
 * @param title - zhwiki page title.
 * @returns Whether the page exists.
 */
export async function fetchZhwikiPageExists(
    api: any,
    title: string,
): Promise<boolean> {
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
 * @param enwikiTitle - English Wikipedia page title.
 * @param targetTitle - Resolved zhwiki target title.
 * @returns zhwiki edit URL.
 */
export function buildZhwikiCreationUrl(
    enwikiTitle: string,
    targetTitle?: string,
): string {
    const title =
        trimFieldValue(targetTitle) || buildZhwikiCreationTitle(enwikiTitle);
    const url = new URL(
        ["/wiki/", encodeURIComponent(title.replace(/ /gu, "_")), ""].join(""),
        ZHWIKI_ORIGIN,
    );

    url.searchParams.set("action", "edit");
    url.searchParams.set("redlink", "1");
    url.searchParams.set(ZHWIKI_ACTIVATION_PARAM, "1");
    url.searchParams.set(
        ZHWIKI_ENWIKI_TITLE_PARAM,
        trimFieldValue(enwikiTitle),
    );

    return url.toString();
}


/**
 * Reads zhwiki activation form values from a URL query string.
 *
 * @param search - URL query string or params.
 * @returns Initial form values, or null when not
 * activated.
 */
export function readZhwikiActivationForm(
    search: string | URLSearchParams,
): any | null {
    const params = selectValue(
        search instanceof URLSearchParams,
        function trueBranch() {
            return search;
        },
        function falseBranch() {
            return new URLSearchParams(String(search || ""));
        },
    );

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
