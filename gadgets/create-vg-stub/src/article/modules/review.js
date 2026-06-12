/* eslint-disable */

/**
 * Flushes reviewed category and navbox selections.
 */

import { trimFieldValue } from "../../shared/form-values.js";
import { defineArticleModule } from "../module.js";

export const reviewModule = defineArticleModule({
    fields: ["categoryRows", "navboxRows", "navboxText"],
    key: "review",

    /**
     * Normalizes reviewed output values.
     *
     * @param {object} form - Current article form.
     * @returns {object} Normalized review patch.
     */
    normalize(form) {
        return {
            categoryRows: Array.isArray(form.categoryRows)
                ? form.categoryRows
                : [],
            navboxRows: Array.isArray(form.navboxRows) ? form.navboxRows : [],
            navboxText: trimFieldValue(form.navboxText),
        };
    },

    /**
     * Builds reviewed output metadata.
     *
     * @param {object} form - Fully normalized article form.
     * @returns {object} Review part payload.
     */
    flush(form) {
        const navboxes = form.navboxRows.map(normalizeNavbox);
        const metadata = {
            categoryRows: form.categoryRows,
            navboxText: form.navboxText,
        };
        const output = {
            metadata,
            navboxes,
            wikitext: {
                navbox: form.navboxText,
            },
        };

        return output;
    },
});

function normalizeNavbox(row) {
    const navbox = {
        enabled: row.enabled !== false,
        status: row.status || "",
        text: trimFieldValue(row.text),
        title: trimFieldValue(row.title),
    };

    return navbox;
}
