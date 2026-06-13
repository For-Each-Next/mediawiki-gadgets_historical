/**
 * Tests persistent article-save progress.
 */

import assert from "node:assert/strict";
import test from "node:test";

import {
    createSaveProgress,
    readSaveProgress,
    renderSaveProgress,
    storeSaveProgress,
    updateSaveProgress,
} from "../src/save/progress.js";

test("createSaveProgress builds save, move, and selected action rows", () => {
    const progress = createSaveProgress(
        "Example",
        [
            {
                id: "redirect:Alias",
                label: "Create redirect Alias",
                redirectTitle: "Alias",
                selected: true,
                type: "redirect",
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
        {
            enabled: true,
        },
    );

    assert.deepEqual(
        progress.steps.map((step) => [step.id, step.label, step.status]),
        [
            ["save", "Save page: Example", "pending"],
            ["move", "Move page to 示例", "pending"],
            ["redirect:Alias", "Create redirect Alias", "pending"],
            ["new-page-list", "Register new page: Example", "pending"],
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

test("renderSaveProgress uses bullets and code-wrapped titles", () => {
    const documentRef = createDocumentStub();
    const progress = createSaveProgress("夏爾故事：魔戒遊戲", [
        {
            id: "interwiki",
            label: "Connect",
            selected: true,
            type: "interwiki",
            wikidataId: "Q125570677",
        },
        {
            id: "redirect:English",
            label: "Redirect",
            redirectTitle: "Tales of the Shire: A The Lord of the Rings Game",
            selected: true,
            type: "redirect",
        },
        {
            id: "talk-banner",
            label: "Banner",
            selected: true,
            type: "talk-banner",
        },
        {
            category: "Chibig游戏",
            id: "category:Chibig游戏",
            label: "Create category: Chibig游戏",
            selected: true,
            type: "category",
        },
    ]);
    const layer = renderSaveProgress(progress, documentRef);

    assert.equal(layer.innerHTML.includes("<ul"), true);
    assert.equal(layer.innerHTML.includes("<ol"), false);
    assert.equal(
        layer.innerHTML.includes("<code>夏爾故事：魔戒遊戲</code>"),
        true,
    );
    assert.equal(layer.innerHTML.includes("<code>Q125570677</code>"), true);
    assert.equal(layer.innerHTML.includes("✅"), false);
    assert.equal(layer.innerHTML.includes("⏸️"), true);
    assert.equal(
        layer.innerHTML.includes("<code>Category:Chibig游戏</code>"),
        true,
    );
    assert.equal(layer.innerHTML.includes(" -&gt; "), false);
    assert.equal(layer.innerHTML.includes(" to "), true);
});

function createDocumentStub() {
    let layer;

    return {
        body: {
            append(element) {
                layer = element;
            },
        },
        createElement() {
            return {
                innerHTML: "",
                querySelector() {
                    return null;
                },
                style: {},
            };
        },
        getElementById() {
            return layer;
        },
    };
}
