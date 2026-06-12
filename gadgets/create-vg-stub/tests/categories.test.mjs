/**
 * Tests generated category and stub-tag handling.
 */

import assert from "node:assert/strict";
import test from "node:test";
import {
    buildCategoryRows,
    buildFallbackCategoryRows,
    createManualCategoryRow,
    resolveCategoryRows,
    resetGeneratedCategoryRows,
    updateCategoryRowCategory,
} from "../src/handlers/categories.js";
import { createArticleData } from "../src/article/index.js";
import {
    buildCategoryLinks,
    buildCategoryText,
    buildStubTagText,
    getStubTagRows,
    sortCategoryRowsByProse,
} from "../src/wikitext/categories.js";

test("buildFallbackCategoryRows keeps generated metadata categories", () => {
    const rows = buildFallbackCategoryRows({
        companyMetadata: {
            categories: ["公司游戏"],
            stubTags: ["company-stub"],
        },
        platformSeriesMetadata: {
            categories: ["平台游戏"],
            stubTags: ["platform-stub"],
        },
        yearGenreMetadata: {
            categories: ["公司游戏", "类型游戏"],
            stubTags: ["genre-stub"],
        },
    });

    assert.deepEqual(
        rows.map((row) => [row.source, row.category, row.status]),
        [
            ["known", "公司游戏", ""],
            ["known", "平台游戏", ""],
            ["known", "类型游戏", ""],
        ],
    );
});

test("buildStubTagText uses its own checkbox independently of categories", () => {
    assert.equal(
        buildStubTagText({
            categoryRows: [
                {
                    category: "公司游戏",
                    enabled: true,
                    stubTag: "company-stub",
                    stubTagEnabled: false,
                },
                {
                    category: "类型游戏",
                    enabled: true,
                    stubTag: "genre-stub",
                    stubTagEnabled: true,
                },
                {
                    category: "平台游戏",
                    enabled: false,
                    stubTag: "platform-stub",
                    stubTagEnabled: true,
                },
            ],
            companyMetadata: emptyMetadata(),
            platformSeriesMetadata: emptyMetadata(),
            yearGenreMetadata: emptyMetadata(),
        }),
        "{{genre-stub}}\n{{platform-stub}}",
    );
});

test("buildStubTagText follows related prose order independently of categories", () => {
    assert.equal(
        buildStubTagText({
            categoryRows: [
                {
                    category: "PlayStation 5游戏",
                    enabled: false,
                    stubTag: "PlayStation-stub",
                    stubTagEnabled: true,
                },
                {
                    category: "Foo Studio游戏",
                    stubTag: "company-stub",
                    stubTagEnabled: true,
                },
                {
                    category: "动作游戏",
                    stubTag: "action-videogame-stub",
                    stubTagEnabled: true,
                },
            ],
            prose: {
                text: "本作是动作游戏，由Foo Studio开发，并登陆PlayStation 5。",
            },
        }),
        [
            "{{action-videogame-stub}}",
            "{{company-stub}}",
            "{{PlayStation-stub}}",
        ].join("\n"),
    );
});

test("getStubTagRows lists unique tags with generated defaults", () => {
    assert.deepEqual(
        getStubTagRows({
            categoryRows: [
                {
                    category: "平台A游戏",
                    stubTag: "platform-stub",
                    stubTagEnabled: false,
                },
                {
                    category: "平台B游戏",
                    stubTag: "platform-stub",
                    stubTagEnabled: true,
                },
                {
                    category: "动作游戏",
                    stubTag: "action-stub",
                    stubTagEnabled: true,
                },
            ],
            prose: {
                text: "动作游戏登陆平台A与平台B。",
            },
        }),
        [
            {
                enabled: true,
                stubTag: "action-stub",
            },
            {
                enabled: true,
                stubTag: "platform-stub",
            },
        ],
    );
});

test("buildCategoryLinks omits unchecked rows", () => {
    assert.deepEqual(
        buildCategoryLinks([
            {
                category: "保留分类",
                enabled: true,
            },
            {
                category: "跳过分类",
                enabled: false,
            },
        ]),
        ["[[Category:保留分类]]"],
    );
});

test("buildCategoryText follows related prose order", () => {
    assert.equal(
        buildCategoryText({
            categoryRows: [
                {
                    category: "科樂美遊戲",
                },
                {
                    category: "任天堂Switch 2遊戲",
                },
                {
                    category: "PlayStation 5游戏",
                },
                {
                    category: "Windows游戏",
                },
                {
                    category: "Xbox Series X/S游戏",
                },
                {
                    category: "平台游戏",
                },
                {
                    category: "2026年电子游戏",
                },
            ],
            defaultSortText: "",
            prose: {
                text: "《Darwin's Paradox!》是2026年平台类电子游戏，由ZDT Studio开发、科樂美发行。作品对应任天堂Switch 2、PlayStation 5、Windows、Xbox Series X/S平台。",
            },
        }),
        [
            "",
            "[[Category:2026年电子游戏]]",
            "[[Category:平台游戏]]",
            "[[Category:科樂美遊戲]]",
            "[[Category:任天堂Switch 2遊戲]]",
            "[[Category:PlayStation 5游戏]]",
            "[[Category:Windows游戏]]",
            "[[Category:Xbox Series X/S游戏]]",
        ].join("\n"),
    );
});

