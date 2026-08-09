import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const browserSource = await readFile(
    new URL("../../src/citation-formatter/browser.ts", import.meta.url),
    "utf8",
);
const editorSource = await readFile(
    new URL("../../src/citation-formatter/ui/editor.ts", import.meta.url),
    "utf8",
);

test("browser startup is restricted to the wikitext content model", () => {
    assert.match(browserSource, /isWikitextPage\(\)/u);
    assert.match(
        browserSource,
        /mw\.config\.get\("wgPageContentModel"\) === "wikitext"/u,
    );
    const startupGuard = new RegExp(
        "function mountWhenMediaWikiIsReady\\(\\): void \\{\\s*" +
            "if \\(!isWikitextPage\\(\\)\\)",
        "su",
    );
    assert.match(browserSource, startupGuard);
    assert.match(
        editorSource,
        /mw\.config\.get\("wgPageContentModel"\) !== "wikitext"/u,
    );
});
