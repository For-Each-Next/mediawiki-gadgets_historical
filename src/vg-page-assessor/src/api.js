/* eslint-disable */

/**
 * Handles MediaWiki API calls for talk assessment.
 */

import {
    getTalkPageTopSection,
    isEmptyImportanceOnlyChange,
    previewTalkPageTopSection,
    updateTalkPageAssessment,
    updateTalkPageTopSection,
} from "./assessment.js";
import { loggedApiGet, loggedPostWithToken, logStep } from "./logger.js";

const MAX_EDIT_ATTEMPTS = 3;
const MAX_TITLES_PER_QUERY = 50;
const CREATION_CACHE_KEY = "vg-page-assessor.creation-datetimes.v1";
const KNOWN_NAMESPACE_PREFIXES = new Set([
    "category",
    "cat",
    "draft",
    "module",
    "portal",
    "template",
    "wikiproject",
    "wp",
    "分類",
    "分类",
    "草稿",
    "模組",
    "模块",
    "模板",
    "主題",
    "主题",
    "維基專題",
    "维基专题",
]);

/**
 * Fetches the current talk-page source.
 *
 * @param {object} api - MediaWiki API client.
 * @param {string} title - Talk-page title.
 * @returns {Promise<object>} Page text and edit timestamps.
 */
export async function fetchPageText(api, title) {
    logStep("fetchPageText start", { title });
    const response = await loggedApiGet(api, "fetchPageText", {
        action: "query",
        curtimestamp: true,
        formatversion: "2",
        prop: "revisions",
        rvprop: "content|timestamp",
        rvslots: "main",
        titles: title,
    });
    const pages = response?.query?.pages || [];
    const page = Array.isArray(pages) ? pages[0] : Object.values(pages)[0];
    const revision = page?.revisions?.[0];

    const result = {
        basetimestamp: revision?.timestamp,
        exists: page?.missing == null,
        starttimestamp: response.curtimestamp,
        text:
            revision?.slots?.main?.content ??
            revision?.slots?.main?.["*"] ??
            revision?.["*"] ??
            "",
    };

    logStep("fetchPageText done", {
        exists: result.exists,
        textLength: result.text.length,
        title,
    });

    return result;
}

/**
 * Fetches page creation metadata and redirect target details.
 *
 * @param {object} api - MediaWiki API client.
 * @param {string} title - Subject-page title.
 * @returns {Promise<object>} Page metadata.
 */
export async function fetchSubjectPageInfo(api, title) {
    logStep("fetchSubjectPageInfo start", { title });
    const page = await fetchPageInfo(api, title);
    const currentText = await fetchCurrentPageText(api, title);
    const redirectTarget = parseRedirectTarget(currentText);
    const targetTitle = redirectTarget || title;
    const creationTimes = await fetchRevisionCreationTimes(api, [targetTitle]);
    const creationDate = creationTimes.get(targetTitle);

    if (creationDate == null) {
        throw new Error(`Unable to read the creation date for ${title}.`);
    }

    const result = {
        creationDate,
        isRedirect: redirectTarget != null,
        listedTitle: title,
        namespaceNumber: page?.ns,
        targetTitle,
    };

    logStep("fetchSubjectPageInfo done", {
        ...result,
        creationDate: result.creationDate.toISOString(),
    });

    return result;
}

/**
 * Fetches basic page info without redirect resolution.
 *
 * @param {object} api - MediaWiki API client.
 * @param {string} title - Page title.
 * @returns {Promise<object>} Page info.
 */
async function fetchPageInfo(api, title) {
    logStep("fetchPageInfo start", { title });
    const response = await loggedApiGet(api, "fetchPageInfo", {
        action: "query",
        formatversion: "2",
        prop: "info",
        titles: title,
    });
    const pages = response?.query?.pages || [];

    const page = Array.isArray(pages) ? pages[0] : Object.values(pages)[0];

    logStep("fetchPageInfo done", {
        missing: page?.missing != null,
        ns: page?.ns,
        title: page?.title,
    });

    return page;
}

/**
 * Fetches creation times for a set of titles, following redirects.
 *
 * @param {object} api - MediaWiki API client.
 * @param {Array<string>} titles - Page titles.
 * @returns {Promise<Map<string, Date>>} Creation times by listed title.
 */
