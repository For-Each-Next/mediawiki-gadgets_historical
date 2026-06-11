/* eslint-disable */

/**
 * Flushes genre values into shared article metadata.
 */

import { normalizeListFieldValue } from "../../form-values.js";
import { buildGenreMetadata } from "../data/genres.js";
import { defineArticlePart } from "../part.js";

export const genrePart = defineArticlePart({
    fields: ["genres"],
    key: "genre",
    listFields: ["genres"],
    sourceFields: [
        {
            key: "genres",
            label: "Genre source URLs",
            sourceKey: "genresSourceUrl",
        },
    ],

    /**
     * Formats the live genre field.
     *
     * @param {string} _key - Form field key.
     * @param {*} value - Raw genre value.
     * @returns {string} Canonical genre text.
     */
    formatField(_key, value) {
        return normalizeListFieldValue(value);
    },

    /**
     * Normalizes genre form data.
     *
     * @param {object} form - Current article form.
     * @returns {object} Normalized genre patch.
     */
    normalize(form) {
        return {
            genres: normalizeListFieldValue(form.genres),
        };
    },

    /**
     * Builds genre metadata.
     *
     * @param {object} form - Fully normalized article form.
     * @param {object} context - Hub context.
     * @returns {object} Genre part payload.
     */
    flush(form, context) {
        const metadata = buildGenreMetadata(form.genres);
        const citations = context.getCitations({
            keys: ["genres"],
        });
        const output = {
            assumedCategories: metadata.categories,
            assumedStubTags: metadata.stubTags,
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
