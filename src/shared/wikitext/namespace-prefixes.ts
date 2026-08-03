/** Database-scoped MediaWiki namespace prefixes used in wikitext. */

export type NamespacePrefixMap = Readonly<Record<number, readonly string[]>>;

export type NamespaceIdMap = Readonly<Record<string, number>>;

/** Namespace aliases decoded for one MediaWiki database. */
export interface NamespaceCatalog {
    readonly databaseName: string;
    readonly namespaceIds: NamespaceIdMap;
    readonly namespacePrefixes: NamespacePrefixMap;
}

/**
 * Valid namespace prefixes reported by English and Chinese Wikipedia.
 *
 * Each namespace starts with its current name. A differing canonical
 * name and configured aliases follow. Data came from MediaWiki siteinfo
 * `namespaces` and `namespacealiases` properties.
 */
export const WIKI_NAMESPACE_PREFIXES = freezeNamespaceCatalogs({
    enwiki: {
        "-2": ["Media"],
        "-1": ["Special"],
        0: [""],
        1: ["Talk"],
        2: ["User"],
        3: ["User talk"],
        4: ["Wikipedia", "Project", "WP"],
        5: ["Wikipedia talk", "Project talk", "WT"],
        6: ["File", "Image"],
        7: ["File talk", "Image talk"],
        8: ["MediaWiki"],
        9: ["MediaWiki talk"],
        10: ["Template", "TM"],
        11: ["Template talk"],
        12: ["Help"],
        13: ["Help talk"],
        14: ["Category"],
        15: ["Category talk"],
        100: ["Portal"],
        101: ["Portal talk"],
        118: ["Draft"],
        119: ["Draft talk"],
        126: ["MOS"],
        127: ["MOS talk"],
        710: ["TimedText"],
        711: ["TimedText talk"],
        828: ["Module"],
        829: ["Module talk"],
        1728: ["Event"],
        1729: ["Event talk"],
    },
    zhwiki: {
        "-2": [
            "Media",
            "媒体",
            "媒体文件",
            "媒体档案",
            "媒體",
            "媒體文件",
            "媒體檔案",
        ],
        "-1": ["Special", "特殊"],
        0: [""],
        1: ["Talk", "对话", "對話", "討論", "讨论"],
        2: ["User", "U", "使用者", "用戶", "用户"],
        3: [
            "User talk",
            "UT",
            "使用者对话",
            "使用者對話",
            "使用者討論",
            "使用者讨论",
            "用戶對話",
            "用戶討論",
            "用户对话",
            "用户讨论",
        ],
        4: [
            "Wikipedia",
            "Project",
            "WP",
            "专案",
            "專案",
            "維基百科",
            "维基百科",
        ],
        5: [
            "Wikipedia talk",
            "Project talk",
            "WT",
            "Wikipedia对话",
            "Wikipedia對話",
            "Wikipedia討論",
            "Wikipedia讨论",
            "专案讨论",
            "專案討論",
            "維基百科對話",
            "維基百科討論",
            "维基百科对话",
            "维基百科讨论",
        ],
        6: [
            "File",
            "Image",
            "图像",
            "图片",
            "圖像",
            "圖片",
            "文件",
            "档案",
            "檔案",
        ],
        7: [
            "File talk",
            "Image talk",
            "图像对话",
            "图像讨论",
            "图片讨论",
            "圖像對話",
            "圖像討論",
            "圖片討論",
            "文件对话",
            "文件對話",
            "文件討論",
            "文件讨论",
            "档案对话",
            "档案讨论",
            "檔案對話",
            "檔案討論",
        ],
        8: ["MediaWiki"],
        9: ["MediaWiki talk", "MediaWiki討論", "MediaWiki讨论"],
        10: ["Template", "T", "样板", "模板", "樣板"],
        11: [
            "Template talk",
            "样板对话",
            "样板讨论",
            "模板对话",
            "模板對話",
            "模板討論",
            "模板讨论",
            "樣板對話",
            "樣板討論",
        ],
        12: [
            "Help",
            "H",
            "使用說明",
            "使用说明",
            "帮助",
            "幫助",
            "說明",
            "说明",
        ],
        13: [
            "Help talk",
            "使用說明討論",
            "使用说明讨论",
            "帮助对话",
            "帮助讨论",
            "幫助對話",
            "幫助討論",
            "說明討論",
            "说明讨论",
        ],
        14: ["Category", "CAT", "分类", "分類"],
        15: ["Category talk", "分类对话", "分类讨论", "分類對話", "分類討論"],
        100: ["Portal", "P", "主題", "主题"],
        101: ["Portal talk", "主題對話", "主題討論", "主题对话", "主题讨论"],
        102: [
            "WikiProject",
            "PJ",
            "WPJ",
            "专题",
            "專題",
            "維基專題",
            "维基专题",
        ],
        103: [
            "WikiProject talk",
            "PJT",
            "WPJT",
            "专题对话",
            "专题讨论",
            "專題對話",
            "專題討論",
            "維基專題對話",
            "維基專題討論",
            "维基专题对话",
            "维基专题讨论",
        ],
        118: ["Draft", "草稿"],
        119: ["Draft talk", "草稿討論", "草稿讨论"],
        126: ["MOS"],
        127: ["MOS talk"],
        710: ["TimedText"],
        711: ["TimedText talk"],
        828: ["Module", "模块", "模塊", "模組", "模组"],
        829: [
            "Module talk",
            "模块对话",
            "模块讨论",
            "模塊對話",
            "模塊討論",
            "模組對話",
            "模組討論",
            "模组对话",
            "模组讨论",
        ],
        1728: ["Event"],
        1729: ["Event talk"],
        2600: ["Topic", "話題", "话题"],
    },
} as const satisfies Readonly<Record<string, NamespacePrefixMap>>);

