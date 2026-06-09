/* eslint-disable */

/**
 * Builds and resolves category review data.
 */

import {
  buildTemplateCall,
  uniqueValues,
} from "./utils.js";

const API_ENDPOINT = "/w/api.php";
const CATEGORY_NAMESPACE = "Category:";
const CATEGORY_BATCH_SIZE = 50;
const CATEGORY_REDIRECT_PROPS = [
  "category_redirect_target",
  "categoryredirect",
  "category_redirect",
];
const CATEGORY_STATUS = {
  exists: "OK",
  missing: "Not exists",
  unchecked: "",
};
const LEGACY_MANUAL_CATEGORY_SOURCE = "manual added";
const MODIFIED_SOURCE_SUFFIX = " †";
const SOURCE_DATA = "known";
const SOURCE_FETCH = "found";
const SOURCE_FITTING = "suggested";
const SOURCE_MANUAL = "manual";

/**
 * Creates a blank manual category review row.
 *
 * @returns {object} Category review row.
 */
export function createManualCategoryRow() {
  return createCategoryRow({
    source: SOURCE_MANUAL,
  });
}

/**
 * Resets an edited generated category row.
 *
 * @param {object} row - Category review row.
 * @returns {object} Reset category row.
 */
export function resetCategoryRow(row) {
  const source = getBaseSource(row.source);

  return normalizeCategoryRow({
    ...row,
    category: row.originalCategory,
    source,
    status: source === SOURCE_FITTING ? CATEGORY_STATUS.unchecked : row.status,
    stubTagEnabled: row.originalStubTagEnabled,
  });
}

/**
 * Resets edited generated category rows, preserving manual rows.
 *
 * @param {Array<object>} rows - Category review rows.
 * @returns {Array<object>} Reset category review rows.
 */
export function resetGeneratedCategoryRows(rows) {
  return rows.map((row) =>
    isManualCategoryRow(row)
      ? normalizeCategoryRow(row)
      : resetCategoryRow(row),
  );
}

/**
 * Updates an editable category title and refreshes its source marker.
 *
 * @param {object} row - Category review row.
 * @param {string} category - New category title.
 * @returns {object} Updated category review row.
 */
export function updateCategoryRowCategory(row, category) {
  return normalizeCategoryRow({
    ...row,
    category,
  });
}

/**
 * Builds category review rows from form values and article metadata.
 *
 * @param {object} form - Dialog form values.
 * @param {object} params - Normalized article parameters.
 * @param {Array<object>} [previousRows] - Existing category rows.
 * @param {object} [options] - API options.
 * @param {Function} [options.fetcher] - Fetch implementation.
 * @param {object} [options.cache] - Resolution cache keyed by category title.
 * @returns {Promise<Array<object>>} Category review rows.
 */
export async function buildCategoryRows(
  form,
  params,
  previousRows = [],
  options = {},
) {
  const generatedRows = await buildGeneratedCategoryRows(params, options);
  const mergedGeneratedRows = mergePreviousGeneratedRows(
    generatedRows,
    previousRows,
  );
  const rows = [
    ...(await resolveCheckableCategoryRows(mergedGeneratedRows, options)),
    ...(await resolveCategoryRows(
      getManualCategoryRows(previousRows),
      options,
    )),
  ];

  return uniqueCategoryRows(rows.map(normalizeCategoryRow));
}

/**
 * Builds fallback category review rows from article metadata.
 *
 * @param {object} params - Normalized article parameters.
 * @returns {Array<object>} Category review rows.
 */
export function buildFallbackCategoryRows(params) {
  return uniqueCategoryRows(
    [
      ...buildSourceCategoryRows(
        SOURCE_DATA,
        params.companyMetadata.categories,
        {
          stubTagEnabled: true,
          stubTags: params.companyMetadata.stubTags,
        },
      ),
      ...buildSourceCategoryRows(
        SOURCE_DATA,
        params.platformSeriesMetadata.categories,
        {
          stubTagEnabled: true,
          stubTags: params.platformSeriesMetadata.stubTags,
        },
      ),
      ...buildSourceCategoryRows(
        SOURCE_DATA,
        params.yearGenreMetadata.categories,
        {
          stubTagEnabled: true,
          stubTags: params.yearGenreMetadata.stubTags,
        },
      ),
    ].map(normalizeCategoryRow),
  );
}

