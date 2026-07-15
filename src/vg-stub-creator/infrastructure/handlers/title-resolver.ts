/**
 * Defines api endpoint.
 *
 * Resolves actual MediaWiki page titles across normalization and
 * redirects.
 */

import { msg } from "#stub/i18n";

const API_ENDPOINT = "/w/api.php";
const DEFAULT_BATCH_SIZE = 50;

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
    config: any,
    options: any = {},
): Promise<any> {
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

/** Normalizes and deduplicates requested titles. */
function normalizeRequestedTitles(titles: Array<string>, namespace) {
    const normalized: Array<string> = titles
        .map((title) => stripNamespace(title, namespace))
        .filter(Boolean);

    return uniqueValues(normalized);
}

/** Gets requested titles absent from the resolution cache. */
function getUncachedTitles(titles, namespace, cache): Array<string> {
    return titles.filter(function callback(title) {
        const key = normalizeTitleKey(title, namespace);
        return cache[key] == null;
    });
}

/** Fetches and caches title-resolution batches. */
async function fetchResolutionBatches(titles, size, config, options, cache) {
    for (const batch of chunkValues(titles, size)) {
        const resolutions = await fetchTitleResolutions(
            batch,
            config,
            options,
        );
        Object.assign(cache, resolutions);
    }
}

/** Builds normalized results from cached resolutions. */
function buildCachedResolutions(titles, config, cache): any {
    return Object.fromEntries(
        titles.map(function callback(title) {
            const key = normalizeTitleKey(title, config.namespace);
            const resolution = normalizeCachedResolution(
                cache[key],
                title,
                config,
            );

            return [key, resolution];
        }),
    );
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
 *
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
    const page = (data?.query?.pages || []).find(
        (item) => normalizeTitleKey(item.title, namespace) === titleKey,
    );

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
 */
async function fetchTitleResolutions(titles, config, options) {
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
 */
async function fetchVariantFallbackTitleResolutions(titles, config, options) {
    try {
        const directData = await fetchTitleQuery(titles, config, options, {
            convertTitles: false,
        });
        const resolutions = createResolutions(titles, directData, config);
        const missingTitles = titles.filter(function callback(title) {
            return !resolutions[normalizeTitleKey(title, config.namespace)]
                ?.exists;
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

/** Adds Hans/Hant resolutions for titles missed by the direct query. */
async function addVariantFallbackResolutions(
    titles,
    resolutions,
    config,
    options,
): Promise<void> {
    if (titles.length === 0) {
        return;
    }
    const sets = await Promise.all(
        ["zh-hans", "zh-hant"].map(async function callback(variant) {
            const data = await fetchTitleQuery(
                titles,
                config,
                { ...options, variant },
                { convertTitles: true },
            );
            return createResolutions(titles, data, config);
        }),
    );

    mergeVariantResolutions(titles, resolutions, sets, config.namespace);
}

/** Chooses the best direct or variant resolution for each title. */
function mergeVariantResolutions(titles, resolutions, sets, namespace): void {
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
 */
async function finalizeTitleResolutions(resolutions, config, options) {
    const redirectTargets = uniqueValues(
        (Object.values(resolutions) as any[])
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
 */
function createResolutions(titles, data, config) {
    return Object.fromEntries(
        titles.map(function callback(title) {
            const key = normalizeTitleKey(title, config.namespace);
            const resolution = createResolution(title, data, config);

            return [key, resolution];
        }),
    );
}

/**
 * Defines the module-level create missing resolutions.
 */
function createMissingResolutions(titles, config) {
    return Object.fromEntries(
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
}

/**
 * Defines the module-level choose variant resolution.
 */
function chooseVariantResolution(requestedTitle, namespace, resolutions) {
    const existing = resolutions.filter((resolution) => resolution?.exists);

    if (existing.length === 0) {
        return resolutions.find(Boolean);
    }

    const requested = stripNamespace(requestedTitle, namespace);
    const exact = existing.find(function callback(resolution) {
        return stripNamespace(resolution.title, namespace) === requested;
    });

    if (exact != null) {
        return exact;
    }

    return existing
        .map(function callback(resolution) {
            return {
                resolution,
                score: getCommonPrefixLength(
                    requested,
                    stripNamespace(resolution.title, namespace),
                ),
            };
        })
        .sort((left, right) => right.score - left.score)[0].resolution;
}

/**
 * Defines the module-level get common prefix length.
 */
function getCommonPrefixLength(left, right) {
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
 */
async function fetchTitleQuery(titles, config, options, queryOptions = {}) {
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
 */
function buildTitleApiUrl(titles, config, options, queryOptions) {
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

/** Adds optional title-query parameters. */
function addOptionalTitleQueryValues(values, config, options, queryOptions) {
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
 */
function createResolution(requestedTitle, data, config) {
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
 */
function followMetadataRedirect(resolution, resolutions, config) {
    if (resolution.redirectTarget == null) {
        return resolution;
    }

    const key = normalizeTitleKey(resolution.redirectTarget, config.namespace);
    const target = resolutions[key];

    if (target != null) {
        return target;
    }

    return {
        ...resolution,
        exists: true,
        title: resolution.redirectTarget,
    };
}

/**
 * Defines the module-level add resolution aliases.
 */
function addResolutionAliases(resolutions, namespace) {
    (Object.values(resolutions) as any[]).forEach(
        function callback(resolution) {
            const key = normalizeTitleKey(resolution.title, namespace);

            resolutions[key] = resolution;
        },
    );

    return resolutions;
}

/**
 * Defines the module-level normalize cached resolution.
 */
function normalizeCachedResolution(resolution, requestedTitle, config) {
    if (resolution == null) {
        return {
            exists: false,
            requestedTitle,
            title: requestedTitle,
        };
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
 */
function chunkValues(values, size) {
    const chunks = [];

    for (let index = 0; index < values.length; index += size) {
        chunks.push(values.slice(index, index + size));
    }

    return chunks;
}

/**
 * Defines the module-level unique values.
 */
function uniqueValues(values) {
    return [...new Set(values)];
}

/**
 * Defines the module-level escape reg exp.
 */
function escapeRegExp(text) {
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
