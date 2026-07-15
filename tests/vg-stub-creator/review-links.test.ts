/**
 * Tests tab-scoped review-link opening state.
 */

import assert from "node:assert/strict";
import test from "node:test";

import {
    claimReviewLinksOpening,
    normalizeListFieldValue,
} from "#stub/form/helpers.ts";

test("review links can only be claimed once in one browser tab", () => {
    const storage = createStorage();

    assert.equal(claimReviewLinksOpening(storage), true);
    assert.equal(claimReviewLinksOpening(storage), false);
});

test("review links use independent browser-tab state", () => {
    const firstTabStorage = createStorage();
    const secondTabStorage = createStorage();

    assert.equal(claimReviewLinksOpening(firstTabStorage), true);
    assert.equal(claimReviewLinksOpening(secondTabStorage), true);
});

test("textbox list normalization preserves ordinary commas", () => {
    assert.equal(normalizeListFieldValue("Alpha, Beta"), "Alpha, Beta");
});

test("textbox list normalization joins first-level lines", () => {
    assert.equal(
        normalizeListFieldValue("Alpha\n[[Beta; Gamma]]\nDelta"),
        "Alpha; [[Beta; Gamma]]; Delta",
    );
});

/**
 * Creates an in-memory Storage implementation.
 *
 * @returns Storage implementation.
 */
function createStorage(): Storage {
    const values = new Map<string, string>();

    return {
        getItem(key) {
            return values.get(key) ?? null;
        },
        setItem(key, value) {
            values.set(key, value);
        },
    } as Storage;
}
