/**
 * Tests citation URL fetching and template formatting.
 */

import assert from "node:assert/strict";
import test from "node:test";

import {
    buildCiteTemplate,
    buildCitoidUrl,
    fetchCiteTemplate,
} from "../../src/vg-stub-creator/sources/citations.ts";

const RULES = [
    {
        fixes: [
            {
                action: "replace",
                field: "language",
                operand: {
                    pattern: "^(?!zh(?:-|$))([a-z]+)-.+$",
                    replacement: "$1",
                },
            },
        ],
    },
    {
        fixes: [
            {
                action: "replace",
                field: "title",
                operand: {
                    pattern: " - Game Informer$",
                    replacement: "",
                },
            },
        ],
        host: "www.gameinformer.com",
    },
    {
        fixes: [
            {
                action: "omit",
                field: "author",
                operand: "巴哈姆特",
            },
        ],
        host: "gnn.gamer.com.tw",
    },
    {
        fixes: [
            {
                action: "omit",
                field: "date",
            },
        ],
        host: "opencritic.com",
    },
    {
        fixes: [
            {
                action: "set",
                field: "website",
                operand: "Metacritic",
            },
            {
                action: "replace",
                field: "title",
                operand: {
                    pattern: " - Metacritic$",
                    replacement: "",
                },
            },
        ],
        host: "www.metacritic.com",
    },
    {
        fixes: [
            {
                action: "set",
                field: "via",
                operand: "Steam",
            },
            {
                action: "omit",
                field: "website",
            },
            {
                action: "set-from-source-query",
                field: "language",
                operand: {
                    key: "l",
                    values: {
                        schinese: "zh-Hans",
                        tchinese: "zh-Hant",
                    },
                },
            },
            {
                action: "preserve-source-query",
                field: "url",
                operand: ["l"],
            },
        ],
        host: "store.steampowered.com",
        redirect: true,
    },
];

test("buildCitoidUrl encodes the source URL", () => {
    assert.equal(
        buildCitoidUrl("https://example.test/a page?x=1&y=2"),
        "/api/rest_v1/data/citation/zotero/https%3A%2F%2Fexample.test%2Fa%20page%3Fx%3D1%26y%3D2",
    );
});

test("buildCiteTemplate formats Zotero metadata as cite web", () => {
    const text = buildCiteTemplate(
        {
            creators: [
                {
                    creatorType: "author",
                    firstName: "Ada",
                    lastName: "Lovelace",
                },
            ],
            date: "2025-01-02",
            itemType: "webpage",
            language: "en",
            title: "Example | Title",
            url: "https://example.test/article",
            websiteTitle: "Example Site",
        },
        {
            now: new Date("2026-05-24T00:00:00Z"),
        },
    );

    assert.equal(
        text,
        "{{cite web\n" +
            "  | access-date = 2026-05-24\n" +
            "  | author = Ada Lovelace\n" +
            "  | date = 2025-01-02\n" +
            "  | language = en\n" +
            "  | title = Example {{!}} Title\n" +
            "  | url = https://example.test/article\n" +
            "  | website = Example Site\n" +
            "}}",
    );
});

test("buildCiteTemplate normalizes non-Chinese language subtags by rule", () => {
    const text = buildCiteTemplate(
        {
            itemType: "webpage",
            language: "en-US",
            title: "Example",
            url: "https://example.test/article",
        },
        {
            now: new Date("2026-05-24T00:00:00Z"),
            rules: RULES,
        },
    );

    assert.equal(
        text,
        "{{cite web\n" +
            "  | access-date = 2026-05-24\n" +
            "  | language = en\n" +
            "  | title = Example\n" +
            "  | url = https://example.test/article\n" +
            "}}",
    );
});

test("buildCiteTemplate preserves Chinese language subtags by rule", () => {
    const text = buildCiteTemplate(
        {
            itemType: "webpage",
            language: "zh-Hans",
            title: "Example",
            url: "https://example.test/article",
        },
        {
            now: new Date("2026-05-24T00:00:00Z"),
            rules: RULES,
        },
    );

    assert.equal(
        text,
        "{{cite web\n" +
            "  | access-date = 2026-05-24\n" +
            "  | language = zh-Hans\n" +
            "  | title = Example\n" +
            "  | url = https://example.test/article\n" +
            "}}",
    );
});

test("fetchCiteTemplate fetches Citoid data and formats the first item", async () => {
    const text = await fetchCiteTemplate("https://example.test/article", {
        fetcher(url, options) {
            assert.equal(
                url,
                "/api/rest_v1/data/citation/zotero/https%3A%2F%2Fexample.test%2Farticle",
            );
            assert.deepEqual(options.headers, {
                accept: "application/json",
            });

            return {
                async json() {
                    return [
                        {
                            itemType: "webpage",
                            title: "Example",
                            url: "https://example.test/article",
                        },
                    ];
                },
                ok: true,
            };
        },
        now: new Date("2026-05-24T00:00:00Z"),
    });

    assert.equal(
        text,
        "{{cite web\n" +
            "  | access-date = 2026-05-24\n" +
            "  | title = Example\n" +
            "  | url = https://example.test/article\n" +
            "}}",
    );
});

