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
    assert.match(
        readDialog("main"),
        /v-bind:style="tableActionTooltip\.style"/u,
    );
});

function readDialog(name: string): string {
    return readFileSync(join(dialogDirectory, `${name}-dialog.vue`), "utf8");
}
