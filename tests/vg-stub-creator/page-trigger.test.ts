/**
 * Tests VG Stub Creator launcher page eligibility.
 */

import assert from "node:assert/strict";
import test from "node:test";

import { canShowZhwikiLauncher } from "vg-stub-creator/ui/page-trigger.ts";

test("shows the launcher in article and draft namespaces", () => {
    for (const namespaceNumber of [0, 118]) {
        assert.equal(
            canShowZhwikiLauncher({
                namespaceNumber,
                pageTitle: "Example",
                userName: "Current editor",
            }),
            true,
        );
    }
});

test("shows the launcher on the current user's user-space pages", () => {
    for (const pageTitle of [
        "Current editor",
        "Current editor/Sandbox",
        "Current_editor/Video_game_draft",
    ]) {
        assert.equal(
            canShowZhwikiLauncher({
                namespaceNumber: 2,
                pageTitle,
                userName: "Current editor",
            }),
            true,
        );
    }
});

test("hides the launcher outside the allowed creation spaces", () => {
    const contexts = [
        {
            namespaceNumber: 2,
            pageTitle: "Another editor/Sandbox",
            userName: "Current editor",
        },
        {
            namespaceNumber: 2,
            pageTitle: "192.0.2.1",
            userName: null,
        },
        {
            namespaceNumber: 3,
            pageTitle: "Current editor",
            userName: "Current editor",
        },
        {
            namespaceNumber: 4,
            pageTitle: "Video games",
            userName: "Current editor",
        },
        {
            namespaceNumber: 119,
            pageTitle: "Example",
            userName: "Current editor",
        },
    ];

    for (const context of contexts) {
        assert.equal(canShowZhwikiLauncher(context), false);
    }
});
