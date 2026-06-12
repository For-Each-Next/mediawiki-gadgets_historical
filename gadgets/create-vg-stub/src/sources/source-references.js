/* eslint-disable */

/**
 * Collects source URLs and provides shared citation fetching.
 */

import { getArticleSourceFields } from "../article/index.js";
import { fetchCiteTemplate } from "./citations.js";
import {
    buildNameSourceReferenceKey,
    splitSourceUrls,
    trimFieldValue,
} from "../shared/form-values.js";

const NAME_GROUP_KEYS = ["localizedNames", "officialNames", "commonNames"];

/**
 * Creates a shared citation fetch/cache store.
 *
 * @returns {object} Citation store.
 */
export function createCitationStore() {
    const cache = {};
    const pending = {};

    return {
        /**
         * Fetches citation wikitext, reusing cached requests.
         *
         * @param {string} url - Source URL.
         * @returns {Promise<string>} Citation template wikitext.
         */
        fetch(url) {
            const key = trimFieldValue(url);

            if (cache[key] != null) {
                return Promise.resolve(cache[key]);
            }

            if (pending[key] == null) {
                pending[key] = fetchCiteTemplate(key, { cache }).finally(
                    () => {
                        delete pending[key];
                    },
                );
            }

            return pending[key];
        },

        /**
         * Starts a background citation fetch for a source URL.
         *
         * @param {string} url - Source URL.
         * @returns {void}
         */
        prefetch(url) {
            if (!isPrefetchableSourceUrl(url)) {
                return;
            }

            this.fetch(url).catch(() => {});
        },
    };
}

/**
 * Fetches named citation data for all entered source URLs.
 *
 * @param {object} form - Dialog form values.
 * @param {object} citationStore - Citation fetch/cache store.
 * @returns {Promise<Array<object>>} Source reference data.
 */
export async function fetchSourceReferences(form, citationStore) {
    return Promise.all(
        getEnteredSourceReferenceFields(form).map(async (field) => ({
            citation: await citationStore.fetch(field.sourceUrl),
            key: field.key,
            sourceUrl: field.sourceUrl,
        })),
    );
}

/**
 * Gets all source reference fields with entered URLs.
 *
 * @param {object} form - Dialog form values.
 * @returns {Array<object>} Entered source fields.
 */
export function getEnteredSourceReferenceFields(form) {
    return [
        ...getArticleSourceFields().flatMap((field) =>
            splitSourceUrls(form[field.sourceKey]).map((sourceUrl) => ({
                ...field,
                sourceUrl,
            })),
        ),
        ...getEnteredNameSourceReferenceFields(form),
    ];
}

/**
 * Gets all unique source URLs currently entered in the form.
 *
 * @param {object} form - Dialog form values.
 * @returns {Array<string>} Unique source URLs.
 */
export function getEnteredSourceUrls(form) {
    return [
        ...new Set(
            getEnteredSourceReferenceFields(form)
                .map((field) => trimFieldValue(field.sourceUrl))
                .filter(Boolean),
        ),
    ];
}

/**
 * Gets source fields for localized name rows with entered URLs.
 *
 * @param {object} form - Dialog form values.
 * @returns {Array<object>} Entered localized-name source fields.
 */
export function getEnteredNameSourceReferenceFields(form) {
    return NAME_GROUP_KEYS.flatMap((key) =>
        (form[key] || [])
            .flatMap((row, index) =>
                splitSourceUrls(row.sourceUrl).map((sourceUrl) => ({
                    key: buildNameSourceReferenceKey(key, index),
                    name: row.name,
                    sourceUrl,
                })),
            )
            .filter(
                (field) =>
                    Boolean(trimFieldValue(field.name)) &&
                    Boolean(trimFieldValue(field.sourceUrl)),
            ),
    );
}

/**
 * Checks whether a URL can be prefetched.
 *
 * @param {string} url - Source URL.
 * @returns {boolean} Whether the URL is a complete HTTP URL.
 */
function isPrefetchableSourceUrl(url) {
    try {
        const parsed = new URL(trimFieldValue(url));

        return ["http:", "https:"].includes(parsed.protocol);
    } catch (_error) {
        return false;
    }
}
