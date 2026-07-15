/**
 * Tests universal article parts with a real saved input.
 */

import assert from "node:assert/strict";
import test from "node:test";

import { createArticleData } from "../../src/vg-stub-creator/domain/article/processor.ts"; // eslint-disable-line max-len
import { wheelWorldEntry } from "./wheel-world.fixture.ts";

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

test("every article part implements the universal contract", () => {
    const data = createWheelWorldArticleData();

    for (const record of Object.values(data.records) as Array<any>) {
        assert.deepEqual(Object.keys(record).sort(), PART_KEYS);
        assert.equal(Array.isArray(record.navboxes), true);
        assert.equal(Array.isArray(record.values), true);
    }
});

test("company navboxes flow through the universal company part", () => {
    const data = createWheelWorldArticleData();
    const companies = data.records.companies;

    assert.deepEqual(companies.navboxes, ["安納布爾納互動"]);
    assert.deepEqual(companies.metadata.navboxes, ["安納布爾納互動"]);
    assert.equal(companies.wikitext.developers, "[[Messhof]]");
    assert.equal(companies.wikitext.publishers, "[[安纳布尔纳互动]]");
});

test("linked real-world fields preserve their entered wikitext", () => {
    const data = createWheelWorldArticleData();

    assert.equal(data.records.platform.values.length, 4);
    assert.equal(data.records.genre.values.length, 2);
    assert.equal(data.records.scores.metadata.metacritic.score, "71");
    assert.equal(data.records.scores.metadata.openCritic.recommend, "65");
});

/**
 * Creates article data from the saved Wheel World input.
 *
 * @returns Normalized article data.
 */
function createWheelWorldArticleData(): any {
    const input = wheelWorldEntry.data.input;

    return createArticleData({
        ...input,
        categoryRows: [],
        name: input.pageName,
        navboxText: "",
        sourceReferences: [],
    });
}
