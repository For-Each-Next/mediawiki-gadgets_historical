/**
 * Flushes series values into shared article metadata.
 */

import { normalizeListFieldValue } from "../../../shared/form-values.ts";
import { buildSeriesMetadata } from "../data/series.ts";
import { defineArticleModule } from "../module.ts";

export const seriesModule = defineArticleModule({
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
     * @param _key - Form field key.
     * @param value - Raw series value.
     * @returns Canonical series text.
     */
    formatField(_key: string, value: any): string {
        return normalizeListFieldValue(value);
    },

    /**
     * Normalizes series form data.
     *
     * @param form - Current article form.
     * @returns Normalized series patch.
     */
    normalize(form: any): any {
        return {
            series: normalizeListFieldValue(form.series),
        };
    },

    /**
     * Builds series link and category-plan metadata.
     *
     * @param form - Fully normalized article form.
     * @param context - Shared module context.
     * @returns Series part payload.
     */
    flush(form: any, context: any): any {
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
