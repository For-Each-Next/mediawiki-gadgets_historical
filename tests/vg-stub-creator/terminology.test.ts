/**
 * Tests the universal terminology contract.
 */

import assert from "node:assert/strict";
import test from "node:test";

import { get } from "vg-stub-creator/config/terminologies/index.ts";

function testCompanyNavboxProjections(): void {
    const company = get("company", "Annapurna Interactive");

    assert.equal(company.label, "安纳布尔纳互动");
    assert.deepEqual(company.categories, ["安納布爾納互動遊戲"]);
    assert.deepEqual(company.navboxes, ["安納布爾納互動"]);
    const companyNavboxes = get(
        "companies",
        "annapurna-interactive",
        "navboxes",
    );
    assert.deepEqual(companyNavboxes, ["安納布爾納互動"]);
}
test("company terms expose navbox projections", testCompanyNavboxProjections);

function testMissingTerminologyValues(): void {
    const platformNavboxes = get("platform", "PS5", "navboxes");
    assert.equal(platformNavboxes, undefined);
    const unknownType = get("unknown", "PS5");
    assert.equal(unknownType, undefined);
    const unknownCompany = get("company", "Unknown studio");
    assert.equal(unknownCompany, undefined);
}
test(
    "terms without navboxes retain the same optional interface",
    testMissingTerminologyValues,
);

function testXboxSeriesPlatformAlias(): void {
    const alias = "Xbox Series X and Series S";
    const platform = get("platform", alias);

    assert.equal(platform.label, "Xbox Series X/S");
    assert.equal(platform.page, "Xbox Series X/S");
    assert.deepEqual(platform.categories, ["Xbox Series X/S游戏"]);
    assert.equal(get("platform", alias, "link"), "[[Xbox Series X/S]]");
}
test(
    "Xbox Series X and Series S resolves to the canonical platform",
    testXboxSeriesPlatformAlias,
);

function testEmptyTerminologyValues(): void {
    const emptyYear = get("year", "");
    assert.equal(emptyYear, undefined);
    const emptyPlatform = get("platform", "");
    assert.equal(emptyPlatform, undefined);
}
test(
    "empty values do not match terms with an optional page",
    testEmptyTerminologyValues,
);
