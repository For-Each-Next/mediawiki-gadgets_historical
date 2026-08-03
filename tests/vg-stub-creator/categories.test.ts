/**
 * Tests category review defaults.
 */

import assert from "node:assert/strict";
import test from "node:test";

import * as categories from "vg-stub-creator/infra/handlers/categories.ts";

const resolvesMissingCategories = async function resolvesMissingCategories() {
    const options = { fetcher: createCategoryFetcher() };
    const rows = await categories.resolveCategoryRows(
        [
            { category: "分類:Existing games", enabled: true },
            { category: "Missing games", enabled: true },
        ],
        options,
    );

    const actualRows = rows.map((row) => [
        row.category,
        row.status,
        row.enabled,
    ]);
    assert.deepEqual(actualRows, [
        ["Existing games", "OK", true],
        ["Missing games", "Not exists", false],
    ]);
};
test(
    "missing categories are unchecked after resolution",
    resolvesMissingCategories,
);

/**
 * Creates a category lookup response with one missing category.
 *
 * @returns MediaWiki-compatible fetch implementation.
 */
function createCategoryFetcher(): typeof fetch {
    return async function fetcher(input) {
        const inputText = String(input);
        const url = new URL(inputText, "https://example.test");
        const titles = url.searchParams.get("titles")?.split("|") || [];
        const pages = titles.map(function createPage(title) {
            if (title === "Category:Missing games") {
                return { missing: true, title };
            }

            return { title };
        });
        return Response.json({ query: { pages } });
    };
}
