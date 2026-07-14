/**
 * Tests modular article data and prose output.
 */

import assert from "node:assert/strict";
import test from "node:test";

import { createArticleData } from "../../src/vg-stub-creator/article/index.ts";

const PART_KEYS = [
    "assumedCategories",
    "assumedStubTags",
    "categoryItems",
    "categoryPlans",
    "citations",
    "inputText",
    "issues",
    "key",
    "metadata",
    "navboxes",
    "normalizedText",
    "sourceUrls",
    "values",
    "wikitext",
];

test("all article modules expose the universal data contract", () => {
    const data = createArticleData({
        categoryRows: [],
        developers: "Foo Studio",
        genres: "RPG",
        localizedNames: [],
        name: "Example",
        navboxRows: [
            {
                enabled: true,
                text: "{{Example series}}",
                title: "Example series",
            },
        ],
        navboxText: "{{Example series}}",
        platforms: "PS5",
        publishers: "Bar Games",
        series: "Example",
        sourceReferences: [
            {
                citation: "{{Cite web|url=https://example.test}}",
                key: "platforms",
                sourceUrl: "https://example.test",
            },
        ],
        year: "2026",
    });

    Object.values(data.records).forEach((record) => {
        assert.deepEqual(Object.keys(record).sort(), PART_KEYS);
    });
    assert.deepEqual(data.records.platform.sourceUrls, [
        "https://example.test",
    ]);
    assert.equal(data.records.platform.normalizedText.platforms, "PS5");
    assert.equal(data.records.review.navboxes[0].title, "Example series");
});

test("prose builds the complete paragraph and its sinograph count", () => {
    const data = createArticleData({
        additionalProse: "补充说明。",
        categoryRows: [],
        developers: "Foo Studio",
        genres: "RPG",
        localizedNames: [],
        name: "Example",
        navboxText: "",
        platforms: "PS5",
        publishers: "Bar Games",
        series: "Example",
        sourceReferences: [],
        year: "2026",
    });

    assert.equal(data.prose.text.startsWith("《'''Example'''》是"), true);
    assert.equal(data.prose.text.includes("作品对应"), true);
    assert.equal(data.prose.text.endsWith("补充说明。"), true);
    assert.equal(data.prose.sinographs > 0, true);
    assert.equal(
        data.prose.fragments.sentence1.s1a.titles,
        "《'''Example'''》",
    );
    assert.equal(
        data.prose.fragments.sentence1.s1b,
        "由Foo Studio开发、Bar Games发行",
    );
});

test("sentence 1 omits its clause separator without company prose", () => {
    const data = createArticleData({
        categoryRows: [],
        genres: "",
        localizedNames: [],
        name: "Example",
        navboxText: "",
        platforms: "",
        series: "",
        sourceReferences: [],
        year: "",
    });

    assert.equal(data.prose.fragments.sentence1.s1b, "");
    assert.equal(data.prose.text, "《'''Example'''》是一款[[电子游戏]]。");
});
