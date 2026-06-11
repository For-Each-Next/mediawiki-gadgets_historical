/**
 * Tests article source discovery and citation routing.
 */

import assert from "node:assert/strict";
import test from "node:test";

import {
    fetchSourceReferences,
    getEnteredSourceUrls,
} from "../src/source-references.js";

test("source discovery includes registered fields and localized names", () => {
    const form = {
        localizedNames: [
            {
                name: "官方名",
                sourceUrl:
                    " https://example.test/name-a\nhttps://example.test/name-b ",
            },
        ],
        yearSourceUrl: " https://example.test/year ",
    };

    assert.deepEqual(getEnteredSourceUrls(form), [
        "https://example.test/year",
        "https://example.test/name-a",
        "https://example.test/name-b",
    ]);
});

test("citation fetching keeps source URLs in hub metadata", async () => {
    const references = await fetchSourceReferences(
        {
            localizedNames: [],
            yearSourceUrl: "https://example.test/year",
        },
        {
            async fetch(url) {
                return `{{cite web|url=${url}}}`;
            },
        },
    );

    assert.deepEqual(references, [
        {
            citation: "{{cite web|url=https://example.test/year}}",
            key: "year",
            sourceUrl: "https://example.test/year",
        },
    ]);
});
