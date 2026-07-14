/**
 * Tests category row stub-tag defaults.
 */

import assert from "node:assert/strict";
import test, { after } from "node:test";

import fieldData from "../../src/vg-stub-creator/field-data.ts";

const originalCompanies = fieldData.companies;
fieldData.companies = [
    {
        aliases: ["Foo Studio"],
        categories: ["Foo Studio游戏"],
        stubTags: ["Foo-stub"],
    },
    {
        aliases: ["Bar Games"],
        categories: ["Bar Games游戏"],
        stubTags: ["Bar-stub"],
    },
] as any;

after(function restoreFieldData() {
    fieldData.companies = originalCompanies;
});

const { buildCategoryRows } =
    await import("../../src/vg-stub-creator/handlers/categories.ts");
const { createArticleData } =
    await import("../../src/vg-stub-creator/article/index.ts");

test("buildCategoryRows checks company stub tags for shared developers and publishers", async () => {
    const form = {
        developers: "Foo Studio",
        platforms: "",
        publishers: "Foo Studio, Bar Games",
        series: "",
    };
    const rows = await buildCategoryRows(form, paramsFromForm(form), [], {
        fetcher: createCategoryFetcher({
            "Bar Games游戏": "Bar Games游戏",
            "Foo Studio游戏": "Foo Studio游戏",
        }),
    });

    assert.deepEqual(
        rows.map((row) => [row.category, row.stubTag, row.stubTagEnabled]),
        [
            ["Foo Studio游戏", "Foo-stub", true],
            ["Bar Games游戏", "Bar-stub", false],
        ],
    );
});

test("buildCategoryRows checks company stub tags when publisher is the equality marker", async () => {
    const form = {
        developers: "Foo Studio, Bar Games",
        platforms: "",
        publishers: "=",
        series: "",
    };
    const rows = await buildCategoryRows(form, paramsFromForm(form), [], {
        fetcher: createCategoryFetcher({
            "Bar Games游戏": "Bar Games游戏",
            "Foo Studio游戏": "Foo Studio游戏",
        }),
    });

    assert.deepEqual(
        rows.map((row) => [row.category, row.stubTag, row.stubTagEnabled]),
        [
            ["Foo Studio游戏", "Foo-stub", true],
            ["Bar Games游戏", "Bar-stub", true],
        ],
    );
});

function emptyParams() {
    return {
        companyMetadata: {
            categories: [],
            stubTags: [],
        },
        platformSeriesMetadata: {
            categories: [],
            stubTags: [],
        },
        yearGenreMetadata: {
            categories: [],
            stubTags: [],
        },
    };
}

function paramsFromForm(form) {
    const params = createArticleData({
        categoryRows: [],
        developers: form.developers,
        genres: "",
        localizedNames: [],
        name: "Example",
        navboxText: "",
        platforms: form.platforms,
        publishers: form.publishers,
        series: form.series,
        sourceReferences: [],
        year: "",
    });

    return params;
}

function createCategoryFetcher(existing) {
    return async (url) => {
        const titles = new URL(url, "https://zh.wikipedia.org").searchParams
            .get("titles")
            .split("|")
            .map((title) => title.replace(/^Category:/u, ""));
        const pages = titles
            .filter((title) => existing[title] != null)
            .map((title, index) => ({
                pageid: index + 1,
                title: `Category:${existing[title]}`,
            }));

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
