/**
 * Tests the company category quick-create helper.
 */

import assert from "node:assert/strict";
import test from "node:test";

import {
    buildCompanyCategoryText,
    prepareCompanyCategoryText,
    saveCategoryPage,
    saveCompanyCategory,
} from "../src/handlers/category-pages.js";
import { EDIT_SUMMARY_SUFFIX } from "../src/editing/summary.js";

test("buildCompanyCategoryText joins category page lines", () => {
    assert.equal(
        buildCompanyCategoryText("Foo Studio", true),
        [
            "{{portal|电子游戏}}",
            "",
            "本分類收錄由[[Foo Studio]]開發、發行的電子遊戲作品。",
            "",
            "{{DEFAULTSORT:Foo Studio}}",
            "[[Category:Foo Studio]]",
            "[[Category:各公司电子游戏]]",
        ].join("\n"),
    );
});

test("buildCompanyCategoryText applies default sort casing rules", () => {
    assert.equal(
        buildCompanyCategoryText("foo & BAR", false),
        [
            "{{portal|电子游戏}}",
            "",
            "本分類收錄由[[foo & BAR]]開發、發行的電子遊戲作品。",
            "",
            "{{DEFAULTSORT:Foo And Bar}}",
            "[[Category:各公司电子游戏]]",
        ].join("\n"),
    );
});

test("prepareCompanyCategoryText omits a missing company parent category", async () => {
    const text = await prepareCompanyCategoryText(
        {
            company: "Foo Studio",
        },
        {
            async get() {
                return {
                    query: {
                        pages: [
                            { missing: true, title: "Category:Foo Studio" },
                        ],
                    },
                };
            },
        },
    );

    assert.equal(text.includes("[[Category:Foo Studio]]"), false);
    assert.equal(text.includes("[[Category:各公司电子游戏]]"), true);
});

test("saveCompanyCategory creates, connects, and tags the category", async () => {
    const calls = [];
    const wikidataCalls = [];

    await saveCompanyCategory(
        "Foo Studio游戏",
        "Category text",
        "Foo Studio games",
        {
            api: {
                async get(params) {
                    calls.push(["get", params]);

                    return {
                        query: {
                            pages: {
                                "-1": {
                                    missing: "",
                                    title: "Category talk:Foo Studio游戏",
                                },
                            },
                        },
                    };
                },
                async postWithToken(token, params) {
                    calls.push(["postWithToken", token, params]);
                },
            },
            async fetchMetadata(title) {
                assert.equal(title, "Category:Foo Studio games");

                return {
                    title,
                    wikidataId: "Q123",
                };
            },
            wikidataApi: {
                async postWithToken(token, params) {
                    wikidataCalls.push([token, params]);
                },
            },
        },
    );

    assert.deepEqual(calls[0], [
        "postWithToken",
        "csrf",
        {
            action: "edit",
            createonly: true,
            summary: `Create company video game category ${EDIT_SUMMARY_SUFFIX}`,
            text: "Category text",
            title: "Category:Foo Studio游戏",
        },
    ]);
    assert.deepEqual(wikidataCalls, [
        [
            "csrf",
            {
                action: "wbsetsitelink",
                id: "Q123",
                linksite: "zhwiki",
                linktitle: "Category:Foo Studio游戏",
                summary:
                    `Connect zhwiki sitelink to ` +
                    `[[:w:zh:Category:Foo Studio游戏]] ` +
                    EDIT_SUMMARY_SUFFIX,
            },
        ],
    ]);
    assert.equal(calls[1][0], "get");
    assert.equal(calls[1][1].titles, "Category talk:Foo Studio游戏");
    assert.equal(calls[2][2].title, "Category talk:Foo Studio游戏");
});

test("saveCompanyCategory validates English category Wikidata first", async () => {
    let saveCount = 0;

    await assert.rejects(
        saveCompanyCategory(
            "Foo Studio游戏",
            "Category text",
            "Category:Missing games",
            {
                api: {
                    async postWithToken() {
                        saveCount += 1;
                    },
                },
                async fetchMetadata() {
                    return {
                        title: "Category:Missing games",
                        wikidataId: "",
                    };
                },
            },
        ),
        /No Wikidata item found/u,
    );

    assert.equal(saveCount, 0);
});

test("saveCategoryPage creates a generic category without overwriting", async () => {
    const calls = [];

    await saveCategoryPage("动作游戏", "Category text", undefined, {
        async postWithToken(token, params) {
            calls.push([token, params]);
        },
    });

    assert.deepEqual(calls, [
        [
            "csrf",
            {
                action: "edit",
                createonly: true,
                summary: `Create video game category ${EDIT_SUMMARY_SUFFIX}`,
                text: "Category text",
                title: "Category:动作游戏",
            },
        ],
    ]);
});
