/* eslint-disable */

/**
 * Flushes article titles and localized names into shared metadata.
 */

import {
    buildNameSourceReferenceKey,
    formatPrefixedValue,
    parsePrefixedValue,
    trimFieldValue,
} from "../../shared/form-values.js";
import { defineArticleModule } from "../module.js";

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
     * @param {string} key - Form field key.
     * @param {*} value - Raw field value.
     * @returns {string} Canonical field text.
     */
    formatField(key, value) {
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
     * @param {object} form - Current article form.
     * @param {object} context - Shared module context.
     * @returns {object} Normalized title form patch.
     */
    normalize(form, context) {
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
     * @param {object} form - Fully normalized article form.
     * @param {object} context - Shared module context.
     * @returns {object} Names part payload.
     */
    flush(form, context) {
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
        ...form.localizedNames.map((row) => ({
            key: "localizedName",
            metadata: row,
            normalizedText: row.name,
            wikitext: row.name,
        })),
    ].filter((value) => value.normalizedText !== "");

    return values;
}

/**
 * Gets merged localized name rows with stable source keys.
 *
 * @param {object} form - Dialog form values.
 * @returns {Array<object>} Localized name rows.
 */
function getLocalizedNameRows(form) {
    if (Array.isArray(form.localizedNames)) {
        return form.localizedNames.map((row, index) => ({
            ...row,
            name: trimFieldValue(row.name),
            sourceKey: buildNameSourceReferenceKey("localizedNames", index),
            sourceUrl: trimFieldValue(row.sourceUrl),
        }));
    }

    return [
        ...(form.officialNames || []).map((row, index) => ({
            ...row,
            name: trimFieldValue(row.name),
            official: true,
            sourceKey: buildNameSourceReferenceKey("officialNames", index),
            sourceUrl: trimFieldValue(row.sourceUrl),
        })),
        ...(form.commonNames || []).map((row, index) => ({
            ...row,
            name: trimFieldValue(row.name),
            official: false,
            sourceKey: buildNameSourceReferenceKey("commonNames", index),
            sourceUrl: trimFieldValue(row.sourceUrl),
        })),
    ];
}
