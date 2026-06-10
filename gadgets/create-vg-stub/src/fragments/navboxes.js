/* eslint-disable */

/**
 * Resolves series navbox templates for generated video game stubs.
 */

import {
  buildTemplateCall,
  splitLookupFieldValues,
  trimValue,
  uniqueValues,
} from "../utils.js";

const API_ENDPOINT = "/w/api.php";
const TEMPLATE_NAMESPACE = "Template:";
const TEMPLATE_BATCH_SIZE = 50;

/**
 * Builds navbox template calls for series values.
 *
 * @param {string|Array<string>} seriesNames - User-entered series names.
 * @param {object} [options] - API options.
 * @param {Function} [options.fetcher] - Fetch implementation.
 * @returns {Promise<string>} Navbox wikitext.
 */
export async function buildNavboxText(seriesNames, options = {}) {
  const plans = buildNavboxPlans(seriesNames);

  if (plans.length === 0) {
    return "";
  }

  const resolutions = await resolveTemplates(
    uniqueValues(plans.flatMap((plan) => plan.candidates)),
    options,
  );

  return uniqueValues(
    plans
      .map((plan) => getFirstExistingTemplate(plan.candidates, resolutions))
      .filter(Boolean),
  )
    .map(buildTemplateCall)
    .join("\n");
}

/**
 * Builds navbox wikitext from selected review rows.
 *
 * @param {Array<object|string>} rows - Reviewed navbox rows.
 * @returns {string} Selected navbox wikitext.
 */
export function buildReviewedNavboxText(rows) {
  return rows
    .filter((row) => row?.enabled !== false)
    .map((row) => trimValue(row?.text ?? row))
    .filter(Boolean)
    .map((text) => text.startsWith("{{") ? text : buildTemplateCall(text))
    .join("\n");
}

/**
 * Resolves reviewed navbox rows through conversion and redirects.
 *
 * @param {Array<object|string>} values - Reviewed navbox rows.
 * @param {object} [options] - API options.
 * @param {Function} [options.fetcher] - Fetch implementation.
 * @returns {Promise<Array<object>>} Resolved navbox rows.
 */
export async function resolveReviewedNavboxRows(values, options = {}) {
  const rows = values.map(createReviewedNavboxRow);
  const titles = uniqueValues(rows.map((row) => row.title).filter(Boolean));

  if (titles.length === 0) {
    return rows;
  }

  const resolutions = await resolveTemplates(titles, options);

  return rows.map((row) => {
    const resolution = resolutions[normalizeTemplateKey(row.title)];
    const title = resolution?.template || row.title;

    return {
      ...row,
      status: resolution?.exists ? "OK" : "Not exists",
      text: replaceTemplateTitle(row.text, title),
      title,
    };
  });
}

/**
 * Creates one normalized reviewed navbox row.
 *
 * @param {object|string} value - Existing row or navbox wikitext.
 * @returns {object} Reviewed navbox row.
 */
function createReviewedNavboxRow(value) {
  const text = trimValue(value?.text ?? value);
  const title = getTemplateCallTitle(text);

  return {
    enabled: value?.enabled !== false,
    status: "",
    text,
    title,
  };
}

/**
 * Gets a template title from a template call.
 *
 * @param {string} text - Template call wikitext.
 * @returns {string} Template title without namespace.
 */
function getTemplateCallTitle(text) {
  const match = text.match(/^\{\{\s*(?:Template:)?([^|}]+).*?\}\}$/iu);

  return normalizeTemplateTitle(match?.[1] || text);
}

/**
 * Replaces a template call title while retaining its parameters.
 *
 * @param {string} text - Template call wikitext.
 * @param {string} title - Resolved template title.
 * @returns {string} Updated template call.
 */
