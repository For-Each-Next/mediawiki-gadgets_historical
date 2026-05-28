/* eslint-disable */

/**
 * Fetches Citoid metadata and formats it as citation template wikitext.
 */

const CITOID_ENDPOINT = "/api/rest_v1/data/citation/zotero/";
const CITATION_RULES = getCitationRules();
const DATE_PARTS_LENGTH = 10;

/**
 * Builds a cite template from the first Citoid result for a URL.
 *
 * @param {string} url - Source URL to resolve through Citoid.
 * @param {object} [options] - Fetch and formatting options.
 * @param {Function} [options.fetcher] - Fetch implementation.
 * @param {Date} [options.now] - Date used for access-date.
 * @param {object} [options.cache] - Citation cache keyed by source URL.
 * @returns {Promise<string>} Generated citation template wikitext.
 */
export async function fetchCiteTemplate(url, options = {}) {
  const cachedTemplate = getCachedCiteTemplate(url, options);

  if (cachedTemplate != null) {
    return cachedTemplate;
  }

  const fetcher = options.fetcher || fetch;
  const response = await fetcher(buildCitoidUrl(url), {
    headers: {
      accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Citoid request failed: HTTP ${response.status}`);
  }

  const citeTemplate = buildCiteTemplate(getFirstCitation(await response.json()), {
    now: options.now,
    rules: options.rules,
    url,
  });

  setCachedCiteTemplate(url, citeTemplate, options);

  return citeTemplate;
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
 * Gets a cached cite template for a URL.
 *
 * @param {string} url - Source URL.
 * @param {object} options - Fetch and formatting options.
 * @param {object} [options.cache] - Citation cache keyed by source URL.
 * @returns {string|undefined} Cached cite template.
 */
function getCachedCiteTemplate(url, options) {
  if (options.cache == null) {
    return undefined;
  }

  return options.cache[normalizeCitationCacheKey(url)];
}

/**
 * Stores a generated cite template for a URL.
 *
 * @param {string} url - Source URL.
 * @param {string} citeTemplate - Generated cite template.
 * @param {object} options - Fetch and formatting options.
 * @param {object} [options.cache] - Citation cache keyed by source URL.
 * @returns {void}
 */
function setCachedCiteTemplate(url, citeTemplate, options) {
  if (options.cache == null) {
    return;
  }

  options.cache[normalizeCitationCacheKey(url)] = citeTemplate;
}

/**
 * Normalizes the cache key for one source URL.
 *
 * @param {string} url - Source URL.
 * @returns {string} Cache key.
 */
function normalizeCitationCacheKey(url) {
  return url.trim();
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
  const values = applyCitationRules(buildCitationValues(citation, options), {
    rules: options.rules || CITATION_RULES,
    sourceUrl: options.url,
  });
  const params = Object.entries(values).filter(hasTemplateValue);

  return `{{${getTemplateName(citation.itemType)}${params
    .map(formatTemplateParam)
    .join("")}}}`;
}

/**
 * Gets bundled citation cleanup rules.
 *
 * @returns {Array<object>} Site-specific citation cleanup rules.
 */
function getCitationRules() {
  if (typeof __CREATE_VG_STUB_FIELD_DATA__ === "undefined") {
    return [];
  }

  return __CREATE_VG_STUB_FIELD_DATA__["citation-rules"] || [];
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
 * Applies site-specific cleanup rules to citation values.
 *
 * @param {object} values - Citation template values.
 * @param {object} options - Rule matching options.
 * @param {Array<object>} options.rules - Available cleanup rules.
 * @param {string} [options.sourceUrl] - Original user-entered source URL.
 * @returns {object} Cleaned citation template values.
 */
function applyCitationRules(values, options) {
  return getMatchingRules(options.rules, options.sourceUrl || values.url).reduce(
    applyCitationRule.bind(null, options.sourceUrl),
    values,
  );
}

/**
 * Applies one site-specific cleanup rule.
 *
 * @param {string} sourceUrl - Original user-entered source URL.
 * @param {object} values - Citation template values.
 * @param {object} rule - Site-specific cleanup rule.
 * @returns {object} Cleaned citation template values.
 */
function applyCitationRule(sourceUrl, values, rule) {
  return (rule.fixes || []).reduce(applyFieldFix.bind(null, sourceUrl), values);
}

/**
 * Applies a field fix to citation values.
 *
 * @param {string} sourceUrl - Original user-entered source URL.
 * @param {object} values - Citation template values.
 * @param {object} fix - Field fix definition.
 * @param {string} fix.action - Field fix action.
 * @param {string} fix.field - Citation value field.
 * @param {string|object} [fix.operand] - Optional fix operand.
 * @returns {object} Citation template values.
 */
function applyFieldFix(sourceUrl, values, fix) {
  if (fix.action === "omit") {
    return applyOmitFix(values, fix);
  }

  if (fix.action === "replace") {
    return applyReplaceFix(values, fix);
  }

  if (fix.action === "preserve-source-query") {
    return applyPreserveSourceQueryFix(sourceUrl, values, fix);
  }

  return values;
}

/**
 * Applies an omit fix to citation values.
 *
 * @param {object} values - Citation template values.
 * @param {object} fix - Field fix definition.
 * @param {string} fix.field - Citation value field.
 * @param {string} [fix.operand] - Value that should be omitted.
 * @returns {object} Citation template values.
 */
function applyOmitFix(values, fix) {
  if (fix.operand != null && values[fix.field] !== fix.operand) {
    return values;
  }

  return {
    ...values,
    [fix.field]: "",
  };
}

/**
 * Applies a regular expression replacement fix to citation values.
 *
 * @param {object} values - Citation template values.
 * @param {object} fix - Field fix definition.
 * @param {string} fix.field - Citation value field.
 * @param {object} fix.operand - Replace operand.
 * @param {string} fix.operand.pattern - Regular expression pattern to replace.
 * @param {string} [fix.operand.replacement] - Replacement value.
 * @returns {object} Citation template values.
 */
function applyReplaceFix(values, fix) {
  return {
    ...values,
    [fix.field]: replacePattern(values[fix.field], fix),
  };
}

/**
 * Applies a preserve-source-query fix to citation values.
 *
 * @param {string} sourceUrl - Original user-entered source URL.
 * @param {object} values - Citation template values.
 * @param {object} fix - Field fix definition.
 * @param {string} fix.field - Citation value field.
 * @returns {object} Citation template values.
 */
function applyPreserveSourceQueryFix(sourceUrl, values, fix) {
  return {
    ...values,
    [fix.field]: preserveSourceQuery(values[fix.field], sourceUrl, fix.operand),
  };
}

/**
 * Replaces a pattern in a value when possible.
 *
 * @param {string} value - Value to update.
 * @param {object} fix - Field fix definition.
 * @param {object} fix.operand - Replace operand.
 * @param {string} fix.operand.pattern - Regular expression pattern to replace.
 * @param {string} [fix.operand.replacement] - Replacement value.
 * @returns {string} Value with the pattern replaced.
 */
function replacePattern(value, fix) {
  const operand = fix.operand || {};

  if (value == null || operand.pattern == null) {
    return value;
  }

  return value.replace(
    new RegExp(operand.pattern, "u"),
    operand.replacement || "",
  );
}

/**
 * Preserves the original source query when Citoid omits it.
 *
 * @param {string} citationUrl - URL returned by Citoid.
 * @param {string} sourceUrl - Original user-entered source URL.
 * @param {Array<string>} [keys] - Query keys to preserve.
 * @returns {string} URL with original query values restored when possible.
 */
function preserveSourceQuery(citationUrl, sourceUrl, keys) {
  const citation = parseUrl(citationUrl);
  const source = parseUrl(sourceUrl);

  if (citation == null || source == null) {
    return citationUrl;
  }

  if (source.search === "") {
    return citationUrl;
  }

  getSourceQueryKeys(source, keys).forEach(
    preserveSourceQueryKey.bind(null, citation, source),
  );

  return citation.toString();
}

/**
 * Gets source query keys that should be preserved.
 *
 * @param {URL} source - Original source URL.
 * @param {Array<string>} [keys] - Query keys to preserve.
 * @returns {Array<string>} Query keys to preserve.
 */
function getSourceQueryKeys(source, keys) {
  if (Array.isArray(keys)) {
    return keys;
  }

  return Array.from(source.searchParams.keys());
}

/**
 * Preserves one query value from the source URL.
 *
 * @param {URL} citation - Citation URL returned by Citoid.
 * @param {URL} source - Original source URL.
 * @param {string} key - Query key to preserve.
 * @returns {void}
 */
function preserveSourceQueryKey(citation, source, key) {
  if (citation.searchParams.has(key) || !source.searchParams.has(key)) {
    return;
  }

  citation.searchParams.set(key, source.searchParams.get(key));
}

/**
 * Gets cleanup rules matching a URL host.
 *
 * @param {Array<object>} rules - Available cleanup rules.
 * @param {string} url - URL used to match cleanup rules.
 * @returns {Array<object>} Matching cleanup rules.
 */
function getMatchingRules(rules, url) {
  const globalRules = rules.filter(isGlobalRule);
  const parsedUrl = parseUrl(url);

  if (parsedUrl == null) {
    return globalRules;
  }

  return rules.filter(isMatchingRule.bind(null, parsedUrl.hostname));
}

/**
 * Checks whether a cleanup rule applies to all citations.
 *
 * @param {object} rule - Cleanup rule.
 * @returns {boolean} Whether the rule is global.
 */
function isGlobalRule(rule) {
  return rule.host == null;
}

/**
 * Checks whether a cleanup rule matches a host.
 *
 * @param {string} hostname - URL hostname.
 * @param {object} rule - Site-specific cleanup rule.
 * @returns {boolean} Whether the rule matches the host.
 */
function isMatchingRule(hostname, rule) {
  return rule.host == null || hostname === rule.host;
}

/**
 * Parses a URL, returning null for invalid values.
 *
 * @param {string} url - URL to parse.
 * @returns {URL|null} Parsed URL.
 */
function parseUrl(url) {
  try {
    return new URL(url);
  } catch (_error) {
    return null;
  }
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
