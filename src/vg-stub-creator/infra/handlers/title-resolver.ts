/**
 * Defines api endpoint.
 *
 * Resolves actual MediaWiki page titles across normalization and
 * redirects.
 */

import { msg } from "#me/i18n/index.ts";

const API_ENDPOINT = "/w/api.php";
const DEFAULT_BATCH_SIZE = 50;

/**
 * Configures MediaWiki title resolution.
 */
interface TitleResolverConfig {
    namespace: string;
    batchSize?: number;
    endpoint?: string;
    getRedirectTarget?: (page: unknown) => string | undefined;
    pageProps?: string;
    prop?: string;
    variantFallback?: boolean;
}

/**
 * Describes one normalized title-resolution result.
 */
interface TitleResolution {
    exists: boolean;
    requestedTitle: string;
    title: string;
    page?: unknown;
    redirectTarget?: string;
    category?: string;
    template?: string;
}

/**
 * Controls one title-resolution request.
 */
interface TitleResolverOptions {
    bypassCache?: boolean;
    cache?: Record<string, TitleResolution | null>;
    fetcher?: typeof fetch;
    variant?: string;
}

/**
 * Resolves requested titles to actual page titles.
 *
 * @param titles - Titles with or without the configured
 * namespace.
 * @param config - Resolver configuration.
 * @param config.namespace - Namespace prefix without a colon.
 * @param config.getRedirectTarget - Page-property redirect
 * reader.
 * @param config.prop - MediaWiki prop query.
 * @param config.pageProps - MediaWiki pageprops keys.
 * @param config.variantFallback - Whether to query
 * Hans/Hant
 * fallbacks after exact misses.
 * @param options - Request options.
 * @param options.bypassCache - Whether to ignore cached
 * entries.
 * @param options.cache - Resolution cache.
 * @param options.fetcher - Fetch implementation.
 * @returns Resolutions keyed by normalized requested
 * title.
 */
export async function resolvePageTitles(
    titles: Array<string>,
    config: TitleResolverConfig,
    options: TitleResolverOptions = {},
): Promise<Record<string, TitleResolution>> {
    const cache = options.cache || {};
    const uniqueTitles = normalizeRequestedTitles(titles, config.namespace);
    const missing = getUncachedTitles(uniqueTitles, config.namespace, cache);
    const titlesToFetch = options.bypassCache ? uniqueTitles : missing;
    const batchSize = config.batchSize || DEFAULT_BATCH_SIZE;

    await fetchResolutionBatches(
        titlesToFetch,
        batchSize,
        config,
        options,
        cache,
    );
    const resolutions = buildCachedResolutions(uniqueTitles, config, cache);

    return resolutions;
}

/**
 * Normalizes and deduplicates requested titles.
 *
 * @param titles - Page titles.
 * @param namespace - MediaWiki namespace.
 * @returns And deduplicates requested titles.
 */
function normalizeRequestedTitles(titles: Array<string>, namespace: string) {
    const normalized: Array<string> = titles
        .map((title) => stripNamespace(title, namespace))
        .filter(Boolean);

    return uniqueValues(normalized);
}

/**
 * Gets requested titles absent from the resolution cache.
 *
 * @param titles - Page titles.
 * @param namespace - MediaWiki namespace.
 * @param cache - Cached values.
 * @returns Requested titles absent from the resolution cache.
 */
function getUncachedTitles(
    titles: string[],
    namespace: string,
    cache: Record<string, TitleResolution | null>,
): Array<string> {
    const result = titles.filter(function callback(title: string) {
        const key = normalizeTitleKey(title, namespace);
        return cache[key] == null;
    });
    return result;
}

/**
 * Fetches and caches title-resolution batches.
 *
 * @param titles - Page titles.
 * @param size - Size value.
 * @param config - Operation configuration.
 * @param options - Operation options.
 * @param cache - Cached values.
 */
async function fetchResolutionBatches(
    titles: string[],
    size: number,
    config: TitleResolverConfig,
    options: TitleResolverOptions,
    cache: Record<string, TitleResolution | null>,
): Promise<void> {
    for (const batch of chunkValues(titles, size)) {
        const resolutions = await fetchTitleResolutions(
            batch,
            config,
            options,
        );
        Object.assign(cache, resolutions);
    }
}

/**
 * Builds normalized results from cached resolutions.
 *
 * @param titles - Page titles.
 * @param config - Operation configuration.
 * @param cache - Cached values.
 * @returns Normalized results from cached resolutions.
 */
