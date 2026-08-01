/** Optional MediaWiki-backed redirect and missing-page lookup. */

export interface WikiLinkLookup {
    missing: Set<string>;
    redirects: Map<string, string>;
}

interface QueryPage {
    missing?: boolean;
    title: string;
}

interface QueryResponse {
    query?: {
        normalized?: Array<{ from: string; to: string }>;
        pages?: QueryPage[];
        redirects?: Array<{ from: string; to: string }>;
    };
}

/**
 * Collects unique non-local article targets.
 *
 * @param source - Source text.
 * @returns Collected unique non-local article targets.
 */
export function collectWikiLinkTitles(source: string): string[] {
    const titles = [...source.matchAll(/\[\[([^\]|#]+)(?:#[^\]|]*)?/gu)]
        .map((match) => match[1].trim().replaceAll("_", " "))
        .filter((title) => title !== "" && !/^[:#]/u.test(title));
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
    api: mw.Api,
    titles: string[],
): Promise<WikiLinkLookup> {
    const lookup: WikiLinkLookup = {
        missing: new Set<string>(),
        redirects: new Map<string, string>(),
    };
    for (let start = 0; start < titles.length; start += 50) {
        const response = (await api.get({
            action: "query",
            formatversion: 2,
            redirects: 1,
            titles: titles.slice(start, start + 50).join("|"),
        })) as QueryResponse;
        mergeLookup(lookup, response.query);
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
    query: QueryResponse["query"],
): void {
    const aliases = new Map<string, string>();
    for (const item of query?.normalized ?? []) {
        aliases.set(normalizeTitle(item.from), item.to);
    }
    for (const item of query?.redirects ?? []) {
        const from = aliases.get(normalizeTitle(item.from)) ?? item.from;
        target.redirects.set(normalizeTitle(from), item.to);
    }
    for (const page of query?.pages ?? []) {
        if (page.missing === true) {
            target.missing.add(normalizeTitle(page.title));
        }
    }
}

function normalizeTitle(title: string): string {
    return title.replaceAll("_", " ").trim().toLowerCase();
}
