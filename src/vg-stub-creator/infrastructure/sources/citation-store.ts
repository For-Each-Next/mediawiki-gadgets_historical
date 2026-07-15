import { cite } from "#shared";
const { fetchCiteTemplate } = cite;

export interface CitationStore {
    fetch(url: string): Promise<string>;
    prefetch(url: string): void;
    refetch(url: string): Promise<string>;
}

/** Creates a cached citation fetch store. */
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

/** Creates the cache-aware citation fetch method. */
function createCitationFetcher(cache, pending) {
    return function fetchCitation(url: string): Promise<string> {
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
}

/** Creates the forced citation refresh method. */
function createCitationRefetcher(cache, pending) {
    return function refetchCitation(url: string): Promise<string> {
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
}

/** Creates the fire-and-forget prefetch method. */
function createCitationPrefetcher(store: CitationStore) {
    return function prefetchCitation(url: string): void {
        if (!isFetchableSourceUrl(url)) {
            return;
        }
        store.fetch(url).catch(function callback() {});
    };
}

/** Checks whether a source URL can be fetched. */
function isFetchableSourceUrl(url: string): boolean {
    try {
        const parsed = new URL(url.trim());
        return ["http:", "https:"].includes(parsed.protocol);
    } catch (_error) {
        return false;
    }
}
