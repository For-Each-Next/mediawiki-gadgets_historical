/**
 * Tests preview form session persistence.
 */

import assert from "node:assert/strict";
import test from "node:test";

import {
    clearPreviewFormData,
    getPendingSaveData,
    getPreviewFormData,
    storePendingSaveData,
    storePreviewFormData,
} from "../src/editing/session.js";

test("preview form data round-trips for the matching page", () => {
    const values = new Map();
    const storage = {
        getItem(key) {
            return values.get(key) ?? null;
        },
        removeItem(key) {
            values.delete(key);
        },
        setItem(key, value) {
            values.set(key, value);
        },
    };

    storePreviewFormData({ name: "Recent edit" }, "Example_page", storage);

    assert.deepEqual(getPreviewFormData("Example page", storage), {
        form: {
            name: "Recent edit",
        },
        title: "Example_page",
    });

    clearPreviewFormData(storage);
    assert.equal(getPreviewFormData("Example page", storage), undefined);
});

test("pending save data preserves new-page registration", () => {
    const values = new Map();
    const storage = {
        getItem(key) {
            return values.get(key) ?? null;
        },
        removeItem(key) {
            values.delete(key);
        },
        setItem(key, value) {
            values.set(key, value);
        },
    };

    storePendingSaveData(
        { name: "Example" },
        "Example",
        {
            registration: {
                enabled: true,
            },
        },
        storage,
    );

    assert.deepEqual(getPendingSaveData("Example", storage).registration, {
        enabled: true,
    });
});
