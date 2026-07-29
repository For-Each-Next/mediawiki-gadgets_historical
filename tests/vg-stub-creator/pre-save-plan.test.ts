/**
 * Characterizes pure pre-save ordering and title-move planning.
 */

import assert from "node:assert/strict";
import test from "node:test";

import * as preSavePlan from "vg-stub-creator/workflows/pre-save-plan.ts";

test("pre-save planning keeps local writes before Wikidata writes", () => {
    const interwiki = {
        id: "interwiki",
        selected: true,
        type: "interwiki",
    };
    const redirect = {
        id: "redirect:Alias",
        selected: true,
        type: "redirect",
    };
    const category = {
        id: "category:Games",
        selected: true,
        type: "category",
    };
    const skipped = {
        id: "redirect:Skipped",
        selected: false,
        type: "redirect",
    };

    const plan = preSavePlan.planPreSaveExecution(
        [interwiki, redirect, skipped, category],
        "Old_Title",
        { enabled: true, to: "New_Title" },
    );

    assert.equal(plan.shouldMove, true);
    assert.equal(plan.finalTitle, "New Title");
    assert.deepEqual(plan.phases, [
        {
            actions: [redirect, category],
            type: "local",
        },
        {
            actions: [interwiki],
            type: "wikidata",
        },
    ]);
});

test("pre-save planning ignores a move to the same normalized title", () => {
    const plan = preSavePlan.planPreSaveExecution([], "Same_Title", {
        enabled: true,
        to: "same title",
    });

    assert.equal(plan.shouldMove, false);
    assert.equal(plan.finalTitle, "Same Title");
});
