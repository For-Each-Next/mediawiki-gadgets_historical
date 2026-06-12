/* eslint-disable */

/**
 * Flushes user-entered additional prose without composing article sentences.
 */

import { trimFieldValue } from "../../shared/form-values.js";
import { defineArticleModule } from "../module.js";

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
        const values =
            form.additionalProse === ""
                ? []
                : [
                      {
                          normalizedText: form.additionalProse,
                          wikitext: form.additionalProse,
                      },
                  ];
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
