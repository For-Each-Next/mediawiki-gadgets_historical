/**
 * Tests missing-page action triggers.
 */

import assert from "node:assert/strict";
import test from "node:test";

import {
    addMissingPageEditTrigger,
    addViewPageTrigger,
} from "../src/interface/page-trigger.js";

test("addMissingPageEditTrigger adds an action to page views", () => {
    const listeners = [];
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
    const updated = addMissingPageEditTrigger(mediaWikiUtil, handler);

    assert.equal(updated, true);
    assert.deepEqual(calls, [
        [
            "p-views",
            "#",
            "Create VG stub",
            "ca-create-vg-stub",
        ],
    ]);
    assert.deepEqual(listeners, [["click", handler]]);
});

test("addMissingPageEditTrigger handles an unavailable portlet", () => {
    const updated = addMissingPageEditTrigger(
        {
            addPortletLink() {
                return null;
            },
        },
        () => {},
    );

    assert.equal(updated, false);
});

test("addViewPageTrigger prefers visible page actions", () => {
    const calls = [];
    const link = {
        addEventListener(type) {
            assert.equal(type, "click");
        },
    };

    assert.equal(
        addViewPageTrigger(
            {
                addPortletLink(...args) {
                    calls.push(args);
                    return link;
                },
            },
            () => {},
        ),
        true,
    );
    assert.equal(calls[0][0], "p-views");
    assert.equal(calls.length, 1);
});

test("addViewPageTrigger falls back to the toolbox", () => {
    const calls = [];

    assert.equal(
        addViewPageTrigger(
            {
                addPortletLink(portlet) {
                    calls.push(portlet);
                    return portlet === "p-tb"
                        ? { addEventListener() {} }
                        : null;
                },
            },
            () => {},
        ),
        true,
    );
    assert.deepEqual(calls, ["p-views", "p-tb"]);
});
