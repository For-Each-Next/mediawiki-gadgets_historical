/**
 * Tests category review defaults.
 */

import assert from "node:assert/strict";
import test from "node:test";

import { resolveCategoryRows } from "../../src/vg-stub-creator/infrastructure/handlers/categories.ts"; // eslint-disable-line max-len

test("missing categories are unchecked after resolution", async () => {
    const rows = await resolveCategoryRows(
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
        const response = {
            ok: true,
            async json() {
                return { query: { pages } };
            },
        };

        return response as Response;
    };
}