test("fetchCiteTemplate preserves the entered URL by default", async () => {
    const sourceUrl = "https://example.test/original";
    const text = await fetchCiteTemplate(sourceUrl, {
        fetcher() {
            return {
                async json() {
                    return [
                        {
                            itemType: "webpage",
                            title: "Example",
                            url: "https://example.test/redirected",
                        },
                    ];
                },
                ok: true,
            };
        },
        now: new Date("2026-06-13T00:00:00Z"),
        rules: RULES,
    });

    assert.equal(text.includes(`| url = ${sourceUrl}`), true);
    assert.equal(text.includes("/redirected"), false);
});

test("fetchCiteTemplate follows Citoid redirects when enabled", async () => {
    const text = await fetchCiteTemplate("https://example.test/original", {
        fetcher() {
            return {
                async json() {
                    return [
                        {
                            itemType: "webpage",
                            title: "Example",
                            url: "https://example.test/redirected",
                        },
                    ];
                },
                ok: true,
            };
        },
        now: new Date("2026-06-13T00:00:00Z"),
        rules: [
            {
                host: "example.test",
                redirect: true,
            },
        ],
    });

    assert.equal(
        text.includes("| url = https://example.test/redirected"),
        true,
    );
});

test("fetchCiteTemplate falls back to source page title on Citoid 404", async () => {
    const requests = [];
    const text = await fetchCiteTemplate(
        " https://www.example.test/missing?page=1 ",
        {
            async fetcher(url, options) {
                requests.push([url, options]);

                if (url.startsWith("/api/rest_v1/")) {
                    return {
                        ok: false,
                        status: 404,
                    };
                }

                return {
                    async text() {
                        return "<!doctype html><title> Missing &amp; Found | Example </title>";
                    },
                    ok: true,
                };
            },
            now: new Date("2026-05-24T00:00:00Z"),
        },
    );

    assert.deepEqual(requests, [
        [
            "/api/rest_v1/data/citation/zotero/https%3A%2F%2Fwww.example.test%2Fmissing%3Fpage%3D1",
            {
                headers: {
                    accept: "application/json",
                },
            },
        ],
        [
            "https://www.example.test/missing?page=1",
            {
                headers: {
                    accept: "text/html",
                },
            },
        ],
    ]);
    assert.equal(
        text,
        "{{cite web\n" +
            "  | access-date = 2026-05-24\n" +
            "  | title = Missing & Found {{!}} Example\n" +
            "  | url = https://www.example.test/missing?page=1\n" +
            "  | website = example.test\n" +
            "}}",
    );
});

test("fetchCiteTemplate omits fallback title when source title fetch fails", async () => {
    const text = await fetchCiteTemplate(
        "https://www.example.test/missing-page?page=1",
        {
            fetcher(url) {
                return {
                    ok: false,
                    status: url.startsWith("/api/rest_v1/") ? 404 : 500,
                };
            },
            now: new Date("2026-05-24T00:00:00Z"),
        },
    );

    assert.equal(
        text,
        "{{cite web\n" +
            "  | access-date = 2026-05-24\n" +
            "  | url = https://www.example.test/missing-page?page=1\n" +
            "  | website = example.test\n" +
            "}}",
    );
});

test("buildCiteTemplate omits URL-only titles", () => {
    const text = buildCiteTemplate(
        {
            itemType: "webpage",
            title: "https://example.test/article",
            url: "https://example.test/article",
        },
        {
            now: new Date("2026-05-24T00:00:00Z"),
            rules: RULES,
        },
    );

    assert.equal(
        text,
        "{{cite web\n" +
            "  | access-date = 2026-05-24\n" +
            "  | url = https://example.test/article\n" +
            "}}",
    );
});

test("buildCiteTemplate removes Gamer author by host rule", () => {
    const text = buildCiteTemplate(
        {
            creators: [
                {
                    creatorType: "author",
                    name: "巴哈姆特",
                },
            ],
            itemType: "webpage",
            title: "GNN article",
            url: "https://gnn.gamer.com.tw/detail.php?sn=123",
        },
        {
            now: new Date("2026-05-24T00:00:00Z"),
            rules: RULES,
        },
    );

    assert.equal(text.includes("| author ="), false);
});

test("buildCiteTemplate omits OpenCritic date by host rule", () => {
    const text = buildCiteTemplate(
        {
            date: "2026-01-02",
            itemType: "webpage",
            title: "Review",
            url: "https://opencritic.com/game/1/example",
        },
        {
            now: new Date("2026-05-24T00:00:00Z"),
            rules: RULES,
        },
    );

    assert.equal(text.includes("| date ="), false);
});

test("buildCiteTemplate strips Metacritic title suffix by host rule", () => {
    const text = buildCiteTemplate(
        {
            itemType: "webpage",
            title: "Example Reviews - Metacritic",
            url: "https://www.metacritic.com/game/example/",
        },
        {
            now: new Date("2026-05-24T00:00:00Z"),
            rules: RULES,
        },
    );

    assert.equal(text.includes("| title = Example Reviews"), true);
    assert.equal(text.includes("| website = Metacritic"), true);
});

