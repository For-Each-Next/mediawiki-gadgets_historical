/**
 * Tests universal MediaWiki title resolution.
 */

import assert from "node:assert/strict";
import test from "node:test";

import {
    getActualTitle,
    resolvePageTitles,
} from "../src/handlers/title-resolver.js";

test("getActualTitle follows normalization, conversion, and redirects", () => {
    const data = createTitleResponse();
    const title = getActualTitle("foo_bar", data, "Template");

    assert.equal(title, "Template:Final title");
});

test("resolvePageTitles returns one namespaced-title-independent record", async () => {
    const resolutions = await resolvePageTitles(
        ["Template:foo_bar"],
        {
            namespace: "Template",
        },
        {
            async fetcher(url, options) {
                assert.equal(options.headers.accept, "application/json");
                assert.equal(
                    new URL(url, "https://example.test").searchParams.get(
                        "titles",
                    ),
                    "Template:foo_bar",
                );

                return {
                    async json() {
                        return createTitleResponse();
                    },
                    ok: true,
                };
            },
        },
    );

    assert.equal(resolutions["foo bar"].exists, true);
    assert.equal(resolutions["foo bar"].requestedTitle, "foo_bar");
    assert.equal(resolutions["foo bar"].title, "Final title");
});

function createTitleResponse() {
    const response = {
        query: {
            converted: [
                {
                    from: "Template:Foo bar",
                    to: "Template:Foo Bar",
                },
            ],
            normalized: [
                {
                    from: "Template:foo_bar",
                    to: "Template:Foo bar",
                },
            ],
            pages: [
                {
                    pageid: 1,
                    title: "Template:Final title",
                },
            ],
            redirects: [
                {
                    from: "Template:Foo Bar",
                    to: "Template:Final title",
                },
            ],
        },
    };

    return response;
}
