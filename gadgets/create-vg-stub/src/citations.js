/* eslint-disable */

/**
 * Fetches Citoid metadata and formats it as citation template wikitext.
 */

const CITOID_ENDPOINT = "/api/rest_v1/data/citation/zotero/";
const DATE_PARTS_LENGTH = 10;

/**
 * Builds a cite template from the first Citoid result for a URL.
 *
 * @param {string} url - Source URL to resolve through Citoid.
 * @param {object} [options] - Fetch and formatting options.
 * @param {Function} [options.fetcher] - Fetch implementation.
 * @param {Date} [options.now] - Date used for access-date.
 * @returns {Promise<string>} Generated citation template wikitext.
 */
export async function fetchCiteTemplate(url, options = {}) {
  const fetcher = options.fetcher || fetch;
  const response = await fetcher(buildCitoidUrl(url), {
    headers: {
      accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Citoid request failed: HTTP ${response.status}`);
  }

  return buildCiteTemplate(getFirstCitation(await response.json()), {
    now: options.now,
    url,
  });
}

/**
 * Builds the Citoid REST URL for a source URL.
 *
 * @param {string} url - Source URL to resolve through Citoid.
 * @returns {string} Citoid request URL.
 */
export function buildCitoidUrl(url) {
  const trimmedUrl = url.trim();

  if (trimmedUrl === "") {
    throw new Error("Enter a URL before fetching a citation.");
  }

  return `${CITOID_ENDPOINT}${encodeURIComponent(trimmedUrl)}`;
}

/**
 * Builds citation template wikitext from one Zotero-style citation object.
 *
 * @param {object} citation - Zotero-style citation data.
 * @param {object} [options] - Formatting options.
 * @param {Date} [options.now] - Date used for access-date.
 * @param {string} [options.url] - Fallback source URL.
 * @returns {string} Citation template wikitext.
 */
export function buildCiteTemplate(citation, options = {}) {
  const values = buildCitationValues(citation, options);
  const params = Object.entries(values).filter(hasTemplateValue);

  return `{{${getTemplateName(citation.itemType)}${params
    .map(formatTemplateParam)
    .join("")}}}`;
}

/**
 * Gets the first Citoid citation from a response body.
 *
 * @param {Array<object>} citations - Citoid response body.
 * @returns {object} First citation object.
 */
function getFirstCitation(citations) {
  if (!Array.isArray(citations) || citations.length === 0) {
    throw new Error("Citoid did not return citation data.");
  }

  return citations[0];
}

/**
 * Builds normalized citation template values.
 *
 * @param {object} citation - Zotero-style citation data.
 * @param {object} options - Formatting options.
 * @param {Date} [options.now] - Date used for access-date.
 * @param {string} [options.url] - Fallback source URL.
 * @returns {object} Template parameter values.
 */
function buildCitationValues(citation, options) {
  return {
    accessDate: formatAccessDate(options.now),
    author: formatCreators(citation.creators, "author"),
    date: citation.date,
    language: citation.language,
    publisher: citation.publisher,
    title: citation.title,
    url: citation.url || options.url,
    website: citation.websiteTitle || citation.publicationTitle,
  };
}

/**
 * Checks whether a template parameter should be emitted.
 *
 * @param {Array<string>} entry - Template parameter entry.
 * @returns {boolean} Whether the value is present.
 */
function hasTemplateValue(entry) {
  const [_key, value] = entry;

  return value != null && String(value).trim() !== "";
}

/**
 * Formats one template parameter.
 *
 * @param {Array<string>} entry - Template parameter entry.
 * @returns {string} Template parameter wikitext.
 */
function formatTemplateParam(entry) {
  const [key, value] = entry;

  return `|${formatTemplateKey(key)}=${escapeTemplateValue(String(value))}`;
}

/**
 * Formats a JavaScript key as a citation template parameter.
 *
 * @param {string} key - Citation value key.
 * @returns {string} Template parameter key.
 */
function formatTemplateKey(key) {
  return key.replace(/[A-Z]/gu, "-$&").toLocaleLowerCase();
}

/**
 * Escapes values that would otherwise break a template parameter.
 *
 * @param {string} value - Template parameter value.
 * @returns {string} Escaped template parameter value.
 */
function escapeTemplateValue(value) {
  return value.trim().replace(/\|/gu, "{{!}}");
}

/**
 * Gets the citation template name for a Zotero item type.
 *
 * @param {string} itemType - Zotero item type.
 * @returns {string} Citation template name.
 */
function getTemplateName(itemType) {
  if (itemType === "journalArticle") {
    return "cite journal";
  }

  if (itemType === "book" || itemType === "bookSection") {
    return "cite book";
  }

  if (itemType === "newspaperArticle" || itemType === "magazineArticle") {
    return "cite news";
  }

  return "cite web";
}

/**
 * Formats matching creators as a joined author string.
 *
 * @param {Array<object>} creators - Zotero creator data.
 * @param {string} type - Creator type to include.
 * @returns {string} Joined creator names.
 */
function formatCreators(creators, type) {
  if (!Array.isArray(creators)) {
    return "";
  }

  return creators.filter(isCreatorType.bind(null, type)).map(formatCreator).join("; ");
}

/**
 * Checks whether a creator has the requested type.
 *
 * @param {string} type - Creator type to include.
 * @param {object} creator - Zotero creator data.
 * @returns {boolean} Whether the creator matches.
 */
function isCreatorType(type, creator) {
  return creator.creatorType === type;
}

/**
 * Formats one Zotero creator.
 *
 * @param {object} creator - Zotero creator data.
 * @returns {string} Creator display text.
 */
function formatCreator(creator) {
  if (creator.name != null) {
    return creator.name;
  }

  return [creator.firstName, creator.lastName].filter(Boolean).join(" ");
}

/**
 * Formats the access date for citation templates.
 *
 * @param {Date} [date] - Date used for access-date.
 * @returns {string} ISO date string.
 */
function formatAccessDate(date) {
  const accessDate = date || new Date();

  return accessDate.toISOString().slice(0, DATE_PARTS_LENGTH);
}
