/** Tests build-time minification of Vue HTML templates. */
/* eslint-disable max-len */

import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { build } from "esbuild";
import {
    createHtmlTemplateMinifier,
    minifyHtmlTemplate,
} from "../../scripts/minify-html-templates.ts";
import { SOURCE_MANAGER_TEMPLATE } from "citation-formatter/ui/source-manager-template.ts";

const templateModulePath = fileURLToPath(
    new URL(
        "../../src/citation-formatter/ui/source-manager-template.ts",
        import.meta.url,
    ),
);

test("discovers HTML template modules without gadget configuration", async () => {
    const result = await build({
        bundle: true,
        entryPoints: [templateModulePath],
        format: "esm",
        plugins: [createHtmlTemplateMinifier()],
        write: false,
    });
    const output = result.outputFiles[0].text;

    assert.match(
        output,
        /SOURCE_MANAGER_TEMPLATE = `<cdx-dialog v-model:open="open"/u,
    );
    assert.doesNotMatch(output, /<cdx-dialog\\n/u);
});

test("removes structural whitespace from Vue HTML templates", async () => {
    const minified = await minifyHtmlTemplate(SOURCE_MANAGER_TEMPLATE);

    assert.ok(minified.length < SOURCE_MANAGER_TEMPLATE.length * 0.7);
    assert.doesNotMatch(minified, />\s+</u);
    assert.doesNotMatch(minified, /(?:class|v-if|v-else-if|@click)="\s*\n/u);
    assert.match(
        minified,
        /@click="revertAppliedAnalysisFinding\(applied\.changeId\)"/u,
    );
    assert.match(minified, /<cdx-icon :icon="editSourceIcon"\/>/u);
});

test("preserves significant Vue template content", async () => {
    const minified = await minifyHtmlTemplate(SOURCE_MANAGER_TEMPLATE);

    assert.match(minified, /\{\{ msg\( 'analysis\.revert' \) \}\}/u);
    assert.match(minified, /'<!-- # '/u);
    assert.match(minified, /' -->'/u);
    assert.match(minified, /\{\{ occurrence\.template \}\} ·/u);
});
