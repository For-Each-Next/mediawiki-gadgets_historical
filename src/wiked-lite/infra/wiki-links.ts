/** Optional MediaWiki-backed redirect and missing-page lookup. */

import {
    getNamespaceId,
    normalizeWikitextTitleKey,
    wikitext,
    type NamespaceSource,
} from "#shared/wikitext";

export interface WikiLinkLookup {
    missing: Set<string>;
    missingLinkClasses: string[];
    redirects: Map<string, string>;
}

export interface WikiLinkApi {
    get(parameters: Record<string, unknown>): PromiseLike<unknown>;
}

interface QueryPage {
    invalid?: boolean;
    linkclasses?: string[];
    missing?: boolean;
    title: string;
}

interface QueryTitleMapping {
    from: string;
    to: string;
    tofragment?: string;
}

interface QueryResponse {
    query?: {
        converted?: QueryTitleMapping[];
        interwiki?: Array<{ title: string }>;
        normalized?: QueryTitleMapping[];
        pages?: QueryPage[];
        redirects?: QueryTitleMapping[];
    };
}

interface LookupMergeContext {
    aliases: ReadonlyMap<string, string>;
    interwiki: ReadonlySet<string>;
    pages: ReadonlyMap<string, QueryPage>;
    redirects: ReadonlyMap<string, string>;
}

/**
 * Collects unique non-local article targets.
 *
 * @param source - Source text.
 * @returns Collected unique non-local article targets.
 */
export function collectWikiLinkTitles(source: string): string[] {
    const titles = wikitext(source)
        .link.getAll()
        .flatMap(function getTitle(range) {
            const inner = source.slice(range.start + 2, range.end - 2);
            const targetPart = wikitext(inner).splitRanges("|")[0];
            if (targetPart == null) {
                return [];
            }
            const target = parseWikiLinkTarget(targetPart.value);
            return target == null ? [] : [target.title.replaceAll("_", " ")];
        });
    return [...new Set(titles)];
}

/**
 * Looks up redirect targets and missing pages in API-sized batches.
 *
 * @param api - MediaWiki API client.
 * @param titles - Titles value.
 * @returns Operation result.
 */
export async function lookupWikiLinks(
    api: WikiLinkApi,
    titles: string[],
): Promise<WikiLinkLookup> {
    const lookup: WikiLinkLookup = {
        missing: new Set<string>(),
        missingLinkClasses: [],
        redirects: new Map<string, string>(),
    };
    for (let start = 0; start < titles.length; start += 50) {
        const batch = titles.slice(start, start + 50);
        const response = (await api.get({
            action: "query",
            converttitles: 1,
            formatversion: 2,
            inprop: "linkclasses",
            iwurl: 1,
            prop: "info",
            redirects: 1,
            titles: batch.join("|"),
        })) as QueryResponse;
        mergeLookup(lookup, batch, response.query);
    }
    return lookup;
}

/**
 * Rewrites exact wikilink targets with confirmed redirects.
 *
 * @param source - Source text.
 * @param redirects - Redirects value.
 * @param namespaceSource - Database-scoped namespace data.
 * @returns Resulting text.
 */
export function applyWikiLinkRedirects(
    source: string,
    redirects: Map<string, string>,
    namespaceSource: NamespaceSource = "enwiki",
): string {
    return rewriteWikiLinks(source, { namespaceSource, redirects });
}

function rewriteWikiLinks(
    source: string,
    context: WikiLinkRewriteContext,
): string {
    const links = wikitext(source)
        .link.getAll()
        .filter((range) => range.depth === 0);
    const result: string[] = [];
    let cursor = 0;

    for (const range of links) {
        result.push(source.slice(cursor, range.start));
        result.push(
            rewriteWikiLink(source.slice(range.start, range.end), context),
        );
        cursor = range.end;
    }
    result.push(source.slice(cursor));
    return result.join("");
}

interface WikiLinkRewriteContext {
    namespaceSource: NamespaceSource;
    redirects: ReadonlyMap<string, string>;
}

interface WikiLinkTarget {
    escaped: boolean;
    fragment: string;
    title: string;
}

interface WikiLinkEmbedding {
    entered: boolean;
    prefix: string;
}

function rewriteWikiLink(
    link: string,
    context: WikiLinkRewriteContext,
): string {
    const inner = rewriteWikiLinks(link.slice(2, -2), context);
    const rewrittenLink = `[[${inner}]]`;
    const parts = wikitext(inner).splitRanges("|");
    const targetPart = parts[0];
    if (targetPart == null) {
        return rewrittenLink;
    }
    const entered = parseWikiLinkTarget(targetPart.value);
    if (entered == null) {
        return rewrittenLink;
    }
    const target = context.redirects.get(normalizeTitle(entered.title));
    if (target == null) {
        return rewrittenLink;
    }
    const targetTitle = stripTitleFragment(target);
    const targetFragment = entered.fragment || getTitleFragment(target);
    const embedding = getWikiLinkEmbedding(
        entered,
        targetTitle,
        context.namespaceSource,
    );
    if (embedding == null) {
        return rewrittenLink;
    }
    const rewrittenTarget =
        `${embedding.prefix}${targetTitle}` + targetFragment;
    const tail = inner.slice(targetPart.end);
    if (tail !== "" || embedding.entered) {
        return `[[${rewrittenTarget}${tail}]]`;
    }
    const label = `${entered.title}${entered.fragment}`.replaceAll("_", " ");
    return `[[${rewrittenTarget}|${label}]]`;
}

