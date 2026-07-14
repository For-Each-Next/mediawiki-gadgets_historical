/**
 * Handles MediaWiki API calls for talk assessment.
 */

import {
    getTalkPageTopSection,
    isEmptyImportanceOnlyChange,
    previewTalkPageTopSection,
    updateTalkPageAssessment,
    updateTalkPageTopSection,
} from "./assessment.ts";
import { loggedApiGet, loggedPostWithToken, logStep } from "./logger.ts";

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
 * @param api - MediaWiki API client.
 * @param title - Talk-page title.
 * @returns Page text and edit timestamps.
 */
export async function fetchPageText(api: any, title: string): Promise<any> {
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
 * @param api - MediaWiki API client.
 * @param title - Subject-page title.
 * @returns Page metadata.
 */
export async function fetchSubjectPageInfo(
    api: any,
    title: string,
): Promise<any> {
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
 * @param api - MediaWiki API client.
 * @param title - Page title.
 * @returns Page info.
 */
async function fetchPageInfo(api: any, title: string): Promise<any> {
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
 * @param api - MediaWiki API client.
 * @param titles - Page titles.
 * @returns Creation times by listed title.
 */
export async function fetchPageCreationTimes(
    api: any,
    titles: Array<string>,
): Promise<Map<string, Date>> {
    logStep("fetchPageCreationTimes start", { titles });
    const uniqueTitles = [...new Set(titles.filter(Boolean))];
    const creationTimes = new Map();

    if (uniqueTitles.length === 0) {
        logStep("fetchPageCreationTimes skipped: no titles");
        return creationTimes;
    }

    const resolvedTitles = new Map();

    await Promise.all(
        uniqueTitles.map(async function callback(title) {
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

    resolvedTitles.forEach(function callback(target, title) {
        const date = targetCreationTimes.get(target);

        if (date == null) {
            return;
        }

        creationTimes.set(title, date);
        creationTimes.set(target, date);
    });

    logStep("fetchPageCreationTimes done", {
        entries: [...creationTimes.entries()].map(function callback([
            title,
            date,
        ]) {
            return [title, date.toISOString()];
        }),
    });

    return creationTimes;
}


/**
 * Fetches the current page source for redirect detection.
 *
 * @param api - MediaWiki API client.
 * @param title - Page title.
 * @returns Current page source.
 */
async function fetchCurrentPageText(api: any, title: string): Promise<string> {
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
 * @param text - Page source.
 * @returns Redirect target title.
 */
function parseRedirectTarget(text: string): string | null {
    const match = String(text || "").match(
        new RegExp(
            [
                "^\\s*#(?:REDIRECT|重定向|重新導向|重新导向)\\",
                "s*:?\\s*\\[\\[([^#|\\]]+)",
            ].join(""),
            "iu",
        ),
    );

    const target = match?.[1]?.trim() || null;

    logStep("parseRedirectTarget", { target });

    return target;
}


/**
 * Fetches first-revision timestamps for resolved, non-redirect titles.
 *
 * @param api - MediaWiki API client.
 * @param titles - Page titles.
 * @returns Creation timestamps.
 */
async function fetchRevisionCreationTimes(
    api: any,
    titles: Array<string>,
): Promise<Map<string, Date>> {
    logStep("fetchRevisionCreationTimes start", { titles });
    const creationTimes = new Map();
    const uniqueTitles = [...new Set(titles.filter(Boolean))];
    const cache = readCreationDateCache();
    const uncachedTitles = [];

    uniqueTitles.forEach(function callback(title) {
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

    for (const namespaceTitles of groupTitlesByNamespace(
        uncachedTitles,
    ).values()) {
        for (
            let index = 0;
            index < namespaceTitles.length;
            index += MAX_TITLES_PER_QUERY
        ) {
            const batchTitles = namespaceTitles.slice(
                index,
                index + MAX_TITLES_PER_QUERY,
            );
            const batchTimes = await fetchRevisionCreationTimeBatch(
                api,
                batchTitles,
            );

            batchTimes.forEach(function callback(date, title) {
                creationTimes.set(title, date);
                cache[normalizeCacheTitle(title)] = date.toISOString();
            });
            batchTitles.forEach(function callback(title) {
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
        entries: [...creationTimes.entries()].map(function callback([
            title,
            date,
        ]) {
            return [title, date.toISOString()];
        }),
    });

    return creationTimes;
}


/**
 * Handles fetch revision creation time batch.
 *
 * Fetches creation timestamps for one namespace-homogeneous title
 * batch.
 *
 * @param api - MediaWiki API client.
 * @param titles - Page titles.
 * @returns Creation timestamps.
 *
 */
async function fetchRevisionCreationTimeBatch(
    api: any,
    titles: Array<string>,
): Promise<Map<string, Date>> {
    try {
        return await fetchRevisionCreationTimeBatchUnsafe(api, titles);
    } catch (error) {
        if (titles.length <= 1) {
            throw error;
        }

        logStep(
            [
                "fetchRevisionCreationTimeBatch fal",
                "lback to single-title requests",
            ].join(""),
            {
                error,
                titles,
            },
        );

        const creationTimes = new Map();

        for (const title of titles) {
            const single = await fetchRevisionCreationTimeBatchUnsafe(api, [
                title,
            ]);

            single.forEach(function callback(date, singleTitle) {
                creationTimes.set(singleTitle, date);
            });
        }

        return creationTimes;
    }
}


/**
 * Fetches creation timestamps without fallback.
 *
 * @param api - MediaWiki API client.
 * @param titles - Page titles.
 * @returns Creation timestamps.
 */
async function fetchRevisionCreationTimeBatchUnsafe(
    api: any,
    titles: Array<string>,
): Promise<Map<string, Date>> {
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

    (Array.isArray(pages) ? pages : Object.values(pages)).forEach(
        function callback(page) {
            const timestamp = page?.revisions?.[0]?.timestamp;

            if (timestamp != null && page?.title != null) {
                creationTimes.set(page.title, new Date(timestamp));
            }
        },
    );

    logStep("fetchRevisionCreationTimeBatch done", {
        entries: [...creationTimes.entries()].map(function callback([
            title,
            date,
        ]) {
            return [title, date.toISOString()];
        }),
        titles,
    });

    return creationTimes;
}


/**
 * Handles group titles by namespace.
 *
 * Groups titles by namespace prefix to avoid mixed-namespace revision
 * batches.
 *
 * @param titles - Page titles.
 * @returns Titles by namespace group.
 *
 */
function groupTitlesByNamespace(
    titles: Array<string>,
): Map<string, Array<string>> {
    const groups = new Map();

    titles.forEach(function callback(title) {
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
 * @param title - Page title.
 * @returns Namespace key.
 */
function getNamespaceGroupKey(title: string): string {
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
 * @returns Cache object.
 */
function readCreationDateCache(): any {
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
 * @param cache - Cache object.
 * @returns */
function writeCreationDateCache(cache: any): void {
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
 * @param title - Page title.
 * @returns Cache key.
 */
function normalizeCacheTitle(title: string): string {
    return String(title || "")
        .replace(/_/gu, " ")
        .trim();
}


/**
 * Gets a creation time from a map using title normalization.
 *
 * @param creationTimes - Creation times.
 * @param title - Requested title.
 * @returns Creation datetime.
 */
function getCreationTimeForTitle(
    creationTimes: Map<string, Date>,
    title: string,
): Date | null {
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
 * @param api - MediaWiki API client.
 * @param title - Talk-page title.
 * @param assessmentText - Replacement top-section text,
 * or
 * selected assessment values.
 * @param projectConfig - Assessment project configuration.
 * @param summary - Talk-page edit summary.
 * @returns Saved talk-page text.
 */
export async function saveTalkAssessment(
    api: any,
    title: string,
    assessmentText: string | any,
    projectConfig: any,
    summary: string = "add or update WikiProject assessment banner",
): Promise<string> {
    for (let attempt = 0; attempt < MAX_EDIT_ATTEMPTS; attempt += 1) {
        logStep("saveTalkAssessment attempt start", {
            attempt: attempt + 1,
            title,
        });
        const page = await fetchPageText(api, title);
        const text = selectValue(
            typeof assessmentText === "string",
            function trueBranch() {
                return updateTalkPageTopSection(
                    page.text,
                    assessmentText,
                    projectConfig,
                );
            },
            function falseBranch() {
                return updateTalkPageAssessment(
                    page.text,
                    assessmentText,
                    projectConfig,
                );
            },
        );

        const oldTopSection = getTalkPageTopSection(page.text);
        const newTopSection = selectValue(
            typeof assessmentText === "string",
            function trueBranch() {
                return assessmentText.trimEnd();
            },
            function falseBranch() {
                return previewTalkPageTopSection(
                    page.text,
                    assessmentText,
                    projectConfig,
                );
            },
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
            const params: Record<string, any> = {
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

            await loggedPostWithToken(
                api,
                "saveTalkAssessment",
                "csrf",
                params,
            );
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
 * @param error - MediaWiki API rejection.
 * @returns Whether the error is an edit conflict.
 */
function isEditConflict(error: any): boolean {
    return (
        error === "editconflict" ||
        error?.code === "editconflict" ||
        error?.error?.code === "editconflict"
    );
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
