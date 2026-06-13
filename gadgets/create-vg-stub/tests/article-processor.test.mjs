/**
 * Tests the registered article data processor.
 */

import assert from "node:assert/strict";
import test from "node:test";

import {
    ARTICLE_MODULES,
    createArticleData,
    formatArticleFormField,
} from "../src/article/index.js";

const ARTICLE_VALUE_KEYS = [
    "displayText",
    "linkTarget",
    "metadata",
    "normalizedText",
    "wikitext",
];

test("article modules emit one shared metadata contract", () => {
    const data = createArticleData({
        additionalProse: " Extra text. ",
        categoryRows: [],
        developers: " Studio ",
        genres: " RPG ",
        localizedNames: [],
        metacriticScore: "ps5:85",
        name: " Example ",
        navboxText: "",
        originalName: " EN: Example Game ",
        platforms: " PS5 ",
        publishers: "=",
        series: "",
        sourceReferences: [
            {
                citation: "{{cite web|title=Score}}",
                key: "metacriticScore",
                sourceUrl: "https://example.test/score",
            },
        ],
        year: " May 2023 ",
    });
    const contract = [
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

    assert.deepEqual(
        Object.keys(data.records),
        ARTICLE_MODULES.map(({ key }) => key),
    );
    Object.values(data.records).forEach((record) => {
        assert.deepEqual(Object.keys(record).sort(), contract);
        record.values.forEach((value) => {
            ARTICLE_VALUE_KEYS.forEach((key) => {
                assert.equal(Object.hasOwn(value, key), true);
            });
        });
    });
    assert.equal(data.form.originalLanguage, "en");
    assert.equal(data.form.originalName, "Example Game");
    assert.equal(data.form.metacriticPlatform, "PS5");
    assert.equal(data.form.metacriticScore, "85");
    assert.equal(data.form.year, "2023");
    assert.equal(data.records.scores.values[0].normalizedText, "PS5:85");
    assert.equal(data.records.scores.values[0].displayText, "PS5:85");
    assert.equal(data.records.scores.values[0].linkTarget, "");
    assert.equal(data.records.scores.values[0].wikitext, "PS5:85");
    assert.deepEqual(data.records.scores.sourceUrls, [
        "https://example.test/score",
    ]);
    assert.match(data.prose.text, /85\/100（PlayStation 5版）/u);
});

test("registered field formatters update compact values in place", () => {
    assert.equal(
        formatArticleFormField({}, "metacriticScore", " ps5: 85 "),
        "PS5:85",
    );
    assert.equal(
        formatArticleFormField({}, "metacriticScore", " ps5 85 "),
        "PS5:85",
    );
    assert.equal(
        formatArticleFormField({}, "metacriticScore", " Xbox Series X/S 77 "),
        "Xbox Series X/S:77",
    );
    assert.equal(
        formatArticleFormField({}, "originalName", " EN: Example "),
        "en:Example",
    );
    assert.equal(
        formatArticleFormField({}, "year", "5 February 2015"),
        "2015",
    );
});
