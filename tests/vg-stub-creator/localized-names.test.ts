/**
 * Tests localized-name form behavior.
 */

import assert from "node:assert/strict";
import test from "node:test";

import {
    applyLocalizedNameAsPageTitle,
    normalizeReceivedFormValues,
} from "#stub/form/helpers.ts";

test("restored forms always show a blank Chinese-name row", () => {
    const form = normalizeReceivedFormValues({ localizedNames: [] });

    assert.equal(form.localizedNames.length, 1);
    assert.equal(form.localizedNames[0].name, "");
});

test("a Chinese name can fill the page-title field", () => {
    const form = {
        localizedNames: [{ name: " 游戏名称 " }],
        pageName: "Old title",
    };

    assert.equal(
        applyLocalizedNameAsPageTitle(form, "localizedNames", 0),
        true,
    );
    assert.equal(form.pageName, "游戏名称");
});
