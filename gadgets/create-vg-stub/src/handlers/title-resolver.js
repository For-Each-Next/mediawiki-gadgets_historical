/* eslint-disable */

/**
 * Resolves actual MediaWiki page titles across normalization and redirects.
 */

const API_ENDPOINT = "/w/api.php";
const DEFAULT_BATCH_SIZE = 50;

/**
 * Resolves requested titles to actual page titles.
 *
 * @param {Array<string>} titles - Titles with or without the configured namespace.
 * @param {object} config - Resolver configuration.
 * @param {string} config.namespace - Namespace prefix without a colon.
 * @param {Function} [config.getRedirectTarget] - Page-property redirect reader.
 * @param {string} [config.prop] - MediaWiki prop query.
 * @param {string} [config.pageProps] - MediaWiki pageprops keys.
 * @param {boolean} [config.variantFallback] - Whether to query Hans/Hant fallbacks after exact misses.
 * @param {object} [options] - Request options.
 * @param {boolean} [options.bypassCache] - Whether to ignore cached entries.
 * @param {object} [options.cache] - Resolution cache.
 * @param {Function} [options.fetcher] - Fetch implementation.
 * @returns {Promise<object>} Resolutions keyed by normalized requested title.
 */
export async function resolvePageTitles(titles, config, options = {}) {
    const cache = options.cache || {};
    const uniqueTitles = uniqueValues(
        titles
            .map((title) => stripNamespace(title, config.namespace))
            .filter(Boolean),
    );
    const missing = uniqueTitles.filter((title) => {
        const key = normalizeTitleKey(title, config.namespace);

        return cache[key] == null;
    });
    const titlesToFetch = options.bypassCache ? uniqueTitles : missing;
    const batchSize = config.batchSize || DEFAULT_BATCH_SIZE;

    for (const batch of chunkValues(titlesToFetch, batchSize)) {
        const resolutions = await fetchTitleResolutions(
            batch,
            config,
            options,
        );

        Object.assign(cache, resolutions);
    }

    const resolutions = Object.fromEntries(
        uniqueTitles.map((title) => {
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
 * Gets the actual title after MediaWiki normalization, conversion, and redirects.
 *
 * @param {string} requestedTitle - Requested title.
 * @param {object} data - MediaWiki query response.
 * @param {string} namespace - Namespace prefix without a colon.
 * @returns {string} Actual namespaced title.
 */
export function getActualTitle(requestedTitle, data, namespace) {
    const initialTitle = formatNamespacedTitle(requestedTitle, namespace);
    const transformations = [
        data?.query?.normalized,
        data?.query?.converted,
        data?.query?.redirects,
    ]
        .flat()
        .filter(Boolean);
    const actualTitle = transformations.reduce((title, item) => {
        const fromKey = normalizeTitleKey(item.from, namespace);
        const titleKey = normalizeTitleKey(title, namespace);

        return fromKey === titleKey ? item.to : title;
    }, initialTitle);

    return actualTitle;
}

/**
 * Finds the API page matching a resolved title.
 *
 * @param {string} title - Resolved title.
 * @param {object} data - MediaWiki query response.
 * @param {string} namespace - Namespace prefix without a colon.
 * @returns {object|undefined} Matching API page.
 */
export function getResolvedPage(title, data, namespace) {
    const titleKey = normalizeTitleKey(title, namespace);
    const page = (data?.query?.pages || []).find(
        (item) => normalizeTitleKey(item.title, namespace) === titleKey,
    );

    return page;
}

/**
 * Adds a namespace to a title for API queries.
 *
 * @param {string} title - Page title.
 * @param {string} namespace - Namespace prefix without a colon.
 * @returns {string} Namespaced title.
 */
export function formatNamespacedTitle(title, namespace) {
    const bareTitle = stripNamespace(title, namespace);
    const namespacedTitle = `${namespace}:${bareTitle}`;

    return namespacedTitle;
}

/**
 * Removes a namespace prefix from a title.
 *
 * @param {*} value - Raw title.
 * @param {string} namespace - Namespace prefix without a colon.
 * @returns {string} Bare title.
 */
export function stripNamespace(value, namespace) {
    const text = value == null ? "" : String(value).trim();
    const pattern = new RegExp(`^${escapeRegExp(namespace)}:`, "iu");
    const title = text.replace(pattern, "").trim();

    return title;
}

/**
 * Normalizes a title for resolution-map lookup.
 *
 * @param {*} value - Raw title.
 * @param {string} namespace - Namespace prefix without a colon.
 * @returns {string} Normalized title key.
 */
export function normalizeTitleKey(value, namespace) {
    return stripNamespace(value, namespace).replace(/_/gu, " ");
}

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

async function fetchVariantFallbackTitleResolutions(titles, config, options) {
    try {
        const directData = await fetchTitleQuery(titles, config, options, {
            convertTitles: false,
        });
        const resolutions = createResolutions(titles, directData, config);
        const missingTitles = titles.filter(
            (title) =>
                !resolutions[normalizeTitleKey(title, config.namespace)]
                    ?.exists,
        );

        if (missingTitles.length > 0) {
            const variantResolutionSets = await Promise.all(
                ["zh-hans", "zh-hant"].map(async (variant) =>
                    createResolutions(
                        missingTitles,
                        await fetchTitleQuery(
                            missingTitles,
                            config,
                            {
                                ...options,
                                variant,
                            },
                            {
                                convertTitles: true,
                            },
                        ),
                        config,
                    ),
                ),
            );

            missingTitles.forEach((title) => {
                const key = normalizeTitleKey(title, config.namespace);

                resolutions[key] = chooseVariantResolution(
                    title,
                    config.namespace,
                    [
                        resolutions[key],
                        ...variantResolutionSets.map((set) => set[key]),
                    ],
                );
            });
        }

        return finalizeTitleResolutions(resolutions, config, options);
    } catch (_error) {
        return createMissingResolutions(titles, config);
    }
}

async function finalizeTitleResolutions(resolutions, config, options) {
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

        redirectTargets.forEach((title) => {
            const key = normalizeTitleKey(title, config.namespace);

            resolutions[key] = createResolution(title, redirectData, config);
        });
    }

    const finalResolutions = Object.fromEntries(
        Object.entries(resolutions).map(([key, resolution]) => {
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

function createResolutions(titles, data, config) {
    return Object.fromEntries(
        titles.map((title) => {
            const key = normalizeTitleKey(title, config.namespace);
            const resolution = createResolution(title, data, config);

            return [key, resolution];
        }),
    );
}

function createMissingResolutions(titles, config) {
    return Object.fromEntries(
        titles.map((title) => {
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

function chooseVariantResolution(requestedTitle, namespace, resolutions) {
    const existing = resolutions.filter((resolution) => resolution?.exists);

    if (existing.length === 0) {
        return resolutions.find(Boolean);
    }

    const requested = stripNamespace(requestedTitle, namespace);
    const exact = existing.find(
        (resolution) => stripNamespace(resolution.title, namespace) === requested,
    );

    if (exact != null) {
        return exact;
    }

    return existing
        .map((resolution) => ({
            resolution,
            score: getCommonPrefixLength(
                requested,
                stripNamespace(resolution.title, namespace),
            ),
        }))
        .sort((left, right) => right.score - left.score)[0].resolution;
}

function getCommonPrefixLength(left, right) {
    const leftChars = Array.from(left);
    const rightChars = Array.from(right);
    let index = 0;

    while (leftChars[index] != null && leftChars[index] === rightChars[index]) {
        index += 1;
    }

    return index;
}

async function fetchTitleQuery(titles, config, options, queryOptions = {}) {
    const fetcher = options.fetcher || fetch;
    const url = buildTitleApiUrl(titles, config, options, queryOptions);
    const response = await fetcher(url, {
        headers: {
            accept: "application/json",
        },
    });

    if (!response.ok) {
        throw new Error(`Title request failed: HTTP ${response.status}`);
    }

    return response.json();
}

function buildTitleApiUrl(titles, config, options, queryOptions) {
    const values = {
        action: "query",
        format: "json",
        formatversion: "2",
        redirects: "1",
        titles: titles
            .map((title) => formatNamespacedTitle(title, config.namespace))
            .join("|"),
    };

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

    const params = new URLSearchParams(values);
    const url = `${config.endpoint || API_ENDPOINT}?${params.toString()}`;

    return url;
}

function createResolution(requestedTitle, data, config) {
    const actualTitle = getActualTitle(requestedTitle, data, config.namespace);
    const page = getResolvedPage(actualTitle, data, config.namespace);
    const redirectTarget = config.getRedirectTarget?.(page);
    const resolution = {
        exists: page != null && !page.missing,
        page,
        redirectTarget:
            redirectTarget == null
                ? undefined
                : stripNamespace(redirectTarget, config.namespace),
        requestedTitle: stripNamespace(requestedTitle, config.namespace),
        title: stripNamespace(actualTitle, config.namespace),
    };

    return resolution;
}

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

function addResolutionAliases(resolutions, namespace) {
    Object.values(resolutions).forEach((resolution) => {
        const key = normalizeTitleKey(resolution.title, namespace);

        resolutions[key] = resolution;
    });

    return resolutions;
}

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

function chunkValues(values, size) {
    const chunks = [];

    for (let index = 0; index < values.length; index += size) {
        chunks.push(values.slice(index, index + size));
    }

    return chunks;
}

function uniqueValues(values) {
    return [...new Set(values)];
}

function escapeRegExp(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}
