/** Composition contracts for Page Assessor dialog startup. */

import assert from "node:assert/strict";
import test from "node:test";

import type { DialogState } from "vg-page-assessor/contracts/dialog.ts";
import { loadDialogStateForCurrentPage } from "vg-page-assessor/ui/app.ts";

test("loads state through the injected page context", async () => {
    const api = {} as mw.Api;
    const title = {} as mw.Title;
    const state = {} as DialogState;
    let factoryCalls = 0;

    const result = await loadDialogStateForCurrentPage({
        createDialogPageContext() {
            factoryCalls += 1;
            return { api, pageName: "Example", title };
        },
        async loadDialogState(receivedApi, receivedTitle) {
            assert.equal(receivedApi, api);
            assert.equal(receivedTitle, title);
            return state;
        },
    });

    assert.equal(factoryCalls, 1);
    assert.equal(result, state);
});

test("rejects an unresolved injected page title before loading state", () => {
    assert.throws(
        () =>
            loadDialogStateForCurrentPage({
                createDialogPageContext() {
                    return {
                        api: {} as mw.Api,
                        pageName: "Invalid page",
                        title: null,
                    };
                },
                async loadDialogState() {
                    assert.fail("Dialog state loaded without a valid title.");
                },
            }),
        /Unable to resolve the current page: Invalid page/u,
    );
});
