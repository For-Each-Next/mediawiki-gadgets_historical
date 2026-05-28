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

    return parseEnwikiMetadata(title, await response.json());
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
 * Parses English Wikipedia metadata from an API response.
 *
 * @param {string} title - Fallback page title.
 * @param {object} data - API response data.
 * @returns {object} Page metadata.
 */
export function parseEnwikiMetadata(title, data) {
  const page = Object.values(data?.query?.pages || {})[0];

  if (page == null || page.missing != null) {
    return createBlankEnwikiMetadata(title);
  }

  return {
    title: page.title || title,
    wikidataId: page.pageprops?.wikibase_item || "",
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
    title,
    wikidataId: "",
  };
}

