/* eslint-disable */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { minify } from "terser";

const dataPaths = {
  genres: "data/genres.json",
  years: "data/years.json",
};
const sourcePath = "index.js";
const dataPlaceholder = "__CREATE_VG_STUB_FIELD_DATA__";

await mkdir("dist", { recursive: true });

const source = await readFile(sourcePath, "utf8");
const fieldReferenceData = await readFieldReferenceData();
const builtSource = source.replace(
  dataPlaceholder,
  JSON.stringify(fieldReferenceData),
);
const { code } = await minify(builtSource, {
  compress: {
    passes: 2,
  },
  format: {
    comments: false,
  },
  mangle: true,
});

if (code == null) {
  throw new Error("Terser did not return minified code.");
}

await writeFile("dist/create_vg_stub.js", builtSource);
await writeFile("dist/create_vg_stub.min.js", code);

/**
 * Reads reference data that should be bundled into the gadget output.
 *
 * @returns {Promise<object>} Field reference data grouped by field name.
 */
async function readFieldReferenceData() {
  const entries = await Promise.all(
    Object.entries(dataPaths).map(readFieldReferenceEntry),
  );

  return Object.fromEntries(entries);
}

/**
 * Reads one reference data file.
 *
 * @param {Array<string>} entry - Data name and file path.
 * @returns {Promise<Array<object>>} Data name paired with parsed JSON.
 */
async function readFieldReferenceEntry(entry) {
  const [name, path] = entry;
  const data = await readFile(path, "utf8");

  return [name, JSON.parse(data)];
}