/**
 * Builds category wikitext links from review rows.
 *
 * @param {Array<object>} rows - Category review rows.
 * @returns {Array<string>} Category link wikitext.
 */
export function buildCategoryLinks(rows) {
  return rows.filter(isRenderableCategoryRow).map(buildCategoryLink);
}

/**
 * Builds category wikitext from accepted article metadata.
 *
 * @param {object} params - Normalized article parameters.
 * @param {string} params.defaultSortText - DEFAULTSORT wikitext.
 * @param {Array<object>} params.categoryRows - Reviewed category rows.
 * @returns {string} Category wikitext.
 */
export function buildCategoryText(params) {
  const categoryText = getCategoryLinks(params).join("\n");

  if (categoryText === "") {
    return "";
  }

  return `${params.defaultSortText}\n${categoryText}`;
}

/**
 * Gets category links from reviewed rows or generated metadata.
 *
 * @param {object} params - Normalized article parameters.
 * @returns {Array<string>} Category links.
 */
export function getCategoryLinks(params) {
  if (params.categoryRows.length > 0) {
    return buildCategoryLinks(params.categoryRows);
  }

  return buildCategoryLinks(buildFallbackCategoryRows(params));
}

/**
 * Builds stub tag wikitext from accepted article metadata.
 *
 * @param {object} params - Normalized article parameters.
 * @returns {string} Stub tag wikitext.
 */
export function buildStubTagText(params) {
  return uniqueValues(getStubTags(params))
    .map(buildTemplateCall)
    .join("\n");
}

/**
 * Gets accepted stub tags from reviewed rows or generated metadata.
 *
 * @param {object} params - Normalized article parameters.
 * @returns {Array<string>} Stub tag template titles.
 */
function getStubTags(params) {
  const rows =
    params.categoryRows.length > 0
      ? params.categoryRows
      : buildFallbackCategoryRows(params);

  return rows
    .filter(isRenderableStubTagRow)
    .map((row) => row.stubTag)
    .filter(Boolean);
}

/**
 * Resolves category rows through the MediaWiki API.
 *
 * @param {Array<object>} rows - Category rows.
 * @param {object} [options] - API options.
 * @param {Function} [options.fetcher] - Fetch implementation.
 * @param {object} [options.cache] - Resolution cache keyed by category title.
 * @returns {Promise<Array<object>>} Resolved category rows.
 */
export async function resolveCategoryRows(rows, options = {}) {
  const normalizedRows = rows.map(normalizeCategoryRow);
  const categories = uniqueValues(
    normalizedRows.map((row) => row.category).filter(Boolean),
  );

  if (categories.length === 0) {
    return normalizedRows;
  }

  const resolutions = await resolveCategories(categories, options);

  return normalizedRows.map((row) =>
    normalizeCategoryRow({
      ...row,
      category:
        resolutions[normalizeCategoryKey(row.category)]?.category ||
        row.category,
      status:
        resolutions[normalizeCategoryKey(row.category)]?.status ||
        CATEGORY_STATUS.unchecked,
    }),
  );
}

/**
 * Builds generated category rows.
 *
 * @param {object} params - Normalized article parameters.
 * @param {object} options - API options.
 * @returns {Promise<Array<object>>} Generated category rows.
 */
