/**
 * Tests generated gadget output formatting.
 */

/* eslint-disable */

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { minifiedOutput } from "../../../build.config.js";

test("minified output is wrapped in MediaWiki nowiki comments", async () => {
  const source = await readFile("dist/create_vg_stub.min.js", "utf8");

  assert.equal(source.startsWith(`${minifiedOutput.prefix}\n`), true);
  assert.equal(source.endsWith(`\n${minifiedOutput.suffix}\n`), true);
});

test("userscript output includes Tampermonkey metadata and bundled code", async () => {
  const [source, bundle] = await Promise.all([
    readFile("dist/create_vg_stub.user.js", "utf8"),
    readFile("dist/create_vg_stub.js", "utf8"),
  ]);

  assert.equal(source.startsWith("// ==UserScript==\n"), true);
  assert.match(source, /^\/\/ @name {9}create-vg-stub$/mu);
  assert.match(source, /^\/\/ @version {6}0\.1\.0$/mu);
  assert.match(source, /^\/\/ @match {8}https:\/\/zh\.wikipedia\.org\/\*$/mu);
  assert.match(source, /^\/\/ @run-at {7}document-idle$/mu);
  assert.match(source, /^\/\/ @sandbox {6}raw$/mu);
  assert.match(source, /^\/\/ @grant {8}none$/mu);
  assert.match(
    source,
    /\n\/\/ ==\/UserScript==\n\n\(\(\) => \{\n {2}function start\(\)/u,
  );
  assert.match(source, /typeof window\.mw\?\.loader\?\.using !== "function"/u);
  assert.match(source, /const mw = window\.mw;/u);
  assert.match(source, /\nvar createVgStub =/u);
  assert.equal(source.includes(`\n${bundle.trimEnd()}\n`), true);
});
