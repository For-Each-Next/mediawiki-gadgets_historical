/**
 * Tests page-title conflicts and post-save navigation.
 */

import assert from "node:assert/strict";
import test from "node:test";

import {
    fetchExistingPageTitles,
    type PageLookupApi,
} from "vg-stub-creator/workflows/pre-save.ts";
import {
    buildWhatLinksHerePageTitle,
    selectArticleSubmissionTitle,
} from "vg-stub-creator/ui/navigation.ts";

const testCallbackB = async () => {
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
};
test("title lookup detects an occupied converted variant", testCallbackB);

const testCallbackA = () => {
    const whatLinksHerePageTitleResult =
        buildWhatLinksHerePageTitle(" Final title ");
    assert.equal(
        whatLinksHerePageTitleResult,
        "Special:WhatLinksHere/Final title",
    );
};
test("completed saves navigate to the final article backlinks", testCallbackA);

const testCallback = () => {
    const selectArticleSubmissionTitleRA = selectArticleSubmissionTitle({
        currentPageExists: false,
        currentTitle: "Initial title",
        enteredTitle: "Entered title",
        shouldMove: false,
    });
    assert.equal(selectArticleSubmissionTitleRA, "Entered title");

    const selectArticleSubmissionTitleRe = selectArticleSubmissionTitle({
        currentPageExists: true,
        currentTitle: "Existing title",
        enteredTitle: "Entered title",
        shouldMove: false,
    });
    assert.equal(selectArticleSubmissionTitleRe, "Existing title");
};
test("new pages save directly to a free entered title", testCallback);
