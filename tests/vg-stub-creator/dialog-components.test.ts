/** Tests VG Stub Creator dialog composition and workflow bindings. */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
    assembleVgStubCreatorDialogs,
    type VgStubCreatorDialogBundle,
} from "vg-stub-creator/ui/dialogs/dialog-bundle.ts";
import {
    VG_STUB_CREATOR_DIALOG_STYLES,
    VG_STUB_CREATOR_DIALOG_TEMPLATE,
} from "vg-stub-creator/ui/dialogs/index.ts";
import {
    registerCodexComponents,
    type VgStubCreatorCodexComponents,
} from "vg-stub-creator/ui/codex.ts";

const dialogDirectory = fileURLToPath(
    new URL("../../src/vg-stub-creator/ui/dialogs/", import.meta.url),
);
const dialogNames = [
    "main",
    "pre-save",
    "company-category",
    "category-view",
    "page-edit",
    "move",
    "preview",
    "history",
    "history-json",
] as const;
const recoveryButtonHandlers = [
    "regenerateNoteTaRows",
    "refetchCitation",
    "resetCitationParam",
    "rebuildRedirectRows",
    "rebuildCategoryRows",
    "resetStubTagRows",
    "rebuildNavboxRows",
];
const removalButtonHandlers = [
    "removeNameRow",
    "removeNoteTaRow",
    "removeCitationParam",
    "removeRedirectRow",
    "removeCategoryRow",
    "removeStubTagRow",
    "removeNavboxRow",
];

test("keeps build-injected dialog assets safe in Node", () => {
    assert.equal(VG_STUB_CREATOR_DIALOG_TEMPLATE, "");
    assert.equal(VG_STUB_CREATOR_DIALOG_STYLES, "");
});

test("assembles nine dialogs under one setup scope", () => {
    const dialogs: VgStubCreatorDialogBundle[] = [
        { styles: ".one {}", template: "<one />" },
        { styles: ".two {}", template: "<two />" },
    ];

    assert.deepEqual(assembleVgStubCreatorDialogs(dialogs, ".shared {}"), {
        styles: ".shared {}\n.one {}\n.two {}",
        template: "<one /><two />",
    });
    assert.equal(dialogNames.length, 9);
});