function buildCachedResolutions(
    titles: string[],
    config: TitleResolverConfig,
    cache: Record<string, TitleResolution | null>,
): Record<string, TitleResolution> {
    const resolutions = Object.fromEntries(
        titles.map(function callback(title: string) {
            const key = normalizeTitleKey(title, config.namespace);
            const resolution = normalizeCachedResolution(
                cache[key],
                title,
                config,
            );

            return [key, resolution];
        }),
    );

    return resolutions;
}

/**
 * Handles get actual title.
 *
 * Gets the actual title after MediaWiki normalization, conversion, and
 * redirects.
 *
 * @param requestedTitle - Requested title.
 * @param data - MediaWiki query response.
 * @param namespace - Namespace prefix without a colon.
 * @returns Actual namespaced title.
 */
export function getActualTitle(
    requestedTitle: string,
    data: any,
    namespace: string,
): string {
    const initialTitle = formatNamespacedTitle(requestedTitle, namespace);
    const transformations = [
        data?.query?.normalized,
        data?.query?.converted,
        data?.query?.redirects,
    ]
        .flat()
        .filter(Boolean);
    const actualTitle = transformations.reduce(function callback(title, item) {
        const fromKey = normalizeTitleKey(item.from, namespace);
        const titleKey = normalizeTitleKey(title, namespace);

        return fromKey === titleKey ? item.to : title;
    }, initialTitle);

    return actualTitle;
}

/**
 * Finds the API page matching a resolved title.
 *
 * @param title - Resolved title.
 * @param data - MediaWiki query response.
 * @param namespace - Namespace prefix without a colon.
 * @returns Matching API page.
 */
export function getResolvedPage(
    title: string,
    data: any,
    namespace: string,
): any | undefined {
    const titleKey = normalizeTitleKey(title, namespace);
    const page = (data?.query?.pages || []).find(function findPage(item: {
        title: string;
    }) {
        return normalizeTitleKey(item.title, namespace) === titleKey;
    });

    return page;
}

/**
 * Adds a namespace to a title for API queries.
 *
 * @param title - Page title.
 * @param namespace - Namespace prefix without a colon.
 * @returns Namespaced title.
 */
export function formatNamespacedTitle(
    title: string,
    namespace: string,
): string {
    const bareTitle = stripNamespace(title, namespace);
    const namespacedTitle = `${namespace}:${bareTitle}`;

    return namespacedTitle;
}

/**
 * Removes a namespace prefix from a title.
 *
 * @param value - Raw title.
 * @param namespace - Namespace prefix without a colon.
 * @returns Bare title.
 */
export function stripNamespace(value: any, namespace: string): string {
    const text = value == null ? "" : String(value).trim();
    const pattern = new RegExp(`^${escapeRegExp(namespace)}:`, "iu");
    const title = text.replace(pattern, "").trim();

    return title;
}

/**
 * Normalizes a title for resolution-map lookup.
 *
 * @param value - Raw title.
 * @param namespace - Namespace prefix without a colon.
 * @returns Normalized title key.
 */
export function normalizeTitleKey(value: any, namespace: string): string {
    return stripNamespace(value, namespace).replace(/_/gu, " ");
}

/**
 * Defines the module-level fetch title resolutions.
 *
 * @param titles - Page titles.
 * @param config - Operation configuration.
 * @param options - Operation options.
 * @returns Result when the function
 *   defines the module-level fetch title resolutions.
 */
async function fetchTitleResolutions(
    titles: string[],
    config: TitleResolverConfig,
    options: TitleResolverOptions,
): Promise<Record<string, TitleResolution>> {
    if (config.variantFallback === true) {
        return fetchVariantFallbackTitleResolutions(titles, config, options);
    }

    try {
        const data = await fetchTitleQuery(titles, config, options);
        const resolutions = createResolutions(titles, data, config);
        return finalizeTitleResolutions(resolutions, config, options);
    } catch (_error) {
        return createMissingResolutions(titles, config);
    }
}

/**
 * Defines the module-level fetch variant fallback title resolutions.
 *
 * @param titles - Page titles.
 * @param config - Operation configuration.
 * @param options - Operation options.
 * @returns Result when the function
 *   defines the module-level fetch variant fallback
 *   title resolutions.
 */
