/** Optional MediaWiki-backed redirect and missing-page lookup. */

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
    const titles = [...source.matchAll(/\[\[([^\]|#]+)(?:#[^\]|]*)?/gu)]
        .map((match) =>
            match[1].trim().replace(/^:/u, "").replaceAll("_", " "),
        )
        .filter((title) => title !== "" && !title.startsWith("#"));
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
 * @returns Resulting text.
 */
export function applyWikiLinkRedirects(
    source: string,
    redirects: Map<string, string>,
): string {
    return source.replace(
        /\[\[([^\]|#]+)(#[^\]|]*)?([\s\S]*?)\]\]/gu,
        function replaceRedirect(match, entered, fragment = "", tail = "") {
            const target = redirects.get(normalizeTitle(String(entered)));
            if (target == null) {
                return match;
            }
            return `[[${target}${fragment}${tail}]]`;
        },
    );
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
    const redirects = buildTitleMap(query?.redirects ?? []);
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
    const resolvedKey = normalizeTitle(resolvedTitle);
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

function resolveTitleAlias(
    title: string,
    aliases: ReadonlyMap<string, string>,
): string {
    let current = title;
    const visited = new Set<string>();
    let key = normalizeTitle(current);
    while (aliases.has(key) && !visited.has(key)) {
        visited.add(key);
        current = aliases.get(key) ?? current;
        key = normalizeTitle(current);
    }
    return current;
}

function normalizeTitle(title: string): string {
    return title.replaceAll("_", " ").trim().toLowerCase();
}
