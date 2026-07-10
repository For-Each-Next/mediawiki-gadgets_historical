/**
 * Tests vg-stub-creator app wiring.
 */

import assert from "node:assert/strict";
import test, { afterEach, beforeEach } from "node:test";

const originalMw = globalThis.mw;

beforeEach(() => {
    globalThis.mw = {
        config: {
            get(key) {
                if (key === "wgAction") {
                    return "read";
                }

                return "";
            },
        },
    };
});

afterEach(() => {
    globalThis.mw = originalMw;
});

test("submit handler passes citation store before reviewed preview", async () => {
    const { createSubmitHandler } = await import(
        `../src/index.js?test=${Date.now()}`
    );
    const form = { name: "Example" };
    const sourceFetchState = { loading: false };
    const closeDialog = () => {};
    const preSave = { actions: [] };
    const citationStore = { cache: new Map() };
    const preview = {
        summary: "create stub",
        text: "Edited generated text",
    };
    let args;

    createSubmitHandler(citationStore, (...receivedArgs) => {
        args = receivedArgs;
    })(form, sourceFetchState, closeDialog, preSave, preview);

    assert.deepEqual(args, [
        form,
        sourceFetchState,
        closeDialog,
        preSave,
        citationStore,
        preview,
    ]);
});

test("saving from a missing-page view allows overwrite", async () => {
    globalThis.mw.config.get = (key) => (key === "wgArticleId" ? 0 : "read");
    const { saveSubmittedArticle } = await import(
        `../src/index.js?test=${Date.now()}`
    );
    const calls = [];
    const api = {
        async postWithToken(token, params) {
            calls.push([token, params]);
        },
    };

    await saveSubmittedArticle(api, "Example", "Text", "create stub");

    assert.deepEqual(calls, [
        [
            "csrf",
            {
                action: "edit",
                summary: "create stub",
                text: "Text",
                title: "Example",
            },
        ],
    ]);
});

test("saving an existing article allows overwrite", async () => {
    globalThis.mw.config.get = (key) => (key === "wgArticleId" ? 123 : "read");
    const { saveSubmittedArticle } = await import(
        `../src/index.js?test=${Date.now()}`
    );
    const calls = [];
    const api = {
        async postWithToken(token, params) {
            calls.push([token, params]);
        },
    };

    await saveSubmittedArticle(api, "Example", "Text", "update stub");

    assert.deepEqual(calls, [
        [
            "csrf",
            {
                action: "edit",
                summary: "update stub",
                text: "Text",
                title: "Example",
            },
        ],
    ]);
});

test("article save failures still reject", async () => {
    globalThis.mw.config.get = (key) => (key === "wgArticleId" ? 0 : "read");
    const { saveSubmittedArticle } = await import(
        `../src/index.js?test=${Date.now()}`
    );
    const api = {
        async postWithToken() {
            throw { code: "abusefilter-disallowed" };
        },
    };

    await assert.rejects(
        () => saveSubmittedArticle(api, "Example", "Text", "create stub"),
        {
            code: "abusefilter-disallowed",
        },
    );
});
