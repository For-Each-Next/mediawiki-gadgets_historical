/**
 * Tests persistent article-save progress.
 */

import assert from "node:assert/strict";
import test from "node:test";

import {
    createSaveProgress,
    readSaveProgress,
    storeSaveProgress,
    updateSaveProgress,
} from "../src/save-progress.js";

test("createSaveProgress builds save, move, and selected action rows", () => {
    const progress = createSaveProgress(
        "Example",
        [
            {
                id: "redirect:Alias",
                label: "Create redirect Alias",
                selected: true,
            },
            {
                id: "redirect:Existing",
                label: "Existing redirect",
                selected: false,
            },
        ],
        {
            enabled: true,
            to: "示例",
        },
    );

    assert.deepEqual(
        progress.steps.map((step) => [step.id, step.label, step.status]),
        [
            ["save", "Save page: Example", "pending"],
            ["move", "Move page to 示例", "pending"],
            ["redirect:Alias", "Create redirect Alias", "pending"],
        ],
    );
});

test("save progress updates and round-trips through storage", () => {
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
    const progress = updateSaveProgress(
        createSaveProgress("Example"),
        "save",
        "running",
    );

    storeSaveProgress(progress, storage);

    assert.equal(readSaveProgress(storage).steps[0].status, "running");
});
