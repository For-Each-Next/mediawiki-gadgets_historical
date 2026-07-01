/**
 * Tests missing-page action triggers.
 */

import assert from "node:assert/strict";
import test from "node:test";

import {
    addEnwikiCreateTrigger,
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

test("addEnwikiCreateTrigger adds an action to page actions", () => {
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
    const updated = addEnwikiCreateTrigger(
        mediaWikiUtil,
        handler,
        "https://zh.wikipedia.org/wiki/Example?action=edit",
    );

    assert.equal(updated, true);
    assert.deepEqual(calls, [
        [
            "p-cactions",
            "https://zh.wikipedia.org/wiki/Example?action=edit",
            "Create zhwiki VG stub",
            "ca-create-zhwiki-vg-stub",
        ],
    ]);
    assert.equal(link.target, "_blank");
    assert.equal(link.rel, "noopener");
    assert.deepEqual(listeners, [["click", handler]]);
});

test("addEnwikiCreateTrigger falls back to the toolbox", () => {
    const calls = [];

    assert.equal(
        addEnwikiCreateTrigger(
            {
                addPortletLink(portlet) {
                    calls.push(portlet);
                    return portlet === "p-tb"
                        ? { addEventListener() {} }
                        : null;
                },
            },
            () => {},
            "https://zh.wikipedia.org/wiki/Example?action=edit",
        ),
        true,
    );
    assert.deepEqual(calls, ["p-cactions", "p-tb"]);
});
