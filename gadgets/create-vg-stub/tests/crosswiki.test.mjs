/**
 * Tests English Wikipedia metadata lookup helpers.
 */

import assert from "node:assert/strict";
import test from "node:test";

import {
    buildEnwikiMetadataUrl,
    fetchEnwikiMetadata,
    parseEnwikiMetadata,
} from "../src/sources/crosswiki.js";

test("buildEnwikiMetadataUrl builds an enwiki pageprops query", () => {
    const url = new URL(buildEnwikiMetadataUrl("Example Game"));

    assert.equal(url.origin, "https://en.wikipedia.org");
    assert.equal(url.pathname, "/w/api.php");
    assert.equal(url.searchParams.get("action"), "query");
    assert.equal(url.searchParams.get("format"), "json");
    assert.equal(url.searchParams.get("origin"), "*");
    assert.equal(url.searchParams.get("prop"), "pageprops");
    assert.equal(url.searchParams.get("titles"), "Example Game");
});

test("parseEnwikiMetadata returns page title and Wikidata item", () => {
    assert.deepEqual(
        parseEnwikiMetadata("Fallback", {
            query: {
                pages: {
                    123: {
                        pageid: 123,
                        pageprops: {
                            wikibase_item: "Q123",
                        },
                        title: "Example Game",
                    },
                },
            },
        }),
        {
            title: "Example Game",
            wikidataId: "Q123",
        },
    );
});

test("parseEnwikiMetadata tolerates pages without Wikidata", () => {
    assert.deepEqual(
        parseEnwikiMetadata("Fallback", {
            query: {
                pages: {
                    123: {
                        pageid: 123,
                        title: "Example Game",
                    },
                },
            },
        }),
        {
            title: "Example Game",
            wikidataId: "",
        },
    );
});

test("fetchEnwikiMetadata falls back on failed requests", async () => {
    const metadata = await fetchEnwikiMetadata("Example Game", {
        async fetcher() {
            return {
                ok: false,
            };
        },
    });

    assert.deepEqual(metadata, {
        title: "Example Game",
        wikidataId: "",
    });
});