async function fetchVariantFallbackTitleResolutions(
    titles: string[],
    config: TitleResolverConfig,
    options: TitleResolverOptions,
): Promise<Record<string, TitleResolution>> {
    try {
        const directData = await fetchTitleQuery(titles, config, options, {
            convertTitles: false,
        });
        const resolutions = createResolutions(titles, directData, config);
        const missingTitles = titles.filter(function callback(title) {
            const result =
                !resolutions[normalizeTitleKey(title, config.namespace)]
                    ?.exists;
            return result;
        });

        await addVariantFallbackResolutions(
            missingTitles,
            resolutions,
            config,
            options,
        );

        return finalizeTitleResolutions(resolutions, config, options);
    } catch (_error) {
        return createMissingResolutions(titles, config);
    }
}

/**
 * Adds Hans/Hant resolutions for titles missed by the direct query.
 *
 * @param titles - Page titles.
 * @param resolutions - Resolutions value.
 * @param config - Operation configuration.
 * @param options - Operation options.
 */
async function addVariantFallbackResolutions(
    titles: string[],
    resolutions: Record<string, TitleResolution>,
    config: TitleResolverConfig,
    options: TitleResolverOptions,
): Promise<void> {
    if (titles.length === 0) {
        return;
    }
    const variants = ["zh-hans", "zh-hant"];
    const fetchVariant = function fetchVariant(variant: string) {
        const result = fetchVariantResolutionSet(
            titles,
            config,
            options,
            variant,
        );
        return result;
    };
    const sets = await Promise.all(variants.map(fetchVariant));

    mergeVariantResolutions(titles, resolutions, sets, config.namespace);
}

/**
 * Fetches one Chinese-variant resolution set.
 *
 * @param variant - MediaWiki language variant code.
 * @param titles - Bare page titles to resolve.
 * @param config - Title resolver configuration.
 * @param options - Request behavior and dependencies.
 * @returns Resolutions keyed by normalized requested title.
 */
async function fetchVariantResolutionSet(
    titles: string[],
    config: TitleResolverConfig,
    options: TitleResolverOptions,
    variant: string,
): Promise<Record<string, TitleResolution>> {
    const data = await fetchTitleQuery(
        titles,
        config,
        { ...options, variant },
        { convertTitles: true },
    );

    return createResolutions(titles, data, config);
}

/**
 * Chooses the best direct or variant resolution for each title.
 *
 * @param titles - Page titles.
 * @param resolutions - Resolutions value.
 * @param sets - Sets value.
 * @param namespace - MediaWiki namespace.
 */
function mergeVariantResolutions(
    titles: string[],
    resolutions: Record<string, TitleResolution>,
    sets: Array<Record<string, TitleResolution>>,
    namespace: string,
): void {
    titles.forEach(function callback(title) {
        const key = normalizeTitleKey(title, namespace);
        const candidates = [resolutions[key], ...sets.map((set) => set[key])];

        resolutions[key] = chooseVariantResolution(
            title,
            namespace,
            candidates,
        );
    });
}

/**
 * Defines the module-level finalize title resolutions.
 *
 * @param resolutions - Resolutions value.
 * @param config - Operation configuration.
 * @param options - Operation options.
 * @returns Result when the function
 *   defines the module-level finalize title
 *   resolutions.
 */
async function finalizeTitleResolutions(
    resolutions: Record<string, TitleResolution>,
    config: TitleResolverConfig,
    options: TitleResolverOptions,
): Promise<Record<string, TitleResolution>> {
    const redirectTargets = uniqueValues(
        Object.values(resolutions)
            .map((resolution) => resolution.redirectTarget)
            .filter(Boolean),
    );

    if (redirectTargets.length > 0) {
        const redirectData = await fetchTitleQuery(
            redirectTargets,
            config,
            options,
        );

        redirectTargets.forEach(function callback(title) {
            const key = normalizeTitleKey(title, config.namespace);

            resolutions[key] = createResolution(title, redirectData, config);
        });
    }

    const finalResolutions = Object.fromEntries(
        Object.entries(resolutions).map(function callback([key, resolution]) {
            const finalResolution = followMetadataRedirect(
                resolution,
                resolutions,
                config,
            );

            return [key, finalResolution];
        }),
    );

    return addResolutionAliases(finalResolutions, config.namespace);
}

/**
 * Defines the module-level create resolutions.
 *
 * @param titles - Page titles.
 * @param data - Input data.
 * @param config - Operation configuration.
 * @returns Result when the function
 *   defines the module-level create resolutions.
 */
function createResolutions(
    titles: string[],
    data: unknown,
    config: TitleResolverConfig,
): Record<string, TitleResolution> {
    const resolutions = Object.fromEntries(
        titles.map(function callback(title) {
            const key = normalizeTitleKey(title, config.namespace);
            const resolution = createResolution(title, data, config);

            return [key, resolution];
        }),
    );

    return resolutions;
}