async function buildGeneratedCategoryRows(params, options) {
  const companyRows = buildCategoryItems(
    params.companyMetadata.categoryItems,
    {
      source: SOURCE_DATA,
    },
  );
  const seriesRows = (params.platformSeriesMetadata.categoryPlans || []).map(
    createCategoryPlan,
  );
  const platformStubTagEnabled =
    params.platformSeriesMetadata.platformCount === 1;
  const metadataRows = [
    ...buildSourceCategoryRows(
      SOURCE_DATA,
      params.platformSeriesMetadata.categories,
      {
        stubTagEnabled: platformStubTagEnabled,
        stubTags: params.platformSeriesMetadata.stubTags,
      },
    ),
    ...buildSourceCategoryRows(
      SOURCE_DATA,
      params.yearGenreMetadata.categories,
      {
        stubTagEnabled: true,
        stubTags: params.yearGenreMetadata.stubTags,
      },
    ),
  ];
  const resolutions = await resolveCategories(
    uniqueValues(
      [
        ...companyRows.flatMap(getCategoryPlanCandidates),
        ...seriesRows.flatMap(getCategoryPlanCandidates),
        ...metadataRows.map((row) => row.category),
      ].filter(Boolean),
    ),
    options,
  );

  return [
    ...resolveCategoryPlans(companyRows, resolutions),
    ...resolveCategoryPlans(seriesRows, resolutions),
    ...applyCategoryResolutions(metadataRows, resolutions),
  ];
}

/**
 * Builds rows for one generated category source.
 *
 * @param {string} source - Category source label.
 * @param {Array<string>} categories - Category titles.
 * @param {object} [options] - Stub tag options.
 * @param {boolean} [options.stubTagEnabled] - Whether stub tags default on.
 * @param {Array<string>} [options.stubTags] - Corresponding stub tags.
 * @returns {Array<object>} Category rows.
 */
function buildSourceCategoryRows(source, categories, options = {}) {
  return (categories || []).map((category, index) => {
    const stubTag = options.stubTags?.[index] || "";

    return createCategoryRow({
      category,
      source,
      stubTag,
      stubTagEnabled: Boolean(options.stubTagEnabled && stubTag),
    });
  });
}

/**
 * Builds category rows and lookup plans from sector category items.
 *
 * @param {Array<object>} items - Sector category rows or lookup plans.
 * @param {object} [options] - Category row options.
 * @param {string} [options.source] - Category row source label.
 * @returns {Array<object>} Category rows or lookup plans.
 */
function buildCategoryItems(items = [], options = {}) {
  return items.map((item) => {
    if (Array.isArray(item.candidates)) {
      return createCategoryPlan(item);
    }

    return createCategoryRow({
      source: options.source,
      ...item,
    });
  });
}

/**
 * Creates one generated category lookup plan.
 *
 * @param {object} values - Plan values.
 * @param {Array<string>} values.candidates - Candidate category titles.
 * @param {string} values.fallback - Fallback category title.
 * @returns {object} Category lookup plan.
 */
function createCategoryPlan(values) {
  return {
    candidates: uniqueValues(values.candidates || []),
    company: values.company || "",
    fallback: values.fallback,
  };
}

/**
 * Gets candidate titles from generated rows and lookup plans.
 *
 * @param {object} item - Category row or lookup plan.
 * @returns {Array<string>} Candidate category titles.
 */
function getCategoryPlanCandidates(item) {
  if (Array.isArray(item.candidates)) {
    return item.candidates;
  }

  return item.category ? [item.category] : [];
}

/**
 * Materializes generated lookup plans using pre-fetched resolutions.
 *
 * @param {Array<object>} items - Category rows and lookup plans.
 * @param {object} resolutions - Category resolutions keyed by title.
 * @returns {Array<object>} Category rows.
 */
function resolveCategoryPlans(items, resolutions) {
  return items.map((item) => {
    if (!Array.isArray(item.candidates)) {
      return applyCategoryResolution(item, resolutions);
    }

    const resolution = item.candidates
      .map((candidate) => resolutions[normalizeCategoryKey(candidate)])
      .find((candidateResolution) => candidateResolution?.exists);

    if (resolution != null) {
      return createCategoryRow({
        category: resolution.category,
        company: item.company,
        source: SOURCE_FETCH,
        status: resolution.status,
      });
    }

    return createCategoryRow({
      category: item.fallback,
      company: item.company,
      enabled: false,
      source: SOURCE_FITTING,
      status: CATEGORY_STATUS.unchecked,
    });
  });
}

