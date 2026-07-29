/**
 * Tests readable JavaScript formatting for generated artifacts.
 */

import assert from "node:assert/strict";
import { runInNewContext } from "node:vm";
import test from "node:test";
import { parseForESLint } from "@typescript-eslint/parser";
import {
    escapeOrdinaryTemplateLineBreaks,
    formatReadableJavaScript,
    stripJavaScriptComments,
} from "../../scripts/gadget-build/readable-javascript.ts";

test("escapes ordinary template lines without changing their values", () => {
    const source = [
        'const value = "middle\\ncontinuation";',
        "globalThis.fixtureResult = `first",
        "${value}",
        "last`;",
    ].join("\n");
    const escaped = escapeOrdinaryTemplateLineBreaks(source);

    assert.ok(escaped.includes("`first\\n${value}\\nlast`"));
    assert.equal(
        evaluateFixtureResult(escaped),
        evaluateFixtureResult(source),
    );
});

test("preserves tagged template raw text", () => {
    const source = [
        "function capture(strings) {",
        "    globalThis.fixtureResult = strings.raw[0];",
        "}",
        "capture`first",
        "last`;",
    ].join("\n");

    assert.equal(escapeOrdinaryTemplateLineBreaks(source), source);
});

test("preserves ordinary template line continuations", () => {
    const source = ["globalThis.fixtureResult = `first\\", "second`;"].join(
        "\n",
    );
    const escaped = escapeOrdinaryTemplateLineBreaks(source);

    assert.equal(
        evaluateFixtureResult(escaped),
        evaluateFixtureResult(source),
    );
});

test("uses repository indentation for readable JavaScript", async () => {
    const source = [
        "function wrap(value) {",
        "return `<div>",
        "${value}",
        "</div>`;",
        "}",
    ].join("\n");
    const formatted = await formatReadableJavaScript(source);

    assert.equal(
        formatted,
        [
            "function wrap(value) {",
            "    return `<div>\\n${value}\\n</div>`;",
            "}",
            "",
        ].join("\n"),
    );
});

test("strips code comments without changing executable values", () => {
    const source = [
        "// leading comment",
        'const url = "https://example.test/a";',
        'const marker = "/* runtime text */";',
        "const pattern = /https?:\\/\\/example\\.test/u;",
        "const value = 1 /* block comment */ + 2;",
        "globalThis.fixtureResult = JSON.stringify({",
        "    flags: pattern.flags,",
        "    marker,",
        "    pattern: pattern.source,",
        "    url,",
        "    value,",
        "});",
    ].join("\n");
    const stripped = stripJavaScriptComments(source);

    assertNoCodeComments(stripped);
    assert.deepEqual(
        evaluateFixtureResult(stripped),
        evaluateFixtureResult(source),
    );
});

test("retains semantic line breaks from removed comments", () => {
    const source = [
        "globalThis.fixtureResult = (function readValue() {",
        "    return /* comment",
        "    continuation */",
        "    1;",
        "})();",
    ].join("\n");
    const stripped = stripJavaScriptComments(source);

    assertNoCodeComments(stripped);
    assert.equal(
        evaluateFixtureResult(stripped),
        evaluateFixtureResult(source),
    );
});

/** Evaluates one fixture and returns its observable string result. */
function evaluateFixtureResult(source: string): unknown {
    const context: Record<string, unknown> = {};
    runInNewContext(source, context);
    return context.fixtureResult;
}

/** Distinguishes parsed comments from comment-like strings. */
function assertNoCodeComments(source: string): void {
    const { ast } = parseForESLint(source, {
        comment: true,
        ecmaVersion: "latest",
        range: true,
        sourceType: "script",
    });
    assert.deepEqual(ast.comments, []);
}
