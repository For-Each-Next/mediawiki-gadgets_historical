/**
 * Tests VG Page Assessor locale catalogs and project-option labels.
 */

import assert from "node:assert/strict";
import test from "node:test";

import * as i18n from "@mediawiki-gadgets/shared/i18n";
import {
    english,
    simplifiedChinese,
    traditionalChinese,
} from "vg-page-assessor/i18n/index.ts";

const catalogs = {
    "en": english,
    "zh-Hans": simplifiedChinese,
    "zh-Hant": traditionalChinese,
};

test("keeps translated catalogs aligned with English", () => {
    const messageIds = Object.keys(english).toSorted();

    assert.deepEqual(Object.keys(simplifiedChinese).toSorted(), messageIds);
    assert.deepEqual(Object.keys(traditionalChinese).toSorted(), messageIds);
});

test("localizes configured project and task-force labels", () => {
    const simplified = i18n.createTranslator(catalogs, "zh-CN");
    const traditional = i18n.createTranslator(catalogs, "zh-TW");

    assert.equal(simplified.text("taskForce.minecraft"), "我的世界");
    assert.equal(simplified.text("project.fictionalCharacters"), "虚构角色");
    assert.equal(traditional.text("taskForce.pokemon"), "寶可夢");
    assert.equal(traditional.text("project.biography"), "傳記");
});

test("localizes assessment codes without changing stored values", () => {
    const simplified = i18n.createTranslator(catalogs, "zh-CN");
    const traditional = i18n.createTranslator(catalogs, "zh-TW");

    assert.equal(simplified.text("assessmentClass.unassessed"), "未评");
    assert.equal(simplified.text("assessmentClass.b"), "乙");
    assert.equal(simplified.text("assessmentClass.bl"), "乙表");
    assert.equal(simplified.text("assessmentImportance.top"), "极高");
    assert.equal(traditional.text("assessmentClass.unassessed"), "未評");
    assert.equal(traditional.text("assessmentImportance.top"), "極高");
});

test("names the new-page workflow as registration", () => {
    const simplified = i18n.createTranslator(catalogs, "zh-CN");
    const traditional = i18n.createTranslator(catalogs, "zh-TW");

    assert.equal(simplified.text("dialog.newPageList"), "新条目登记");
    assert.equal(traditional.text("dialog.newPageList"), "新條目登記");
});

test("describes an expired registration with its full creation date", () => {
    const simplified = i18n.createTranslator(catalogs, "zh-CN");

    assert.equal(
        simplified.text("registration.ineligible", {
            date: "2026年4月7日",
        }),
        "创建于2026年4月7日，已过登记期",
    );
});
