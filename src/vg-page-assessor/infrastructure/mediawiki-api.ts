/**
 * Handles MediaWiki API calls for talk assessment.
 */

import {
    getTalkPageTopSection,
    isEmptyImportanceOnlyChange,
    previewTalkPageTopSection,
    updateTalkPageAssessment,
    updateTalkPageTopSection,
} from "#assessor/domain/assessment.ts";
import {
    loggedApiGet,
    loggedPostWithToken,
    logStep,
} from "#assessor/infra/logger.ts";

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
    const result = parseFetchedPageText(response);

    logStep("fetchPageText done", {
        exists: result.exists,
        textLength: result.text.length,
        title,
    });

    return result;
}

/**
 * Parses page text and edit timestamps from a query response.
 *
 * @param response - Fetch response.
 * @returns Page text and edit timestamps from a query response.
 */
function parseFetchedPageText(response: any): any {
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

    const resolvedTitles = await resolveRedirectTitles(api, uniqueTitles);
    const targets = [...new Set(resolvedTitles.values())];
    const targetCreationTimes = await fetchRevisionCreationTimes(api, targets);

    mergeResolvedCreationTimes(
        creationTimes,
        resolvedTitles,
        targetCreationTimes,
    );

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
 * Resolves redirect targets for requested page titles.
 *
 * @param api - MediaWiki API client.
 * @param titles - Page titles.
 * @returns Redirect targets for requested page titles.
 */
async function resolveRedirectTitles(api: any, titles: Array<string>) {
    const resolvedTitles = new Map();

    await Promise.all(
        titles.map(async function callback(title) {
            const text = await fetchCurrentPageText(api, title);
            const target = parseRedirectTarget(text) || title;

            resolvedTitles.set(title, target);
            logStep("fetchPageCreationTimes resolved title", {
                target,
                title,
            });
        }),
    );

    return resolvedTitles;
}

/**
 * Maps target creation times back to requested redirect titles.
 *
 * @param output - Output value.
 * @param resolvedTitles - Resolved titles value.
 * @param targetTimes - Target times value.
 */
function mergeResolvedCreationTimes(
    output: Map<string, Date>,
    resolvedTitles: Map<string, string>,
    targetTimes: Map<string, Date>,
): void {
    resolvedTitles.forEach(function callback(target, title) {
        const date = targetTimes.get(target);

        if (date == null) {
            return;
        }

        output.set(title, date);
        output.set(target, date);
    });
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
    const uncachedTitles = readCachedCreationTimes(
        uniqueTitles,
        cache,
        creationTimes,
    );

    await fetchUncachedCreationTimes(
        api,
        uncachedTitles,
        cache,
        creationTimes,
    );

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
 * Returns titles without cached creation times.
 *
 * @param titles - Page titles.
 * @param cache - Cached values.
 * @param creationTimes - Creation times value.
 * @returns Result when the function
 *   returns titles without cached creation times.
 */
function readCachedCreationTimes(
    titles: string[],
    cache: Record<string, string>,
    creationTimes: Map<string, Date>,
): Array<string> {
    const result = titles.filter(function callback(title: string) {
        const cached = cache[normalizeCacheTitle(title)];

        if (cached == null) {
            return true;
        }

        creationTimes.set(title, new Date(cached));
        logStep("fetchRevisionCreationTimes cache hit", {
            timestamp: cached,
            title,
        });

        return false;
    });
    return result;
}

/**
 * Fetches uncached creation times in namespace-homogeneous batches.
 *
 * @param api - MediaWiki API client.
 * @param titles - Page titles.
 * @param cache - Cached values.
 * @param output - Output value.
 */
async function fetchUncachedCreationTimes(
    api: unknown,
    titles: string[],
    cache: Record<string, string>,
    output: Map<string, Date>,
) {
    for (const group of groupTitlesByNamespace(titles).values()) {
        for (
            let index = 0;
            index < group.length;
            index += MAX_TITLES_PER_QUERY
        ) {
            const batch = group.slice(index, index + MAX_TITLES_PER_QUERY);
            const times = await fetchRevisionCreationTimeBatch(api, batch);

            mergeCreationTimeBatch(output, cache, batch, times);
        }
    }
}

/**
 * Merges one API batch into creation-time output and cache maps.
 *
 * @param output - Output value.
 * @param cache - Cached values.
 * @param titles - Page titles.
 * @param times - Times value.
 */
function mergeCreationTimeBatch(
    output: Map<string, Date>,
    cache: Record<string, string>,
    titles: string[],
    times: Map<string, Date>,
): void {
    times.forEach(function callback(date: Date, title: string) {
        output.set(title, date);
        cache[normalizeCacheTitle(title)] = date.toISOString();
    });
    titles.forEach(function callback(title: string) {
        const date = getCreationTimeForTitle(times, title);

        if (date != null) {
            output.set(title, date);
            cache[normalizeCacheTitle(title)] = date.toISOString();
        }
    });
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

        return await fetchIndividualCreationTimes(api, titles, error);
    }
}

/**
 * Retries a failed creation-time batch one title at a time.
 *
 * @param api - MediaWiki API client.
 * @param titles - Page titles.
 * @param error - Caught error.
 * @returns Result when the function
 *   retries a failed creation-time batch one title at
 *   a time.
 */
async function fetchIndividualCreationTimes(
    api: unknown,
    titles: string[],
    error: unknown,
): Promise<Map<string, Date>> {
    const message = [
        "fetchRevisionCreationTimeBatch fal",
        "lback to single-title requests",
    ].join("");
    const creationTimes = new Map<string, Date>();

    logStep(message, { error, titles });
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
    const creationTimes = parseRevisionCreationTimes(response);

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
 * Parses first-revision timestamps from a query response.
 *
 * @param response - Fetch response.
 * @returns First-revision timestamps from a query response.
 */
function parseRevisionCreationTimes(response: any): Map<string, Date> {
    const pages = response?.query?.pages || [];
    const creationTimes = new Map();
    const pageList = Array.isArray(pages) ? pages : Object.values(pages);

    pageList.forEach(function callback(page) {
        const timestamp = page?.revisions?.[0]?.timestamp;

        if (timestamp != null && page?.title != null) {
            creationTimes.set(page.title, new Date(timestamp));
        }
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
 * @returns Result when the function
 *   writes cached creation datetimes to localstorage.
 */
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
    const result = String(title || "")
        .replace(/_/gu, " ")
        .trim();
    return result;
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
        try {
            const result = await saveTalkAssessmentAttempt({
                api,
                assessmentText,
                attempt,
                projectConfig,
                summary,
                title,
            });
            return result;
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
 * Runs one talk-page assessment save attempt.
 *
 * @param options - Operation options.
 * @returns Result when the function
 *   runs one talk-page assessment save attempt.
 */
async function saveTalkAssessmentAttempt(options: any): Promise<string> {
    logStep("saveTalkAssessment attempt start", {
        attempt: options.attempt + 1,
        title: options.title,
    });
    const page = await fetchPageText(options.api, options.title);
    const update = buildTalkAssessmentUpdate(page, options);

    if (shouldSkipTalkAssessmentSave(page, update, options.title)) {
        return update.text;
    }

    const params = buildTalkAssessmentEditParams(page, update.text, options);

    await loggedPostWithToken(
        options.api,
        "saveTalkAssessment",
        "csrf",
        params,
    );
    logStep("saveTalkAssessment saved", {
        attempt: options.attempt + 1,
        title: options.title,
    });

    return update.text;
}

/**
 * Builds updated talk text and its replacement top section.
 *
 * @param page - Page value.
 * @param options - Operation options.
 * @returns Updated talk text and its replacement top section.
 */
function buildTalkAssessmentUpdate(page: any, options: any): any {
    const isText = typeof options.assessmentText === "string";
    const text = selectValue(
        isText,
        function trueBranch() {
            return updateTalkPageTopSection(page.text, options.assessmentText);
        },
        function falseBranch() {
            const result = updateTalkPageAssessment(
                page.text,
                options.assessmentText,
                options.projectConfig,
            );
            return result;
        },
    );
    const newTopSection = buildNewTalkTopSection(page, options, isText);

    return { newTopSection, text };
}

/**
 * Builds the new top section used for no-op detection.
 *
 * @param page - Page value.
 * @param options - Operation options.
 * @param isText - Whether is text.
 * @returns The new top section used for no-op detection.
 */
function buildNewTalkTopSection(
    page: { text: string },
    options: { assessmentText: string; projectConfig: unknown },
    isText: unknown,
): string {
    const result = selectValue(
        isText,
        function trueBranch() {
            return options.assessmentText.trimEnd();
        },
        function falseBranch() {
            const result = previewTalkPageTopSection(
                page.text,
                options.assessmentText,
                options.projectConfig,
            );
            return result;
        },
    );
    return result;
}

/**
 * Checks whether an assessment save has no effective change.
 *
 * @param page - Page value.
 * @param update - Update value.
 * @param title - Page title.
 * @returns Whether an assessment save has no effective change.
 */
function shouldSkipTalkAssessmentSave(
    page: { text: string; exists: unknown },
    update: { newTopSection: string; text: unknown },
    title: unknown,
): boolean {
    const oldTopSection = getTalkPageTopSection(page.text);
    const emptyChange = isEmptyImportanceOnlyChange(
        oldTopSection,
        update.newTopSection,
    );
    const skip = page.exists && (update.text === page.text || emptyChange);

    if (skip) {
        logStep("saveTalkAssessment skipped: no effective change", {
            textChanged: update.text !== page.text,
            title,
        });
    }

    return skip;
}

/**
 * Builds MediaWiki edit parameters for an assessment save.
 *
 * @param page - Page value.
 * @param text - Source text.
 * @param options - Operation options.
 * @returns MediaWiki edit parameters for an assessment save.
 */
function buildTalkAssessmentEditParams(
    page: { starttimestamp: unknown; basetimestamp: null; exists: unknown },
    text: unknown,
    options: { summary: unknown; title: unknown },
): unknown {
    const params: Record<string, any> = {
        action: "edit",
        starttimestamp: page.starttimestamp,
        summary: options.summary,
        text,
        title: options.title,
    };

    if (page.basetimestamp != null) {
        params.basetimestamp = page.basetimestamp;
    }

    if (!page.exists) {
        params.createonly = true;
    }

    return params;
}

/**
 * Checks whether a failed API edit should be retried.
 *
 * @param error - MediaWiki API rejection.
 * @returns Whether the error is an edit conflict.
 */
function isEditConflict(error: any): boolean {
    const result =
        error === "editconflict" ||
        error?.code === "editconflict" ||
        error?.error?.code === "editconflict";
    return result;
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
