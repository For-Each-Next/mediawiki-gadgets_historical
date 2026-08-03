/** Namespace discovery with static Wikipedia fast paths. */

import {
    decodeNamespaceCatalog,
    getNamespacePrefixes,
    type NamespaceCatalog,
    type NamespaceDatabaseName,
    type NamespaceSource,
} from "#shared/wikitext";

export interface WikiNamespaceApi {
    get(parameters: Record<string, unknown>): PromiseLike<unknown>;
}

export interface WikiNamespaceState {
    /** Whether redirect rewrites preserve embed semantics. */
    redirectsSafe: boolean;
    source: NamespaceSource;
}

export interface WikiNamespaceResolver {
    current(): WikiNamespaceState;
    load(api: WikiNamespaceApi): Promise<WikiNamespaceState>;
}

const CANONICAL_FALLBACK_SOURCE = decodeNamespaceCatalog("unknownwiki", {
    query: {
        namespacealiases: [],
        namespaces: {
            0: { canonical: "", id: 0, name: "" },
            6: { canonical: "File", id: 6, name: "File" },
            10: { canonical: "Template", id: 10, name: "Template" },
            14: { canonical: "Category", id: 14, name: "Category" },
        },
    },
});
const FALLBACK_STATE = createState(CANONICAL_FALLBACK_SOURCE, false);

/**
 * Creates a cached namespace resolver for one MediaWiki database.
 *
 * English and Chinese Wikipedia use authored catalogs without a
 * request. Other databases retain a conservative fallback until
 * siteinfo is decoded.
 * Failed requests leave redirect rewriting disabled and may be retried.
 *
 * @param databaseName - Current MediaWiki database name.
 * @returns Namespace resolver.
 */
export function createWikiNamespaceResolver(
    databaseName: string,
): WikiNamespaceResolver {
    const staticSource = getStaticSource(databaseName);
    let state =
        staticSource == null
            ? FALLBACK_STATE
            : createState(staticSource, true);
    let pending: Promise<WikiNamespaceState> | null = null;

    return Object.freeze({
        current(): WikiNamespaceState {
            return state;
        },
        load(api: WikiNamespaceApi): Promise<WikiNamespaceState> {
            if (state.redirectsSafe) {
                return Promise.resolve(state);
            }
            if (pending != null) {
                return pending;
            }
            pending = loadNamespaceCatalog(api, databaseName)
                .then(function useCatalog(catalog) {
                    state = createState(catalog, true);
                    return state;
                })
                .catch(() => state)
                .finally(function clearPending() {
                    pending = null;
                });
            return pending;
        },
    });
}

async function loadNamespaceCatalog(
    api: WikiNamespaceApi,
    databaseName: string,
): Promise<NamespaceCatalog> {
    const response = await api.get({
        action: "query",
        formatversion: "2",
        meta: "siteinfo",
        siprop: "namespaces|namespacealiases",
    });
    const catalog = decodeNamespaceCatalog(databaseName, response);
    for (const namespaceId of [6, 10, 14]) {
        if (getNamespacePrefixes(catalog, namespaceId).length === 0) {
            const message =
                `Missing namespace ${namespaceId} ` + `for ${databaseName}.`;
            throw new TypeError(message);
        }
    }
    return catalog;
}

function getStaticSource(databaseName: string): NamespaceDatabaseName | null {
    return databaseName === "enwiki" || databaseName === "zhwiki"
        ? databaseName
        : null;
}

function createState(
    source: NamespaceSource,
    redirectsSafe: boolean,
): WikiNamespaceState {
    return Object.freeze({ redirectsSafe, source });
}