/**
 * Applies pre-fetched resolutions to category rows.
 *
 * @param {Array<object>} rows - Category rows.
 * @param {object} resolutions - Category resolutions keyed by title.
 * @returns {Array<object>} Category rows with resolved titles/statuses.
 */
function applyCategoryResolutions(rows, resolutions) {
  return rows.map((row) => applyCategoryResolution(row, resolutions));
}

/**
 * Applies one pre-fetched resolution to a category row.
 *
 * @param {object} row - Category row.
 * @param {object} resolutions - Category resolutions keyed by title.
 * @returns {object} Category row with resolved title/status.
 */
function applyCategoryResolution(row, resolutions) {
  const resolution = resolutions[normalizeCategoryKey(row.category)];
  const isEdited =
    normalizeCategoryKey(row.category) !==
    normalizeCategoryKey(row.originalCategory);

  return normalizeCategoryRow({
    ...row,
    category: resolution?.category || row.category,
    originalCategory:
      !isEdited && resolution?.category != null
        ? resolution.category
        : row.originalCategory,
    status: resolution?.status || CATEGORY_STATUS.unchecked,
  });
}

/**
 * Creates one category review row.
 *
 * @param {object} values - Row values.
 * @param {string} [values.category] - Category title without namespace.
 * @param {string} [values.company] - Company page title for category creation.
 * @param {boolean} [values.enabled] - Whether the row should render.
 * @param {string} [values.originalCategory] - Original generated category.
 * @param {string} [values.source] - Category source label.
 * @param {string} [values.stubTag] - Corresponding stub tag title.
 * @param {boolean} [values.stubTagEnabled] - Whether to render the stub tag.
 * @param {boolean} [values.originalStubTagEnabled] - Original stub tag state.
 * @returns {object} Category review row.
 */
function createCategoryRow(values = {}) {
  return normalizeCategoryRow({
    category: "",
    enabled: true,
    originalCategory: values.category || "",
    source: "",
    status: CATEGORY_STATUS.unchecked,
    stubTag: "",
    stubTagEnabled: false,
    originalStubTagEnabled: values.stubTagEnabled === true,
    ...values,
  });
}

/**
 * Normalizes one category review row.
 *
 * @param {object} row - Category row.
 * @returns {object} Normalized category row.
 */
function normalizeCategoryRow(row) {
  const originalCategory = normalizeCategoryTitle(
    row.originalCategory || row.category,
  );
  const category = normalizeCategoryTitle(row.category);
  const source = normalizeSourceLabel(row.source, category, originalCategory);

  return {
    category,
    company: trimValue(row.company),
    enabled: row.enabled !== false,
    originalCategory,
    source,
    status: trimValue(row.status),
    stubTag: trimValue(row.stubTag),
    stubTagEnabled: row.stubTagEnabled === true,
    originalStubTagEnabled:
      row.originalStubTagEnabled == null
        ? row.stubTagEnabled === true
        : row.originalStubTagEnabled === true,
  };
}

/**
 * Adds a modified marker to source labels for edited generated rows.
 *
 * @param {string} source - Source label.
 * @param {string} category - Current category.
 * @param {string} originalCategory - Original generated category.
 * @returns {string} Source label.
 */
function normalizeSourceLabel(source, category, originalCategory) {
  const cleanSource = trimValue(source).replace(
    new RegExp(`${escapeRegExp(MODIFIED_SOURCE_SUFFIX)}$`, "u"),
    "",
  );

  if (
    cleanSource === SOURCE_MANUAL ||
    cleanSource === LEGACY_MANUAL_CATEGORY_SOURCE ||
    category === "" ||
    originalCategory === "" ||
    normalizeCategoryKey(category) === normalizeCategoryKey(originalCategory)
  ) {
    return cleanSource;
  }

  return `${cleanSource}${MODIFIED_SOURCE_SUFFIX}`;
}

/**
 * Gets previous manual category rows.
 *
 * @param {Array<object>} rows - Existing category rows.
 * @returns {Array<object>} Manual category rows.
 */
