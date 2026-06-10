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
} from "../src/company-category-helper.js";
import { EDIT_SUMMARY_SUFFIX } from "../src/edit-summary.js";

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

test("saveCompanyCategory creates the category without overwriting", async () => {
    const calls = [];

    await saveCompanyCategory("Foo Studio游戏", "Category text", {
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
                summary: `Create company video game category ${EDIT_SUMMARY_SUFFIX}`,
                text: "Category text",
                title: "Category:Foo Studio游戏",
            },
        ],
    ]);
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
