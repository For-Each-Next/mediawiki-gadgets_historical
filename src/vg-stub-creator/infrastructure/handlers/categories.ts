import { getDefinitionCollections } from "#stub/terms";
import {
    normalizeTitleKey,
    resolvePageTitles,
    stripNamespace,
} from "#stub/handlers/title-resolver.ts";
import { sortCategoryRowsByProse } from "#stub/wiki";
import { wikitext } from "#shared";
const { uniqueValues } = wikitext;

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
 * @returns Category review row.
 */
export function createManualCategoryRow(): any {
    return createCategoryRow({
        source: SOURCE_MANUAL,
    });
}

/**
 * Updates an editable category title and refreshes its source marker.
 *
 * @param row - Category review row.
 * @param category - New category title.
 * @returns Updated category review row.
 */
export function updateCategoryRowCategory(row: any, category: string): any {
    return normalizeCategoryRow({
        ...row,
        category,
    });
}

/**
 * Builds category review rows from form values and article metadata.
 *
 * @param params - Normalized article parameters.
 * @param previousRows - Existing category rows.
 * @param options - API options.
 * @param options.fetcher - Fetch implementation.
 * @param options.cache - Resolution cache keyed by category
 * title.
 * @returns Category review rows.
 */
export async function buildCategoryRows(
    params: any,
    previousRows: Array<any> = [],
    options: any = {},
): Promise<Array<any>> {
    const generatedRows = await buildGeneratedCategoryRows(params, options);
    const mergedGeneratedRows = mergePreviousGeneratedRows(
        generatedRows,
        previousRows,
    );
    const resolvedGeneratedRows = await resolveCheckableCategoryRows(
        mergedGeneratedRows,
        options,
    );
    const rows = [
        ...resolvedGeneratedRows,
        ...enrichManualCategoryRows(
            await resolveCategoryRows(
                getManualCategoryRows(previousRows),
                options,
            ),
            resolvedGeneratedRows,
        ),
    ];

    return sortRowsByArticleProse(
        uniqueCategoryRows(rows.map(normalizeCategoryRow)),
        params,
    );
}

/**
 * Builds fallback category review rows from article metadata.
 *
 * @param params - Normalized article parameters.
 * @returns Category review rows.
 */
export function buildFallbackCategoryRows(params: any): Array<any> {
    const metadata = getArticleCategoryMetadata(params);
    const rows = [
        ...buildFallbackRoleRows(metadata.companies),
        ...buildFallbackRoleRows(metadata.platform),
        ...buildSourceCategoryRows(SOURCE_DATA, metadata.release.categories, {
            stubTagEnabled: true,
            stubTags: metadata.release.stubTags,
        }),
    ];
    const normalized = uniqueCategoryRows(rows.map(normalizeCategoryRow));

    return sortRowsByArticleProse(normalized, params);
}

/** Builds fallback rows for one article metadata role. */
function buildFallbackRoleRows(metadata): Array<any> {
    return buildSourceCategoryRows(
        SOURCE_DATA,
        metadata.assumedCategories || metadata.categories,
        {
            stubTagEnabled: true,
            stubTags: metadata.assumedStubTags || metadata.stubTags,
        },
    );
}

/**
 * Resolves category rows through the MediaWiki API.
 *
 * @param rows - Category rows.
 * @param options - API options.
 * @param options.fetcher - Fetch implementation.
 * @param options.cache - Resolution cache keyed by category
 * title.
 * @returns Resolved category rows.
 */
export async function resolveCategoryRows(
    rows: Array<any>,
    options: any = {},
): Promise<Array<any>> {
    const normalizedRows = rows.map(normalizeCategoryRow);
    const categories = uniqueValues(
        normalizedRows.map((row) => row.category).filter(Boolean),
    );

    if (categories.length === 0) {
        return normalizedRows;
    }

    const resolutions = await resolveCategories(categories, options);

    return normalizedRows.map(function callback(row) {
        return normalizeCategoryRow({
            ...row,
            category:
                resolutions[normalizeCategoryKey(row.category)]?.category ||
                row.category,
            status:
                resolutions[normalizeCategoryKey(row.category)]?.status ||
                CATEGORY_STATUS.unchecked,
        });
    });
}