export async function fetchPageCreationTimes(api, titles) {
    logStep("fetchPageCreationTimes start", { titles });
    const uniqueTitles = [...new Set(titles.filter(Boolean))];
    const creationTimes = new Map();

    if (uniqueTitles.length === 0) {
        logStep("fetchPageCreationTimes skipped: no titles");
        return creationTimes;
    }

    const resolvedTitles = new Map();

    await Promise.all(
        uniqueTitles.map(async (title) => {
            const text = await fetchCurrentPageText(api, title);
            const target = parseRedirectTarget(text) || title;

            resolvedTitles.set(title, target);
            logStep("fetchPageCreationTimes resolved title", {
                target,
                title,
            });
        }),
    );

    const targetCreationTimes = await fetchRevisionCreationTimes(api, [
        ...new Set(resolvedTitles.values()),
    ]);

    resolvedTitles.forEach((target, title) => {
        const date = targetCreationTimes.get(target);

        if (date == null) {
            return;
        }

        creationTimes.set(title, date);
        creationTimes.set(target, date);
    });

    logStep("fetchPageCreationTimes done", {
        entries: [...creationTimes.entries()].map(([title, date]) => [
            title,
            date.toISOString(),
        ]),
    });

    return creationTimes;
}

/**
 * Fetches the current page source for redirect detection.
 *
 * @param {object} api - MediaWiki API client.
 * @param {string} title - Page title.
 * @returns {Promise<string>} Current page source.
 */
async function fetchCurrentPageText(api, title) {
    logStep("fetchCurrentPageText start", { title });
    const response = await loggedApiGet(api, "fetchCurrentPageText", {
        action: "query",
        formatversion: "2",
        prop: "revisions",
        rvprop: "content",
        rvslots: "main",
        titles: title,
    });
    const pages = response?.query?.pages || [];
    const page = Array.isArray(pages) ? pages[0] : Object.values(pages)[0];
    const revision = page?.revisions?.[0];

    const text =
        revision?.slots?.main?.content ??
        revision?.slots?.main?.["*"] ??
        revision?.["*"] ??
        "";

    logStep("fetchCurrentPageText done", {
        textLength: text.length,
        title,
    });

    return text;
}

/**
 * Parses a redirect target from page source.
 *
 * @param {string} text - Page source.
 * @returns {string|null} Redirect target title.
 */
function parseRedirectTarget(text) {
    const match = String(text || "").match(
        /^\s*#(?:REDIRECT|重定向|重新導向|重新导向)\s*:?\s*\[\[([^#|\]]+)/iu,
    );

    const target = match?.[1]?.trim() || null;

    logStep("parseRedirectTarget", { target });

    return target;
}

/**
 * Fetches first-revision timestamps for resolved, non-redirect titles.
 *
 * @param {object} api - MediaWiki API client.
 * @param {Array<string>} titles - Page titles.
 * @returns {Promise<Map<string, Date>>} Creation timestamps.
 */
async function fetchRevisionCreationTimes(api, titles) {
    logStep("fetchRevisionCreationTimes start", { titles });
    const creationTimes = new Map();
    const uniqueTitles = [...new Set(titles.filter(Boolean))];
    const cache = readCreationDateCache();
    const uncachedTitles = [];

    uniqueTitles.forEach((title) => {
        const cached = cache[normalizeCacheTitle(title)];

        if (cached != null) {
            creationTimes.set(title, new Date(cached));
            logStep("fetchRevisionCreationTimes cache hit", {
                timestamp: cached,
                title,
            });
            return;
        }

        uncachedTitles.push(title);
    });

    for (const namespaceTitles of groupTitlesByNamespace(uncachedTitles).values()) {
        for (
            let index = 0;
            index < namespaceTitles.length;
            index += MAX_TITLES_PER_QUERY
        ) {
            const batchTitles = namespaceTitles.slice(
                index,
                index + MAX_TITLES_PER_QUERY,
            );
            const batchTimes = await fetchRevisionCreationTimeBatch(api, batchTitles);

            batchTimes.forEach((date, title) => {
                creationTimes.set(title, date);
                cache[normalizeCacheTitle(title)] = date.toISOString();
            });
            batchTitles.forEach((title) => {
                const date = getCreationTimeForTitle(batchTimes, title);

                if (date != null) {
                    creationTimes.set(title, date);
                    cache[normalizeCacheTitle(title)] = date.toISOString();
                }
            });
        }
    }

    writeCreationDateCache(cache);
    logStep("fetchRevisionCreationTimes done", {
        entries: [...creationTimes.entries()].map(([title, date]) => [
            title,
            date.toISOString(),
        ]),
    });

    return creationTimes;
}

