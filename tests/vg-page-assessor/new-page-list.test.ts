/**
 * Characterizes pure new-page-list parsing and insertion.
 */

import assert from "node:assert/strict";
import test from "node:test";

import {
    getTitlesForDate,
    prepareNewPageListRegistration,
} from "vg-page-assessor/domain/new-page-list.ts";

const LIST_TEXT = [
    "Intro",
    "",
    "== 2026年 ==",
    "* 7月29日 - {{vgc|Later}}、{{vgc|Earlier}}",
    "*:模板：{{vgc|Template:Old}}",
    "* 7月28日 - {{vgc|Yesterday}}",
    "",
    "== 2025年 ==",
    "* 12月31日 - {{vgc|Old}}",
    "",
].join("\n");

test("finds main and subgroup titles for a UTC date", () => {
    const titles = getTitlesForDate(
        LIST_TEXT,
        new Date("2026-07-29T23:59:59Z"),
    );

    assert.deepEqual(titles, ["Later", "Earlier", "Template:Old"]);
});

test("inserts an article by known creation time", () => {
    const creationTimes = new Map([
        ["Earlier", new Date("2026-07-29T01:00:00Z")],
        ["New", new Date("2026-07-29T02:00:00Z")],
        ["Later", new Date("2026-07-29T03:00:00Z")],
    ]);
    const result = prepareNewPageListRegistration({
        creationDate: new Date("2026-07-29T02:00:00Z"),
        creationTimes,
        namespaceNumber: 0,
        text: LIST_TEXT,
        title: "New",
    });

    assert.equal(result.changed, true);
    assert.equal(result.eligible, true);
    assert.ok(
        result.proposedText.includes(
            "* 7月29日 - " + "{{vgc|Earlier}}、{{vgc|New}}、{{vgc|Later}}",
        ),
    );
});

test("inserts templates into the existing template subgroup", () => {
    const result = prepareNewPageListRegistration({
        creationDate: new Date("2026-07-29T12:00:00Z"),
        namespaceNumber: 10,
        text: LIST_TEXT,
        title: "Template:New",
    });

    assert.match(
        result.proposedText,
        /^\*:模板：\{\{vgc\|Template:Old\}\}、\{\{vgc\|Template:New\}\}$/mu,
    );
});

test("preserves an existing registration and rejects expired dates", () => {
    const existing = prepareNewPageListRegistration({
        creationDate: new Date("2026-07-29T12:00:00Z"),
        namespaceNumber: 0,
        text: LIST_TEXT,
        title: "Earlier",
    });
    const expired = prepareNewPageListRegistration({
        creationDate: new Date("2025-01-01T12:00:00Z"),
        namespaceNumber: 0,
        text: LIST_TEXT,
        title: "Too old",
    });

    assert.equal(existing.alreadyRegistered, true);
    assert.equal(existing.changed, false);
    assert.equal(existing.existing?.listedTitle, "Earlier");
    assert.equal(expired.eligible, false);
    assert.equal(expired.changed, false);
    assert.equal(expired.proposedText, LIST_TEXT);
});