/**
 * Defines the module-level create missing resolutions.
 *
 * @param titles - Page titles.
 * @param config - Operation configuration.
 * @returns Result when the function
 *   defines the module-level create missing
 *   resolutions.
 */
function createMissingResolutions(
    titles: string[],
    config: TitleResolverConfig,
): Record<string, TitleResolution> {
    const resolutions = Object.fromEntries(
        titles.map(function callback(title) {
            const bareTitle = stripNamespace(title, config.namespace);
            const resolution = {
                exists: false,
                page: undefined,
                redirectTarget: undefined,
                requestedTitle: bareTitle,
                title: bareTitle,
            };

            return [normalizeTitleKey(title, config.namespace), resolution];
        }),
    );

    return resolutions;
}

/**
 * Defines the module-level choose variant resolution.
 *
 * @param requestedTitle - Requested title value.
 * @param namespace - MediaWiki namespace.
 * @param resolutions - Resolutions value.
 * @returns Result when the function
 *   defines the module-level choose variant
 *   resolution.
 */
function chooseVariantResolution(
    requestedTitle: string,
    namespace: string,
    resolutions: Array<TitleResolution | undefined>,
): TitleResolution {
    const existing = resolutions.filter(
        function isExistingResolution(
            resolution,
        ): resolution is TitleResolution {
            return resolution?.exists === true;
        },
    );

    if (existing.length === 0) {
        return resolutions.find(Boolean) as TitleResolution;
    }

    const requested = stripNamespace(requestedTitle, namespace);
    const exact = existing.find(function callback(resolution) {
        return stripNamespace(resolution.title, namespace) === requested;
    });

    if (exact != null) {
        return exact;
    }

    const closest = existing
        .map(function callback(resolution) {
            const result = {
                resolution,
                score: getCommonPrefixLength(
                    requested,
                    stripNamespace(resolution.title, namespace),
                ),
            };
            return result;
        })
        .sort((left, right) => right.score - left.score)[0].resolution;

    return closest;
}

/**
 * Defines the module-level get common prefix length.
 *
 * @param left - Left value.
 * @param right - Right value.
 * @returns Result when the function
 *   defines the module-level get common prefix length.
 */
function getCommonPrefixLength(left: string, right: string): number {
    const leftChars = Array.from(left);
    const rightChars = Array.from(right);
    let index = 0;

    while (
        leftChars[index] != null &&
        leftChars[index] === rightChars[index]
    ) {
        index += 1;
    }

    return index;
}

/**
 * Defines the module-level fetch title query.
 *
 * @param titles - Page titles.
 * @param config - Operation configuration.
 * @param options - Operation options.
 * @param queryOptions - Query options value.
 * @returns Result when the function
 *   defines the module-level fetch title query.
 */
async function fetchTitleQuery(
    titles: string[],
    config: TitleResolverConfig,
    options: TitleResolverOptions,
    queryOptions: { convertTitles?: boolean } = {},
): Promise<unknown> {
    const fetcher = options.fetcher || fetch;
    const url = buildTitleApiUrl(titles, config, options, queryOptions);
    const response = await fetcher(url, {
        headers: {
            accept: "application/json",
        },
    });

    if (!response.ok) {
        throw new Error(
            msg("errors.titleRequestHttp", { status: response.status }),
        );
    }

    return response.json();
}

/**
 * Defines the module-level build title api url.
 *
 * @param titles - Page titles.
 * @param config - Operation configuration.
 * @param options - Operation options.
 * @param queryOptions - Query options value.
 * @returns Result when the function
 *   defines the module-level build title api url.
 */
function buildTitleApiUrl(
    titles: string[],
    config: TitleResolverConfig,
    options: TitleResolverOptions,
    queryOptions: { convertTitles?: boolean },
): string {
    const values: Record<string, string> = {
        action: "query",
        format: "json",
        formatversion: "2",
        redirects: "1",
        titles: titles
            .map((title) => formatNamespacedTitle(title, config.namespace))
            .join("|"),
    };

    addOptionalTitleQueryValues(values, config, options, queryOptions);

    const params = new URLSearchParams(values);
    const url = [
        "",
        config.endpoint || API_ENDPOINT,
        "?",
        params.toString(),
        "",
    ].join("");

    return url;
}

/**
 * Adds optional title-query parameters.
 *
 * @param values - Input values.
 * @param config - Operation configuration.
 * @param options - Operation options.
 * @param queryOptions - Query options value.
 */