export type NamespaceDatabaseName = keyof typeof WIKI_NAMESPACE_PREFIXES;

export type NamespaceSource = NamespaceDatabaseName | NamespaceCatalog;

const EMPTY_NAMESPACE_PREFIXES: readonly string[] = Object.freeze([]);
const WIKI_NAMESPACE_IDS = Object.freeze({
    enwiki: createNamespaceIds(WIKI_NAMESPACE_PREFIXES.enwiki),
    zhwiki: createNamespaceIds(WIKI_NAMESPACE_PREFIXES.zhwiki),
}) satisfies Readonly<
    Record<NamespaceDatabaseName, Readonly<Record<string, number>>>
>;

/**
 * Decodes one namespace catalog from a MediaWiki siteinfo response.
 *
 * The caller remains responsible for requesting `namespaces` and
 * `namespacealiases`. Modern `name` and `alias` fields are accepted.
 * The legacy `*` field is accepted too.
 *
 * @param databaseName - Database that supplied the response.
 * @param response - MediaWiki `action=query&meta=siteinfo` response.
 * @returns Immutable namespace catalog.
 */
export function decodeNamespaceCatalog(
    databaseName: string,
    response: unknown,
): NamespaceCatalog {
    const namespacePrefixes = decodeNamespacePrefixes(response);
    return Object.freeze({
        databaseName,
        namespaceIds: createNamespaceIds(namespacePrefixes),
        namespacePrefixes,
    });
}

/**
 * Normalizes a namespace prefix like MediaWiki's `wgNamespaceIds` keys.
 *
 * @param prefix - Entered namespace prefix without a colon.
 * @returns Case-folded prefix with spaces and underscores normalized.
 */
export function normalizeNamespacePrefix(prefix: string): string {
    return prefix
        .trim()
        .replace(/[_\s]+/gu, "_")
        .toLowerCase();
}

/**
 * Normalizes only syntax-equivalent structure in a wikitext title key.
 *
 * Title casing remains intact because case rules are wiki-specific.
 * Callers should follow explicit API `normalized` and `converted`
 * mappings instead of case-folding whole titles.
 *
 * @param title - Entered title.
 * @returns Trimmed title with underscores represented as spaces.
 */
export function normalizeWikitextTitleKey(title: string): string {
    return title.replaceAll("_", " ").trim();
}

