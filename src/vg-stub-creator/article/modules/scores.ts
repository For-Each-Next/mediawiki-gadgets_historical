/**
 * Flushes aggregate review scores into shared article metadata.
 */

import {
    formatPrefixedValue,
    parsePrefixedValue,
    trimFieldValue,
} from "../../shared/form-values.ts";
import { defineArticleModule } from "../module.ts";

export const scoresModule = defineArticleModule({
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
     * @param key - Form field key.
     * @param value - Raw score field value.
     * @returns Canonical score text.
     */
    formatField(key: string, value: any): string {
        if (key !== "metacriticScore") {
            return trimFieldValue(value);
        }

        const enteredScore = trimFieldValue(value);
        const score = selectValue(
            enteredScore.includes(":"),
            function trueBranch() {
                return enteredScore;
            },
            function falseBranch() {
                return enteredScore.replace(/^(.+?)\s+(\d{1,3})$/u, "$1:$2");
            },
        );

        return formatPrefixedValue(score, {
            normalizePrefix: normalizeScorePlatform,
        });
    },

    /**
     * Normalizes aggregate score form data.
     *
     * @param form - Current article form.
     * @returns Normalized score patch.
     */
    normalize(form: any): any {
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
     * @param form - Fully normalized article form.
     * @param context - Shared module context.
     * @returns Scores part payload.
     */
    flush(form: any, context: any): any {
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
 * @param value - Raw platform prefix.
 * @returns Canonical score platform.
 */
function normalizeScorePlatform(value: any): string {
    const platform = trimFieldValue(value);

    if (/^[a-z0-9_-]{1,8}$/iu.test(platform)) {
        return platform.toLocaleUpperCase();
    }

    return platform;
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
