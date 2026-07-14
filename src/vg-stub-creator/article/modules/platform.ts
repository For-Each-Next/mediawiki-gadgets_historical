/**
 * Flushes platform values into shared article metadata.
 */

import { normalizeListFieldValue } from "../../shared/form-values.ts";
import { buildPlatformMetadata } from "../data/platforms.ts";
import { defineArticleModule } from "../module.ts";

export const platformModule = defineArticleModule({
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
     * @param _key - Form field key.
     * @param value - Raw platform value.
     * @returns Canonical platform text.
     */
    formatField(_key: string, value: any): string {
        return normalizeListFieldValue(value);
    },

    /**
     * Normalizes platform form data.
     *
     * @param form - Current article form.
     * @returns Normalized platform patch.
     */
    normalize(form: any): any {
        return {
            platforms: normalizeListFieldValue(form.platforms),
        };
    },

    /**
     * Builds platform link and category metadata.
     *
     * @param form - Fully normalized article form.
     * @param context - Shared module context.
     * @returns Platform part payload.
     */
    flush(form: any, context: any): any {
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