test("sortCategoryRowsByProse orders review rows like category output", () => {
    const rows = [
        { category: "科樂美遊戲" },
        { category: "PlayStation 5游戏" },
        { category: "平台游戏" },
        { category: "2026年电子游戏" },
    ];

    assert.deepEqual(
        sortCategoryRowsByProse(
            rows,
            "本作是2026年平台类电子游戏，由科樂美发行，并登陆PlayStation 5。",
        ),
        [rows[3], rows[2], rows[0], rows[1]],
    );
});

test("buildCategoryRows fetches company categories from API", async () => {
    const form = {
        developers: "日本开发",
        publishers: "",
        series: "",
    };
    const rows = await buildCategoryRows(form, paramsFromForm(form), [], {
        fetcher: createCategoryFetcher({
            日本开发电子游戏: "日本開發電子遊戲",
        }),
    });

    assert.deepEqual(
        rows.map((row) => [row.enabled, row.source, row.category, row.status]),
        [[true, "found", "日本開發電子遊戲", "OK"]],
    );
});

test("buildCategoryRows falls back to unchecked suggested company categories", async () => {
    const form = {
        developers: "Foo Studio",
        publishers: "",
        series: "",
    };
    const rows = await buildCategoryRows(form, paramsFromForm(form), [], {
        fetcher: createCategoryFetcher({}),
    });

    assert.deepEqual(
        rows.map((row) => [row.enabled, row.source, row.category, row.status]),
        [[false, "suggested", "Foo Studio游戏", ""]],
    );
});

test("buildCategoryRows generates company categories from wikilink display text", async () => {
    const form = {
        developers: "[[Foo, Inc.|Foo Studio]], [[Bar Games]]",
        publishers: "",
        series: "",
    };
    const rows = await buildCategoryRows(form, paramsFromForm(form), [], {
        fetcher: createCategoryFetcher({}),
    });

    assert.deepEqual(
        rows.map((row) => [
            row.enabled,
            row.source,
            row.category,
            row.company,
            row.status,
        ]),
        [
            [false, "suggested", "Foo Studio游戏", "Foo, Inc.", ""],
            [false, "suggested", "Bar Games游戏", "Bar Games", ""],
        ],
    );
});

test("buildCategoryRows checks a platform stub tag only for one platform", async () => {
    const form = {
        developers: "",
        platforms: "PS5",
        publishers: "",
        series: "",
    };
    const rows = await buildCategoryRows(
        form,
        paramsFromForm(form, {
            platformSeriesCategories: ["PlayStation 5游戏"],
            platformSeriesStubTags: ["PlayStation-stub"],
        }),
        [],
        {
            fetcher: createCategoryFetcher({
                "PlayStation 5游戏": "PlayStation 5游戏",
            }),
        },
    );

    assert.deepEqual(
        rows.map((row) => [row.category, row.stubTag, row.stubTagEnabled]),
        [["PlayStation 5游戏", "PlayStation-stub", true]],
    );
});

test("buildCategoryRows unchecks platform stub tags for multiple platforms", async () => {
    const form = {
        developers: "",
        platforms: "PS5, Switch",
        publishers: "",
        series: "",
    };
    const rows = await buildCategoryRows(
        form,
        paramsFromForm(form, {
            platformSeriesCategories: [
                "PlayStation 5游戏",
                "任天堂Switch游戏",
            ],
            platformSeriesStubTags: ["PlayStation-stub", "Nintendo-stub"],
        }),
        [],
        {
            fetcher: createCategoryFetcher({
                "PlayStation 5游戏": "PlayStation 5游戏",
                任天堂Switch游戏: "任天堂Switch游戏",
            }),
        },
    );

    assert.deepEqual(
        rows.map((row) => [row.category, row.stubTag, row.stubTagEnabled]),
        [
            ["PlayStation 5游戏", "PlayStation-stub", false],
            ["任天堂Switch游戏", "Nintendo-stub", false],
        ],
    );
});

