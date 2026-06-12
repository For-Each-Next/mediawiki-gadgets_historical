/* eslint-disable */

/**
 * Flushes release-year values into shared article metadata.
 */

import { buildYearMetadata, normalizeYearFieldValue } from "../data/year.js";
import { defineArticleModule } from "../module.js";

export const yearModule = defineArticleModule({
    fields: ["year"],
    key: "year",
    sourceFields: [
        {
            key: "year",
            label: "Year source URLs",
            sourceKey: "yearSourceUrl",
        },
    ],

    /**
     * Formats the live release-year field.
     *
     * @param {string} _key - Form field key.
     * @param {*} value - Raw year value.
     * @returns {string} Canonical year value.
     */
    formatField(_key, value) {
        return normalizeYearFieldValue(value);
    },

    /**
     * Normalizes release-year form data.
     *
     * @param {object} form - Current article form.
     * @returns {object} Normalized year patch.
     */
    normalize(form) {
        return {
            year: normalizeYearFieldValue(form.year),
        };
    },

    /**
     * Builds release-year metadata.
     *
     * @param {object} form - Fully normalized article form.
     * @param {object} context - Shared module context.
     * @returns {object} Year part payload.
     */
    flush(form, context) {
        const metadata = buildYearMetadata(form.year);
        const citations = context.getCitations({
            keys: ["year"],
        });
        const values =
            metadata.value === ""
                ? []
                : [
                      {
                          normalizedText: metadata.value,
                          wikitext: metadata.value,
                      },
                  ];
        const output = {
            assumedCategories: metadata.categories,
            citations,
            metadata,
            values,
            wikitext: {
                phrase: metadata.phrase,
            },
        };

        return output;
    },
});
