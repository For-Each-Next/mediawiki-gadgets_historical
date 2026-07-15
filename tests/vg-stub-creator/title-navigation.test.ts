/**
 * Tests page-title conflicts and post-save navigation.
 */

import assert from "node:assert/strict";
import test from "node:test";

import {
    fetchExistingPageTitles,
    type PageLookupApi,
} from "vg-stub-creator/infra/editing/pre-save.ts";
import {
    buildWhatLinksHerePageTitle,
    selectArticleSubmissionTitle,
} from "vg-stub-creator/ui/navigation.ts";

test("title lookup detects an occupied converted variant", async () => {
    const api: PageLookupApi = {
        async get(params: any) {
            assert.equal(params.converttitles, "1");
            assert.equal(params.titles, "遊戲名稱|Unused title");

            return {
                query: {
                    converted: [{ from: "遊戲名稱", to: "游戏名称" }],
                    pages: {
                        1: { title: "游戏名称" },
                        "-1": { missing: "", title: "Unused title" },
                    },
                },
            };
        },
    };

    const matches = await fetchExistingPageTitles(api, [
        "遊戲名稱",
        "Unused title",
    ]);

    assert.deepEqual(matches, [
        {
            exists: true,
            requestedTitle: "遊戲名稱",
            title: "游戏名称",
        },
    ]);
});

test("completed saves navigate to the final article backlinks", () => {
    assert.equal(
        buildWhatLinksHerePageTitle(" Final title "),
        "Special:WhatLinksHere/Final title",
    );
});

test("new pages save directly to a free entered title", () => {
    assert.equal(
        selectArticleSubmissionTitle({
            currentPageExists: false,
            currentTitle: "Initial title",
            enteredTitle: "Entered title",
            shouldMove: false,
        }),
        "Entered title",
    );

    assert.equal(
        selectArticleSubmissionTitle({
            currentPageExists: true,
            currentTitle: "Existing title",
            enteredTitle: "Entered title",
            shouldMove: false,
        }),
        "Existing title",
    );
});
