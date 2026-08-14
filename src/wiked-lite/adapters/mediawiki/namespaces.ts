/** Namespace discovery with static Wikipedia fast paths. */

import type { Logger } from "#shared/logging";
import {
    decodeNamespaceCatalog,
    getNamespacePrefixes,
    type NamespaceCatalog,
    type NamespaceDatabaseName,
    type NamespaceSource,
} from "#shared/wiki-titles";

import type {
    MagicWordAliases,
    TemplateMagicWordCatalog,
} from "#gadget/domain/magic-words.ts";

export interface WikiNamespaceApi {
    get(parameters: Record<string, unknown>): PromiseLike<unknown>;
}

export interface WikiNamespaceState {
    /** Whether redirect rewrites preserve embed semantics. */
    redirectsSafe: boolean;
    source: NamespaceSource;
    /** Site syntax used to classify template-like constructs. */
    templateMagicWords: TemplateMagicWordCatalog | null;
    /** Whether template redirects are safe to rewrite. */
    templateRedirectsSafe: boolean;
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
const FALLBACK_STATE = createState(
    CANONICAL_FALLBACK_SOURCE,
    false,
    null,
    false,
);

interface LoadedSiteinfo {
    source: NamespaceCatalog;
    templateMagicWords: TemplateMagicWordCatalog | null;
}

interface MagicWordRecord {
    aliases: string[];
    caseSensitive: boolean;
}

const MODIFIER_MAGIC_WORDS = Object.freeze({
    message: ["msg", "msgnw"],
    raw: ["raw"],
    substitution: ["subst", "safesubst"],
} as const);

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
    logger?: Logger,
): WikiNamespaceResolver {
    let state = createInitialState(databaseName);
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
            pending = loadSiteinfo(api, databaseName)
                .then(function useCatalog(siteinfo) {
                    state = createState(
                        siteinfo.source,
                        true,
                        siteinfo.templateMagicWords,
                        siteinfo.templateMagicWords != null,
                    );
                    return state;
                })
                .catch(function retainFallback(error) {
                    logger?.warn("load.failed", { databaseName, error });
                    return state;
                })
                .finally(function clearPending() {
                    pending = null;
                });
            return pending;
        },
    });
}

function createInitialState(databaseName: string): WikiNamespaceState {
    const staticSource = getStaticSource(databaseName);
    return staticSource == null
        ? FALLBACK_STATE
        : createState(staticSource, true, null, true);
}

async function loadSiteinfo(
    api: WikiNamespaceApi,
    databaseName: string,
): Promise<LoadedSiteinfo> {
    const response = await api.get({
        action: "query",
        formatversion: "2",
        meta: "siteinfo",
        siprop:
            "namespaces|namespacealiases|magicwords|variables|" +
            "functionhooks",
    });
    const source = decodeNamespaceCatalog(databaseName, response);
    for (const namespaceId of [6, 10, 14]) {
        if (getNamespacePrefixes(source, namespaceId).length === 0) {
            const message =
                `Missing namespace ${namespaceId} ` + `for ${databaseName}.`;
            throw new TypeError(message);
        }
    }
    return {
        source,
        templateMagicWords: decodeTemplateMagicWords(response),
    };
}

function decodeTemplateMagicWords(
    response: unknown,
): TemplateMagicWordCatalog | null {
    const query = readRecord(readRecord(response)?.query);
    const records = decodeMagicWordRecords(query?.magicwords);
    const variableIds = readStringList(query?.variables);
    const functionIds = readStringList(query?.functionhooks);
    if (records == null || variableIds == null || functionIds == null) {
        return null;
    }
    const variables = createAliasCatalog(variableIds, records, false);
    const functions = createAliasCatalog(functionIds, records, true);
    const modifiers = decodeModifierAliases(records);
    if (variables == null || functions == null || modifiers == null) {
        return null;
    }
    return Object.freeze({ functions, modifiers, variables });
}

function decodeMagicWordRecords(
    value: unknown,
): Map<string, MagicWordRecord> | null {
    if (!Array.isArray(value)) {
        return null;
    }
    const records = new Map<string, MagicWordRecord>();
    for (const item of value) {
        const record = readRecord(item);
        const name = readNonemptyString(record?.name);
        const aliases = readStringList(record?.aliases);
        const caseSensitive = record?.["case-sensitive"];
        if (
            name == null ||
            aliases == null ||
            aliases.length === 0 ||
            typeof caseSensitive !== "boolean" ||
            records.has(name)
        ) {
            return null;
        }
        records.set(name, { aliases, caseSensitive });
    }
    return records;
}

function decodeModifierAliases(
    records: ReadonlyMap<string, MagicWordRecord>,
): TemplateMagicWordCatalog["modifiers"] | null {
    const message = createAliasCatalog(
        MODIFIER_MAGIC_WORDS.message,
        records,
        true,
    );
    const raw = createAliasCatalog(MODIFIER_MAGIC_WORDS.raw, records, true);
    const substitution = createAliasCatalog(
        MODIFIER_MAGIC_WORDS.substitution,
        records,
        true,
    );
    return message == null || raw == null || substitution == null
        ? null
        : Object.freeze({ message, raw, substitution });
}

function createAliasCatalog(
    ids: readonly string[],
    records: ReadonlyMap<string, MagicWordRecord>,
    callable: boolean,
): MagicWordAliases | null {
    const caseInsensitive = new Set<string>();
    const caseSensitive = new Set<string>();
    for (const id of ids) {
        const record = records.get(id);
        if (record == null) {
            return null;
        }
        const target = record.caseSensitive ? caseSensitive : caseInsensitive;
        for (const entered of record.aliases) {
            const alias = callable ? normalizeCallableAlias(entered) : entered;
            if (alias === "") {
                return null;
            }
            target.add(record.caseSensitive ? alias : alias.toLowerCase());
        }
    }
    return Object.freeze({ caseInsensitive, caseSensitive });
}

function normalizeCallableAlias(value: string): string {
    return value.endsWith(":") || value.endsWith("：")
        ? value.slice(0, -1)
        : value;
}

function readStringList(value: unknown): string[] | null {
    if (!Array.isArray(value)) {
        return null;
    }
    const result = value.map(readNonemptyString);
    return result.includes(null) ? null : (result as string[]);
}

function readNonemptyString(value: unknown): string | null {
    return typeof value === "string" && value.trim() !== ""
        ? value.trim()
        : null;
}

function readRecord(value: unknown): Record<string, unknown> | null {
    return typeof value === "object" && value != null && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : null;
}

function getStaticSource(databaseName: string): NamespaceDatabaseName | null {
    return databaseName === "enwiki" || databaseName === "zhwiki"
        ? databaseName
        : null;
}

function createState(
    source: NamespaceSource,
    redirectsSafe: boolean,
    templateMagicWords: TemplateMagicWordCatalog | null,
    templateRedirectsSafe: boolean,
): WikiNamespaceState {
    return Object.freeze({
        redirectsSafe,
        source,
        templateMagicWords,
        templateRedirectsSafe,
    });
}
