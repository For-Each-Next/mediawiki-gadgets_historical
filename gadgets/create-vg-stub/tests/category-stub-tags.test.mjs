/**
 * Tests category row stub-tag defaults.
 */

import assert from "node:assert/strict";
import test from "node:test";

globalThis.__CREATE_VG_STUB_FIELD_DATA__ = {
    companies: [
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
    ],
};

const { buildCategoryRows } = await import("../src/categories.js");
const { buildCompanyMetadata } = await import("../src/sectors/companies.js");

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
    return {
        ...emptyParams(),
        companyMetadata: buildCompanyMetadata({
            developers: form.developers,
            publishers: form.publishers,
        }),
    };
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