test("buildCategoryRows always checks genre stub tags", async () => {
    const rows = await buildCategoryRows(
        {
            developers: "",
            platforms: "",
            publishers: "",
            series: "",
        },
        emptyParams({
            yearGenreCategories: ["动作游戏", "2026年电子游戏"],
            yearGenreStubTags: ["action-videogame-stub"],
        }),
        [],
        {
            fetcher: createCategoryFetcher({
                "2026年电子游戏": "2026年电子游戏",
                动作游戏: "动作游戏",
            }),
        },
    );

    assert.deepEqual(
        rows.map((row) => [row.category, row.stubTag, row.stubTagEnabled]),
        [
            ["动作游戏", "action-videogame-stub", true],
            ["2026年电子游戏", "", false],
        ],
    );
});

test("buildCategoryRows checks all generated candidates in one request", async () => {
    const fetchedTitles = [];
    const form = {
        developers: "日本开发",
        publishers: "",
        series: "塞尔达传说",
    };
    const rows = await buildCategoryRows(
        form,
        paramsFromForm(form, {
            platformSeriesCategories: ["PlayStation 5游戏"],
            yearGenreCategories: ["2026年电子游戏"],
        }),
        [],
        {
            fetcher: createCategoryFetcher(
                {
                    PlayStation: "PlayStation",
                    "PlayStation 5游戏": "PlayStation 5遊戲",
                    塞尔达传说系列游戏: "薩爾達傳說系列遊戲",
                    "2026年电子游戏": "2026年電子遊戲",
                    日本开发电子游戏: "日本開發電子遊戲",
                },
                fetchedTitles,
            ),
        },
    );

    assert.deepEqual(
        rows.map((row) => [row.source, row.category]),
        [
            ["found", "日本開發電子遊戲"],
            ["found", "薩爾達傳說系列遊戲"],
            ["known", "PlayStation 5遊戲"],
            ["known", "2026年電子遊戲"],
        ],
    );
    assert.equal(fetchedTitles.length, 1);
    assert.deepEqual(fetchedTitles[0], [
        "日本开发电子游戏",
        "日本开发游戏",
        "日本开发",
        "塞尔达传说系列电子游戏",
        "塞尔达传说系列游戏",
        "塞尔达传说系列",
        "塞尔达传说电子游戏",
        "塞尔达传说游戏",
        "塞尔达传说",
        "PlayStation 5游戏",
        "2026年电子游戏",
    ]);
});

test("buildCategoryRows preserves manual rows and edited generated rows", async () => {
    const manual = {
        ...createManualCategoryRow(),
        category: "手动分类",
    };
    const form = {
        developers: "Foo Studio",
        publishers: "",
        series: "",
    };
    const rows = await buildCategoryRows(
        form,
        paramsFromForm(form),
        [
            {
                category: "改后分类",
                enabled: false,
                originalCategory: "Foo Studio游戏",
                source: "suggested",
            },
            manual,
        ],
        {
            fetcher: createCategoryFetcher({}),
        },
    );

    assert.deepEqual(
        rows.map((row) => [row.enabled, row.source, row.category, row.status]),
        [
            [false, "suggested †", "改后分类", "Not exists"],
            [true, "manual", "手动分类", "Not exists"],
        ],
    );
});

test("resetGeneratedCategoryRows resets generated rows but keeps manual rows", () => {
    assert.deepEqual(
        resetGeneratedCategoryRows([
            {
                category: "改后分类",
                enabled: false,
                originalCategory: "Foo Studio游戏",
                originalStubTagEnabled: true,
                source: "suggested †",
                status: "Not exists",
                stubTag: "Foo-stub",
                stubTagEnabled: false,
            },
            {
                category: "手动分类",
                enabled: true,
                originalCategory: "手动分类",
                source: "manual",
                status: "OK",
            },
        ]).map((row) => [row.enabled, row.source, row.category, row.status]),
        [
            [false, "suggested", "Foo Studio游戏", ""],
            [true, "manual", "手动分类", "OK"],
        ],
    );
});

test("resetCategoryRow restores the generated stub tag checkbox state", () => {
    const row = updateCategoryRowCategory(
        {
            category: "Foo Studio游戏",
            originalCategory: "Foo Studio游戏",
            originalStubTagEnabled: true,
            source: "suggested",
            stubTag: "Foo-stub",
            stubTagEnabled: false,
        },
        "改后分类",
    );

    const reset = resetGeneratedCategoryRows([row])[0];

    assert.equal(reset.category, "Foo Studio游戏");
    assert.equal(reset.stubTagEnabled, true);
});

test("updateCategoryRowCategory updates the modified marker immediately", () => {
    const row = {
        category: "Foo Studio游戏",
        originalCategory: "Foo Studio游戏",
        source: "suggested",
    };

    const edited = updateCategoryRowCategory(row, "改后分类");
    const restored = updateCategoryRowCategory(edited, "Foo Studio游戏");

    assert.equal(edited.source, "suggested †");
    assert.equal(restored.source, "suggested");
});

