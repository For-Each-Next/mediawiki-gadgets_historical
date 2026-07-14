/**
 * Tests WikiProject new-page-list preparation.
 */

import assert from "node:assert/strict";
import test from "node:test";

import {
    buildLineComparison,
    buildNewPageListSummary,
    getTitlesForDate,
    prepareNewPageListRegistration,
} from "vg-page-assessor/new-page-list.ts";

test("adds category entries under the matching date subgroup", () => {
    const result = prepareNewPageListRegistration({
        creationDate: new Date("2026-06-15T08:00:00Z"),
        namespaceNumber: 14,
        text: "== 2026年 ==\n* 6月15日 - {{vgc|Article A}}\n*:草稿：{{vgc|Draft:Example}}\n*:模板：{{vgc|Template:Example}}\n",
        title: "Category:Example",
    });

    assert.equal(result.eligible, true);
    assert.equal(
        result.proposedText,
        "== 2026年 ==\n* 6月15日 - {{vgc|Article A}}\n*:草稿：{{vgc|Draft:Example}}\n*:分類：{{vgc|Category:Example}}\n*:模板：{{vgc|Template:Example}}\n",
    );
});

test("recognizes simplified category and miscellaneous labels", () => {
    const result = prepareNewPageListRegistration({
        creationDate: new Date("2026-06-15T08:00:00Z"),
        namespaceNumber: 4,
        text: "== 2026年 ==\n* 6月15日 - {{vgc|Article A}}\n*:分类：{{vgc|Category:Old}}\n*:杂页：{{vgc|WikiProject:Old}}\n",
        title: "WikiProject:Example",
    });

    assert.equal(
        result.proposedText,
        "== 2026年 ==\n* 6月15日 - {{vgc|Article A}}\n*:分類：{{vgc|Category:Old}}\n*:雜頁：{{vgc|WikiProject:Old}}、{{vgc|WikiProject:Example}}\n",
    );
});

test("adds file entries with the traditional file label", () => {
    const result = prepareNewPageListRegistration({
        creationDate: new Date("2026-06-15T08:00:00Z"),
        namespaceNumber: 6,
        text: "== 2026年 ==\n* 6月15日 - {{vgc|Article A}}\n*:文件：{{vgc|File:Old.png}}\n",
        title: "File:Example.png",
    });

    assert.equal(
        result.proposedText,
        "== 2026年 ==\n* 6月15日 - {{vgc|Article A}}\n*:檔案：{{vgc|File:Old.png}}、{{vgc|File:Example.png}}\n",
    );
});

test("disables registration before the retained date range", () => {
    const result = prepareNewPageListRegistration({
        creationDate: new Date("2026-06-14T23:59:59Z"),
        namespaceNumber: 0,
        text: "== 2026年 ==\n* 6月15日 - {{vgc|Article A}}\n",
        title: "Older Article",
    });

    assert.equal(result.eligible, false);
    assert.equal(result.changed, false);
});

test("reports existing registration details", () => {
    const result = prepareNewPageListRegistration({
        creationDate: new Date("2026-06-15T08:00:00Z"),
        namespaceNumber: 0,
        text: "== 2026年 ==\n* 6月15日 - {{vgc|Redirect title}}\n",
        title: "Redirect title",
    });

    assert.equal(result.alreadyRegistered, true);
    assert.equal(result.existing.listedTitle, "Redirect title");
    assert.equal(
        result.existing.date.toISOString(),
        "2026-06-15T00:00:00.000Z",
    );
});

test("builds before and after comparison snippets with context", () => {
    assert.deepEqual(buildLineComparison("a\nb\nc\nd", "a\nb\nC\nd", 1), {
        after: "b\nC\nd",
        before: "b\nc\nd",
    });
});

test("builds a date-specific registration summary", () => {
    assert.equal(
        buildNewPageListSummary(
            "Category:2028年日本動畫作品",
            new Date("2028-07-15T08:00:00Z"),
        ),
        "Add [[Category:2028年日本動畫作品]] to the July 15 entry [[:m:User:For Each ... Next/global.js/vg page assessor.js|🍄]]",
    );
});

test("reorders entries by known creation times", () => {
    const result = prepareNewPageListRegistration({
        creationDate: new Date("2026-06-15T08:00:00Z"),
        creationTimes: new Map([
            ["Article B", new Date("2026-06-15T02:00:00Z")],
            ["Article A", new Date("2026-06-15T05:00:00Z")],
        ]),
        namespaceNumber: 0,
        text: "== 2026年 ==\n* 6月15日 - {{vgc|Article A}}\n",
        title: "Article B",
    });

    assert.equal(
        result.proposedText,
        "== 2026年 ==\n* 6月15日 - {{vgc|Article B}}、{{vgc|Article A}}\n",
    );
});

test("collects titles from date lines and continuation rows", () => {
    assert.deepEqual(
        getTitlesForDate(
            "== 2026年 ==\n* 6月15日 - {{vgc|Article A}}\n*:分類：{{vgc|Category:Example}}\n",
            new Date("2026-06-15T00:00:00Z"),
        ),
        ["Article A", "Category:Example"],
    );
});
