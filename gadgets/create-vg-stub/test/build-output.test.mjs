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