function getManualCategoryRows(rows) {
  return rows.filter(isManualCategoryRow);
}

/**
 * Checks whether a row was manually added.
 *
 * @param {object} row - Category review row.
 * @returns {boolean} Whether the row is manual.
 */
function isManualCategoryRow(row) {
  return [SOURCE_MANUAL, LEGACY_MANUAL_CATEGORY_SOURCE].includes(
    getBaseSource(row.source),
  );
}

/**
 * Merges user edits into regenerated rows.
 *
 * @param {Array<object>} generatedRows - Generated category rows.
 * @param {Array<object>} previousRows - Existing category rows.
 * @returns {Array<object>} Merged category rows.
 */
function mergePreviousGeneratedRows(generatedRows, previousRows) {
  return generatedRows.map((row) => {
    const previous = previousRows.find((item) =>
      hasSameGeneratedRow(row, item),
    );

    if (previous == null) {
      return row;
    }

    return {
      ...row,
      category: previous.category,
      enabled: previous.enabled,
      stubTagEnabled:
        previous.stubTagEnabled == null
          ? row.stubTagEnabled
          : previous.stubTagEnabled,
    };
  });
}

/**
 * Resolves rows whose title should be checked, preserving unchecked suggestions.
 *
 * @param {Array<object>} rows - Category rows.
 * @param {object} options - API options.
 * @returns {Promise<Array<object>>} Category rows with refreshed statuses.
 */
async function resolveCheckableCategoryRows(rows, options) {
  const checkableRows = rows.filter(shouldCheckCategoryRow);
  const resolvedRows = await resolveCategoryRows(checkableRows, options);
  const resolvedByOriginal = Object.fromEntries(
    resolvedRows.map((row) => [getCategoryRowIdentity(row), row]),
  );

  return rows.map(
    (row) => resolvedByOriginal[getCategoryRowIdentity(row)] || row,
  );
}

/**
 * Checks whether a category row should be verified through the API.
 *
 * @param {object} row - Category review row.
 * @returns {boolean} Whether the row should be checked.
 */
function shouldCheckCategoryRow(row) {
  return (
    normalizeCategoryTitle(row.category) !== "" &&
    normalizeCategoryKey(row.category) !==
    normalizeCategoryKey(row.originalCategory)
  );
}

/**
 * Gets an identity key for matching rows across API resolution.
 *
 * @param {object} row - Category review row.
 * @returns {string} Category row identity.
 */
function getCategoryRowIdentity(row) {
  return `${getBaseSource(row.source)}\n${normalizeCategoryKey(row.originalCategory)}`;
}

/**
 * Checks whether two generated rows represent the same source category.
 *
 * @param {object} row - Generated row.
 * @param {object} previous - Previous row.
 * @returns {boolean} Whether the rows match.
 */
function hasSameGeneratedRow(row, previous) {
  return (
    getBaseSource(row.source) === getBaseSource(previous.source) &&
    normalizeCategoryKey(row.originalCategory) ===
    normalizeCategoryKey(previous.originalCategory)
  );
}

/**
 * Gets a source label without the modified suffix.
 *
 * @param {string} source - Source label.
 * @returns {string} Base source label.
 */
function getBaseSource(source) {
  return trimValue(source).replace(
    new RegExp(`${escapeRegExp(MODIFIED_SOURCE_SUFFIX)}$`, "u"),
    "",
  );
}

/**
 * Checks whether a row should be rendered as category wikitext.
 *
 * @param {object} row - Category review row.
 * @returns {boolean} Whether the row should render.
 */
function isRenderableCategoryRow(row) {
  return row.enabled !== false && normalizeCategoryTitle(row.category) !== "";
}

/**
 * Checks whether a row should render a stub tag.
 *
 * @param {object} row - Category review row.
 * @returns {boolean} Whether the row's stub tag should render.
 */
function isRenderableStubTagRow(row) {
  return (
    isRenderableCategoryRow(row) &&
    row.stubTagEnabled === true &&
    trimValue(row.stubTag) !== ""
  );
}