/**
 * Gets the namespace ID for a database-scoped prefix.
 *
 * @param source - Static database name or decoded namespace catalog.
 * @param prefix - Namespace prefix without a colon.
 * @returns Namespace ID when configured for the database.
 */
export function getNamespaceId(
    source: NamespaceSource,
    prefix: string,
): number | undefined {
    return getNamespaceIds(source)[normalizeNamespacePrefix(prefix)];
}

/**
 * Gets every configured prefix for one namespace.
 *
 * @param source - Static database name or decoded namespace catalog.
 * @param namespaceId - MediaWiki namespace ID.
 * @returns Current name, canonical name when different, and aliases.
 */
export function getNamespacePrefixes(
    source: NamespaceSource,
    namespaceId: number,
): readonly string[] {
    const prefixes: NamespacePrefixMap =
        typeof source === "string"
            ? WIKI_NAMESPACE_PREFIXES[source]
            : source.namespacePrefixes;
    return prefixes[namespaceId] ?? EMPTY_NAMESPACE_PREFIXES;
}

/**
 * Gets a reverse map compatible with `wgNamespaceIds` keys.
 *
 * @param source - Static database name or decoded namespace catalog.
 * @returns Normalized namespace prefixes keyed to namespace IDs.
 */
export function getNamespaceIds(
    source: NamespaceSource,
): Readonly<Record<string, number>> {
    return typeof source === "string"
        ? WIKI_NAMESPACE_IDS[source]
        : source.namespaceIds;
}

/**
 * Gets a title's namespace ID from its database-scoped prefix.
 *
 * Bare titles and unknown prefixes remain in the main namespace.
 * One leading colon used to force a wikitext link is ignored.
 *
 * @param value - Title to inspect.
 * @param source - Static database name or decoded namespace catalog.
 * @returns Resolved namespace ID.
 */
export function getTitleNamespaceId(
    value: string,
    source: NamespaceSource,
): number {
    const entered = readEnteredNamespacePrefix(value);
    return entered == null ? 0 : (getNamespaceId(source, entered.prefix) ?? 0);
}

/**
 * Checks whether a title enters a prefix for one namespace.
 *
 * @param value - Title to inspect.
 * @param source - Static database name or decoded namespace catalog.
 * @param namespaceId - Expected namespace ID.
 * @returns Whether an explicit matching prefix is present.
 */
export function hasNamespacePrefix(
    value: string,
    source: NamespaceSource,
    namespaceId: number,
): boolean {
    const entered = readEnteredNamespacePrefix(value);
    return (
        entered != null &&
        getNamespaceId(source, entered.prefix) === namespaceId
    );
}

/**
 * Removes a matching database-scoped namespace prefix from a title.
 *
 * @param value - Title with or without a namespace prefix.
 * @param source - Static database name or decoded namespace catalog.
 * @param namespaceId - Namespace ID to remove.
 * @returns Trimmed title without a matching prefix.
 */
export function stripNamespacePrefix(
    value: string,
    source: NamespaceSource,
    namespaceId: number,
): string {
    const title = value.trim();
    const entered = readEnteredNamespacePrefix(title);
    if (entered == null) {
        return title;
    }
    if (getNamespaceId(source, entered.prefix) !== namespaceId) {
        return title;
    }
    return title.slice(entered.separator + 1).trim();
}

/**
 * Formats a title with the database's current namespace name.
 *
 * @param value - Title with or without a matching namespace prefix.
 * @param source - Static database name or decoded namespace catalog.
 * @param namespaceId - Namespace ID to apply.
 * @returns Title formatted with the current namespace name.
 */
export function formatNamespaceTitle(
    value: string,
    source: NamespaceSource,
    namespaceId: number,
): string {
    const prefixes = getNamespacePrefixes(source, namespaceId);
    const prefix = prefixes[0];
    if (prefix == null) {
        const databaseName =
            typeof source === "string" ? source : source.databaseName;
        throw new RangeError(
            `Unknown ${databaseName} namespace ID: ${namespaceId}`,
        );
    }
    const title = stripNamespacePrefix(value, source, namespaceId);
    return prefix === "" ? title : `${prefix}:${title}`;
}

