/**
 * Tests missing-page action triggers.
 */

import assert from "node:assert/strict";
import test from "node:test";

import { addMissingPageEditTrigger } from "../src/page-trigger.js";

test("addMissingPageEditTrigger adds an action beside #ca-edit", () => {
    const listeners = [];
    const editItem = {
        nextSibling: {
            id: "next",
        },
        parentNode: {},
    };
    const document = {
        querySelector(selector) {
            assert.equal(selector, "#ca-edit");
            return editItem;
        },
    };
    const link = {
        addEventListener(type, handler) {
            listeners.push([type, handler]);
        },
    };
    const calls = [];
    const mediaWikiUtil = {
        addPortletLink(...args) {
            calls.push(args);
            return link;
        },
    };
    const handler = () => {};
    const updated = addMissingPageEditTrigger(
        document,
        mediaWikiUtil,
        handler,
    );

    assert.equal(updated, true);
    assert.deepEqual(calls, [
        [
            "p-cactions",
            "#",
            "Create VG stub",
            "ca-create-vg-stub",
            undefined,
            undefined,
            editItem.nextSibling,
        ],
    ]);
    assert.deepEqual(listeners, [["click", handler]]);
});

test("addMissingPageEditTrigger skips pages without #ca-edit", () => {
    const updated = addMissingPageEditTrigger(
        {
            querySelector() {
                return null;
            },
        },
        {},
        () => {},
    );

    assert.equal(updated, false);
});

test("addMissingPageEditTrigger handles an unavailable portlet", () => {
    const updated = addMissingPageEditTrigger(
        {
            querySelector() {
                return {
                    nextSibling: null,
                    parentNode: {},
                };
            },
        },
        {
            addPortletLink() {
                return null;
            },
        },
        () => {},
    );

    assert.equal(updated, false);
});
