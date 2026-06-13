/* eslint-disable */

/**
 * Injects text templates for direct source-module tests.
 */

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseJsonc } from "../../../scripts/jsonc.mjs";

const path = resolve("src/wikitext/wikitext.jsonc");
const source = await readFile(path, "utf8");
const wikitext = parseJsonc(source);
const terminologyNames = ["companies", "genres", "platforms", "years"];
const terminology = Object.fromEntries(
    await Promise.all(
        terminologyNames.map(async (name) => [
            name,
            JSON.parse(
                await readFile(
                    resolve(`src/terminologies/${name}.json`),
                    "utf8",
                ),
            ),
        ]),
    ),
);

globalThis.__CREATE_VG_STUB_FIELD_DATA__ = {
    ...terminology,
    wikitext,
};
