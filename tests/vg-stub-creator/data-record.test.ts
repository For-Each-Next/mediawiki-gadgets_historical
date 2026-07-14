/**
 * Tests the universal named article data record.
 */

import assert from "node:assert/strict";
import test from "node:test";

import {
    createDataRecord,
    createDataValue,
} from "../../src/vg-stub-creator/article/data-record.ts";

test("createDataRecord fills the universal metadata contract", () => {
    const record = createDataRecord("platform", {
        categories: ["PlayStation 5游戏"],
        citations: [
            {
                sourceUrl: "https://example.test/platform",
            },
        ],
        metadata: {
            count: 1,
        },
        values: [
            {
                displayText: "PlayStation 5",
                linkTarget: "PlayStation 5",
                normalizedText: "PS5",
                wikitext: "[[PlayStation 5|PlayStation 5]]",
            },
        ],
    });

    assert.equal(record.key, "platform");
    assert.deepEqual(record.assumedCategories, ["PlayStation 5游戏"]);
    assert.deepEqual(record.sourceUrls, ["https://example.test/platform"]);
    assert.equal(record.values[0].normalizedText, "PS5");
    assert.equal(record.values[0].metadata != null, true);
    assert.equal(Object.hasOwn(record, "categories"), false);
});

test("createDataValue keeps named link and display fields", () => {
    const value = createDataValue({
        normalizedText: "Foo",
    });

    assert.deepEqual(value, {
        displayText: "Foo",
        linkTarget: "",
        metadata: {},
        normalizedText: "Foo",
        wikitext: "Foo",
    });
});
