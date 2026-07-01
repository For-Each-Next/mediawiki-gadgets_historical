/**
 * Tests WikiProject new-page-list registration.
 */

import assert from "node:assert/strict";
import test from "node:test";

import {
    NEW_PAGE_LIST_TITLE,
    addNewPageListEntry,
    registerNewPage,
} from "../src/handlers/new-page-list.js";
import { EDIT_SUMMARY_SUFFIX } from "../src/editing/summary.js";

test("appends an article and company categories to an existing date", () => {
    const text = [
        "== 2026年 ==",
        "* 6月14日 - {{vgc|Existing}}",
        "*:分類：{{vgc|Category:Existing公司游戏}}",
        "* 6月13日 - {{vgc|Older}}",
        "",
        "== 參見 ==",
    ].join("\n");

    assert.equal(
        addNewPageListEntry(
            text,
            "Example",
            ["Example公司游戏"],
            new Date("2026-06-14T01:00:00Z"),
        ),
        [
            "== 2026年 ==",
            "* 6月14日 - {{vgc|Existing}}、{{vgc|Example}}",
            "*:分類：{{vgc|Category:Existing公司游戏}}、{{vgc|Category:Example公司游戏}}",
            "* 6月13日 - {{vgc|Older}}",
            "",
            "== 參見 ==",
        ].join("\n"),
    );
});

test("inserts a skipped date in descending order", () => {
    const text = [
        "== 2026年 ==",
        "* 6月13日 - {{vgc|Newer}}",
        "* 6月10日 - {{vgc|Older}}",
        "",
        "== 參見 ==",
    ].join("\n");

    assert.equal(
        addNewPageListEntry(
            text,
            "Example",
            [],
            new Date("2026-06-12T23:59:59Z"),
        ),
        [
            "== 2026年 ==",
            "* 6月13日 - {{vgc|Newer}}",
            "* 6月12日 - {{vgc|Example}}",
            "* 6月10日 - {{vgc|Older}}",
            "",
            "== 參見 ==",
        ].join("\n"),
    );
});

test("creates a new year section above the old year", () => {
    const text = [
        "Intro",
        "",
        "== 2026年 ==",
        "* 12月31日 - {{vgc|Older}}",
        "",
        "== 參見 ==",
    ].join("\n");

    assert.equal(
        addNewPageListEntry(
            text,
            "Example",
            ["Category:Example公司游戏"],
            new Date("2027-01-01T00:00:00Z"),
        ),
        [
            "Intro",
            "",
            "== 2027年 ==",
            "* 1月1日 - {{vgc|Example}}",
            "*:分類：{{vgc|Category:Example公司游戏}}",
            "",
            "== 2026年 ==",
            "* 12月31日 - {{vgc|Older}}",
            "",
            "== 參見 ==",
        ].join("\n"),
    );
});

test("does not duplicate existing registrations", () => {
    const text = [
        "== 2026年 ==",
        "* 6月14日 - {{vgc|Example}}",
        "*:分類：{{vgc|Category:Example公司游戏}}",
    ].join("\n");

    assert.equal(
        addNewPageListEntry(
            text,
            "Example",
            ["Example公司游戏"],
            new Date("2026-06-14T00:00:00Z"),
        ),
        text,
    );
});

test("registerNewPage retries edit conflicts with fresh page text", async () => {
    let getCount = 0;
    const edits = [];
    const api = {
        async get(params) {
            getCount += 1;
            assert.equal(params.titles, NEW_PAGE_LIST_TITLE);
            return {
                curtimestamp: `2026-06-14T00:00:0${getCount}Z`,
                query: {
                    pages: [
                        {
                            revisions: [
                                {
                                    slots: {
                                        main: {
                                            content:
                                                "== 2026年 ==\n* 6月13日 - {{vgc|Older}}",
                                        },
                                    },
                                    timestamp: `2026-06-13T00:00:0${getCount}Z`,
                                },
                            ],
                        },
                    ],
                },
            };
        },
        async postWithToken(token, params) {
            edits.push([token, params]);

            if (edits.length === 1) {
                throw { code: "editconflict" };
            }
        },
    };

    await registerNewPage(
        api,
        "Example",
        [],
        new Date("2026-06-14T00:00:00Z"),
    );

    assert.equal(getCount, 2);
    assert.equal(edits.length, 2);
    assert.equal(edits[1][1].title, NEW_PAGE_LIST_TITLE);
    assert.equal(
        edits[1][1].summary,
        `register the new article "[[Example]]" ${EDIT_SUMMARY_SUFFIX}`,
    );
    assert.equal(
        edits[1][1].text,
        "== 2026年 ==\n* 6月14日 - {{vgc|Example}}\n* 6月13日 - {{vgc|Older}}",
    );
});

test("registerNewPage edit summary mentions added categories", async () => {
    const edits = [];
    const api = {
        async get() {
            return {
                curtimestamp: "2026-06-14T00:00:00Z",
                query: {
                    pages: [
                        {
                            revisions: [
                                {
                                    slots: {
                                        main: {
                                            content: "== 2026年 ==",
                                        },
                                    },
                                    timestamp: "2026-06-13T00:00:00Z",
                                },
                            ],
                        },
                    ],
                },
            };
        },
        async postWithToken(token, params) {
            edits.push([token, params]);
        },
    };

    await registerNewPage(
        api,
        "Example",
        ["Example公司游戏"],
        new Date("2026-06-14T00:00:00Z"),
    );

    assert.equal(
        edits[0][1].summary,
        `register the new article "[[Example]]" and category [[Category:Example公司游戏]] ${EDIT_SUMMARY_SUFFIX}`,
    );
});
