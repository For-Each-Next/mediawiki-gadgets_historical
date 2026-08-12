/**
 * Tests compatibility with a real saved history payload.
 */

import assert from "node:assert/strict";
import test from "node:test";

// eslint-disable-next-line max-len
import { createFormHistoryStore } from "vg-stub-creator/adapters/storage/form-history.ts";
import { wheelWorldEntry } from "./wheel-world.fixture.ts";

const HISTORY_STORAGE_KEY = "vg-stub-creator-form-history";

const testCallback = () => {
    const stored = JSON.stringify([{ ...wheelWorldEntry, id: 18726 }]);
    const storage = createStorage(stored);
    const history = createFormHistoryStore(() => storage, {
        temporaryDraft: "Temporary draft",
        untitled: "Untitled",
    });
    const [entry] = history.readFormHistory();

    assert.equal(entry.data.version, 1);
    assert.equal(entry.metadata.page, "Wheel World");
    assert.equal(entry.data.input.stubTagRows.length, 7);
    assert.deepEqual(entry.data.patches.categories, [
        {
            source: { company: "Messhof" },
            enabled: false,
        },
        {
            source: { manual: true },
            enabled: true,
        },
    ]);
};
test(
    "real version 1 history remains readable without losing patches",
    testCallback,
);

/**
 * Creates storage containing one serialized history list.
 *
 * @param stored - Serialized history data.
 * @returns Minimal Storage implementation.
 */
function createStorage(stored: string): Storage {
    return {
        getItem(key) {
            return key === HISTORY_STORAGE_KEY ? stored : null;
        },
    } as Storage;
}
