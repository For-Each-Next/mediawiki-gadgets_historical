/* eslint-disable */

/**
 * Bundles and minifies the create-vg-stub gadget for publishing.
 */

import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { basename, extname } from "node:path";
import { build } from "esbuild";
import { minify } from "terser";
import { formatMinifiedOutput } from "../../../build.config.js";

const dataPath = "src/data";
const sourcePath = "src/index.js";
const dataPlaceholder = "__CREATE_VG_STUB_FIELD_DATA__";
const userscriptPath = "dist/create_vg_stub.user.js";

await mkdir("dist", { recursive: true });

const packageMetadata = JSON.parse(await readFile("package.json", "utf8"));
const fieldReferenceData = await readFieldReferenceData();
const source = await bundleSource(fieldReferenceData);
const { code } = await minify(source, {
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

await writeFile("dist/create_vg_stub.js", source);
await writeFile("dist/create_vg_stub.min.js", formatMinifiedOutput(code));
await writeFile(userscriptPath, formatUserscript(source, packageMetadata));

/**
 * Adds Tampermonkey metadata to the bundled source.
 *
 * @param {string} source - Bundled gadget source.
 * @param {object} metadata - Package metadata.
 * @returns {string} Installable userscript source.
 */
function formatUserscript(source, metadata) {
  const header = [
    "// ==UserScript==",
    `// @name         ${metadata.name}`,
    "// @namespace    https://github.com/For-Each-Next/mediawiki-gadgets",
    `// @version      ${metadata.version}`,
    `// @description  ${metadata.description}`,
    "// @author       For Each ... Next",
    "// @match        https://zh.wikipedia.org/*",
    "// @run-at       document-idle",
    "// @sandbox      raw",
    "// @grant        none",
    "// ==/UserScript==",
  ].join("\n");

  return `${header}\n\n${formatUserscriptBootstrap(source)}`;
}

/**
 * Waits for MediaWiki before running the bundled gadget.
 *
 * @param {string} source - Bundled gadget source.
 * @returns {string} Userscript bootstrap source.
 */
function formatUserscriptBootstrap(source) {
  return `(() => {
  function start() {
    if (
      window.mw?.config == null ||
      typeof window.mw?.loader?.using !== "function"
    ) {
      window.setTimeout(start, 50);
      return;
    }

    const mw = window.mw;

${source.trimEnd()}
  }

  start();
})();
`;
}

/**
 * Bundles the source modules into one browser script.
 *
 * @param {object} fieldReferenceData - Reference data to inline.
 * @returns {Promise<string>} Bundled source.
 */
async function bundleSource(fieldReferenceData) {
  const result = await build({
    bundle: true,
    define: {
      [dataPlaceholder]: JSON.stringify(fieldReferenceData),
    },
    entryPoints: [sourcePath],
    format: "iife",
    globalName: "createVgStub",
    logLevel: "silent",
    write: false,
  });

  return result.outputFiles[0].text;
}

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
