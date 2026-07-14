/**
 * Fetches cross-wiki page metadata.
 */

/**
 * Fetches metadata for an English Wikipedia page.
 *
 * @param title - English Wikipedia page title.
 * @param options - Fetch options.
 * @param options.fetcher - Fetch implementation.
 * @returns Page metadata.
 */
export async function fetchEnwikiMetadata(
    title: string,
    options: any = {},
): Promise<any> {
    const fetcher = options.fetcher || fetch;

    try {
        const response = await fetcher(buildEnwikiMetadataUrl(title), {
            headers: {
                accept: "application/json",
            },
        });

        if (!response.ok) {
            return createBlankEnwikiMetadata(title);
        }

        const metadata = parseEnwikiMetadata(title, await response.json());

        if (metadata.wikidataId === "") {
            return metadata;
        }

        try {
            const wikidataResponse = await fetcher(
                buildWikidataEntityUrl(metadata.wikidataId),
                {
                    headers: {
                        accept: "application/json",
                    },
                },
            );

            if (!wikidataResponse.ok) {
                return metadata;
            }

            return {
                ...metadata,
                ...parseWikidataIdentifiers(
                    metadata.wikidataId,
                    await wikidataResponse.json(),
                ),
            };
        } catch (_error) {
            return metadata;
        }
    } catch (_error) {
        return createBlankEnwikiMetadata(title);
    }
}


/**
 * Builds the English Wikipedia metadata API URL.
 *
 * @param title - English Wikipedia page title.
 * @returns API URL.
 */
export function buildEnwikiMetadataUrl(title: string): string {
    const params = new URLSearchParams({
        action: "query",
        format: "json",
        origin: "*",
        prop: "pageprops",
        titles: title,
    });

    return [
        "https://en.wikipedia.org/w/api.php",
        "?",
        params.toString(),
        "",
    ].join("");
}


/**
 * Builds the Wikidata entity API URL for external game identifiers.
 *
 * @param wikidataId - Wikidata entity ID.
 * @returns API URL.
 */
export function buildWikidataEntityUrl(wikidataId: string): string {
    const params = new URLSearchParams({
        action: "wbgetentities",
        format: "json",
        origin: "*",
        ids: wikidataId,
        props: "claims",
    });

    return [
        "https://www.wikidata.org/w/api.php",
        "?",
        params.toString(),
        "",
    ].join("");
}


/**
 * Parses English Wikipedia metadata from an API response.
 *
 * @param title - Fallback page title.
 * @param data - API response data.
 * @returns Page metadata.
 */
export function parseEnwikiMetadata(title: string, data: any): any {
    const page: any = Object.values(data?.query?.pages || {})[0];

    if (page == null || page.missing != null) {
        return {
            ...createBlankEnwikiMetadata(title),
            pageExists: false,
        };
    }

    return {
        pageExists: true,
        title: page.title || title,
        wikidataId: page.pageprops?.wikibase_item || "",
        ...createBlankExternalIdentifiers(),
    };
}


/**
 * Parses game website identifiers from a Wikidata entity response.
 *
 * @param wikidataId - Wikidata entity ID.
 * @param data - Wikidata API response data.
 * @returns External game identifiers.
 */
export function parseWikidataIdentifiers(wikidataId: string, data: any): any {
    const claims = data?.entities?.[wikidataId]?.claims || {};

    return {
        metacriticId: getClaimValue(claims.P12054),
        openCriticId: getClaimValue(claims.P2864),
        steamId: getClaimValue(claims.P1733),
    };
}


/**
 * Creates blank English Wikipedia metadata.
 *
 * @param title - Page title.
 * @returns Blank metadata.
 */
function createBlankEnwikiMetadata(title: string): any {
    return {
        pageExists: null,
        title,
        wikidataId: "",
        ...createBlankExternalIdentifiers(),
    };
}


/**
 * Creates blank external identifier values.
 *
 * @returns Blank identifier values.
 */
function createBlankExternalIdentifiers(): any {
    return {
        metacriticId: "",
        openCriticId: "",
        steamId: "",
    };
}


/**
 * Gets the first usable external identifier claim value.
 *
 * @param statements - Wikidata claim statements.
 * @returns External identifier, or an empty string.
 */
function getClaimValue(statements: Array<any>): string {
    const statement = (statements || []).find(function callback(item) {
        return (
            item.rank !== "deprecated" &&
            item.mainsnak?.snaktype === "value" &&
            item.mainsnak?.datavalue?.value != null
        );
    });

    return String(statement?.mainsnak?.datavalue?.value || "").trim();
}
