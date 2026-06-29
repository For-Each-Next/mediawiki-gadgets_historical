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

test("renderSaveProgress groups steps by edited target page", () => {
    const documentRef = createDocumentStub();
    const progress = createSaveProgress(
        "Example",
        [
            {
                id: "redirect:Alias",
                label: "Redirect name: Alias to Example",
                pageTitle: "Alias",
                redirectTitle: "Alias",
                selected: true,
                type: "redirect",
            },
            {
                id: "talk-banner",
                label: "Add WikiProject Video games banner to Talk:Example",
                pageTitle: "Example",
                selected: true,
                type: "talk-banner",
            },
            {
                id: "page-edit:Template:Example",
                label: "Edit page: Template:Example",
                pageTitle: "Template:Example",
                selected: true,
                title: "Template:Example",
                type: "page-edit",
            },
        ],
        {},
        {
            enabled: true,
        },
    );
    const layer = renderSaveProgress(progress, documentRef);

    assert.equal(
        layer.innerHTML.includes("Target page: <code>Example</code>"),
        true,
    );
    assert.equal(
        layer.innerHTML.includes("Target page: <code>Alias</code>"),
        true,
    );
    assert.equal(
        layer.innerHTML.includes("Target page: <code>Talk:Example</code>"),
        true,
    );
    assert.equal(
        layer.innerHTML.includes("Target page: <code>Template:Example</code>"),
        true,
    );
    assert.equal(
        layer.innerHTML.includes(
            "Target page: <code>WikiProject:电子游戏/新进条目</code>",
        ),
        true,
    );
    assert.equal(
        layer.innerHTML.includes('class="create-vg-stub-save-progress-group"'),
        true,
    );
});

test("category progress omits bundled Wikidata work", () => {
    const documentRef = createDocumentStub();
    const progress = createSaveProgress("Example", [
        {
            category: "Milestone (公司)游戏",
            englishName: "Category:Milestone games",
            id: "category:Milestone (公司)游戏",
            label: "Create category: Milestone (公司)游戏",
            pageTitle: "Category:Milestone (公司)游戏",
            selected: true,
            type: "category",
        },
    ]);
    const layer = renderSaveProgress(progress, documentRef);

    assert.equal(
        layer.innerHTML.includes("Target page: <code>Wikidata:"),
        false,
    );
    assert.equal(
        layer.innerHTML.includes("Connect to matching Wikidata"),
        false,
    );
    assert.equal(
        layer.innerHTML.includes(
            "<code>Category:Milestone (公司)游戏</code>",
        ),
        true,
    );
});

test("renderSaveProgress uses a Codex-style waiting frame", () => {
    const documentRef = createDocumentStub();
    const progress = updateSaveProgress(
        createSaveProgress("Example"),
        "save",
        "complete",
    );
    const layer = renderSaveProgress(progress, documentRef);

    assert.equal(
        layer.innerHTML.includes(
            'class="cdx-dialog create-vg-stub-save-progress-dialog"',
        ),
        true,
    );
    assert.equal(layer.innerHTML.includes('class="cdx-dialog__header"'), true);
    assert.equal(layer.innerHTML.includes('class="cdx-dialog__body"'), true);
    assert.equal(layer.innerHTML.includes('data-action="close"'), false);
    assert.equal(layer.innerHTML.includes("cdx-button"), false);
    assert.equal(layer.innerHTML.includes("cdx-dialog__footer"), false);
    assert.equal(layer.innerHTML.includes("float:right"), false);
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
