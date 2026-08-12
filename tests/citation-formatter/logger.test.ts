/** Composition checks for Citation Formatter observability. */

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const browserSource = await readFile(
    new URL("../../src/citation-formatter/browser.ts", import.meta.url),
    "utf8",
);
const mainSource = await readFile(
    new URL("../../src/citation-formatter/main.ts", import.meta.url),
    "utf8",
);

test("composes the shared logger in the Citation Formatter root", () => {
    assert.match(mainSource, /createLogger\("citation-formatter"\)/u);
    assert.match(mainSource, /logger\.child\("ui\.source-manager"\)/u);
    assert.match(mainSource, /logger\.child\("ui\.editor"\)/u);
    assert.match(mainSource, /createActionNotifier\("citation-formatter"\)/u);
    assert.match(mainSource, /key: "startup-failed"/u);
});

test("keeps browser startup delegated to the composition root", () => {
    assert.equal(
        browserSource.trim(),
        [
            "/**",
            " * Browser entry point for the MediaWiki gadget bundle.",
            " */",
            "",
            'import { start } from "#gadget/main.ts";',
            "",
            "start();",
        ].join("\n"),
    );
});
