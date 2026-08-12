/** Locks the intentionally small shared package API. */

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const packagePath = new URL(
    "../../../src/shared/package.json",
    import.meta.url,
);

test("publishes only focused capability entry points", async () => {
    const contents = await readFile(packagePath, "utf8");
    const manifest = JSON.parse(contents) as {
        exports?: Readonly<Record<string, string>>;
    };

    assert.deepEqual(manifest.exports, {
        "./citoid": "./citoid/index.ts",
        "./edit-box": "./edit-box/index.ts",
        "./i18n": "./i18n/index.ts",
        "./logging": "./logging/index.ts",
        "./mediawiki/notifications": "./mediawiki/notifications/index.ts",
        "./short-footnotes": "./short-footnotes/index.ts",
        "./wiki-titles": "./wiki-titles/index.ts",
        "./wikitext": "./wikitext/index.ts",
    });
});
