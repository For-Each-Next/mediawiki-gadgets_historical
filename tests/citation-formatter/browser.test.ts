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
const mainSource = await readFile(
    new URL("../../src/citation-formatter/main.ts", import.meta.url),
    "utf8",
);

test("browser startup is restricted to the wikitext content model", () => {
    assert.match(mainSource, /isWikitextPage\(\)/u);
    assert.match(
        mainSource,
        /mw\.config\.get\("wgPageContentModel"\) === "wikitext"/u,
    );
    const startupGuard = new RegExp(
        "function mountWhenMediaWikiIsReady\\([^)]*\\): void \\{\\s*" +
            "if \\(!isWikitextPage\\(\\)\\)",
        "su",
    );
    assert.match(mainSource, startupGuard);
    assert.match(
        browserSource,
        /import \{ start \} from "#gadget\/main\.ts"/u,
    );
    assert.match(
        editorSource,
        /mw\.config\.get\("wgPageContentModel"\) !== "wikitext"/u,
    );
});

test("the formatter portlet link uses a distinct article icon", () => {
    assert.match(editorSource, /const LINK_ICON = "article"/u);
    assert.match(editorSource, /icon: LINK_ICON/u);
});
