/* eslint-disable */

/**
 * Flushes developer and publisher values into shared metadata.
 */

import {
    normalizeListFieldValue,
    trimFieldValue,
} from "../../shared/form-values.js";
import { buildCompanyData } from "../data/companies.js";
import { defineArticleModule } from "../module.js";

export const companiesModule = defineArticleModule({
    fields: ["developers", "publishers"],
    key: "companies",
    listFields: ["developers", "publishers"],
    sourceFields: [
        {
            key: "developers",
            label: "Dev source URLs",
            sourceKey: "developersSourceUrl",
        },
        {
            key: "publishers",
            label: "Pub source URLs",
            sourceKey: "publishersSourceUrl",
        },
    ],

    /**
     * Formats live company field values.
     *
     * @param {string} key - Form field key.
     * @param {*} value - Raw company value.
     * @returns {string} Canonical company text.
     */
    formatField(key, value) {
        if (key === "publishers" && trimFieldValue(value) === "=") {
            return "=";
        }

        return normalizeListFieldValue(value);
    },

    /**
     * Normalizes company form data.
     *
     * @param {object} form - Current article form.
     * @returns {object} Normalized company patch.
     */
    normalize(form) {
        return {
            developers: normalizeListFieldValue(form.developers),
            publishers:
                trimFieldValue(form.publishers) === "="
                    ? "="
                    : normalizeListFieldValue(form.publishers),
        };
    },

    /**
     * Builds company attribution and category metadata.
     *
     * @param {object} form - Fully normalized article form.
     * @param {object} context - Shared module context.
     * @returns {object} Companies part payload.
     */
    flush(form, context) {
        const companyValues = {
            developers: form.developers,
            publishers: form.publishers,
        };
        const metadata = buildCompanyData(companyValues);
        const citations = context.getCitations({
            keys: ["developers", "publishers"],
        });
        const developerValues = metadata.developers.items.map((item) => ({
            ...item,
            role: "developer",
        }));
        const publisherValues = metadata.publishers.items.map((item) => ({
            ...item,
            role: "publisher",
        }));
        const output = {
            assumedCategories: metadata.categories,
            assumedStubTags: metadata.stubTags,
            categoryItems: metadata.categoryItems,
            citations,
            metadata,
            values: [...developerValues, ...publisherValues],
            wikitext: {
                developers: metadata.developers.text,
                publishers: metadata.publishers.text,
            },
        };

        return output;
    },
});
