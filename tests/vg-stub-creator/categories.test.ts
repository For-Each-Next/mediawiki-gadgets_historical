/**
 * Tests category review defaults.
 */

import assert from "node:assert/strict";
import test from "node:test";

import * as categories from "vg-stub-creator/infra/handlers/categories.ts";

test("missing categories are unchecked after resolution", async () => {
    const rows = await categories.resolveCategoryRows(
        [
            { category: "Existing games", enabled: true },
            { category: "Missing games", enabled: true },
        ],
        { fetcher: createCategoryFetcher() },
    );

    assert.deepEqual(
        rows.map((row) => [row.category, row.status, row.enabled]),
        [
            ["Existing games", "OK", true],
            ["Missing games", "Not exists", false],
        ],
    );
});

/**
 * Creates a category lookup response with one missing category.
 *
 * @returns MediaWiki-compatible fetch implementation.
 */
function createCategoryFetcher(): typeof fetch {
    return async function fetcher(input) {
        const url = new URL(String(input), "https://example.test");
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
