/**
 * Flushes developer and publisher values into shared metadata.
 */

import {
    normalizeListFieldValue,
    trimFieldValue,
} from "../../shared/form-values.ts";
import { buildCompanyData } from "../data/companies.ts";
import { defineArticleModule } from "../module.ts";

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
     * @param key - Form field key.
     * @param value - Raw company value.
     * @returns Canonical company text.
     */
    formatField(key: string, value: any): string {
        if (key === "publishers" && trimFieldValue(value) === "=") {
            return "=";
        }

        return normalizeListFieldValue(value);
    },

    /**
     * Normalizes company form data.
     *
     * @param form - Current article form.
     * @returns Normalized company patch.
     */
    normalize(form: any): any {
        return {
            developers: normalizeListFieldValue(form.developers),
            publishers: selectValue(
                trimFieldValue(form.publishers) === "=",
                function trueBranch() {
                    return "=";
                },
                function falseBranch() {
                    return normalizeListFieldValue(form.publishers);
                },
            ),
        };
    },

    /**
     * Builds company attribution and category metadata.
     *
     * @param form - Fully normalized article form.
     * @param context - Shared module context.
     * @returns Companies part payload.
     */
    flush(form: any, context: any): any {
        const companyValues = {
            developers: form.developers,
            publishers: form.publishers,
        };
        const metadata = buildCompanyData(companyValues);
        const citations = context.getCitations({
            keys: ["developers", "publishers"],
        });
        const developerValues = metadata.developers.items.map(
            function callback(item) {
                return {
                    ...item,
                    role: "developer",
                };
            },
        );
        const publisherValues = metadata.publishers.items.map(
            function callback(item) {
                return {
                    ...item,
                    role: "publisher",
                };
            },
        );
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