/**
 * Builds generated category rows.
 *
 * @param params - Normalized article parameters.
 * @param options - API options.
 * @returns Generated category rows.
 */
async function buildGeneratedCategoryRows(
    params: any,
    options: any,
): Promise<Array<any>> {
    const metadata = getArticleCategoryMetadata(params);
    const companyRows = buildCategoryItems(metadata.companies.categoryItems, {
        source: SOURCE_DATA,
    });
    const seriesRows = (metadata.series.categoryPlans || []).map(
        createCategoryPlan,
    );
    const metadataRows = buildGeneratedMetadataRows(metadata);
    const candidates = getGeneratedCategoryCandidates(
        companyRows,
        seriesRows,
        metadataRows,
    );
    const resolutions = await resolveCategories(candidates, options);

    return [
        ...resolveCategoryPlans(companyRows, resolutions),
        ...resolveCategoryPlans(seriesRows, resolutions),
        ...applyCategoryResolutions(metadataRows, resolutions),
    ];
}

/** Builds generated platform and release category rows. */
function buildGeneratedMetadataRows(metadata): Array<any> {
    const platformRows = buildSourceCategoryRows(
        SOURCE_DATA,
        metadata.platform.assumedCategories || metadata.platform.categories,
        {
            stubTagEnabled: metadata.platform.count === 1,
            stubTags:
                metadata.platform.assumedStubTags ||
                metadata.platform.stubTags,
        },
    );
    const releaseRows = buildSourceCategoryRows(
        SOURCE_DATA,
        metadata.release.categories,
        { stubTagEnabled: true, stubTags: metadata.release.stubTags },
    );

    return [...platformRows, ...releaseRows];
}

/** Gets unique category candidates needed by generated rows. */
function getGeneratedCategoryCandidates(companies, series, metadata) {
    const candidates = [
        ...companies.flatMap(getCategoryPlanCandidates),
        ...series.flatMap(getCategoryPlanCandidates),
        ...metadata.map((row) => row.category),
    ].filter(Boolean);

    return uniqueValues(candidates);
}

/**
 * Gets category metadata from article records or legacy parameters.
 *
 * @param params - Processed article data or legacy parameters.
 * @returns Category metadata grouped by owning part.
 */
function getArticleCategoryMetadata(params: any): any {
    if (params.records == null) {
        return getLegacyArticleCategoryMetadata(params);
    }

    return getRecordArticleCategoryMetadata(params.records);
}

