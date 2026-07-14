/**
 * Tests navbox template creation.
 */

import assert from "node:assert/strict";
import test from "node:test";

import { EDIT_SUMMARY_SUFFIX } from "../../src/vg-stub-creator/editing/summary.ts";
import { saveNavboxTemplate } from "../../src/vg-stub-creator/handlers/navbox-pages.ts";

test("saveNavboxTemplate creates a template without overwriting", async () => {
    const calls = [];
    const api = {
        async postWithToken(token, params) {
            calls.push([token, params]);
        },
    };

    await saveNavboxTemplate("Example series", "{{Navbox}}", api as any);

    assert.deepEqual(calls, [
        [
            "csrf",
            {
                action: "edit",
                createonly: true,
                summary: `create 'Template:Example series' ${EDIT_SUMMARY_SUFFIX}`,
                text: "{{Navbox}}",
                title: "Template:Example series",
            },
        ],
    ]);
});
