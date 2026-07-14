/**
 * Describes the additional-prose module.
 *
 * Flushes user-entered additional prose without composing article
 * sentences.
 */

import { trimFieldValue } from "../../shared/form-values.ts";
import { defineArticleModule } from "../module.ts";

export const additionalProseModule = defineArticleModule({
    fields: ["additionalProse"],
    key: "additionalProse",
    sourceFields: [
        {
            key: "additionalProse",
            label: "Additional prose source URLs",
            sourceKey: "additionalProseSourceUrl",
        },
    ],

    formatField(_key, value) {
        return trimFieldValue(value);
    },

    normalize(form) {
        const normalized = {
            additionalProse: trimFieldValue(form.additionalProse),
        };

        return normalized;
    },

    flush(form, context) {
        const citations = context.getCitations({
            keys: ["additionalProse"],
        });
        const values = selectValue(
            form.additionalProse === "",
            function trueBranch() {
                return [];
            },
            function falseBranch() {
                return [
                    {
                        normalizedText: form.additionalProse,
                        wikitext: form.additionalProse,
                    },
                ];
            },
        );
        const output = {
            citations,
            values,
            wikitext: {
                text: form.additionalProse,
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
