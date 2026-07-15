/**
 * Flushes genre values into shared article metadata.
 */

import { normalizeListFieldValue } from "../../../shared/form-values.ts";
import { buildGenreMetadata } from "../data/genres.ts";
import { defineArticleModule } from "../module.ts";

export const genreModule = defineArticleModule({
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
     * @param _key - Form field key.
     * @param value - Raw genre value.
     * @returns Canonical genre text.
     */
    formatField(_key: string, value: any): string {
        return normalizeListFieldValue(value);
    },

    /**
     * Normalizes genre form data.
     *
     * @param form - Current article form.
     * @returns Normalized genre patch.
     */
    normalize(form: any): any {
        return {
            genres: normalizeListFieldValue(form.genres),
        };
    },

    /**
     * Builds genre metadata.
     *
     * @param form - Fully normalized article form.
     * @param context - Shared module context.
     * @returns Genre part payload.
     */
    flush(form: any, context: any): any {
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
