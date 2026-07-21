/**
 * Tests universal article parts with a real saved input.
 */

import assert from "node:assert/strict";
import test from "node:test";

import { createArticleData } from "vg-stub-creator/domain/processor.ts";
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

const testCallbackD = () => {
    const data = createWheelWorldArticleData();

    for (const record of Object.values(data.records) as Array<any>) {
        const sortResult = Object.keys(record).sort();
        assert.deepEqual(sortResult, PART_KEYS);
        const isArrayValueA = Array.isArray(record.navboxes);
        assert.equal(isArrayValueA, true);
        const isArrayValue = Array.isArray(record.values);
        assert.equal(isArrayValue, true);
    }
};
test("every article part implements the universal contract", testCallbackD);

const testCallbackC = () => {
    const data = createWheelWorldArticleData();
    const companies = data.records.companies;

    assert.deepEqual(companies.navboxes, ["安納布爾納互動"]);
    assert.deepEqual(companies.metadata.navboxes, ["安納布爾納互動"]);
    assert.equal(companies.wikitext.developers, "[[Messhof]]");
    assert.equal(companies.wikitext.publishers, "[[安纳布尔纳互动]]");
};
test(
    "company navboxes flow through the universal company part",
    testCallbackC,
);

const testCallbackB = () => {
    const data = createWheelWorldArticleData();

    assert.equal(data.records.platform.values.length, 4);
    assert.equal(data.records.genre.values.length, 2);
    assert.equal(data.records.scores.metadata.metacritic.score, "71");
    assert.equal(data.records.scores.metadata.openCritic.recommend, "65");
};
test(
    "linked real-world fields preserve their entered wikitext",
    testCallbackB,
);

const testCallbackA = () => {
    const data = createArticleData({
        categoryRows: [],
        genres: "",
        localizedNames: [],
        name: "Example",
        navboxText: "",
        platforms: "",
        sourceReferences: [],
        year: "",
    });

    assert.equal(data.records.year.metadata.value, "");
    assert.equal(data.records.platform.values.length, 0);
    assert.equal(data.prose.text, "《'''Example'''》是一款[[电子游戏]]。");
};
test("empty year and genre use the fallback video-game phrase", testCallbackA);

const testCallback = () => {
    const data = createArticleData({
        categoryRows: [],
        genres: "Action\nAdventure",
        localizedNames: [],
        name: "Example",
        navboxText: "",
        platforms: "",
        sourceReferences: [],
        year: "",
    });

    assert.equal(
        data.records.genre.normalizedText.genres,
        "Action\nAdventure",
    );
    assert.equal(data.records.genre.values.length, 2);
};
test("article processing preserves entered list text", testCallback);

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
