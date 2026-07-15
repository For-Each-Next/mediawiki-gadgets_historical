import { cite } from "#shared";
const { fetchCiteTemplate } = cite;

export interface CitationStore {
    fetch(url: string): Promise<string>;
    prefetch(url: string): void;
    refetch(url: string): Promise<string>;
}

/**
 * Creates a cached citation fetch store.
 *
 * @returns A cached citation fetch store.
 */
export function createCitationStore(): CitationStore {
    const cache: Record<string, string> = {};
    const pending: Record<string, Promise<string>> = {};
    const store = {
        fetch: createCitationFetcher(cache, pending),
        prefetch: undefined,
        refetch: createCitationRefetcher(cache, pending),
    } as unknown as CitationStore;

    store.prefetch = createCitationPrefetcher(store);
    return store;
}

/**
 * Creates the cache-aware citation fetch method.
 *
 * @param cache - Cached values.
 * @param pending - Pending value.
 * @returns The cache-aware citation fetch method.
 */
function createCitationFetcher(
    cache: Record<string, string>,
    pending: Record<string, Promise<string>>,
) {
    const result = function fetchCitation(url: string): Promise<string> {
        const key = url.trim();
        if (cache[key] != null) {
            return Promise.resolve(cache[key]);
        }
        if (pending[key] == null) {
            pending[key] = fetchCiteTemplate(key, { cache }).finally(
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
 * @returns The forced citation refresh method.
 */
function createCitationRefetcher(
    cache: Record<string, string>,
    pending: Record<string, Promise<string>>,
) {
    const result = function refetchCitation(url: string): Promise<string> {
        const key = url.trim();
        delete cache[key];
        delete pending[key];
        pending[key] = fetchCiteTemplate(key, { cache }).finally(
            function callback() {
                delete pending[key];
            },
        );
        return pending[key];
    };
    return result;
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
        store.fetch(url).catch(function callback() {});
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
        const parsed = new URL(url.trim());
        return ["http:", "https:"].includes(parsed.protocol);
    } catch (_error) {
        return false;
    }
}