/**
 * Fetches creation timestamps for one namespace-homogeneous title batch.
 *
 * @param {object} api - MediaWiki API client.
 * @param {Array<string>} titles - Page titles.
 * @returns {Promise<Map<string, Date>>} Creation timestamps.
 */
async function fetchRevisionCreationTimeBatch(api, titles) {
    try {
        return await fetchRevisionCreationTimeBatchUnsafe(api, titles);
    } catch (error) {
        if (titles.length <= 1) {
            throw error;
        }

        logStep("fetchRevisionCreationTimeBatch fallback to single-title requests", {
            error,
            titles,
        });

        const creationTimes = new Map();

        for (const title of titles) {
            const single = await fetchRevisionCreationTimeBatchUnsafe(api, [title]);

            single.forEach((date, singleTitle) => {
                creationTimes.set(singleTitle, date);
            });
        }

        return creationTimes;
    }
}

/**
 * Fetches creation timestamps without fallback.
 *
 * @param {object} api - MediaWiki API client.
 * @param {Array<string>} titles - Page titles.
 * @returns {Promise<Map<string, Date>>} Creation timestamps.
 */
async function fetchRevisionCreationTimeBatchUnsafe(api, titles) {
    logStep("fetchRevisionCreationTimeBatch start", {
        namespaceGroup: getNamespaceGroupKey(titles[0]),
        titles,
    });
    const response = await loggedApiGet(api, "fetchRevisionCreationTimes", {
        action: "query",
        formatversion: "2",
        prop: "revisions",
        rvdir: "newer",
        rvlimit: 1,
        rvprop: "timestamp",
        titles: titles.join("|"),
    });
    const pages = response?.query?.pages || [];
    const creationTimes = new Map();

    (Array.isArray(pages) ? pages : Object.values(pages)).forEach((page) => {
        const timestamp = page?.revisions?.[0]?.timestamp;

        if (timestamp != null && page?.title != null) {
            creationTimes.set(page.title, new Date(timestamp));
        }
    });

    logStep("fetchRevisionCreationTimeBatch done", {
        entries: [...creationTimes.entries()].map(([title, date]) => [
            title,
            date.toISOString(),
        ]),
        titles,
    });

    return creationTimes;
}

/**
 * Groups titles by namespace prefix to avoid mixed-namespace revision batches.
 *
 * @param {Array<string>} titles - Page titles.
 * @returns {Map<string, Array<string>>} Titles by namespace group.
 */
function groupTitlesByNamespace(titles) {
    const groups = new Map();

    titles.forEach((title) => {
        const key = getNamespaceGroupKey(title);

        if (!groups.has(key)) {
            groups.set(key, []);
        }

        groups.get(key).push(title);
    });

    logStep("groupTitlesByNamespace", [...groups.entries()]);
    return groups;
}

/**
 * Gets a conservative namespace group key from a title.
 *
 * @param {string} title - Page title.
 * @returns {string} Namespace key.
 */
function getNamespaceGroupKey(title) {
    const value = String(title || "");
    const colonIndex = value.indexOf(":");

    if (colonIndex === -1) {
        return "";
    }

    const prefix = value.slice(0, colonIndex).trim().toLowerCase();

    return KNOWN_NAMESPACE_PREFIXES.has(prefix) ? prefix : "";
}

/**
 * Reads cached creation datetimes from localStorage.
 *
 * @returns {object} Cache object.
 */
function readCreationDateCache() {
    try {
        const raw = globalThis.localStorage?.getItem(CREATION_CACHE_KEY);

        if (!raw) {
            return {};
        }

        const parsed = JSON.parse(raw);

        return parsed && typeof parsed === "object" ? parsed : {};
    } catch (error) {
        logStep("readCreationDateCache failed", { error });
        return {};
    }
}

