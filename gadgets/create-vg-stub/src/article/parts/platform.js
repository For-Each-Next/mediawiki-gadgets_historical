/* eslint-disable */

/**
 * Flushes platform values into shared article metadata.
 */

import { normalizeListFieldValue } from "../../form-values.js";
import { buildPlatformMetadata } from "../data/platforms.js";
import { defineArticlePart } from "../part.js";

export const platformPart = defineArticlePart({
    fields: ["platforms"],
    key: "platform",
    listFields: ["platforms"],
    sourceFields: [
        {
            key: "platforms",
            label: "Plat source URLs",
            sourceKey: "platformsSourceUrl",
        },
    ],

    /**
     * Formats the live platform field.
     *
     * @param {string} _key - Form field key.
     * @param {*} value - Raw platform value.
     * @returns {string} Canonical platform text.
     */
    formatField(_key, value) {
        return normalizeListFieldValue(value);
    },

    /**
     * Normalizes platform form data.
     *
     * @param {object} form - Current article form.
     * @returns {object} Normalized platform patch.
     */
    normalize(form) {
        return {
            platforms: normalizeListFieldValue(form.platforms),
        };
    },

    /**
     * Builds platform link and category metadata.
     *
     * @param {object} form - Fully normalized article form.
     * @param {object} context - Hub context.
     * @returns {object} Platform part payload.
     */
    flush(form, context) {
        const metadata = buildPlatformMetadata(form.platforms);
        const citations = context.getCitations({
            keys: ["platforms"],
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
