/**
 * Tests tab-scoped review-link opening state.
 */

import assert from "node:assert/strict";
import test from "node:test";

// eslint-disable-next-line max-len
import { normalizeListFieldValue } from "vg-stub-creator/ui/form/form-model.ts";
import {
    claimReviewLinksOpening,
    createReviewLinkSession,
} from "vg-stub-creator/adapters/storage/review-link-session.ts";

test("review-link sessions keep two dialog instances isolated", () => {
    const first = createReviewLinkSession(() => createStorage());
    const second = createReviewLinkSession(() => createStorage());

    assert.equal(first.claim(), true);
    assert.equal(first.claim(), false);
    assert.equal(second.claim(), true);
    assert.equal(second.claim(), false);
});

const testCallbackC = () => {
    const storage = createStorage();

    const claimReviewLinksOpeningResultC = claimReviewLinksOpening(storage);
    assert.equal(claimReviewLinksOpeningResultC, true);
    const claimReviewLinksOpeningResultB = claimReviewLinksOpening(storage);
    assert.equal(claimReviewLinksOpeningResultB, false);
};
test(
    "review links can only be claimed once in one browser tab",
    testCallbackC,
);

const testCallbackB = () => {
    const firstTabStorage = createStorage();
    const secondTabStorage = createStorage();

    const claimReviewLinksOpeningResultA =
        claimReviewLinksOpening(firstTabStorage);
    assert.equal(claimReviewLinksOpeningResultA, true);
    const claimReviewLinksOpeningResult =
        claimReviewLinksOpening(secondTabStorage);
    assert.equal(claimReviewLinksOpeningResult, true);
};
test("review links use independent browser-tab state", testCallbackB);

const testCallbackA = () => {
    const listFieldValueResultA = normalizeListFieldValue("Alpha, Beta");
    assert.equal(listFieldValueResultA, "Alpha, Beta");
};
test("textbox list normalization preserves ordinary commas", testCallbackA);

const testCallback = () => {
    const listFieldValueResult = normalizeListFieldValue(
        "Alpha\n[[Beta; Gamma]]\nDelta",
    );
    assert.equal(listFieldValueResult, "Alpha; [[Beta; Gamma]]; Delta");
};
test("textbox list normalization joins first-level lines", testCallback);

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
