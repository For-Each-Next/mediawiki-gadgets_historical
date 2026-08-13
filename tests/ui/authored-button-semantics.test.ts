/** Verifies authored Codex button syntax before Vue renders it. */

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

// noinspection ES6PreferShortImport -- Node ESM requires index.ts.
import { discoverGadgetPackages } from "../../scripts/workspace/index.ts";
import { collectDialogFiles } from "./support/discovery.ts";

test("authored Codex buttons use explicit safe syntax", async () => {
    const root = new URL("../../", import.meta.url).pathname;
    const gadgets = await discoverGadgetPackages(root);
    for (const file of await collectDialogFiles(gadgets)) {
        const source = await readFile(file, "utf8");
        for (const match of source.matchAll(/<cdx-button(?!-)\b[^>]*>/gsu)) {
            const button = match[0];
            assert.match(button, /\stype=(?:"button"|"submit")/u, file);
            assert.doesNotMatch(button, /\saction="neutral"/u, file);
            assert.doesNotMatch(button, /\sweight="normal"/u, file);
        }
    }
});
