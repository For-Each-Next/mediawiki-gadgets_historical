/* eslint-disable */

import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { basename, extname } from "node:path";
import { minify } from "terser";

const dataPath = "src/data";
const sourcePath = "src/index.js";
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
  const paths = await readdir(dataPath);
  const entries = await Promise.all(
    paths.filter(isJsonPath).map(readJsonData),
  );

  return Object.fromEntries(entries);
}

/**
 * Gets whether a path points to a JSON file.
 *
 * @param {string} path - Data file path.
 * @returns {boolean} Whether the path points to JSON.
 */
function isJsonPath(path) {
  return extname(path) === ".json";
}

/**
 * Reads one JSON data file.
 *
 * @param {string} path - Data file path.
 * @returns {Promise<Array<object>>} Data name paired with parsed JSON.
 */
async function readJsonData(path) {
  const data = await readFile(`${dataPath}/${path}`, "utf8");

  return [basename(path, ".json"), JSON.parse(data)];
}
