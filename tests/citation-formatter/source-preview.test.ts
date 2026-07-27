/** Tests semantic source-preview segmentation. */

import assert from "node:assert/strict";
import test from "node:test";

import { buildSourcePreview } from "citation-formatter/ui/source-preview.ts";

test("segments parameter names and alias comments", () => {
    const source =
        "{{Cite web | title = Example<!-- # Alias --> | " +
        "url = https://example.test}}";
    const parts = buildSourcePreview(source);

    assert.equal(parts.map((part) => part.text).join(""), source);
    assert.deepEqual(
        parts
            .filter((part) => part.kind === "parameter")
            .map((part) => part.text),
        ["title", "url"],
    );
    assert.deepEqual(
        parts.filter((part) => part.kind === "alias").map((part) => part.text),
        ["<!-- # Alias -->"],
    );
});

test("keeps nested template parameters inside a citation value", () => {
    const parts = buildSourcePreview(
        "{{Cite web | title = {{lang|ja|記事}} | date = 2025}}",
    );

    assert.deepEqual(
        parts
            .filter((part) => part.kind === "parameter")
            .map((part) => part.text),
        ["title", "date"],
    );
});
