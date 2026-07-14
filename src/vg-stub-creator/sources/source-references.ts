/**
 * Collects source URLs and provides shared citation fetching.
 */

import { getArticleSourceFields } from "../article/index.ts";
import {
    buildCiteTemplateFromParts,
    fetchCiteTemplate,
    parseCiteTemplate,
    sortCitationParams,
} from "./citations.ts";
import {
    buildNameSourceReferenceKey,
    splitSourceUrls,
    trimFieldValue,
} from "../shared/form-values.ts";

const NAME_GROUP_KEYS = ["localizedNames", "officialNames", "commonNames"];


/**
 * Creates a shared citation fetch/cache store.
 *
 * @returns Citation store.
 */
export function createCitationStore(): any {
    const cache = {};
    const pending = {};

    return {
        /**
         * Fetches citation wikitext, reusing cached requests.
         *
         * @param url - Source URL.
         * @returns Citation template wikitext.
         */
        fetch(url: string): Promise<string> {
            const key = trimFieldValue(url);

            if (cache[key] != null) {
                return Promise.resolve(cache[key]);
            }

            if (pending[key] == null) {
                pending[key] = fetchCiteTemplate(key, { cache }).finally(
                    function callback() {
                        delete pending[key];
                    },
                );
            }

            return pending[key];
        },

        /**
         * Fetches fresh citation wikitext and updates the cache.
         *
         * @param url - Source URL.
         * @returns Citation template wikitext.
         */
        refetch(url: string): Promise<string> {
            const key = trimFieldValue(url);

            delete cache[key];
            delete pending[key];

            pending[key] = fetchCiteTemplate(key, { cache }).finally(
                function callback() {
                    delete pending[key];
                },
            );

            return pending[key];
        },

        /**
         * Starts a background citation fetch for a source URL.
         *
         * @param url - Source URL.
         * @returns */
        prefetch(url: string): void {
            if (!isPrefetchableSourceUrl(url)) {
                return;
            }

            this.fetch(url).catch(function callback() {});
        },
    };
}


/**
 * Fetches named citation data for all entered source URLs.
 *
 * @param form - Dialog form values.
 * @param citationStore - Citation fetch/cache store.
 * @returns Source reference data.
 */
export async function fetchSourceReferences(
    form: any,
    citationStore: any,
): Promise<Array<any>> {
    return Promise.all(
        getEnteredSourceReferenceFields(form).map(
            async function callback(field) {
                return {
                    citation:
                        getManagedCitation(form, field.sourceUrl) ||
                        (await citationStore.fetch(field.sourceUrl)),
                    key: field.key,
                    sourceUrl: field.sourceUrl,
                };
            },
        ),
    );
}


/**
 * Handles prepare managed citation rows.
 *
 * Prepares editable citation rows for all currently entered source
 * URLs.
 *
 * @param form - Dialog form values.
 * @param citationStore - Citation fetch/cache store.
 * @param options - Citation preparation options.
 * @param options.refetchSourceUrls - Source URLs to
 * re-fetch.
 * @returns Managed citation rows.
 *
 */
export async function prepareManagedCitationRows(
    form: any,
    citationStore: any,
    options: any = {},
): Promise<Array<any>> {
    const existingRows = selectValue(
        Array.isArray(form.citationRows),
        function trueBranch() {
            return form.citationRows;
        },
        function falseBranch() {
            return [];
        },
    );
    const refetchSourceUrls = new Set(
        (options.refetchSourceUrls || []).map(trimFieldValue),
    );

    return Promise.all(
        getEnteredSourceUrls(form).map(
            async function callback(sourceUrl, index) {
                const generatedCitation = await selectValue(
                    refetchSourceUrls.has(sourceUrl),
                    function trueBranch() {
                        return citationStore.refetch(sourceUrl);
                    },
                    function falseBranch() {
                        return citationStore.fetch(sourceUrl);
                    },
                );
                const generated = parseCiteTemplate(generatedCitation);
                const existing = existingRows.find(
                    (row) => trimFieldValue(row.sourceUrl) === sourceUrl,
                );
                const generatedParams = sortCitationParams(generated.params);

                return {
                    generatedParams,
                    index: index + 1,
                    modified: existing?.modified === true,
                    params: selectValue(
                        existing?.modified === true,
                        function trueBranch() {
                            return sortCitationParams(existing.params || []);
                        },
                        function falseBranch() {
                            return generatedParams;
                        },
                    ),
                    sourceUrl,
                    template: selectValue(
                        trimFieldValue(existing?.template),
                        function trueBranch() {
                            return existing.template;
                        },
                        function falseBranch() {
                            return generated.template;
                        },
                    ),
                };
            },
        ),
    );
}


/**
 * Gets all source reference fields with entered URLs.
 *
 * @param form - Dialog form values.
 * @returns Entered source fields.
 */
export function getEnteredSourceReferenceFields(form: any): Array<any> {
    return [
        ...getArticleSourceFields().flatMap(function callback(field) {
            return splitSourceUrls(form[field.sourceKey]).map(
                function callback(sourceUrl) {
                    return {
                        ...field,
                        sourceUrl,
                    };
                },
            );
        }),
        ...getEnteredNameSourceReferenceFields(form),
    ];
}


/**
 * Gets all unique source URLs currently entered in the form.
 *
 * @param form - Dialog form values.
 * @returns Unique source URLs.
 */
export function getEnteredSourceUrls(form: any): Array<string> {
    return [
        ...new Set(
            getEnteredSourceReferenceFields(form)
                .map((field) => trimFieldValue(field.sourceUrl))
                .filter(Boolean),
        ),
    ];
}


/**
 * Builds a managed citation for a source URL when the form has one.
 *
 * @param form - Dialog form values.
 * @param sourceUrl - Source URL.
 * @returns Managed citation wikitext, or empty string.
 */
function getManagedCitation(form: any, sourceUrl: string): string {
    if (!Array.isArray(form.citationRows)) {
        return "";
    }

    const row = form.citationRows.find(
        (item) => trimFieldValue(item.sourceUrl) === trimFieldValue(sourceUrl),
    );

    if (row == null) {
        return "";
    }

    return buildCiteTemplateFromParts(row);
}


/**
 * Gets source fields for localized name rows with entered URLs.
 *
 * @param form - Dialog form values.
 * @returns Entered localized-name source fields.
 */
export function getEnteredNameSourceReferenceFields(form: any): Array<any> {
    return NAME_GROUP_KEYS.flatMap(function callback(key) {
        return (form[key] || [])
            .flatMap(function callback(row, index) {
                return splitSourceUrls(row.sourceUrl).map(
                    function callback(sourceUrl) {
                        return {
                            key: buildNameSourceReferenceKey(key, index),
                            name: row.name,
                            sourceUrl,
                        };
                    },
                );
            })
            .filter(function callback(field) {
                return (
                    Boolean(trimFieldValue(field.name)) &&
                    Boolean(trimFieldValue(field.sourceUrl))
                );
            });
    });
}


/**
 * Checks whether a URL can be prefetched.
 *
 * @param url - Source URL.
 * @returns Whether the URL is a complete HTTP URL.
 */
function isPrefetchableSourceUrl(url: string): boolean {
    try {
        const parsed = new URL(trimFieldValue(url));

        return ["http:", "https:"].includes(parsed.protocol);
    } catch (_error) {
        return false;
    }
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