test("keeps workflow actions bound in declarative templates", () => {
    const expectedActions = {
        "history-json": "importHistoryJson",
        "main": "submitForm",
        "move": "submitMoveTarget",
        "page-edit": "stagePageEdit",
        "pre-save": "confirmSubmit",
        "preview": "submitPreviewText",
    } as const;

    for (const [name, action] of Object.entries(expectedActions)) {
        assert.match(readDialog(name), new RegExp(`"${action}"`, "u"), name);
    }
    assert.match(readDialog("main"), /\bmsgParts\(/u);
});

test("keeps static presentation in CSS sidecars", () => {
    for (const name of dialogNames) {
        assert.doesNotMatch(readDialog(name), /(?:^|\s)style=/mu, name);
    }
});

test("uses native titles for every icon-only table action", () => {
    const source = readDialog("main");
    const buttons = [
        ...source.matchAll(
            /<cdx-button\b(?=[^>]*\bvg-stub-creator-icon-button\b)[^>]*>/gu,
        ),
    ].map((match) => match[0]);

    assert.equal(buttons.length, 32);
    for (const button of buttons) {
        assert.match(button, /\s(?::|v-bind:)title=/u);
        assert.match(button, /\s(?::|v-bind:)aria-label=/u);
    }
    assert.doesNotMatch(source, /tableActionTooltip/iu);
    assert.doesNotMatch(source, /role="tooltip"/u);
});

test("keeps every dialog locale-aware and cleanup-aware", () => {
    for (const name of dialogNames) {
        const source = readDialog(name);

        assert.match(source, /:lang="interfaceLocale"/u, name);
        assert.match(source, /@update:open=/u, name);
    }
});

test("uses native and responsive custom footer actions", () => {
    const nativeActionDialogs = [
        "category-view",
        "history-json",
        "pre-save",
    ] as const;
    const customFooterDialogs = [
        "company-category",
        "history",
        "main",
        "move",
        "page-edit",
        "preview",
    ] as const;

    for (const name of nativeActionDialogs) {
        const source = readDialog(name);

        assert.match(source, /:default-action=/u, name);
        assert.doesNotMatch(source, /#footer/u, name);
    }

    for (const name of customFooterDialogs) {
        assert.match(readDialog(name), /<template #footer>/u, name);
    }

    const styles = readFileSync(join(dialogDirectory, "shared.css"), "utf8");
    assert.match(styles, /@media \(max-width: 639px\)/u);
    assert.match(styles, /gap: 0\.75rem/u);
    assert.match(styles, /\.cdx-menu-button > \.cdx-button/u);
});

test("uses semantic buttons and accessible table editors", () => {
    const source = readDialog("main");
    const buttons = [...source.matchAll(/<cdx-button(?=\s)[\s\S]*?>/gu)].map(
        (match) => match[0],
    );
    const editors = [
        ...source.matchAll(/<cdx-text-(?:input|area)\b[\s\S]*?>/gu),
    ].map((match) => match[0]);

    assert.doesNotMatch(source, /href="#"/u);
    assert.doesNotMatch(source, /vg-stub-creator-destructive-action/u);
    assert.match(source, /<cdx-icon[\s\S]*:icon="externalLinkIcon"/u);

    for (const button of buttons) {
        assert.match(button, /\btype="button"/u);
        assert.doesNotMatch(button, /\bv-(?:bind|on):/u);
    }

    for (const editor of editors) {
        assert.match(editor, /:aria-label=/u);
    }
});

test("reserves destructive actions for work that cannot be restored", () => {
    const source = readDialog("main");

    for (const handler of recoveryButtonHandlers) {
        assert.doesNotMatch(
            readButtonForHandler(source, handler),
            /action="destructive"/u,
            handler,
        );
    }

    for (const handler of removalButtonHandlers) {
        assert.match(
            readButtonForHandler(source, handler),
            /action="destructive"/u,
            handler,
        );
    }

    assert.match(
        readButtonForHandler(readDialog("history"), "deleteHistoryEntry"),
        /action="destructive"/u,
    );
    assert.match(
        readButtonForHandler(readDialog("history"), "clearHistory"),
        /action="destructive"/u,
    );
});

test("shares production Codex registration with visual hosts", () => {
    const componentNames = [
        "CdxDialog",
        "CdxButton",
        "CdxButtonGroup",
        "CdxCard",
        "CdxCheckbox",
        "CdxField",
        "CdxIcon",
        "CdxInfoChip",
        "CdxMenuButton",
        "CdxMessage",
        "CdxProgressBar",
        "CdxProgressIndicator",
        "CdxSelect",
        "CdxTab",
        "CdxTabs",
        "CdxTable",
        "CdxTextArea",
        "CdxTextInput",
    ] as const;
    const codex = Object.fromEntries(
        componentNames.map((name) => [name, Symbol(name)]),
    ) as unknown as VgStubCreatorCodexComponents;
    const registered: string[] = [];

    registerCodexComponents(
        {
            component(name, component) {
                assert.equal(component, codex[name as keyof typeof codex]);
                registered.push(name);
            },
        },
        codex,
    );

    assert.deepEqual(registered, componentNames);
});

function readDialog(name: string): string {
    return readFileSync(join(dialogDirectory, `${name}-dialog.vue`), "utf8");
}

function readButtonForHandler(source: string, handler: string): string {
    const buttons = [...source.matchAll(/<cdx-button(?=\s)[\s\S]*?>/gu)].map(
        (match) => match[0],
    );
    const button = buttons.find((candidate) => candidate.includes(handler));

    assert.ok(button, `Missing button for ${handler}`);
    return button;
}