/**
 * Builds one category link.
 *
 * @param {object} row - Category review row.
 * @param {string} row.category - Category title without namespace.
 * @returns {string} Category wikitext.
 */
function buildCategoryLink(row) {
  return `[[Category:${row.category}]]`;
}

/**
 * Resolves category titles.
 *
 * @param {Array<string>} categories - Category titles without namespace.
 * @param {object} options - API options.
 * @returns {Promise<object>} Resolutions keyed by normalized category title.
 */
async function resolveCategories(categories, options) {
  const cache = options.cache || {};
  const missing = categories.filter(
    (category) => cache[normalizeCategoryKey(category)] == null,
  );
  const categoriesToFetch = options.bypassCache ? categories : missing;

  for (const batch of chunkValues(categoriesToFetch, CATEGORY_BATCH_SIZE)) {
    Object.assign(cache, await fetchCategoryResolutions(batch, options));
  }

  return Object.fromEntries(
    categories.map((category) => [
      normalizeCategoryKey(category),
      cache[normalizeCategoryKey(category)],
    ]),
  );
}

/**
 * Fetches category resolutions for one API batch.
 *
 * @param {Array<string>} categories - Category titles without namespace.
 * @param {object} options - API options.
 * @returns {Promise<object>} Resolutions keyed by normalized category title.
 */
async function fetchCategoryResolutions(categories, options) {
  try {
    const data = await fetchCategoryQuery(categories, options);
    const resolutions = Object.fromEntries(
      categories.map((category) => [
        normalizeCategoryKey(category),
        getCategoryResolution(category, data),
      ]),
    );
    const redirectTargets = uniqueValues(
      Object.values(resolutions)
        .map((resolution) => resolution.redirectTarget)
        .filter(Boolean),
    );

    if (redirectTargets.length === 0) {
      return addResolutionAliases(resolutions);
    }

    const redirectData = await fetchCategoryQuery(redirectTargets, options);

    redirectTargets.forEach((target) => {
      resolutions[normalizeCategoryKey(target)] = getCategoryResolution(
        target,
        redirectData,
      );
    });

    return addResolutionAliases(
      Object.fromEntries(
        Object.entries(resolutions).map(([key, resolution]) => [
          key,
          resolveCategoryRedirect(resolution, resolutions),
        ]),
      ),
    );
  } catch (_error) {
    return Object.fromEntries(
      categories.map((category) => [
        normalizeCategoryKey(category),
        {
          category: normalizeCategoryTitle(category),
          exists: false,
          status: CATEGORY_STATUS.missing,
        },
      ]),
    );
  }
}

/**
 * Stores each resolved title as an alias to avoid duplicate converted-title fetches.
 *
 * @param {object} resolutions - Category resolutions keyed by requested title.
 * @returns {object} Category resolutions with aliases.
 */
function addResolutionAliases(resolutions) {
  Object.values(resolutions).forEach((resolution) => {
    resolutions[normalizeCategoryKey(resolution.category)] = resolution;
  });

  return resolutions;
}

/**
 * Fetches one category query response.
 *
 * @param {Array<string>} categories - Category titles without namespace.
 * @param {object} options - API options.
 * @returns {Promise<object>} API response body.
 */