test("resolveCategoryRows applies converted category titles", async () => {
    const rows = await resolveCategoryRows(
        [
            {
                category: "日本开发电子游戏",
                source: "manual added",
            },
        ],
        {
            fetcher: createCategoryFetcher({
                日本开发电子游戏: "日本開發電子遊戲",
            }),
        },
    );

    assert.equal(rows[0].category, "日本開發電子遊戲");
});

test("resolveCategoryRows follows category redirect targets", async () => {
    const rows = await resolveCategoryRows(
        [
            {
                category: "旧分类",
                source: "manual added",
            },
        ],
        {
            fetcher: createRedirectCategoryFetcher({
                旧分类: "新分類",
            }),
        },
    );

    assert.equal(rows[0].category, "新分類");
});

test("resolveCategoryRows follows ordinary redirected category pages", async () => {
    const rows = await resolveCategoryRows(
        [
            {
                category: ".22 LR口徑槍械",
                source: "manual added",
            },
        ],
        {
            fetcher: createOrdinaryRedirectCategoryFetcher({
                ".22 LR口徑槍械": ".22 LR口径枪械",
            }),
        },
    );

    assert.equal(rows[0].category, ".22 LR口径枪械");
    assert.equal(rows[0].status, "OK");
});

function emptyParams(options = {}) {
    return {
        companyMetadata: {
            categories: [],
            stubTags: [],
        },
        platformSeriesMetadata: {
            categories: options.platformSeriesCategories || [],
            stubTags: options.platformSeriesStubTags || [],
        },
        yearGenreMetadata: {
            categories: options.yearGenreCategories || [],
            stubTags: options.yearGenreStubTags || [],
        },
    };
}

function paramsFromForm(form, options = {}) {
    const params = createArticleData({
        categoryRows: [],
        developers: form.developers || "",
        genres: "",
        localizedNames: [],
        name: "Example",
        navboxText: "",
        platforms: form.platforms || "",
        publishers: form.publishers || "",
        series: form.series || "",
        sourceReferences: [],
        year: "",
    });

    params.records.platform.assumedCategories =
        options.platformSeriesCategories || [];
    params.records.platform.assumedStubTags =
        options.platformSeriesStubTags || [];
    params.records.year.assumedCategories = options.yearGenreCategories || [];
    params.records.year.assumedStubTags = options.yearGenreStubTags || [];

    return params;
}

function emptyMetadata() {
    return {
        categories: [],
        stubTags: [],
    };
}

function createCategoryFetcher(existing, fetchedTitles) {
    return async (url) => {
        const titles = new URL(url, "https://zh.wikipedia.org").searchParams
            .get("titles")
            .split("|")
            .map((title) => title.replace(/^Category:/u, ""));
        fetchedTitles?.push(titles);
        const pages = titles
            .filter((title) => existing[title] != null)
            .map((title, index) => ({
                pageid: index + 1,
                title: `Category:${existing[title]}`,
            }));
        const converted = titles
            .filter(
                (title) =>
                    existing[title] != null && existing[title] !== title,
            )
            .map((title) => ({
                from: `Category:${title}`,
                to: `Category:${existing[title]}`,
            }));

        return {
            ok: true,
            json: async () => ({
                query: {
                    converted,
                    pages,
                },
            }),
        };
    };
}

function createRedirectCategoryFetcher(redirects) {
    return async (url) => {
        const titles = new URL(url, "https://zh.wikipedia.org").searchParams
            .get("titles")
            .split("|")
            .map((title) => title.replace(/^Category:/u, ""));
        const pages = titles.map((title, index) => {
            const redirectTarget = redirects[title];

            if (redirectTarget == null) {
                return {
                    pageid: index + 1,
                    title: `Category:${title}`,
                };
            }

            return {
                pageid: index + 1,
                pageprops: {
                    category_redirect_target: `Category:${redirectTarget}`,
                },
                title: `Category:${title}`,
            };
        });

        return {
            ok: true,
            json: async () => ({
                query: {
                    pages,
                },
            }),
        };
    };
}

function createOrdinaryRedirectCategoryFetcher(redirects) {
    return async (url) => {
        const titles = new URL(url, "https://zh.wikipedia.org").searchParams
            .get("titles")
            .split("|")
            .map((title) => title.replace(/^Category:/u, ""));
        const redirectItems = titles
            .filter((title) => redirects[title] != null)
            .map((title) => ({
                from: `Category:${title}`,
                to: `Category:${redirects[title]}`,
            }));
        const pages = titles.map((title, index) => ({
            pageid: index + 1,
            title: `Category:${redirects[title] || title}`,
        }));

        return {
            ok: true,
            json: async () => ({
                query: {
                    pages,
                    redirects: redirectItems,
                },
            }),
        };
    };
}
