/**
 * Tests compatibility with a real saved history payload.
 */

import assert from "node:assert/strict";
import test from "node:test";

import { readFormHistory } from "#stub/ui/history.ts";
import { wheelWorldEntry } from "./wheel-world.fixture.ts";

const HISTORY_STORAGE_KEY = "vg-stub-creator-form-history";

test("real version 1 history remains readable without losing patches", () => {
    const originalStorage = globalThis.localStorage;
    const stored = JSON.stringify([{ ...wheelWorldEntry, id: 18726 }]);
    globalThis.localStorage = createStorage(stored);

    try {
        const [entry] = readFormHistory();

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
    } finally {
        globalThis.localStorage = originalStorage;
    }
});

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
