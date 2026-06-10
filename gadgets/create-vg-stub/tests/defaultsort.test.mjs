/**
 * Tests DEFAULTSORT generation and normalization.
 */

import assert from "node:assert/strict";
import test from "node:test";

import {
    buildDefaultSortKey,
    buildDefaultSortText,
} from "../src/fragments/defaultsort.js";

test("buildDefaultSortText uses an explicit sort key", () => {
    assert.equal(
        buildDefaultSortText({
            english: "example game",
            sortKey: "Custom Key",
            title: "Example",
        }),
        "{{DEFAULTSORT:Custom Key}}",
    );
});

test("buildDefaultSortKey prefers Latin original names", () => {
    assert.equal(
        buildDefaultSortKey({
            english: "example game",
            original: "sample title",
            title: "Example",
        }),
        "Sample Title",
    );
});

test("buildDefaultSortKey skips non-Latin original names", () => {
    assert.equal(
        buildDefaultSortKey({
            english: "example game",
            original: "サンプル",
            title: "Example",
        }),
        "Example Game",
    );
});

test("buildDefaultSortKey falls back to article title", () => {
    assert.equal(
        buildDefaultSortKey({
            title: "example game",
        }),
        "Example Game",
    );
});

test("buildDefaultSortKey normalizes Unicode compatibility characters", () => {
    assert.equal(
        buildDefaultSortKey({
            title: "Ｆｏｏ Ｂａｒ",
        }),
        "Foo Bar",
    );
});

test("buildDefaultSortKey normalizes easy punctuation cases", () => {
    assert.equal(
        buildDefaultSortKey({
            title: "foo & bar: baz × qux",
        }),
        "Foo And Bar Baz X Qux",
    );
});

test("buildDefaultSortKey normalizes dashes and numeric separators", () => {
    assert.equal(
        buildDefaultSortKey({
            title: "foo—bar 1,234.567",
        }),
        "Foo-Bar 1234567",
    );
});

test("buildDefaultSortKey normalizes O apostrophe names", () => {
    assert.equal(
        buildDefaultSortKey({
            title: "O'Neill",
        }),
        "Oneill",
    );
});

test("buildDefaultSortKey ignores three dots", () => {
    assert.equal(
        buildDefaultSortKey({
            title: "foo... bar",
        }),
        "Foo Bar",
    );
});