async function fetchCategoryQuery(categories, options) {
  const fetcher = options.fetcher || fetch;
  const response = await fetcher(buildCategoryApiUrl(categories), {
    headers: {
      accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Category request failed: HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Builds a MediaWiki category query URL.
 *
 * @param {Array<string>} categories - Category titles without namespace.
 * @returns {string} API URL.
 */
function buildCategoryApiUrl(categories) {
  const params = new URLSearchParams({
    action: "query",
    converttitles: "1",
    format: "json",
    formatversion: "2",
    prop: "info|pageprops",
    ppprop: CATEGORY_REDIRECT_PROPS.join("|"),
    redirects: "1",
    titles: categories.map(formatCategoryApiTitle).join("|"),
  });

  return `${API_ENDPOINT}?${params.toString()}`;
}

/**
 * Gets one category resolution from an API response.
 *
 * @param {string} category - Original category title.
 * @param {object} data - API response body.
 * @returns {object} Category resolution.
 */
function getCategoryResolution(category, data) {
  const title = getResolvedTitle(category, data);
  const page = getResolvedPage(title, data);

  return {
    category: normalizeCategoryTitle(title),
    redirectTarget: getCategoryRedirectTarget(page),
    exists: page != null && !page.missing,
    status:
      page != null && !page.missing
        ? CATEGORY_STATUS.exists
        : CATEGORY_STATUS.missing,
  };
}

/**
 * Resolves a category redirect target when available.
 *
 * @param {object} resolution - Category resolution.
 * @param {object} resolutions - Known resolutions keyed by category.
 * @returns {object} Final category resolution.
 */
function resolveCategoryRedirect(resolution, resolutions) {
  if (resolution.redirectTarget == null) {
    return resolution;
  }

  return (
    resolutions[normalizeCategoryKey(resolution.redirectTarget)] || {
      category: normalizeCategoryTitle(resolution.redirectTarget),
      exists: true,
      status: CATEGORY_STATUS.exists,
    }
  );
}

/**
 * Gets a resolved title from API normalization/conversion/redirect data.
 *
 * @param {string} category - Original category title.
 * @param {object} data - API response body.
 * @returns {string} Resolved category title.
 */
function getResolvedTitle(category, data) {
  return [
    data?.query?.normalized,
    data?.query?.converted,
    data?.query?.redirects,
  ]
    .flat()
    .filter(Boolean)
    .reduce(
      (title, item) =>
        normalizeCategoryKey(item.from) === normalizeCategoryKey(title)
          ? item.to
          : title,
      formatCategoryApiTitle(category),
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
    (page) => normalizeCategoryKey(page.title) === normalizeCategoryKey(title),
  );
}

/**
 * Gets a category redirect target from page props.
 *
 * @param {object} page - API page.
 * @returns {string|undefined} Redirect target.
 */
function getCategoryRedirectTarget(page) {
  const props = page?.pageprops || {};
  const target = CATEGORY_REDIRECT_PROPS.map((key) => props[key]).find(
    Boolean,
  );

  return target == null ? undefined : normalizeCategoryTitle(target);
}

/**
 * Formats a category title for API lookup.
 *
 * @param {string} category - Category title.
 * @returns {string} API page title.
 */
function formatCategoryApiTitle(category) {
  return `${CATEGORY_NAMESPACE}${normalizeCategoryTitle(category)}`;
}

/**
 * Normalizes a category title without namespace.
 *
 * @param {*} value - Raw category value.
 * @returns {string} Category title.
 */
function normalizeCategoryTitle(value) {
  return trimValue(value)
    .replace(/^Category:/iu, "")
    .trim();
}

/**
 * Normalizes a category title for lookup.
 *
 * @param {*} value - Raw category value.
 * @returns {string} Category key.
 */
function normalizeCategoryKey(value) {
  return normalizeCategoryTitle(value).replace(/_/gu, " ");
}

/**
 * Splits values into chunks.
 *
 * @param {Array<*>} values - Values to chunk.
 * @param {number} size - Chunk size.
 * @returns {Array<Array<*>>} Chunked values.
 */
function chunkValues(values, size) {
  const chunks = [];

  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }

  return chunks;
}

/**
 * Deduplicates category rows by category title.
 *
 * @param {Array<object>} rows - Category rows.
 * @returns {Array<object>} Unique category rows.
 */
function uniqueCategoryRows(rows) {
  const seen = new Set();

  return rows.filter((row) => {
    const key = normalizeCategoryKey(row.category);

    if (key === "" || seen.has(key)) {
      return false;
    }

    seen.add(key);

    return true;
  });
}

/**
 * Escapes a string for RegExp construction.
 *
 * @param {string} value - Value to escape.
 * @returns {string} Escaped value.
 */
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

/**
 * Trims a value.
 *
 * @param {*} value - Raw value.
 * @returns {string} Trimmed string.
 */
function trimValue(value) {
  return value == null ? "" : String(value).trim();
}