test("buildCiteTemplate strips Game Informer title suffix by host rule", () => {
    const text = buildCiteTemplate(
        {
            itemType: "webpage",
            title: "Example Preview - Game Informer",
            url: "https://www.gameinformer.com/preview/example",
            websiteTitle: "Game Informer",
        },
        {
            now: new Date("2026-05-24T00:00:00Z"),
            rules: RULES,
        },
    );

    assert.equal(text.includes("| title = Example Preview"), true);
    assert.equal(text.includes(" - Game Informer"), false);
});

test("fetchCiteTemplate preserves the entered PlayStation URL by default", async () => {
    const sourceUrl =
        "https://www.playstation.com/zh-hant-tw/games/darwins-paradox/";
    const text = await fetchCiteTemplate(sourceUrl, {
        fetcher() {
            return {
                async json() {
                    return [
                        {
                            itemType: "webpage",
                            language: "zh-HANT-TW",
                            title: "《達爾文悖論！》- PS5遊戲 | PlayStation",
                            url: "https://www.playstation.com/zh-hant-tw/games/--/",
                            websiteTitle: "PlayStation",
                        },
                    ];
                },
                ok: true,
            };
        },
        now: new Date("2026-06-13T00:00:00Z"),
        rules: RULES,
    });

    assert.equal(text.includes(`| url = ${sourceUrl}`), true);
    assert.equal(text.includes("/games/--/"), false);
});

test("fetchCiteTemplate restores Steam source query by host rule", async () => {
    const text = await fetchCiteTemplate(
        "https://store.steampowered.com/app/123/example/?l=schinese&utm_source=test",
        {
            fetcher() {
                return {
                    async json() {
                        return [
                            {
                                itemType: "webpage",
                                title: "Example on Steam",
                                url: "https://store.steampowered.com/app/123/example/",
                                websiteTitle: "store.steampowered.com",
                            },
                        ];
                    },
                    ok: true,
                };
            },
            now: new Date("2026-05-24T00:00:00Z"),
            rules: RULES,
        },
    );

    assert.equal(
        text.includes(
            "https://store.steampowered.com/app/123/example/?l=schinese",
        ),
        true,
    );
    assert.equal(text.includes("| language = zh-Hans"), true);
    assert.equal(text.includes("| publisher ="), false);
    assert.equal(text.includes("| via = Steam"), true);
    assert.equal(text.includes("| website ="), false);
    assert.equal(text.includes("utm_source"), false);
});

test("fetchCiteTemplate maps Steam Traditional Chinese query language", async () => {
    const text = await fetchCiteTemplate(
        "https://store.steampowered.com/app/123/example/?l=tchinese",
        {
            fetcher() {
                return {
                    async json() {
                        return [
                            {
                                itemType: "webpage",
                                title: "Example on Steam",
                                url: "https://store.steampowered.com/app/123/example/",
                            },
                        ];
                    },
                    ok: true,
                };
            },
            now: new Date("2026-05-24T00:00:00Z"),
            rules: RULES,
        },
    );

    assert.equal(text.includes("| language = zh-Hant"), true);
});

test("fetchCiteTemplate avoids direct Steam fallback fetches", async () => {
    const requests = [];
    const text = await fetchCiteTemplate(
        "https://store.steampowered.com/app/123/example/?l=schinese",
        {
            fetcher(url, options) {
                requests.push([url, options]);

                return {
                    ok: false,
                    status: 404,
                };
            },
            now: new Date("2026-05-24T00:00:00Z"),
            rules: RULES,
        },
    );

    assert.deepEqual(
        requests.map((request) => request[0]),
        [
            "/api/rest_v1/data/citation/zotero/https%3A%2F%2Fstore.steampowered.com%2Fapp%2F123%2Fexample%2F%3Fl%3Dschinese",
        ],
    );
    assert.equal(
        text,
        "{{cite web\n" +
            "  | access-date = 2026-05-24\n" +
            "  | language = zh-Hans\n" +
            "  | url = https://store.steampowered.com/app/123/example/?l=schinese\n" +
            "  | via = Steam\n" +
            "}}",
    );
});

test("fetchCiteTemplate caches generated citation templates", async () => {
    const cache = {};
    let fetchCount = 0;
    const options = {
        cache,
        fetcher() {
            fetchCount += 1;

            return {
                async json() {
                    return [
                        {
                            itemType: "webpage",
                            title: "Cached",
                            url: "https://example.test/cached",
                        },
                    ];
                },
                ok: true,
            };
        },
        now: new Date("2026-05-24T00:00:00Z"),
    };
    const first = await fetchCiteTemplate(
        "https://example.test/cached",
        options,
    );
    const second = await fetchCiteTemplate(
        "https://example.test/cached",
        options,
    );

    assert.equal(first, second);
    assert.equal(fetchCount, 1);
});