function decodeNamespacePrefixes(response: unknown): NamespacePrefixMap {
    const query = readRecord(readRecord(response)?.query);
    const namespaces = readRecord(query?.namespaces);
    const aliases = query?.namespacealiases;
    if (namespaces == null || !Array.isArray(aliases)) {
        throw invalidSiteinfoError();
    }
    const result = Object.create(null) as Record<number, readonly string[]>;
    for (const [enteredId, value] of Object.entries(namespaces)) {
        const namespace = readRecord(value);
        const namespaceId = readNamespaceId(namespace?.id, enteredId);
        const name = readNamespaceName(namespace);
        if (namespaceId == null || name == null) {
            throw invalidSiteinfoError();
        }
        const canonical = readOptionalString(namespace?.canonical);
        const configuredAliases = readNamespaceAliases(aliases, namespaceId);
        result[namespaceId] = Object.freeze(
            uniquePrefixes([name, canonical, ...configuredAliases]),
        );
    }
    return Object.freeze(result);
}

function readNamespaceAliases(
    values: unknown[],
    namespaceId: number,
): string[] {
    const aliases: string[] = [];
    for (const value of values) {
        const alias = readRecord(value);
        const aliasId = readNamespaceId(alias?.id);
        const name = readNamespaceName(alias);
        if (aliasId == null || name == null) {
            throw invalidSiteinfoError();
        }
        if (aliasId === namespaceId) {
            aliases.push(name);
        }
    }
    return aliases;
}

function readNamespaceId(value: unknown, fallback?: string): number | null {
    const namespaceId = typeof value === "number" ? value : Number(fallback);
    return Number.isInteger(namespaceId) ? namespaceId : null;
}

function readNamespaceName(
    value: Record<string, unknown> | null | undefined,
): string | null {
    if (value == null) {
        return null;
    }
    const name = value.name ?? value.alias ?? value["*"];
    return typeof name === "string" ? name : null;
}

function readOptionalString(value: unknown): string {
    return typeof value === "string" ? value : "";
}

function readRecord(value: unknown): Record<string, unknown> | null {
    return typeof value === "object" && value != null && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : null;
}

function invalidSiteinfoError(): TypeError {
    return new TypeError("Invalid MediaWiki namespace siteinfo response.");
}

function uniquePrefixes(prefixes: readonly string[]): string[] {
    const seen = new Set<string>();
    return prefixes.filter(function isFirst(prefix, index) {
        const normalized = normalizeNamespacePrefix(prefix);
        if ((prefix === "" && index > 0) || seen.has(normalized)) {
            return false;
        }
        seen.add(normalized);
        return true;
    });
}

function createNamespaceIds(
    prefixes: NamespacePrefixMap,
): Readonly<Record<string, number>> {
    const namespaceIds = Object.create(null) as Record<string, number>;
    for (const [namespaceId, values] of Object.entries(prefixes)) {
        for (const prefix of values) {
            namespaceIds[normalizeNamespacePrefix(prefix)] =
                Number(namespaceId);
        }
    }
    return Object.freeze(namespaceIds);
}

function freezeNamespaceCatalogs<
    Catalogs extends Readonly<Record<string, NamespacePrefixMap>>,
>(catalogs: Catalogs): Catalogs {
    for (const prefixes of Object.values(catalogs)) {
        for (const aliases of Object.values(prefixes)) {
            Object.freeze(aliases);
        }
        Object.freeze(prefixes);
    }
    return Object.freeze(catalogs);
}

function readEnteredNamespacePrefix(
    value: string,
): { prefix: string; separator: number } | null {
    const title = value.trim();
    let start = title.startsWith(":") ? 1 : 0;
    while (/\s/u.test(title[start] ?? "")) {
        start += 1;
    }
    const separator = title.indexOf(":", start);
    if (separator < 0) {
        return null;
    }
    return { prefix: title.slice(start, separator), separator };
}
