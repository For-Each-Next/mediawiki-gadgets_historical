/**
 * Flushes article titles and localized names into shared metadata.
 */

import {
    buildNameSourceReferenceKey,
    formatPrefixedValue,
    parsePrefixedValue,
    trimFieldValue,
} from "../../shared/form-values.ts";
import { defineArticleModule } from "../module.ts";

const NAME_SOURCE_PREFIXES = [
    "localizedNames.",
    "officialNames.",
    "commonNames.",
];

export const namesModule = defineArticleModule({
    fields: [
        "name",
        "originalLanguage",
        "originalName",
        "englishName",
        "sortKey",
        "localizedNames",
        "officialNames",
        "commonNames",
    ],
    key: "names",
    sourceFields: [
        {
            key: "originalName",
            label: "Original title source URLs",
            sourceKey: "originalNameSourceUrl",
        },
        {
            key: "englishName",
            label: "English title source URLs",
            sourceKey: "englishNameSourceUrl",
        },
    ],

    /**
     * Formats live title field values.
     *
     * @param key - Form field key.
     * @param value - Raw field value.
     * @returns Canonical field text.
     */
    formatField(key: string, value: any): string {
        if (key === "originalName") {
            return formatPrefixedValue(value, {
                normalizePrefix: (prefix) => prefix.toLocaleLowerCase(),
            });
        }

        return trimFieldValue(value);
    },

    /**
     * Normalizes title data for all output handlers.
     *
     * @param form - Current article form.
     * @param context - Shared module context.
     * @returns Normalized title form patch.
     */
    normalize(form: any, context: any): any {
        const original = parsePrefixedValue(
            form.originalName,
            form.originalLanguage || "ja",
        );
        const localizedNames = getLocalizedNameRows(form);

        return {
            commonNames: localizedNames.filter((row) => !row.official),
            englishName: trimFieldValue(form.englishName),
            localizedNames,
            name:
                trimFieldValue(form.name) ||
                trimFieldValue(context.defaultName),
            officialNames: localizedNames.filter((row) => row.official),
            originalLanguage: original.prefix.toLocaleLowerCase() || "ja",
            originalName: original.value,
            sortKey: trimFieldValue(form.sortKey),
        };
    },

    /**
     * Builds title metadata and generated title fragments.
     *
     * @param form - Fully normalized article form.
     * @param context - Shared module context.
     * @returns Names part payload.
     */
    flush(form: any, context: any): any {
        const citations = context.getCitations({
            keys: ["originalName", "englishName"],
            prefixes: NAME_SOURCE_PREFIXES,
        });
        const metadata = {
            commonNames: form.commonNames,
            englishName: form.englishName,
            name: form.name,
            officialNames: form.officialNames,
            original: {
                language: form.originalLanguage,
                name: form.originalName,
            },
            sortKey: form.sortKey,
        };
        const values = buildNameValues(form);
        const wikitext = {
            englishName: form.englishName,
            name: form.name,
            originalName: form.originalName,
        };
        const output = {
            citations,
            metadata,
            values,
            wikitext,
        };

        return output;
    },
});


/**
 * Defines the module-level build name values.
 */
function buildNameValues(form) {
    const values = [
        {
            key: "name",
            normalizedText: form.name,
            wikitext: form.name,
        },
        {
            key: "originalName",
            metadata: {
                language: form.originalLanguage,
            },
            normalizedText: form.originalName,
            wikitext: form.originalName,
        },
        {
            key: "englishName",
            normalizedText: form.englishName,
            wikitext: form.englishName,
        },
        ...form.localizedNames.map(function callback(row) {
            return {
                key: "localizedName",
                metadata: row,
                normalizedText: row.name,
                wikitext: row.name,
            };
        }),
    ].filter((value) => value.normalizedText !== "");

    return values;
}


/**
 * Gets merged localized name rows with stable source keys.
 *
 * @param form - Dialog form values.
 * @returns Localized name rows.
 */
function getLocalizedNameRows(form: any): Array<any> {
    if (Array.isArray(form.localizedNames)) {
        return form.localizedNames.map(function callback(row, index) {
            return {
                ...row,
                name: trimFieldValue(row.name),
                sourceKey: buildNameSourceReferenceKey(
                    "localizedNames",
                    index,
                ),
                sourceUrl: trimFieldValue(row.sourceUrl),
            };
        });
    }

    return [
        ...(form.officialNames || []).map(function callback(row, index) {
            return {
                ...row,
                name: trimFieldValue(row.name),
                official: true,
                sourceKey: buildNameSourceReferenceKey("officialNames", index),
                sourceUrl: trimFieldValue(row.sourceUrl),
            };
        }),
        ...(form.commonNames || []).map(function callback(row, index) {
            return {
                ...row,
                name: trimFieldValue(row.name),
                official: false,
                sourceKey: buildNameSourceReferenceKey("commonNames", index),
                sourceUrl: trimFieldValue(row.sourceUrl),
            };
        }),
    ];
}
