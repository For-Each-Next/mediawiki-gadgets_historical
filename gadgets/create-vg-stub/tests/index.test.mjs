/**
 * Tests create-vg-stub app wiring.
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
