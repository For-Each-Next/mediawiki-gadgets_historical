/**
 * Performs MediaWiki write operations for the pre-save workflow.
 */

import { addEditSummarySuffix } from "#gadget/infra/editing/summary.ts";
import { wikitext } from "#shared/citation";

const { buildTemplateCall, buildTemplateText } = wikitext;
const videoGamesBanner = buildTemplateCall("WikiProject Video games");

export const TALK_PAGE_BANNER = buildTemplateText(
    "WikiProject banner shell",
    [
        ["class", "stub"],
        ["1", videoGamesBanner],
    ],
    "block",
);

const unassessedBannerParams: Parameters<typeof buildTemplateText>[1] = [
    ["class", "unassessed"],
    ["1", buildTemplateCall("WikiProject Video games")],
];
const UNASSESSED_TALK_PAGE_BANNER = buildTemplateText(
    "WikiProject banner shell",
    unassessedBannerParams,
    "block",
);

/**
 * Moves an article before follow-up writes.
 *
 * @param api - MediaWiki API client.
 * @param from - Current page title.
 * @param to - Destination page title.
 * @param options - Move options.
 * @returns Resolves after the page is moved.
 */
export async function movePage(
    api: any,
    from: string,
    to: string,
    options: { leaveRedirect?: boolean },
): Promise<void> {
    const params: Record<string, any> = {
        action: "move",
        from,
        reason: addEditSummarySuffix(`Rename to [[${to}]]`),
        to,
    };

    if (!options.leaveRedirect) {
        params.noredirect = true;
    }

    await api.postWithToken("csrf", params);
}

/**
 * Saves a staged page edit.
 *
 * @param api - MediaWiki API client.
 * @param action - Page edit action.
 * @returns Resolves after the page is saved.
 */
export async function savePageEdit(api: any, action: any): Promise<void> {
    const params: Record<string, any> = {
        action: "edit",
        summary: addEditSummarySuffix(action.summary),
        text: action.text,
        title: action.title,
    };

    if (action.create) {
        params.createonly = true;
    }

    await api.postWithToken("csrf", params);
}

/**
 * Connects the saved Chinese Wikipedia page to a Wikidata item.
 *
 * @param api - Wikidata API client.
 * @param wikidataId - Wikidata entity ID.
 * @param title - Chinese Wikipedia article title.
 * @returns Resolves after the sitelink is saved.
 */
export async function connectWikidataSitelink(
    api: any,
    wikidataId: string,
    title: string,
): Promise<void> {
    const params = {
        action: "wbsetsitelink",
        id: wikidataId,
        linksite: "zhwiki",
        linktitle: title,
        summary: addEditSummarySuffix(`see '[[w:zh:${title}]]'`),
    };

    await api.postWithToken("csrf", params);
}

/**
 * Creates one redirect without overwriting an existing page.
 *
 * @param api - MediaWiki API client.
 * @param redirectTitle - Redirect page title.
 * @param targetTitle - Redirect target.
 * @returns Resolves after the redirect is created.
 */
export async function createRedirect(
    api: any,
    redirectTitle: string,
    targetTitle: string,
): Promise<void> {
    const params = {
        action: "edit",
        createonly: true,
        summary: addEditSummarySuffix(
            `redirect "${redirectTitle}" to "[[${targetTitle}]]"`,
        ),
        text: `#REDIRECT [[${targetTitle}]]`,
        title: redirectTitle,
    };

    await api.postWithToken("csrf", params);
}

/**
 * Adds the video game project banner when it is not already present.
 *
 * @param api - MediaWiki API client.
 * @param articleTitle - Article title.
 * @returns Resolves after the talk page is updated.
 */
export async function addTalkPageBanner(
    api: any,
    articleTitle: string,
): Promise<void> {
    const title = getTalkPageTitle(articleTitle);
    const banner = getTalkPageBanner(articleTitle);
    const text = await fetchTalkPageText(api, title);

    if (/WikiProject\s+Video games/iu.test(text)) {
        return;
    }

    const joinedText = [
        "tagging the {{[[Template:WikiProje",
        "ct Video games|WikiProject Video g",
        "ames]]}} banner",
    ].join("");
    const params = {
        action: "edit",
        appendtext: `${text === "" ? "" : "\n\n"}${banner}`,
        summary: addEditSummarySuffix(joinedText),
        title,
    };

    await api.postWithToken("csrf", params);
}

/**
 * Fetches the current talk-page wikitext.
 *
 * @param api - MediaWiki API client.
 * @param title - Page title.
 * @returns Current talk-page wikitext.
 */
async function fetchTalkPageText(api: any, title: string): Promise<string> {
    const data = await api.get({
        action: "query",
        prop: "revisions",
        rvprop: "content",
        rvslots: "main",
        titles: title,
    });
    const page: any = Object.values(data?.query?.pages || {})[0];
    return (
        page?.revisions?.[0]?.slots?.main?.content ||
        page?.revisions?.[0]?.["*"] ||
        ""
    );
}

/**
 * Gets the appropriate article or category project banner.
 *
 * @param title - Subject-page title.
 * @returns Talk-page banner wikitext.
 */
function getTalkPageBanner(title: string): string {
    return /^Category:/iu.test(normalizeTitle(title))
        ? UNASSESSED_TALK_PAGE_BANNER
        : TALK_PAGE_BANNER;
}

/**
 * Gets the canonical talk-page title for an article or category.
 *
 * @param title - Subject-page title.
 * @returns Talk-page title.
 */
function getTalkPageTitle(title: string): string {
    const normalized = normalizeTitle(title);
    const categoryMatch = normalized.match(/^Category:(.+)$/iu);
    return categoryMatch == null
        ? `Talk:${normalized}`
        : `Category talk:${categoryMatch[1]}`;
}

/**
 * Normalizes title whitespace.
 *
 * @param value - Raw title value.
 * @returns Normalized title.
 */
function normalizeTitle(value: unknown): string {
    return String(value || "")
        .trim()
        .replace(/_/gu, " ");
}
