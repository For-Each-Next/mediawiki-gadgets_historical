/**
 * Tests persistent article-save progress.
 */

import assert from "node:assert/strict";
import test from "node:test";

import {
    createSaveProgress,
    getSaveProgressGroups,
    isSaveProgressComplete,
    readSaveProgress,
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
            ["new-page-list", "Register on WikiProject new-page list", "pending"],
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

test("createSaveProgress stores semantic title fragments", () => {
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

    assert.deepEqual(
        progress.steps.find((step) => step.id === "interwiki").parts,
        [
            { text: "Connect " },
            { code: "夏爾故事：魔戒遊戲" },
            { text: " to " },
            { code: "Q125570677" },
        ],
    );
    assert.deepEqual(
        progress.steps.find((step) => step.id === "category:Chibig游戏").parts,
        [{ text: "Create category: " }, { code: "Category:Chibig游戏" }],
    );
});

test("getSaveProgressGroups groups steps by edited target page", () => {
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
    const groups = getSaveProgressGroups(progress);

    assert.deepEqual(
        groups.map((group) => group.targetPage),
        [
            "Example",
            "Alias",
            "Talk:Example",
            "Template:Example",
            "WikiProject:电子游戏/新进条目",
        ],
    );
});

test("category progress includes bundled Wikidata and talk-page work", () => {
    const progress = createSaveProgress("Example", [
        {
            category: "Milestone (公司)游戏",
            company: "Milestone (公司)",
            englishName: "Category:Milestone games",
            id: "category:Milestone (公司)游戏",
            label: "Create category: Milestone (公司)游戏",
            pageTitle: "Category:Milestone (公司)游戏",
            selected: true,
            type: "category",
        },
    ]);
    const groups = getSaveProgressGroups(progress);
    const categoryGroup = groups.find(
        (group) => group.targetPage === "Category:Milestone (公司)游戏",
    );

    assert.deepEqual(
        categoryGroup.steps.map((step) => [step.id, step.label]),
        [
            [
                "category:Milestone (公司)游戏",
                "Create category: Milestone (公司)游戏",
            ],
            [
                "category:Milestone (公司)游戏:talk-banner",
                "Add WikiProject Video games banner to Category talk:Milestone (公司)游戏",
            ],
            [
                "category:Milestone (公司)游戏:wikidata",
                "Connect matching Wikidata category item",
            ],
        ],
    );
});

test("category progress updates bundled work with the parent action", () => {
    const progress = updateSaveProgress(
        createSaveProgress("Example", [
            {
                category: "Chibig游戏",
                company: "Chibig",
                englishName: "Category:Chibig games",
                id: "category:Chibig游戏",
                label: "Create category: Chibig游戏",
                pageTitle: "Category:Chibig游戏",
                selected: true,
                type: "category",
                wikidataId: "Q123",
            },
        ]),
        "category:Chibig游戏",
        "complete",
    );

    assert.deepEqual(
        progress.steps
            .filter((step) => step.id.startsWith("category:Chibig游戏"))
            .map((step) => [step.id, step.status]),
        [
            ["category:Chibig游戏", "complete"],
            ["category:Chibig游戏:talk-banner", "complete"],
            ["category:Chibig游戏:wikidata", "complete"],
        ],
    );
});

test("checklist progress can show article and category registration together", () => {
    const progress = updateSaveProgress(
        createSaveProgress(
            "Example",
            [],
            {},
            {},
            [
                {
                    rows: [
                        {
                            key: "register-new-page",
                            label: "Register on WikiProject new-page list",
                            type: "registration",
                        },
                    ],
                    title: "Example",
                },
                {
                    rows: [
                        {
                            key: "category:Chibig游戏:register-new-page",
                            label: "Register on WikiProject new-page list",
                            type: "registration",
                        },
                    ],
                    title: "Category:Chibig游戏",
                },
            ],
        ),
        "new-page-list",
        "running",
    );

    assert.deepEqual(
        progress.steps
            .filter((step) => step.id === "new-page-list")
            .map((step) => [step.targetPage, step.status]),
        [
            ["Example", "running"],
            ["Category:Chibig游戏", "running"],
        ],
    );
});

test("isSaveProgressComplete recognizes terminal progress", () => {
    const progress = updateSaveProgress(
        createSaveProgress("Example"),
        "save",
        "complete",
    );

    assert.equal(isSaveProgressComplete(progress), true);
    assert.equal(
        isSaveProgressComplete(
            updateSaveProgress(createSaveProgress("Example"), "save", "failed"),
        ),
        true,
    );
    assert.equal(
        isSaveProgressComplete(
            updateSaveProgress(
                createSaveProgress("Example"),
                "save",
                "retrying",
            ),
        ),
        false,
    );
});
