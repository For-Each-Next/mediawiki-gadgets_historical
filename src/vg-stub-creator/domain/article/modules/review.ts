/**
 * Flushes reviewed category and navbox selections.
 */

import { trimFieldValue } from "../../../shared/form-values.ts";
import { defineArticleModule } from "../module.ts";

export const reviewModule = defineArticleModule({
    fields: ["categoryRows", "stubTagRows", "navboxRows", "navboxText"],
    key: "review",

    /**
     * Normalizes reviewed output values.
     *
     * @param form - Current article form.
     * @returns Normalized review patch.
     */
    normalize(form: any): any {
        return {
            categoryRows: selectValue(
                Array.isArray(form.categoryRows),
                function trueBranch() {
                    return form.categoryRows;
                },
                function falseBranch() {
                    return [];
                },
            ),
            stubTagRows: selectValue(
                Array.isArray(form.stubTagRows),
                function trueBranch() {
                    return form.stubTagRows;
                },
                function falseBranch() {
                    return null;
                },
            ),
            navboxRows: Array.isArray(form.navboxRows) ? form.navboxRows : [],
            navboxText: trimFieldValue(form.navboxText),
        };
    },

    /**
     * Builds reviewed output metadata.
     *
     * @param form - Fully normalized article form.
     * @returns Review part payload.
     */
    flush(form: any): any {
        const navboxes = form.navboxRows.map(normalizeNavbox);
        const metadata = {
            categoryRows: form.categoryRows,
            stubTagRows: form.stubTagRows,
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

/**
 * Defines the module-level normalize navbox.
 */
function normalizeNavbox(row) {
    const navbox = {
        enabled: row.enabled !== false,
        status: row.status || "",
        text: trimFieldValue(row.text),
        title: trimFieldValue(row.title),
    };

    return navbox;
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
