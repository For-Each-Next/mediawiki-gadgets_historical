import { buildCiteTemplate } from "#gadget/domain/citations/index.ts";
import * as fallback from "#gadget/infra/sources/fallback-citation.ts";
import * as citoid from "#shared/citation";

const HTTP_NOT_FOUND = 404;

export interface CitationStore {
    fetch(url: string): Promise<string>;
    prefetch(url: string): void;
    refetch(url: string): Promise<string>;
}

export interface CitationStoreOptions {
    fetcher?: typeof fetch;
    now?: Date;
}

/**
 * Creates a cached citation fetch store.
 *
 * @param options - Citation request and formatting options.
 * @returns A cached citation fetch store.
 */
export function createCitationStore(
    options: CitationStoreOptions = {},
): CitationStore {
    const cache: Record<string, string> = {};
    const pending: Record<string, Promise<string>> = {};
    const store = {
        fetch: createCitationFetcher(cache, pending, options),
        prefetch: undefined,
        refetch: createCitationRefetcher(cache, pending, options),
    } as unknown as CitationStore;

    store.prefetch = createCitationPrefetcher(store);
    return store;
}

/**
 * Creates the cache-aware citation fetch method.
 *
 * @param cache - Cached values.
 * @param pending - Pending value.
 * @param options - Citation request and formatting options.
 * @returns The cache-aware citation fetch method.
 */
function createCitationFetcher(
    cache: Record<string, string>,
    pending: Record<string, Promise<string>>,
    options: CitationStoreOptions,
) {
    const result = function fetchCitation(url: string): Promise<string> {
        const key = url.trim();
        if (cache[key] != null) {
            return Promise.resolve(cache[key]);
        }
        if (pending[key] == null) {
            pending[key] = fetchAndCacheCitation(key, cache, options).finally(
                function callback() {
                    delete pending[key];
                },
            );
        }
        return pending[key];
    };
    return result;
}

/**
 * Creates the forced citation refresh method.
 *
 * @param cache - Cached values.
 * @param pending - Pending value.
 * @param options - Citation request and formatting options.
 * @returns The forced citation refresh method.
 */
function createCitationRefetcher(
    cache: Record<string, string>,
    pending: Record<string, Promise<string>>,
    options: CitationStoreOptions,
) {
    const result = function refetchCitation(url: string): Promise<string> {
        const key = url.trim();
        delete cache[key];
        delete pending[key];
        pending[key] = fetchAndCacheCitation(key, cache, options).finally(
            function callback() {
                delete pending[key];
            },
        );
        return pending[key];
    };
    return result;
}

/**
 * Fetches, formats, and stores one citation template.
 *
 * @param url - Url value.
 * @param cache - Cache value.
 * @param options - Operation options.
 * @returns Operation result.
 */
async function fetchAndCacheCitation(
    url: string,
    cache: Record<string, string>,
    options: CitationStoreOptions,
): Promise<string> {
    const template = await fetchCitationTemplate(url, options);
    cache[url] = template;
    return template;
}

/**
 * Fetches raw metadata before applying VG citation formatting.
 *
 * @param url - Url value.
 * @param options - Operation options.
 * @returns Operation result.
 */
async function fetchCitationTemplate(
    url: string,
    options: CitationStoreOptions,
): Promise<string> {
    try {
        const metadata = await citoid.fetchCitationMetadata(url, options);
        return buildCiteTemplate(metadata, {
            now: options.now,
            url,
        });
    } catch (error) {
        if (
            !(error instanceof citoid.CitoidRequestError) ||
            error.status !== HTTP_NOT_FOUND
        ) {
            throw error;
        }
        return fallback.buildFallbackCiteWebTemplate(url, options);
    }
}

/**
 * Creates the fire-and-forget prefetch method.
 *
 * @param store - Store value.
 * @returns The fire-and-forget prefetch method.
 */
function createCitationPrefetcher(store: CitationStore) {
    const result = function prefetchCitation(url: string): void {
        if (!isFetchableSourceUrl(url)) {
            return;
        }
        store.fetch(url).catch(function callback() {
            // Prefetch is opportunistic. A later explicit fetch reports
            // failures.
        });
    };
    return result;
}

/**
 * Checks whether a source URL can be fetched.
 *
 * @param url - Request URL.
 * @returns Whether a source URL can be fetched.
 */
function isFetchableSourceUrl(url: string): boolean {
    try {
        const trimmedUrl = url.trim();
        const parsed = new URL(trimmedUrl);
        return ["http:", "https:"].includes(parsed.protocol);
    } catch (_error) {
        return false;
    }
}
