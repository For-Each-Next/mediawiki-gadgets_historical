/**
 * Tests form draft and history persistence.
 */

import assert from "node:assert/strict";
import test, { afterEach, beforeEach } from "node:test";

import {
    readFormDraftEntry,
    readFormHistory,
    readFormDraftForPage,
    saveFormHistory,
    saveFormDraft,
} from "../../src/vg-stub-creator/src/interface/history.js";

const originalLocalStorage = globalThis.localStorage;

beforeEach(() => {
    const entries = new Map();

    globalThis.localStorage = {
        getItem(key) {
            return entries.has(key) ? entries.get(key) : null;
        },
        removeItem(key) {
            entries.delete(key);
        },
        setItem(key, value) {
            entries.set(key, String(value));
        },
    };
});

afterEach(() => {
    globalThis.localStorage = originalLocalStorage;
});

test("readFormDraftForPage returns a draft for the same page", () => {
    const form = {
        name: "Example",
        year: "2026",
    };

    saveFormDraft(form, "Example");

    assert.deepEqual(readFormDraftForPage("Example"), form);
});

test("readFormDraftForPage ignores a draft from another page", () => {
    saveFormDraft(
        {
            name: "Original page",
            year: "2026",
        },
        "Actual page",
    );

    assert.equal(readFormDraftForPage("Different page"), undefined);
});

test("readFormDraftEntry stores temporary display data in metadata", () => {
    saveFormDraft(
        {
            name: "Form title",
            year: "2026",
        },
        "Actual page",
    );

    const entry = readFormDraftEntry();

    assert.equal(entry.id, 0);
    assert.equal(entry.metadata.temporary, true);
    assert.equal(entry.metadata.page, "Actual page");
    assert.equal(entry.data.input.name, "Form title");
    assert.equal(Object.hasOwn(entry, "temporary"), false);
    assert.equal(Object.hasOwn(entry, "page"), false);
    assert.equal(Object.hasOwn(entry, "temporaryHint"), false);
});

test("saveFormHistory stores input and minimal source-keyed patches", () => {
    saveFormHistory(
        {
            categoryRows: [
                {
                    category: "Patched games",
                    originalCategory: "Generated games",
                    source: "company †",
                    status: "OK",
                    stubTag: "vg-stub",
                    stubTagEnabled: false,
                    originalStubTagEnabled: true,
                },
                {
                    category: "Studio Aurum游戏",
                    company: "Studio Aurum",
                    enabled: false,
                    originalCategory: "Studio Aurum游戏",
                    source: "suggested",
                    stubTagEnabled: false,
                    originalStubTagEnabled: false,
                },
                {
                    category: "Example Studio游戏",
                    company: "Example Studio",
                    originalCategory: "Example Studio游戏",
                    source: "suggested",
                    stubTagEnabled: false,
                    originalStubTagEnabled: false,
                },
            ],
            citationRows: [
                {
                    generatedParams: [
                        {
                            name: "title",
                            value: "Generated title",
                        },
                        {
                            name: "url",
                            value: "https://example.test/source",
                        },
                        {
                            name: "language",
                            value: "en",
                        },
                        {
                            name: "website",
                            value: "Generated site",
                        },
                    ],
                    index: 1,
                    modified: true,
                    params: [
                        {
                            name: "title",
                            value: "Generated title",
                        },
                        {
                            name: "url",
                            value: "https://example.test/source",
                        },
                        {
                            name: "language",
                            value: "zh-Hans",
                        },
                    ],
                    sourceUrl: "https://example.test/source",
                    template: "cite web",
                },
            ],
            developers: "Example Studio",
            developersSourceUrl: "https://example.test/source",
            localizedNames: [
                {
                    hans: true,
                    name: "示例游戏",
                    official: true,
                    sourceUrl: "https://example.test/name",
                },
            ],
            name: "Example",
            year: "2026",
            yearSourceUrl: "https://example.test/year",
        },
        "Example",
        {
            "https://example.test/source":
                "{{cite web|title=Generated title}}",
        },
    );

    const [entry] = readFormHistory();

    assert.equal(Object.hasOwn(entry, "form"), false);
    assert.equal(Object.hasOwn(entry, "citations"), false);
    assert.equal(Object.hasOwn(entry, "page"), false);
    assert.equal(Object.hasOwn(entry, "savedAt"), false);
    assert.equal(Number.isInteger(entry.id), true);
    assert.notEqual(entry.id, 0);
    assert.equal(entry.metadata.page, "Example");
    assert.equal(typeof entry.metadata.savedAt, "string");
    assert.equal(entry.data.version, 1);
    assert.equal(Object.hasOwn(entry.data, "autogenerated"), false);
    assert.equal(entry.data.input.developers, "Example Studio");
    assert.equal(
        entry.data.input.developersSourceUrl,
        "https://example.test/source",
    );
    assert.equal(entry.data.input.yearSourceUrl, "https://example.test/year");
    assert.equal(Object.hasOwn(entry.data.input, "categoryRows"), false);
    assert.equal(Object.hasOwn(entry.data.input, "citationRows"), false);
    assert.equal(
        entry.data.input.localizedNames[0].sourceUrl,
        "https://example.test/name",
    );
    assert.deepEqual(entry.data.patches.categories[0], {
        category: "Patched games",
        source: {
            category: "Generated games",
        },
        stubTagEnabled: false,
    });
    assert.deepEqual(entry.data.patches.categories[1], {
        enabled: false,
        source: {
            company: "Studio Aurum",
        },
    });
    assert.equal(
        entry.data.patches.citations[0].sourceUrl,
        "https://example.test/source",
    );
    assert.deepEqual(entry.data.patches.citations[0].params, [
        {
            name: "language",
            value: "zh-Hans",
        },
        {
            name: "website",
            value: null,
        },
    ]);
});
