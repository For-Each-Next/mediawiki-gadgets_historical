/**
 * Tests English Wikipedia metadata lookup helpers.
 */

import assert from "node:assert/strict";
import test from "node:test";

import {
    buildEnwikiMetadataUrl,
    buildWikidataEntityUrl,
    fetchEnwikiMetadata,
    parseEnwikiMetadata,
    parseWikidataIdentifiers,
} from "../../src/vg-stub-creator/src/sources/crosswiki.js";

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
            metacriticId: "",
            openCriticId: "",
            pageExists: true,
            steamId: "",
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
            metacriticId: "",
            openCriticId: "",
            pageExists: true,
            steamId: "",
            title: "Example Game",
            wikidataId: "",
        },
    );
});

test("parseEnwikiMetadata distinguishes a missing page", () => {
    assert.deepEqual(
        parseEnwikiMetadata("Missing Game", {
            query: {
                pages: {
                    "-1": {
                        missing: "",
                        title: "Missing Game",
                    },
                },
            },
        }),
        {
            metacriticId: "",
            openCriticId: "",
            pageExists: false,
            steamId: "",
            title: "Missing Game",
            wikidataId: "",
        },
    );
});

test("buildWikidataEntityUrl requests external identifier claims", () => {
    const url = new URL(buildWikidataEntityUrl("Q123"));

    assert.equal(url.origin, "https://www.wikidata.org");
    assert.equal(url.searchParams.get("action"), "wbgetentities");
    assert.equal(url.searchParams.get("ids"), "Q123");
    assert.equal(url.searchParams.get("props"), "claims");
});

test("parseWikidataIdentifiers returns game website identifiers", () => {
    const statement = (value, rank = "normal") => ({
        rank,
        mainsnak: {
            datavalue: { value },
            snaktype: "value",
        },
    });

    assert.deepEqual(
        parseWikidataIdentifiers("Q123", {
            entities: {
                Q123: {
                    claims: {
                        P12054: [statement("example-game")],
                        P1733: [statement("12345")],
                        P2864: [
                            statement("ignored", "deprecated"),
                            statement("6789"),
                        ],
                    },
                },
            },
        }),
        {
            metacriticId: "example-game",
            openCriticId: "6789",
            steamId: "12345",
        },
    );
});

test("fetchEnwikiMetadata adds Wikidata game identifiers", async () => {
    const requestedUrls = [];
    const responses = [
        {
            query: {
                pages: {
                    123: {
                        pageprops: { wikibase_item: "Q123" },
                        title: "Example Game",
                    },
                },
            },
        },
        {
            entities: {
                Q123: {
                    claims: {
                        P1733: [
                            {
                                rank: "normal",
                                mainsnak: {
                                    datavalue: { value: "12345" },
                                    snaktype: "value",
                                },
                            },
                        ],
                    },
                },
            },
        },
    ];
    const metadata = await fetchEnwikiMetadata("Example Game", {
        async fetcher(url) {
            requestedUrls.push(url);

            return {
                ok: true,
                async json() {
                    return responses.shift();
                },
            };
        },
    });

    assert.equal(requestedUrls.length, 2);
    assert.deepEqual(metadata, {
        metacriticId: "",
        openCriticId: "",
        pageExists: true,
        steamId: "12345",
        title: "Example Game",
        wikidataId: "Q123",
    });
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
        metacriticId: "",
        openCriticId: "",
        pageExists: null,
        steamId: "",
        title: "Example Game",
        wikidataId: "",
    });
});