function replaceTemplateTitle(text, title) {
  if (!text.trimStart().startsWith("{{")) {
    return title;
  }

  return text.replace(
    /^(\{\{\s*)(?:Template:)?([^|}]+)/iu,
    `$1${title}`,
  );
}

/**
 * Builds series navbox lookup plans.
 *
 * @param {string|Array<string>} seriesNames - User-entered series names.
 * @returns {Array<object>} Navbox lookup plans.
 */
function buildNavboxPlans(seriesNames) {
  return getSeriesValues(seriesNames).map((series) => ({
    candidates: buildNavboxCandidates(series),
  }));
}

/**
 * Gets normalized series values for navbox lookup.
 *
 * @param {string|Array<string>} seriesNames - User-entered series names.
 * @returns {Array<string>} Normalized series values.
 */
function getSeriesValues(seriesNames) {
  const values = Array.isArray(seriesNames)
    ? seriesNames.flatMap(splitLookupFieldValues)
    : splitLookupFieldValues(seriesNames || "");

  return uniqueValues(values.map(trimSeriesSuffix).filter(Boolean));
}

/**
 * Removes a redundant Chinese series suffix from one value.
 *
 * @param {string} value - Raw series value.
 * @returns {string} Series value without a trailing suffix.
 */
function trimSeriesSuffix(value) {
  return trimValue(value).replace(/系列$/u, "");
}

/**
 * Builds navbox template candidates for one series.
 *
 * @param {string} series - Series title.
 * @returns {Array<string>} Candidate template titles without namespace.
 */
function buildNavboxCandidates(series) {
  return [
    `${series}系列电子游戏`,
    `${series}电子游戏`,
    `${series}系列`,
    series,
  ];
}

/**
 * Gets the first existing template from a candidate list.
 *
 * @param {Array<string>} candidates - Candidate template titles.
 * @param {object} resolutions - Resolutions keyed by template title.
 * @returns {string|undefined} Existing resolved template title.
 */
function getFirstExistingTemplate(candidates, resolutions) {
  return candidates
    .map((candidate) => resolutions[normalizeTemplateKey(candidate)])
    .find((resolution) => resolution?.exists)?.template;
}

/**
 * Resolves template titles.
 *
 * @param {Array<string>} templates - Template titles without namespace.
 * @param {object} options - API options.
 * @returns {Promise<object>} Resolutions keyed by normalized template title.
 */
async function resolveTemplates(templates, options) {
  const resolutions = {};

  for (const batch of chunkValues(templates, TEMPLATE_BATCH_SIZE)) {
    Object.assign(resolutions, await fetchTemplateResolutions(batch, options));
  }

  return resolutions;
}

/**
 * Fetches template resolutions for one API batch.
 *
 * @param {Array<string>} templates - Template titles without namespace.
 * @param {object} options - API options.
 * @returns {Promise<object>} Resolutions keyed by template title.
 */
async function fetchTemplateResolutions(templates, options) {
  try {
    const data = await fetchTemplateQuery(templates, options);

    return addResolutionAliases(
      Object.fromEntries(
        templates.map((template) => [
          normalizeTemplateKey(template),
          getTemplateResolution(template, data),
        ]),
      ),
    );
  } catch (_error) {
    return Object.fromEntries(
      templates.map((template) => [
        normalizeTemplateKey(template),
        {
          exists: false,
          template: normalizeTemplateTitle(template),
        },
      ]),
    );
  }
}

/**
 * Stores each resolved title as an alias to avoid duplicate converted-title fetches.
 *
 * @param {object} resolutions - Resolutions keyed by requested title.
 * @returns {object} Template resolutions with aliases.
 */
function addResolutionAliases(resolutions) {
  Object.values(resolutions).forEach((resolution) => {
    resolutions[normalizeTemplateKey(resolution.template)] = resolution;
  });

  return resolutions;
}

/**
 * Fetches one template query response.
 *
 * @param {Array<string>} templates - Template titles without namespace.
 * @param {object} options - API options.
 * @returns {Promise<object>} API response body.
 */
async function fetchTemplateQuery(templates, options) {
  const fetcher = options.fetcher || fetch;
  const response = await fetcher(buildTemplateApiUrl(templates), {
    headers: {
      accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Template request failed: HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Builds a MediaWiki template query URL.
 *
 * @param {Array<string>} templates - Template titles without namespace.
 * @returns {string} API URL.
 */
function buildTemplateApiUrl(templates) {
  const params = new URLSearchParams({
    action: "query",
    converttitles: "1",
    format: "json",
    formatversion: "2",
    redirects: "1",
    titles: templates.map(formatTemplateApiTitle).join("|"),
  });

  return `${API_ENDPOINT}?${params.toString()}`;
}

/**
 * Gets one template resolution from an API response.
 *
 * @param {string} template - Original template title.
 * @param {object} data - API response body.
 * @returns {object} Template resolution.
 */
function getTemplateResolution(template, data) {
  const title = getResolvedTitle(template, data);
  const page = getResolvedPage(title, data);

  return {
    exists: page != null && !page.missing,
    template: normalizeTemplateTitle(title),
  };
}

/**
 * Gets a resolved title from API normalization/conversion/redirect data.
 *
 * @param {string} template - Original template title.
 * @param {object} data - API response body.
 * @returns {string} Resolved template title.
 */
function getResolvedTitle(template, data) {
  return [
    data?.query?.normalized,
    data?.query?.converted,
    data?.query?.redirects,
  ]
    .flat()
    .filter(Boolean)
    .reduce(
      (title, item) =>
        normalizeTemplateKey(item.from) === normalizeTemplateKey(title)
          ? item.to
          : title,
      formatTemplateApiTitle(template),
    );
}

/**
 * Gets the API page matching a resolved title.
 *
 * @param {string} title - Resolved page title.
 * @param {object} data - API response body.
 * @returns {object|undefined} API page.
 */
function getResolvedPage(title, data) {
  return (data?.query?.pages || []).find(
    (page) => normalizeTemplateKey(page.title) === normalizeTemplateKey(title),
  );
}

/**
 * Formats a title for API template queries.
 *
 * @param {string} template - Template title with or without namespace.
 * @returns {string} Template API title.
 */
function formatTemplateApiTitle(template) {
  const title = trimValue(template);

  return title.startsWith(TEMPLATE_NAMESPACE)
    ? title
    : `${TEMPLATE_NAMESPACE}${title}`;
}

/**
 * Removes the template namespace from a title.
 *
 * @param {string} template - Template title with or without namespace.
 * @returns {string} Template title without namespace.
 */
function normalizeTemplateTitle(template) {
  return trimValue(template).replace(/^Template:/u, "");
}

/**
 * Normalizes a template title for lookup.
 *
 * @param {string} template - Template title with or without namespace.
 * @returns {string} Normalized template key.
 */
function normalizeTemplateKey(template) {
  return normalizeTemplateTitle(template).replace(/_/gu, " ");
}

/**
 * Splits an array into fixed-size chunks.
 *
 * @param {Array<string>} values - Values to split.
 * @param {number} size - Chunk size.
 * @returns {Array<Array<string>>} Chunked values.
 */
function chunkValues(values, size) {
  const chunks = [];

  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }

  return chunks;
}
