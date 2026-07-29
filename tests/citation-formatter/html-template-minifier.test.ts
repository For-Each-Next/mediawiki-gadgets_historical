/** Tests build-time minification of Vue HTML templates. */
/* eslint-disable max-len */

import assert from "node:assert/strict";
import test from "node:test";

import { minifyHtmlTemplate } from "../../scripts/minify-html-templates.ts";

import { SOURCE_MANAGER_TEMPLATE_FIXTURE as SOURCE_MANAGER_TEMPLATE } from "./dialog-fixtures.ts";

test("removes structural whitespace from Vue HTML templates", async () => {
    const minified = await minifyHtmlTemplate(SOURCE_MANAGER_TEMPLATE);

    assert.ok(minified.length < SOURCE_MANAGER_TEMPLATE.length * 0.7);
    assert.doesNotMatch(minified, />\s+</u);
    assert.doesNotMatch(minified, /(?:class|v-if|v-else-if|@click)="\s*\n/u);
    assert.match(
        minified,
        /@click="revertAppliedAnalysisFinding\(applied\.changeId,?\)"/u,
    );
    assert.match(minified, /<cdx-icon :icon="editSourceIcon"\/>/u);
});

test("preserves significant Vue template content", async () => {
    const minified = await minifyHtmlTemplate(SOURCE_MANAGER_TEMPLATE);

    assert.match(
        minified,
        /\{\{\s*msg\(\s*["']analysis\.revert["']\s*\)\s*\}\}/u,
    );
    assert.match(minified, /'<!-- # '/u);
    assert.match(minified, /' -->'/u);
    assert.match(minified, /\{\{ occurrence\.template \}\} ·/u);
});
