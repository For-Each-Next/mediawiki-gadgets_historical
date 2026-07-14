import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const minifiedOutputPath =
    "../../dist/vg-page-assessor/vg_page_assessor.min.js";
const userscriptOutputPath =
    "../../dist/vg-page-assessor/vg_page_assessor.user.js";

test("minified output compacts injected CSS and HTML", async () => {
    const output = await readFile(minifiedOutputPath, "utf8");

    assert.match(output, /\.avgp-dialog\{background:/u);
    assert.doesNotMatch(output, />\\n\s*/u);
    assert.doesNotMatch(output, /\\n\s*</u);
    assert.doesNotMatch(output, /\.avgp-dialog \{\\n/u);
});

test("userscript output keeps injected CSS readable", async () => {
    const output = await readFile(userscriptOutputPath, "utf8");

    assert.match(output, /\.avgp-dialog \{\\n/u);
});
