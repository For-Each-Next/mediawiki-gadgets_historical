/**
 * Tests the universal terminology contract.
 */

import assert from "node:assert/strict";
import test from "node:test";

import { get } from "vg-stub-creator/config/terminologies/index.ts";

const testCallbackB = () => {
    const company = get("company", "Annapurna Interactive");

    assert.equal(company.label, "安纳布尔纳互动");
    assert.deepEqual(company.categories, ["安納布爾納互動遊戲"]);
    assert.deepEqual(company.navboxes, ["安納布爾納互動"]);
    const configValueE = get("companies", "annapurna-interactive", "navboxes");
    assert.deepEqual(configValueE, ["安納布爾納互動"]);
};
test("company terms expose navbox projections", testCallbackB);

const testCallbackA = () => {
    const configValueD = get("platform", "PS5", "navboxes");
    assert.equal(configValueD, undefined);
    const configValueC = get("unknown", "PS5");
    assert.equal(configValueC, undefined);
    const configValueB = get("company", "Unknown studio");
    assert.equal(configValueB, undefined);
};
test(
    "terms without navboxes retain the same optional interface",
    testCallbackA,
);

const testCallback = () => {
    const configValueA = get("year", "");
    assert.equal(configValueA, undefined);
    const configValue = get("platform", "");
    assert.equal(configValue, undefined);
};
test("empty values do not match terms with an optional page", testCallback);