/**
 * Writes cached creation datetimes to localStorage.
 *
 * @param {object} cache - Cache object.
 * @returns {void}
 */
function writeCreationDateCache(cache) {
    try {
        globalThis.localStorage?.setItem(
            CREATION_CACHE_KEY,
            JSON.stringify(cache),
        );
        logStep("writeCreationDateCache done", {
            size: Object.keys(cache).length,
        });
    } catch (error) {
        logStep("writeCreationDateCache failed", { error });
    }
}

/**
 * Normalizes titles for cache keys.
 *
 * @param {string} title - Page title.
 * @returns {string} Cache key.
 */
function normalizeCacheTitle(title) {
    return String(title || "").replace(/_/gu, " ").trim();
}

/**
 * Gets a creation time from a map using title normalization.
 *
 * @param {Map<string, Date>} creationTimes - Creation times.
 * @param {string} title - Requested title.
 * @returns {Date|null} Creation datetime.
 */
function getCreationTimeForTitle(creationTimes, title) {
    if (creationTimes.has(title)) {
        return creationTimes.get(title);
    }

    const normalized = normalizeCacheTitle(title);
    const found = [...creationTimes.entries()].find(
        ([entryTitle]) => normalizeCacheTitle(entryTitle) === normalized,
    );

    return found?.[1] || null;
}

/**
 * Saves the updated talk-page assessment with edit-conflict retry.
 *
 * @param {object} api - MediaWiki API client.
 * @param {string} title - Talk-page title.
 * @param {string|object} assessmentText - Replacement top-section text, or selected assessment values.
 * @param {object} projectConfig - Assessment project configuration.
 * @param {string} [summary] - Talk-page edit summary.
 * @returns {Promise<string>} Saved talk-page text.
 */
export async function saveTalkAssessment(
    api,
    title,
    assessmentText,
    projectConfig,
    summary = "add or update WikiProject assessment banner",
) {
    for (let attempt = 0; attempt < MAX_EDIT_ATTEMPTS; attempt += 1) {
        logStep("saveTalkAssessment attempt start", {
            attempt: attempt + 1,
            title,
        });
        const page = await fetchPageText(api, title);
        const text =
            typeof assessmentText === "string"
                ? updateTalkPageTopSection(
                      page.text,
                      assessmentText,
                      projectConfig,
                  )
                : updateTalkPageAssessment(
                      page.text,
                      assessmentText,
                      projectConfig,
                  );

        const oldTopSection = getTalkPageTopSection(page.text);
        const newTopSection =
            typeof assessmentText === "string"
                ? assessmentText.trimEnd()
                : previewTalkPageTopSection(
                      page.text,
                      assessmentText,
                      projectConfig,
                  );

        if (
            page.exists &&
            (text === page.text ||
                isEmptyImportanceOnlyChange(oldTopSection, newTopSection))
        ) {
            logStep("saveTalkAssessment skipped: no effective change", {
                textChanged: text !== page.text,
                title,
            });
            return text;
        }

        try {
            const params = {
                action: "edit",
                starttimestamp: page.starttimestamp,
                summary,
                text,
                title,
            };

            if (page.basetimestamp != null) {
                params.basetimestamp = page.basetimestamp;
            }

            if (!page.exists) {
                params.createonly = true;
            }

            await loggedPostWithToken(api, "saveTalkAssessment", "csrf", params);
            logStep("saveTalkAssessment saved", {
                attempt: attempt + 1,
                title,
            });
            return text;
        } catch (error) {
            logStep("saveTalkAssessment caught error", {
                attempt: attempt + 1,
                error,
                title,
            });
            if (!isEditConflict(error) || attempt === MAX_EDIT_ATTEMPTS - 1) {
                throw error;
            }
        }
    }

    return "";
}

/**
 * Checks whether a failed API edit should be retried.
 *
 * @param {*} error - MediaWiki API rejection.
 * @returns {boolean} Whether the error is an edit conflict.
 */
function isEditConflict(error) {
    return (
        error === "editconflict" ||
        error?.code === "editconflict" ||
        error?.error?.code === "editconflict"
    );
}
