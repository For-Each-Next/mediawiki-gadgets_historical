/* eslint-disable */

/**
 * Builds and resolves category review data.
 */

import { uniqueValues } from "../shared/utils.js";
import {
    normalizeTitleKey,
    resolvePageTitles,
    stripNamespace,
} from "./title-resolver.js";
import { sortCategoryRowsByProse } from "../wikitext/categories.js";

const CATEGORY_NAMESPACE = "Category";
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
        status:
            source === SOURCE_FITTING ? CATEGORY_STATUS.unchecked : row.status,
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

    return sortRowsByArticleProse(
        uniqueCategoryRows(rows.map(normalizeCategoryRow)),
        params,
    );
}

/**
 * Builds fallback category review rows from article metadata.
 *
 * @param {object} params - Normalized article parameters.
 * @returns {Array<object>} Category review rows.
 */
export function buildFallbackCategoryRows(params) {
    const metadata = getArticleCategoryMetadata(params);

    return sortRowsByArticleProse(
        uniqueCategoryRows(
            [
                ...buildSourceCategoryRows(
                    SOURCE_DATA,
                    metadata.companies.assumedCategories ||
                        metadata.companies.categories,
                    {
                        stubTagEnabled: true,
                        stubTags:
                            metadata.companies.assumedStubTags ||
                            metadata.companies.stubTags,
                    },
                ),
                ...buildSourceCategoryRows(
                    SOURCE_DATA,
                    metadata.platform.assumedCategories ||
                        metadata.platform.categories,
                    {
                        stubTagEnabled: true,
                        stubTags:
                            metadata.platform.assumedStubTags ||
                            metadata.platform.stubTags,
                    },
                ),
                ...buildSourceCategoryRows(
                    SOURCE_DATA,
                    metadata.release.categories,
                    {
                        stubTagEnabled: true,
                        stubTags: metadata.release.stubTags,
                    },
                ),
            ].map(normalizeCategoryRow),
        ),
        params,
    );
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
    const metadata = getArticleCategoryMetadata(params);
    const companyRows = buildCategoryItems(metadata.companies.categoryItems, {
        source: SOURCE_DATA,
    });
    const seriesRows = (metadata.series.categoryPlans || []).map(
        createCategoryPlan,
    );
    const platformStubTagEnabled = metadata.platform.count === 1;
    const metadataRows = [
        ...buildSourceCategoryRows(
            SOURCE_DATA,
            metadata.platform.assumedCategories ||
                metadata.platform.categories,
            {
                stubTagEnabled: platformStubTagEnabled,
                stubTags:
                    metadata.platform.assumedStubTags ||
                    metadata.platform.stubTags,
            },
        ),
        ...buildSourceCategoryRows(SOURCE_DATA, metadata.release.categories, {
            stubTagEnabled: true,
            stubTags: metadata.release.stubTags,
        }),
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
 * Gets category metadata from article records or legacy parameters.
 *
 * @param {object} params - Processed article data or legacy parameters.
 * @returns {object} Category metadata grouped by owning part.
 */
function getArticleCategoryMetadata(params) {
    if (params.records == null) {
        return {
            companies: params.companyMetadata,
            platform: {
                ...params.platformSeriesMetadata,
                count: params.platformSeriesMetadata.platformCount,
            },
            release: params.yearGenreMetadata,
            series: params.platformSeriesMetadata,
        };
    }

    return {
        companies: params.records.companies,
        platform: {
            ...params.records.platform,
            count: params.records.platform.metadata.count,
        },
        release: {
            categories: uniqueValues([
                ...params.records.genre.assumedCategories,
                ...params.records.year.assumedCategories,
            ]),
            stubTags: uniqueValues([
                ...params.records.genre.assumedStubTags,
                ...params.records.year.assumedStubTags,
            ]),
        },
        series: params.records.series,
    };
}

/**
 * Sorts category rows by their first related mention in generated prose.
 *
 * @param {Array<object>} rows - Category review rows.
 * @param {object} params - Processed article data or legacy parameters.
 * @returns {Array<object>} Prose-ordered category rows.
 */
function sortRowsByArticleProse(rows, params) {
    return sortCategoryRowsByProse(rows, params.prose?.text || "");
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
    const source = normalizeSourceLabel(
        row.source,
        category,
        originalCategory,
    );

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
        normalizeCategoryKey(category) ===
            normalizeCategoryKey(originalCategory)
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
            pendingCreation: previous.pendingCreation,
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
 * Resolves category titles.
 *
 * @param {Array<string>} categories - Category titles without namespace.
 * @param {object} options - API options.
 * @returns {Promise<object>} Resolutions keyed by normalized category title.
 */
async function resolveCategories(categories, options) {
    const values = await resolvePageTitles(
        categories,
        {
            getRedirectTarget: getCategoryRedirectTarget,
            namespace: CATEGORY_NAMESPACE,
            pageProps: CATEGORY_REDIRECT_PROPS.join("|"),
            prop: "info|pageprops",
        },
        options,
    );
    const resolutions = Object.fromEntries(
        Object.entries(values).map(([key, resolution]) => [
            key,
            {
                ...resolution,
                category: resolution.title,
                status: resolution.exists
                    ? CATEGORY_STATUS.exists
                    : CATEGORY_STATUS.missing,
            },
        ]),
    );

    return resolutions;
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
function normalizeCategoryTitle(value) {
    return stripNamespace(value, CATEGORY_NAMESPACE);
}

/**
 * Normalizes a category title for lookup.
 *
 * @param {*} value - Raw category value.
 * @returns {string} Category key.
 */
function normalizeCategoryKey(value) {
    return normalizeTitleKey(value, CATEGORY_NAMESPACE);
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
