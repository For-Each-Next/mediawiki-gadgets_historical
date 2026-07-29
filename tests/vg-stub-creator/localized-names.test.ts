/**
 * Tests localized-name form behavior.
 */

import assert from "node:assert/strict";
import test from "node:test";

import {
    applyLocalizedNameAsPageTitle,
    normalizeReceivedFormValues,
} from "vg-stub-creator/ui/form/form-model.ts";

const testCallbackA = () => {
    const form = normalizeReceivedFormValues({ localizedNames: [] });

    assert.equal(form.localizedNames.length, 1);
    assert.equal(form.localizedNames[0].name, "");
};
test("restored forms always show a blank Chinese-name row", testCallbackA);

const testCallback = () => {
    const form = {
        localizedNames: [{ name: " 游戏名称 " }],
        pageName: "Old title",
    };

    const applyLocalizedNameAsPageTitleA = applyLocalizedNameAsPageTitle(
        form,
        "localizedNames",
        0,
    );
    assert.equal(applyLocalizedNameAsPageTitleA, true);
    assert.equal(form.pageName, "游戏名称");
};
test("a Chinese name can fill the page-title field", testCallback);