/** Gets category metadata from legacy processed parameters. */
function getLegacyArticleCategoryMetadata(params): any {
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

/** Gets category metadata from article data records. */
function getRecordArticleCategoryMetadata(records): any {
    return {
        companies: records.companies,
        platform: {
            ...records.platform,
            count: records.platform.metadata.count,
        },
        release: {
            categories: uniqueValues([
                ...records.genre.assumedCategories,
                ...records.year.assumedCategories,
            ]),
            stubTags: uniqueValues([
                ...records.genre.assumedStubTags,
                ...records.year.assumedStubTags,
            ]),
        },
        series: records.series,
    };
}

/**
 * Handles sort rows by article prose.
 *
 * Sorts category rows by their first related mention in generated
 * prose.
 *
 * @param rows - Category review rows.
 * @param params - Processed article data or legacy parameters.
 * @returns Prose-ordered category rows.
 *
 */
function sortRowsByArticleProse(rows: Array<any>, params: any): Array<any> {
    return sortCategoryRowsByProse(rows, params.prose?.text || "");
}

/**
 * Builds rows for one generated category source.
 *
 * @param source - Category source label.
 * @param categories - Category titles.
 * @param options - Stub tag options.
 * @param options.stubTagEnabled - Whether stub tags default
 * on.
 * @param options.stubTags - Corresponding stub tags.
 * @returns Category rows.
 */
function buildSourceCategoryRows(
    source: string,
    categories: Array<string>,
    options: any = {},
): Array<any> {
    return (categories || []).map(function callback(category, index) {
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
 * @param items - Sector category rows or lookup plans.
 * @param options - Category row options.
 * @param options.source - Category row source label.
 * @returns Category rows or lookup plans.
 */
function buildCategoryItems(
    items: Array<any> = [],
    options: any = {},
): Array<any> {
    return items.map(function callback(item) {
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
 * @param values - Plan values.
 * @param values.candidates - Candidate category titles.
 * @param values.fallback - Fallback category title.
 * @returns Category lookup plan.
 */
function createCategoryPlan(values: any): any {
    return {
        candidates: uniqueValues(values.candidates || []),
        company: values.company || "",
        fallback: values.fallback,
    };
}

/**
 * Gets candidate titles from generated rows and lookup plans.
 *
 * @param item - Category row or lookup plan.
 * @returns Candidate category titles.
 */
function getCategoryPlanCandidates(item: any): Array<string> {
    if (Array.isArray(item.candidates)) {
        return item.candidates;
    }

    return item.category ? [item.category] : [];
}

/**
 * Materializes generated lookup plans using pre-fetched resolutions.
 *
 * @param items - Category rows and lookup plans.
 * @param resolutions - Category resolutions keyed by title.
 * @returns Category rows.
 */
function resolveCategoryPlans(
    items: Array<any>,
    resolutions: any,
): Array<any> {
    return items.map(function callback(item) {
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
 * @param rows - Category rows.
 * @param resolutions - Category resolutions keyed by title.
 * @returns Category rows with resolved titles/statuses.
 */
function applyCategoryResolutions(
    rows: Array<any>,
    resolutions: any,
): Array<any> {
    return rows.map((row) => applyCategoryResolution(row, resolutions));
}

/**
 * Applies one pre-fetched resolution to a category row.
 *
 * @param row - Category row.
 * @param resolutions - Category resolutions keyed by title.
 * @returns Category row with resolved title/status.
 */
function applyCategoryResolution(row: any, resolutions: any): any {
    const resolution = resolutions[normalizeCategoryKey(row.category)];
    const isEdited =
        normalizeCategoryKey(row.category) !==
        normalizeCategoryKey(row.originalCategory);

    return normalizeCategoryRow({
        ...row,
        category: resolution?.category || row.category,
        originalCategory: selectValue(
            !isEdited && resolution?.category != null,
            function trueBranch() {
                return resolution.category;
            },
            function falseBranch() {
                return row.originalCategory;
            },
        ),
        status: resolution?.status || CATEGORY_STATUS.unchecked,
    });
}

/**
 * Creates one category review row.
 *
 * @param values - Row values.
 * @param values.category - Category title without namespace.
 * @param values.company - Company page title for category
 * creation.
 * @param values.enabled - Whether the row should render.
 * @param values.originalCategory - Original generated
 * category.
 * @param values.source - Category source label.
 * @param values.stubTag - Corresponding stub tag title.
 * @param values.stubTagEnabled - Whether to render the stub
 * tag.
 * @param values.originalStubTagEnabled - Original stub tag
 * state.
 * @returns Category review row.
 */
function createCategoryRow(values: any = {}): any {
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
 * @param row - Category row.
 * @returns Normalized category row.
 */
function normalizeCategoryRow(row: any): any {
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
        originalStubTagEnabled: selectValue(
            row.originalStubTagEnabled == null,
            function trueBranch() {
                return row.stubTagEnabled === true;
            },
            function falseBranch() {
                return row.originalStubTagEnabled === true;
            },
        ),
    };
}

/**
 * Adds a modified marker to source labels for edited generated rows.
 *
 * @param source - Source label.
 * @param category - Current category.
 * @param originalCategory - Original generated category.
 * @returns Source label.
 */
function normalizeSourceLabel(
    source: string,
    category: string,
    originalCategory: string,
): string {
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
 * @param rows - Existing category rows.
 * @returns Manual category rows.
 */
function getManualCategoryRows(rows: Array<any>): Array<any> {
    return rows.filter(isManualCategoryRow);
}

/**
 * Handles enrich manual category rows.
 *
 * Copies generated stub-tag metadata onto matching manual category
 * rows.
 *
 * @param manualRows - Resolved manual category rows.
 * @param generatedRows - Resolved generated category
 * rows.
 * @returns Manual rows with matching stub metadata.
 *
 */
function enrichManualCategoryRows(
    manualRows: Array<any>,
    generatedRows: Array<any>,
): Array<any> {
    const generatedByCategory = new Map<string, any>(
        generatedRows
            .filter((row) => trimValue(row.stubTag) !== "")
            .map((row) => [normalizeCategoryKey(row.category), row]),
    );

    return manualRows.map(function callback(row) {
        if (trimValue(row.stubTag) !== "") {
            return row;
        }

        const generated =
            generatedByCategory.get(normalizeCategoryKey(row.category)) ||
            getConfiguredCategoryStubMetadata(row.category);

        if (generated == null) {
            return row;
        }

        return normalizeCategoryRow({
            ...row,
            originalStubTagEnabled: generated.originalStubTagEnabled,
            stubTag: generated.stubTag,
            stubTagEnabled: generated.stubTagEnabled,
        });
    });
}

/**
 * Gets configured stub metadata for a category title.
 *
 * @param category - Category title.
 * @returns Matching stub metadata.
 */
function getConfiguredCategoryStubMetadata(category: string): any | undefined {
    for (const definitions of getDefinitionCollections()) {
        const metadata = findConfiguredCategoryStubMetadata(
            definitions,
            category,
        );

        if (metadata != null) {
            return metadata;
        }
    }

    return undefined;
}

/**
 * Finds configured stub metadata in one definition collection.
 *
 * @param definitions - Terminology definitions.
 * @param category - Category title.
 * @returns Matching stub metadata.
 */
function findConfiguredCategoryStubMetadata(
    definitions: Array<any>,
    category: string,
): any | undefined {
    const categoryKey = normalizeCategoryKey(category);

    for (const definition of definitions) {
        const index = (definition.categories || []).findIndex(
            (item) => normalizeCategoryKey(item) === categoryKey,
        );
        const stubTag = definition.stubTags?.[index];

        if (index >= 0 && trimValue(stubTag) !== "") {
            return {
                originalStubTagEnabled: true,
                stubTag,
                stubTagEnabled: true,
            };
        }
    }

    return undefined;
}

/**
 * Checks whether a row was manually added.
 *
 * @param row - Category review row.
 * @returns Whether the row is manual.
 */
function isManualCategoryRow(row: any): boolean {
    return [SOURCE_MANUAL, LEGACY_MANUAL_CATEGORY_SOURCE].includes(
        getBaseSource(row.source),
    );
}

/**
 * Merges user edits into regenerated rows.
 *
 * @param generatedRows - Generated category rows.
 * @param previousRows - Existing category rows.
 * @returns Merged category rows.
 */
function mergePreviousGeneratedRows(
    generatedRows: Array<any>,
    previousRows: Array<any>,
): Array<any> {
    return generatedRows.map(function callback(row) {
        const previous = previousRows.find(function callback(item) {
            return hasSameGeneratedRow(row, item);
        });

        if (previous == null) {
            return row;
        }

        return {
            ...row,
            category: previous.category,
            enabled: previous.enabled,
            pendingCreation: previous.pendingCreation,
            stubTagEnabled: selectValue(
                previous.stubTagEnabled == null,
                function trueBranch() {
                    return row.stubTagEnabled;
                },
                function falseBranch() {
                    return previous.stubTagEnabled;
                },
            ),
        };
    });
}

/**
 * Handles resolve checkable category rows.
 *
 * Resolves rows whose title should be checked, preserving unchecked
 * suggestions.
 *
 * @param rows - Category rows.
 * @param options - API options.
 * @returns Category rows with refreshed
 * statuses.
 *
 */
async function resolveCheckableCategoryRows(
    rows: Array<any>,
    options: any,
): Promise<Array<any>> {
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
 * @param row - Category review row.
 * @returns Whether the row should be checked.
 */
function shouldCheckCategoryRow(row: any): boolean {
    return (
        normalizeCategoryTitle(row.category) !== "" &&
        normalizeCategoryKey(row.category) !==
            normalizeCategoryKey(row.originalCategory)
    );
}

/**
 * Gets an identity key for matching rows across API resolution.
 *
 * @param row - Category review row.
 * @returns Category row identity.
 */
function getCategoryRowIdentity(row: any): string {
    return [
        "",
        getBaseSource(row.source),
        "\n",
        normalizeCategoryKey(row.originalCategory),
        "",
    ].join("");
}

/**
 * Checks whether two generated rows represent the same source category.
 *
 * @param row - Generated row.
 * @param previous - Previous row.
 * @returns Whether the rows match.
 */
function hasSameGeneratedRow(row: any, previous: any): boolean {
    return (
        getBaseSource(row.source) === getBaseSource(previous.source) &&
        normalizeCategoryKey(row.originalCategory) ===
            normalizeCategoryKey(previous.originalCategory)
    );
}

/**
 * Gets a source label without the modified suffix.
 *
 * @param source - Source label.
 * @returns Base source label.
 */
function getBaseSource(source: string): string {
    return trimValue(source).replace(
        new RegExp(`${escapeRegExp(MODIFIED_SOURCE_SUFFIX)}$`, "u"),
        "",
    );
}

/**
 * Resolves category titles.
 *
 * @param categories - Category titles without
 * namespace.
 * @param options - API options.
 * @returns Resolutions keyed by normalized category
 * title.
 */
async function resolveCategories(
    categories: Array<string>,
    options: any,
): Promise<any> {
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
        (Object.entries(values) as Array<[string, any]>).map(
            function callback([key, resolution]) {
                return [key, buildCategoryResolution(resolution)];
            },
        ),
    );

    return resolutions;
}

/** Adds category-specific fields to a title resolution. */
function buildCategoryResolution(resolution): any {
    let status = CATEGORY_STATUS.missing;

    if (resolution.exists) {
        status = CATEGORY_STATUS.exists;
    }
    return {
        ...resolution,
        category: resolution.title,
        status,
    };
}

/**
 * Gets a category redirect target from page props.
 *
 * @param page - API page.
 * @returns Redirect target.
 */
function getCategoryRedirectTarget(page: any): string | undefined {
    const props = page?.pageprops || {};
    const target = CATEGORY_REDIRECT_PROPS.map((key) => props[key]).find(
        Boolean,
    );

    return target == null ? undefined : normalizeCategoryTitle(target);
}

/**
 * Formats a category title for API lookup.
 *
 * @param value - Category title.
 * @returns API page title.
 */
function normalizeCategoryTitle(value): string {
    return stripNamespace(value, CATEGORY_NAMESPACE);
}

/**
 * Normalizes a category title for lookup.
 *
 * @param value - Raw category value.
 * @returns Category key.
 */
function normalizeCategoryKey(value: any): string {
    return normalizeTitleKey(value, CATEGORY_NAMESPACE);
}

/**
 * Deduplicates category rows by category title.
 *
 * @param rows - Category rows.
 * @returns Unique category rows.
 */
function uniqueCategoryRows(rows: Array<any>): Array<any> {
    const seen = new Set();

    return rows.filter(function callback(row) {
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
 * @param value - Value to escape.
 * @returns Escaped value.
 */
function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

/**
 * Trims a value.
 *
 * @param value - Raw value.
 * @returns Trimmed string.
 */
function trimValue(value: any): string {
    return value == null ? "" : String(value).trim();
}

/**
 * Selects a lazily evaluated value for a condition.
 *
 * @param condition - Condition to evaluate.
 * @param trueBranch - Branch used when the condition is
 * true.
 * @param falseBranch - Branch used when the condition is
 * false.
 * @returns Value returned by the selected branch.
 */
function selectValue(
    condition: unknown,
    trueBranch: (...args: any[]) => any,
    falseBranch: (...args: any[]) => any,
): any {
    if (condition) {
        return trueBranch();
    }

    return falseBranch();
}
