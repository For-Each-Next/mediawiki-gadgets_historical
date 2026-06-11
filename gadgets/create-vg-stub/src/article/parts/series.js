/* eslint-disable */

/**
 * Flushes series values into shared article metadata.
 */

import { normalizeListFieldValue } from "../../form-values.js";
import { buildSeriesMetadata } from "../data/series.js";
import { defineArticlePart } from "../part.js";

export const seriesPart = defineArticlePart({
    fields: ["series"],
    key: "series",
    listFields: ["series"],
    sourceFields: [
        {
            key: "series",
            label: "Series source URLs",
            sourceKey: "seriesSourceUrl",
        },
    ],

    /**
     * Formats the live series field.
     *
     * @param {string} _key - Form field key.
     * @param {*} value - Raw series value.
     * @returns {string} Canonical series text.
     */
    formatField(_key, value) {
        return normalizeListFieldValue(value);
    },

    /**
     * Normalizes series form data.
     *
     * @param {object} form - Current article form.
     * @returns {object} Normalized series patch.
     */
    normalize(form) {
        return {
            series: normalizeListFieldValue(form.series),
        };
    },

    /**
     * Builds series link and category-plan metadata.
     *
     * @param {object} form - Fully normalized article form.
     * @param {object} context - Hub context.
     * @returns {object} Series part payload.
     */
    flush(form, context) {
        const metadata = buildSeriesMetadata(form.series);
        const citations = context.getCitations({
            keys: ["series"],
        });
        const output = {
            categoryPlans: metadata.categoryPlans,
            citations,
            metadata,
            values: metadata.items,
            wikitext: {
                list: metadata.text,
            },
        };

        return output;
    },
});
