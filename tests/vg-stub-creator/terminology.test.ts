/**
 * Tests the universal terminology contract.
 */

import assert from "node:assert/strict";
import test from "node:test";

import { get } from "vg-stub-creator/config/terminologies/index.ts";

test("company terms expose navbox projections", () => {
    const company = get("company", "Annapurna Interactive");

    assert.equal(company.label, "安纳布尔纳互动");
    assert.deepEqual(company.categories, ["安納布爾納互動遊戲"]);
    assert.deepEqual(company.navboxes, ["安納布爾納互動"]);
    assert.deepEqual(get("companies", "annapurna-interactive", "navboxes"), [
        "安納布爾納互動",
    ]);
});

test("terms without navboxes retain the same optional interface", () => {
    assert.equal(get("platform", "PS5", "navboxes"), undefined);
    assert.equal(get("unknown", "PS5"), undefined);
    assert.equal(get("company", "Unknown studio"), undefined);
});

test("empty values do not match terms with an optional page", () => {
    assert.equal(get("year", ""), undefined);
    assert.equal(get("platform", ""), undefined);
});
