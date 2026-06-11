/* eslint-disable */

/**
 * Flushes aggregate review scores into shared article metadata.
 */

import {
    formatPrefixedValue,
    parsePrefixedValue,
    trimFieldValue,
} from "../../form-values.js";
import { defineArticlePart } from "../part.js";

export const scoresPart = defineArticlePart({
    fields: ["metacriticPlatform", "metacriticScore", "openCriticRecommend"],
    key: "scores",
    sourceFields: [
        {
            key: "metacriticScore",
            label: "MC score source URLs",
            sourceKey: "metacriticScoreSourceUrl",
        },
        {
            key: "openCriticRecommend",
            label: "OC score source URLs",
            sourceKey: "openCriticRecommendSourceUrl",
        },
    ],

    /**
     * Formats live score field values.
     *
     * @param {string} key - Form field key.
     * @param {*} value - Raw score field value.
     * @returns {string} Canonical score text.
     */
    formatField(key, value) {
        if (key !== "metacriticScore") {
            return trimFieldValue(value);
        }

        return formatPrefixedValue(value, {
            normalizePrefix: normalizeScorePlatform,
        });
    },

    /**
     * Normalizes aggregate score form data.
     *
     * @param {object} form - Current article form.
     * @returns {object} Normalized score patch.
     */
    normalize(form) {
        const metacritic = parsePrefixedValue(
            form.metacriticScore,
            form.metacriticPlatform || "",
        );

        return {
            metacriticPlatform: normalizeScorePlatform(metacritic.prefix),
            metacriticScore: metacritic.value,
            openCriticRecommend: trimFieldValue(form.openCriticRecommend),
        };
    },

    /**
     * Builds aggregate score metadata and prose.
     *
     * @param {object} form - Fully normalized article form.
     * @param {object} context - Hub context.
     * @returns {object} Scores part payload.
     */
    flush(form, context) {
        const citations = context.getCitations({
            keys: ["metacriticScore", "openCriticRecommend"],
        });
        const metadata = {
            metacritic: {
                platform: form.metacriticPlatform,
                score: form.metacriticScore,
            },
            openCritic: {
                recommend: form.openCriticRecommend,
            },
        };
        const values = [
            {
                key: "metacritic",
                metadata: metadata.metacritic,
                normalizedText: [form.metacriticPlatform, form.metacriticScore]
                    .filter(Boolean)
                    .join(":"),
            },
            {
                key: "openCritic",
                metadata: metadata.openCritic,
                normalizedText: form.openCriticRecommend,
            },
        ].filter((value) => value.normalizedText !== "");
        const output = {
            citations,
            metadata,
            values,
            wikitext: {
                metacriticScore: form.metacriticScore,
                openCriticRecommend: form.openCriticRecommend,
            },
        };

        return output;
    },
});

/**
 * Normalizes compact review-platform codes while preserving full names.
 *
 * @param {*} value - Raw platform prefix.
 * @returns {string} Canonical score platform.
 */
function normalizeScorePlatform(value) {
    const platform = trimFieldValue(value);

    if (/^[a-z0-9_-]{1,8}$/iu.test(platform)) {
        return platform.toLocaleUpperCase();
    }

    return platform;
}
