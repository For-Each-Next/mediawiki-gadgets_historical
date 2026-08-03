/**
 * Handles MediaWiki API calls for talk assessment.
 */

import type { PageSnapshot, SubjectPageInfo } from "#gadget/domain/types.ts";
import {
    type CreationTimeCache,
    normalizeCreationTimeCacheTitle,
    readCreationTimeCache,
    writeCreationTimeCache,
} from "#gadget/infra/creation-time-cache.ts";
import { loggedApiGet, logStep } from "#gadget/infra/logger.ts";
import {
    asRecord,
    getFirstQueryPage,
    getFirstRevision,
    getRequiredString,
    getRevisionContent,
} from "#gadget/infra/mediawiki-response.ts";
import { getTitleNamespaceId } from "#shared/wikitext";

const MAX_TITLES_PER_QUERY = 50;

/**
 * Fetches the current talk-page source.
 *
 * @param api - MediaWiki API client.
 * @param title - Talk-page title.
 * @returns Page text and edit timestamps.
 */
export async function fetchPageText(
    api: mw.Api,
    title: string,
): Promise<PageSnapshot> {
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
    const result = decodePageTextResponse(response);

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
export function decodePageTextResponse(response: unknown): PageSnapshot {
    const responseRecord = asRecord(response);
    const page = getFirstQueryPage(response);
    const revision = getFirstRevision(page);
    const basetimestamp = revision?.timestamp;

    if (responseRecord == null || page == null) {
        throw new Error("MediaWiki response omitted the requested page.");
    }

    return {
        ...(typeof basetimestamp === "string" ? { basetimestamp } : {}),
        exists: page.missing == null,
        starttimestamp: getRequiredString(
            responseRecord,
            "curtimestamp",
            "the query timestamp",
        ),
        text: getRevisionContent(revision),
    };
}

/**
 * Fetches page creation metadata and redirect target details.
 *
 * @param api - MediaWiki API client.
 * @param title - Subject-page title.
 * @returns Page metadata.
 */
export async function fetchSubjectPageInfo(
    api: mw.Api,
    title: string,
): Promise<SubjectPageInfo> {
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
        namespaceNumber: readPageNamespace(page, title),
        targetTitle,
    };

    const creationTimestamp = result.creationDate.toISOString();
    logStep("fetchSubjectPageInfo done", {
        ...result,
        creationDate: creationTimestamp,
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
async function fetchPageInfo(
    api: mw.Api,
    title: string,
): Promise<Record<string, unknown> | null> {
    logStep("fetchPageInfo start", { title });
    const response = await loggedApiGet(api, "fetchPageInfo", {
        action: "query",
        formatversion: "2",
        prop: "info",
        titles: title,
    });
    const page = getFirstQueryPage(response);

    logStep("fetchPageInfo done", {
        missing: page?.missing != null,
        ns: page?.ns,
        title: page?.title,
    });

    return page;
}

function readPageNamespace(
    page: Record<string, unknown> | null,
    title: string,
): number {
    if (typeof page?.ns !== "number") {
        throw new Error(`Unable to read the namespace for ${title}.`);
    }

    return page.ns;
}

/**
 * Fetches creation times for a set of titles, following redirects.
 *
 * @param api - MediaWiki API client.
 * @param titles - Page titles.
 * @returns Creation times by listed title.
 */
export async function fetchPageCreationTimes(
    api: mw.Api,
    titles: Array<string>,
): Promise<Map<string, Date>> {
    logStep("fetchPageCreationTimes start", { titles });
    const enteredTitles = titles.filter(Boolean);
    const titleSet = new Set(enteredTitles);
    const uniqueTitles = [...titleSet];
    const creationTimes = new Map<string, Date>();

    if (uniqueTitles.length === 0) {
        logStep("fetchPageCreationTimes skipped: no titles");
        return creationTimes;
    }

    const resolvedTitles = await resolveRedirectTitles(api, uniqueTitles);
    const resolvedValues = resolvedTitles.values();
    const targetSet = new Set(resolvedValues);
    const targets = [...targetSet];
    const targetCreationTimes = await fetchRevisionCreationTimes(api, targets);

    mergeResolvedCreationTimes(
        creationTimes,
        resolvedTitles,
        targetCreationTimes,
    );

    const entries = serializeCreationTimeEntries(creationTimes);
    logStep("fetchPageCreationTimes done", {
        entries,
    });

    return creationTimes;
}

/**
 * Serializes creation times for diagnostic logging.
 *
 * @param creationTimes - Creation times.
 * @returns Serializable creation-time entries.
 */
function serializeCreationTimeEntries(
    creationTimes: Map<string, Date>,
): Array<[string, string]> {
    const entries: Array<[string, string]> = [];

    for (const [title, date] of creationTimes) {
        const timestamp = date.toISOString();
        entries.push([title, timestamp]);
    }

    return entries;
}

/**
 * Resolves redirect targets for requested page titles.
 *
 * @param api - MediaWiki API client.
 * @param titles - Page titles.
 * @returns Redirect targets for requested page titles.
 */
async function resolveRedirectTitles(
    api: mw.Api,
    titles: Array<string>,
): Promise<Map<string, string>> {
    const resolvedTitles = new Map<string, string>();
    const resolveTitle = resolveRedirectTitle.bind(null, api, resolvedTitles);
    const requests = titles.map(resolveTitle);

    await Promise.all(requests);

    return resolvedTitles;
}

/**
 * Resolves and stores one redirect target.
 *
 * @param api - MediaWiki API client.
 * @param resolvedTitles - Mutable resolved-title map.
 * @param title - Source title.
 */
async function resolveRedirectTitle(
    api: mw.Api,
    resolvedTitles: Map<string, string>,
    title: string,
): Promise<void> {
    const text = await fetchCurrentPageText(api, title);
    const target = parseRedirectTarget(text) || title;

    resolvedTitles.set(title, target);
    logStep("fetchPageCreationTimes resolved title", { target, title });
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
    for (const [title, target] of resolvedTitles) {
        const date = targetTimes.get(target);

        if (date != null) {
            output.set(title, date);
            output.set(target, date);
        }
    }
}

/**
 * Fetches the current page source for redirect detection.
 *
 * @param api - MediaWiki API client.
 * @param title - Page title.
 * @returns Current page source.
 */
async function fetchCurrentPageText(
    api: mw.Api,
    title: string,
): Promise<string> {
    logStep("fetchCurrentPageText start", { title });
    const response = await loggedApiGet(api, "fetchCurrentPageText", {
        action: "query",
        formatversion: "2",
        prop: "revisions",
        rvprop: "content",
        rvslots: "main",
        titles: title,
    });
    const page = getFirstQueryPage(response);
    const revision = getFirstRevision(page);
    const text = getRevisionContent(revision);

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
    const patternSource = [
        "^\\s*#(?:REDIRECT|重定向|重新導向|重新导向)\\",
        "s*:?\\s*\\[\\[([^#|\\]]+)",
    ].join("");
    const pattern = new RegExp(patternSource, "iu");
    const match = String(text || "").match(pattern);

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
    api: mw.Api,
    titles: Array<string>,
): Promise<Map<string, Date>> {
    logStep("fetchRevisionCreationTimes start", { titles });
    const creationTimes = new Map<string, Date>();
    const enteredTitles = titles.filter(Boolean);
    const titleSet = new Set(enteredTitles);
    const uniqueTitles = [...titleSet];
    const cache = readCreationTimeCache();
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

    writeCreationTimeCache(cache);
    const entries = serializeCreationTimeEntries(creationTimes);
    logStep("fetchRevisionCreationTimes done", { entries });

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
    cache: CreationTimeCache,
    creationTimes: Map<string, Date>,
): Array<string> {
    const result = [];

    for (const title of titles) {
        const cacheTitle = normalizeCreationTimeCacheTitle(title);
        const cached = cache[cacheTitle];

        if (cached == null) {
            result.push(title);
        } else {
            const creationDate = new Date(cached);
            creationTimes.set(title, creationDate);
            logStep("fetchRevisionCreationTimes cache hit", {
                timestamp: cached,
                title,
            });
        }
    }

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
    api: mw.Api,
    titles: string[],
    cache: CreationTimeCache,
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
    cache: CreationTimeCache,
    titles: string[],
    times: Map<string, Date>,
): void {
    for (const [title, date] of times) {
        output.set(title, date);
        const cacheTitle = normalizeCreationTimeCacheTitle(title);
        cache[cacheTitle] = date.toISOString();
    }

    for (const title of titles) {
        const date = getCreationTimeForTitle(times, title);

        if (date != null) {
            output.set(title, date);
            const cacheTitle = normalizeCreationTimeCacheTitle(title);
            cache[cacheTitle] = date.toISOString();
        }
    }
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
    api: mw.Api,
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
    api: mw.Api,
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

        for (const [singleTitle, date] of single) {
            creationTimes.set(singleTitle, date);
        }
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
    api: mw.Api,
    titles: Array<string>,
): Promise<Map<string, Date>> {
    const namespaceGroup = getNamespaceGroupKey(titles[0]);
    logStep("fetchRevisionCreationTimeBatch start", {
        namespaceGroup,
        titles,
    });
    const joinedTitles = titles.join("|");
    const response = await loggedApiGet(api, "fetchRevisionCreationTimes", {
        action: "query",
        formatversion: "2",
        prop: "revisions",
        rvdir: "newer",
        rvlimit: 1,
        rvprop: "timestamp",
        titles: joinedTitles,
    });
    const creationTimes = parseRevisionCreationTimes(response);
    const entries = serializeCreationTimeEntries(creationTimes);

    logStep("fetchRevisionCreationTimeBatch done", {
        entries,
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
function parseRevisionCreationTimes(response: unknown): Map<string, Date> {
    const responseRecord = asRecord(response);
    const query = asRecord(responseRecord?.query);
    const pages = query?.pages;
    const creationTimes = new Map<string, Date>();
    const pageRecord = asRecord(pages);
    const pageList = Array.isArray(pages)
        ? pages
        : Object.values(pageRecord ?? {});

    for (const pageValue of pageList) {
        const page = asRecord(pageValue);
        const revision = getFirstRevision(page);
        const timestamp = revision?.timestamp;

        if (typeof timestamp === "string" && typeof page?.title === "string") {
            const creationDate = new Date(timestamp);
            creationTimes.set(page.title, creationDate);
        }
    }

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
    const groups = new Map<string, Array<string>>();

    for (const title of titles) {
        const key = getNamespaceGroupKey(title);

        if (!groups.has(key)) {
            groups.set(key, []);
        }

        groups.get(key)?.push(title);
    }

    const entries = [...groups.entries()];
    logStep("groupTitlesByNamespace", entries);
    return groups;
}

/**
 * Gets a conservative namespace group key from a title.
 *
 * @param title - Page title.
 * @returns Namespace key.
 */
function getNamespaceGroupKey(title: string): string {
    const namespaceId = getTitleNamespaceId(String(title || ""), "zhwiki");
    return namespaceId === 0 ? "" : String(namespaceId);
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
        return creationTimes.get(title) ?? null;
    }

    const normalized = normalizeCreationTimeCacheTitle(title);
    let found: Date | null = null;

    for (const [entryTitle, date] of creationTimes) {
        if (found == null) {
            const normalizedEntryTitle =
                normalizeCreationTimeCacheTitle(entryTitle);

            if (normalizedEntryTitle === normalized) {
                found = date;
            }
        }
    }

    return found;
}
