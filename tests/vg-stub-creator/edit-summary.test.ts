/**
 * Tests generated edit summary formatting.
 */

import assert from "node:assert/strict";
import test from "node:test";

import {
    EDIT_SUMMARY_SUFFIX,
    addEditSummarySuffix,
    buildEditSummary,
} from "../../src/vg-stub-creator/editing/summary.ts";

test("buildEditSummary prefers Wikidata title metadata", () => {
    assert.equal(
        buildEditSummary({
            displayName: "サンプル",
            enwikiTitle: "Example Game",
            proseSinographs: 59,
            wikidataId: "Q123",
            year: "2026",
        }),
        `create 2026 video game «サンプル», with 59 equivalent sinographs; also see "[[:w:en:Example Game]]" and "[[:d:Q123]]" ${EDIT_SUMMARY_SUFFIX}`,
    );
});

test("buildEditSummary falls back to enwiki title metadata", () => {
    assert.equal(
        buildEditSummary({
            displayName: "サンプル",
            enwikiTitle: "Example Game",
            proseSinographs: 59,
            wikidataId: "",
            year: "2026",
        }),
        `create 2026 video game «サンプル», with 59 equivalent sinographs; also see "[[:w:en:Example Game]]" ${EDIT_SUMMARY_SUFFIX}`,
    );
});

test("buildEditSummary renders plain title without enwiki metadata", () => {
    assert.equal(
        buildEditSummary({
            displayName: "サンプル",
            enwikiTitle: "",
            proseSinographs: 59,
            wikidataId: "",
            year: "2026",
        }),
        `create 2026 video game «サンプル», with 59 equivalent sinographs ${EDIT_SUMMARY_SUFFIX}`,
    );
});

test("buildEditSummary omits unavailable metadata", () => {
    assert.equal(
        buildEditSummary({
            displayName: "",
            enwikiTitle: "",
            proseSinographs: 0,
            wikidataId: "",
            year: "",
        }),
        EDIT_SUMMARY_SUFFIX,
    );
});

test("addEditSummarySuffix adds the linked gadget marker", () => {
    assert.equal(
        addEditSummarySuffix("create redirect"),
        `create redirect ${EDIT_SUMMARY_SUFFIX}`,
    );
});