function addOptionalTitleQueryValues(
    values: Record<string, string>,
    config: TitleResolverConfig,
    options: TitleResolverOptions,
    queryOptions: { convertTitles?: boolean },
): void {
    if (queryOptions.convertTitles !== false) {
        values.converttitles = "1";
    }
    if (config.prop) {
        values.prop = config.prop;
    }
    if (config.pageProps) {
        values.ppprop = config.pageProps;
    }
    if (options.variant) {
        values.variant = options.variant;
    }
}

/**
 * Defines the module-level create resolution.
 *
 * @param requestedTitle - Requested title value.
 * @param data - Input data.
 * @param config - Operation configuration.
 * @returns Result when the function
 *   defines the module-level create resolution.
 */
function createResolution(
    requestedTitle: string,
    data: unknown,
    config: TitleResolverConfig,
): TitleResolution {
    const actualTitle = getActualTitle(requestedTitle, data, config.namespace);
    const page = getResolvedPage(actualTitle, data, config.namespace);
    const redirectTarget = config.getRedirectTarget?.(page);
    const resolution = {
        exists: page != null && !page.missing,
        page,
        redirectTarget: selectValue(
            redirectTarget == null,
            function trueBranch() {
                return undefined;
            },
            function falseBranch() {
                return stripNamespace(redirectTarget, config.namespace);
            },
        ),
        requestedTitle: stripNamespace(requestedTitle, config.namespace),
        title: stripNamespace(actualTitle, config.namespace),
    };

    return resolution;
}

/**
 * Defines the module-level follow metadata redirect.
 *
 * @param resolution - Resolution value.
 * @param resolutions - Resolutions value.
 * @param config - Operation configuration.
 * @returns Result when the function
 *   defines the module-level follow metadata redirect.
 */
function followMetadataRedirect(
    resolution: TitleResolution,
    resolutions: Record<string, TitleResolution>,
    config: TitleResolverConfig,
): TitleResolution {
    if (resolution.redirectTarget == null) {
        return resolution;
    }

    const key = normalizeTitleKey(resolution.redirectTarget, config.namespace);
    const target = resolutions[key];

    if (target != null) {
        return target;
    }

    const redirected = {
        ...resolution,
        exists: true,
        title: resolution.redirectTarget,
    };

    return redirected;
}

/**
 * Defines the module-level add resolution aliases.
 *
 * @param resolutions - Resolutions value.
 * @param namespace - MediaWiki namespace.
 * @returns Result when the function
 *   defines the module-level add resolution aliases.
 */
function addResolutionAliases(
    resolutions: Record<string, TitleResolution>,
    namespace: string,
): Record<string, TitleResolution> {
    Object.values(resolutions).forEach(function callback(resolution) {
        const key = normalizeTitleKey(resolution.title, namespace);

        resolutions[key] = resolution;
    });

    return resolutions;
}

/**
 * Defines the module-level normalize cached resolution.
 *
 * @param resolution - Resolution value.
 * @param requestedTitle - Requested title value.
 * @param config - Operation configuration.
 * @returns Result when the function
 *   defines the module-level normalize cached
 *   resolution.
 */
function normalizeCachedResolution(
    resolution: TitleResolution | null,
    requestedTitle: string,
    config: TitleResolverConfig,
): TitleResolution {
    if (resolution == null) {
        const missing = {
            exists: false,
            requestedTitle,
            title: requestedTitle,
        };

        return missing;
    }

    if (resolution.title != null) {
        return resolution;
    }

    const legacyTitle =
        resolution.category || resolution.template || requestedTitle;
    const normalized = {
        ...resolution,
        requestedTitle,
        title: stripNamespace(legacyTitle, config.namespace),
    };

    return normalized;
}

/**
 * Defines the module-level chunk values.
 *
 * @param values - Input values.
 * @param size - Size value.
 * @returns Result when the function
 *   defines the module-level chunk values.
 */
function chunkValues(values: string[], size: number): string[][] {
    const chunks: string[][] = [];

    for (let index = 0; index < values.length; index += size) {
        chunks.push(values.slice(index, index + size));
    }

    return chunks;
}

/**
 * Defines the module-level unique values.
 *
 * @param values - Input values.
 * @returns Result when the function
 *   defines the module-level unique values.
 */
function uniqueValues<T>(values: Iterable<T>): T[] {
    const unique = [...new Set(values)];

    return unique;
}

/**
 * Defines the module-level escape reg exp.
 *
 * @param text - Source text.
 * @returns Result when the function
 *   defines the module-level escape reg exp.
 */
function escapeRegExp(text: string) {
    return text.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
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