function getWikiLinkEmbedding(
    entered: WikiLinkTarget,
    targetTitle: string,
    namespaceSource: NamespaceSource,
): WikiLinkEmbedding | null {
    const enteredNamespace = getEmbeddedLinkNamespaceId(
        entered,
        namespaceSource,
    );
    const targetNamespace = getEmbeddedNamespaceId(
        targetTitle,
        namespaceSource,
    );
    if (enteredNamespace != null && enteredNamespace !== targetNamespace) {
        return null;
    }
    const needsEscape = entered.escaped || targetNamespace != null;
    return {
        entered: enteredNamespace != null,
        prefix: needsEscape && enteredNamespace == null ? ":" : "",
    };
}

function parseWikiLinkTarget(value: string): WikiLinkTarget | null {
    let target = value.trim();
    const escaped = target.startsWith(":");
    if (escaped) {
        target = target.slice(1).trimStart();
    }
    const fragmentStart = target.indexOf("#");
    const title = (
        fragmentStart < 0 ? target : target.slice(0, fragmentStart)
    ).trim();
    if (title === "") {
        return null;
    }
    const fragment = fragmentStart < 0 ? "" : target.slice(fragmentStart);
    return { escaped, fragment, title };
}

function getEmbeddedLinkNamespaceId(
    target: WikiLinkTarget,
    namespaceSource: NamespaceSource,
): number | undefined {
    if (target.escaped) {
        return undefined;
    }
    return getEmbeddedNamespaceId(target.title, namespaceSource);
}

function getEmbeddedNamespaceId(
    title: string,
    namespaceSource: NamespaceSource,
): number | undefined {
    const separator = title.indexOf(":");
    if (separator < 0) {
        return undefined;
    }
    const namespaceId = getNamespaceId(
        namespaceSource,
        title.slice(0, separator),
    );
    return namespaceId === 6 || namespaceId === 14 ? namespaceId : undefined;
}

function mergeLookup(
    target: WikiLinkLookup,
    requestedTitles: string[],
    query: QueryResponse["query"],
): void {
    const aliases = buildTitleMap([
        ...(query?.normalized ?? []),
        ...(query?.converted ?? []),
    ]);
    const redirects = buildRedirectMap(query?.redirects ?? []);
    const pages = new Map(
        (query?.pages ?? []).map((page) => [normalizeTitle(page.title), page]),
    );
    const interwiki = new Set(
        (query?.interwiki ?? []).map((page) => normalizeTitle(page.title)),
    );
    const context = { aliases, interwiki, pages, redirects };

    for (const enteredTitle of requestedTitles) {
        mergeRequestedTitle(target, enteredTitle, context);
    }
}

function mergeRequestedTitle(
    target: WikiLinkLookup,
    enteredTitle: string,
    context: LookupMergeContext,
): void {
    const enteredKey = normalizeTitle(enteredTitle);
    const convertedTitle = resolveTitleAlias(enteredTitle, context.aliases);
    const resolvedTitle = resolveTitleAlias(convertedTitle, context.redirects);
    if (normalizeTitle(convertedTitle) !== normalizeTitle(resolvedTitle)) {
        target.redirects.set(enteredKey, resolvedTitle);
    }
    const resolvedKey = normalizeTitle(stripTitleFragment(resolvedTitle));
    const page = context.pages.get(resolvedKey);
    if (
        context.interwiki.has(resolvedKey) ||
        (page != null && page.invalid !== true && page.missing !== true)
    ) {
        return;
    }
    target.missing.add(enteredKey);
    if (target.missingLinkClasses.length === 0 && page?.linkclasses != null) {
        target.missingLinkClasses = page.linkclasses
            .map((name) => String(name).trim())
            .filter(Boolean);
    }
}

function buildTitleMap(mappings: QueryTitleMapping[]): Map<string, string> {
    return new Map(
        mappings.map((mapping) => [normalizeTitle(mapping.from), mapping.to]),
    );
}

function buildRedirectMap(mappings: QueryTitleMapping[]): Map<string, string> {
    return new Map(
        mappings.map((mapping) => [
            normalizeTitle(mapping.from),
            appendTitleFragment(mapping.to, mapping.tofragment),
        ]),
    );
}

function resolveTitleAlias(
    title: string,
    aliases: ReadonlyMap<string, string>,
): string {
    let current = stripTitleFragment(title);
    let fragment = getTitleFragment(title);
    const visited = new Set<string>();
    let key = normalizeTitle(current);
    while (aliases.has(key) && !visited.has(key)) {
        visited.add(key);
        const mapped = aliases.get(key) ?? current;
        current = stripTitleFragment(mapped);
        fragment ||= getTitleFragment(mapped);
        key = normalizeTitle(current);
    }
    return `${current}${fragment}`;
}

function appendTitleFragment(title: string, fragment?: string): string {
    return fragment == null || fragment === ""
        ? title
        : `${stripTitleFragment(title)}#${fragment}`;
}

function stripTitleFragment(title: string): string {
    return title.split("#", 1)[0] ?? title;
}

function getTitleFragment(title: string): string {
    const fragmentStart = title.indexOf("#");
    return fragmentStart < 0 ? "" : title.slice(fragmentStart);
}

function normalizeTitle(title: string): string {
    return normalizeWikitextTitleKey(title);
}
