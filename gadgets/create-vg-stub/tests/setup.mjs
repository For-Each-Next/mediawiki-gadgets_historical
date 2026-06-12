/* eslint-disable */

/**
 * Injects text templates for direct source-module tests.
 */

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseJsonc } from "../../../scripts/jsonc.mjs";

const path = resolve("src/config/wikitext.jsonc");
const source = await readFile(path, "utf8");
const wikitext = parseJsonc(source);

globalThis.__CREATE_VG_STUB_FIELD_DATA__ = { wikitext };
