/* eslint-disable */

/**
 * Fetches cross-wiki page metadata.
 */

/**
 * Fetches metadata for an English Wikipedia page.
 *
 * @param {string} title - English Wikipedia page title.
 * @param {object} [options] - Fetch options.
 * @param {Function} [options.fetcher] - Fetch implementation.
 * @returns {Promise<object>} Page metadata.
 */
export async function fetchEnwikiMetadata(title, options = {}) {
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
 * @param {string} title - English Wikipedia page title.
 * @returns {string} API URL.
 */
export function buildEnwikiMetadataUrl(title) {
    const params = new URLSearchParams({
        action: "query",
        format: "json",
        origin: "*",
        prop: "pageprops",
        titles: title,
    });

    return `https://en.wikipedia.org/w/api.php?${params.toString()}`;
}

/**
 * Builds the Wikidata entity API URL for external game identifiers.
 *
 * @param {string} wikidataId - Wikidata entity ID.
 * @returns {string} API URL.
 */
export function buildWikidataEntityUrl(wikidataId) {
    const params = new URLSearchParams({
        action: "wbgetentities",
        format: "json",
        origin: "*",
        ids: wikidataId,
        props: "claims",
    });

    return `https://www.wikidata.org/w/api.php?${params.toString()}`;
}

/**
 * Parses English Wikipedia metadata from an API response.
 *
 * @param {string} title - Fallback page title.
 * @param {object} data - API response data.
 * @returns {object} Page metadata.
 */
export function parseEnwikiMetadata(title, data) {
    const page = Object.values(data?.query?.pages || {})[0];

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
 * @param {string} wikidataId - Wikidata entity ID.
 * @param {object} data - Wikidata API response data.
 * @returns {object} External game identifiers.
 */
export function parseWikidataIdentifiers(wikidataId, data) {
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
 * @param {string} title - Page title.
 * @returns {object} Blank metadata.
 */
function createBlankEnwikiMetadata(title) {
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
 * @returns {object} Blank identifier values.
 */
function createBlankExternalIdentifiers() {
    return {
        metacriticId: "",
        openCriticId: "",
        steamId: "",
    };
}

/**
 * Gets the first usable external identifier claim value.
 *
 * @param {Array<object>} statements - Wikidata claim statements.
 * @returns {string} External identifier, or an empty string.
 */
function getClaimValue(statements) {
    const statement = (statements || []).find(
        (item) =>
            item.rank !== "deprecated" &&
            item.mainsnak?.snaktype === "value" &&
            item.mainsnak?.datavalue?.value != null,
    );

    return String(statement?.mainsnak?.datavalue?.value || "").trim();
}
