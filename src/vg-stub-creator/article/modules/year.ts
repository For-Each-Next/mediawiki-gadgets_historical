/**
 * Flushes release-year values into shared article metadata.
 */

import { buildYearMetadata, normalizeYearFieldValue } from "../data/year.ts";
import { defineArticleModule } from "../module.ts";

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
     * @param _key - Form field key.
     * @param value - Raw year value.
     * @returns Canonical year value.
     */
    formatField(_key: string, value: any): string {
        return normalizeYearFieldValue(value);
    },

    /**
     * Normalizes release-year form data.
     *
     * @param form - Current article form.
     * @returns Normalized year patch.
     */
    normalize(form: any): any {
        return {
            year: normalizeYearFieldValue(form.year),
        };
    },

    /**
     * Builds release-year metadata.
     *
     * @param form - Fully normalized article form.
     * @param context - Shared module context.
     * @returns Year part payload.
     */
    flush(form: any, context: any): any {
        const metadata = buildYearMetadata(form.year);
        const citations = context.getCitations({
            keys: ["year"],
        });
        const values = selectValue(
            metadata.value === "",
            function trueBranch() {
                return [];
            },
            function falseBranch() {
                return [
                    {
                        normalizedText: metadata.value,
                        wikitext: metadata.value,
                    },
                ];
            },
        );
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
