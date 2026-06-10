/* eslint-disable */

/**
 * Builds a MediaWiki gadget package and an installable userscript.
 */

import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { basename, extname, resolve } from "node:path";
import { build } from "esbuild";
import { minify } from "terser";
import { formatMinifiedOutput } from "../build.config.js";

const packagePath = resolve("package.json");
const packageMetadata = JSON.parse(await readFile(packagePath, "utf8"));
const config = packageMetadata.gadgetBuild;

if (config == null) {
    throw new Error("package.json must define gadgetBuild configuration.");
}

const entryPoint =
    config.entryPoint || packageMetadata.browser || packageMetadata.main;
const outputName = config.outputName || packageMetadata.name;
const outputDirectory = config.outputDirectory || "dist";

if (entryPoint == null) {
    throw new Error(
        "gadgetBuild.entryPoint, browser, or main must be defined.",
    );
}

if (config.globalName == null) {
    throw new Error("gadgetBuild.globalName must be defined.");
}

await mkdir(outputDirectory, { recursive: true });

const source = await bundleSource(entryPoint, config);
const minifyOptions = {
    compress: {
        passes: 2,
    },
    format: {
        comments: false,
    },
    mangle: true,
};
const { code } = await minify(source, minifyOptions);

if (code == null) {
    throw new Error("Terser did not return minified code.");
}

await Promise.all([
    writeFile(resolve(outputDirectory, `${outputName}.js`), source),
    writeFile(
        resolve(outputDirectory, `${outputName}.min.js`),
        formatMinifiedOutput(code),
    ),
    writeFile(
        resolve(outputDirectory, `${outputName}.user.js`),
        formatUserscript(source, packageMetadata, config.userscript),
    ),
]);

/**
 * Bundles a gadget package into one browser script.
 *
 * @param {string} entryPoint - Package entry point.
 * @param {object} buildConfig - Gadget build configuration.
 * @returns {Promise<string>} Bundled source.
 */
async function bundleSource(entryPoint, buildConfig) {
    const buildOptions = {
        bundle: true,
        define: await buildDefines(buildConfig.defines),
        entryPoints: [entryPoint],
        format: "iife",
        globalName: buildConfig.globalName,
        logLevel: "silent",
        write: false,
    };
    const result = await build(buildOptions);

    return result.outputFiles[0].text;
}

/**
 * Builds esbuild define values from package configuration.
 *
 * @param {object} [defineConfig] - Defines keyed by placeholder.
 * @returns {Promise<object>} Serialized esbuild define values.
 */
async function buildDefines(defineConfig = {}) {
    const entries = await Promise.all(
        Object.entries(defineConfig).map(async ([placeholder, definition]) => [
            placeholder,
            JSON.stringify(await readJsonDirectory(definition.jsonDirectory)),
        ]),
    );

    return Object.fromEntries(entries);
}

/**
 * Reads a directory of JSON files into an object keyed by basename.
 *
 * @param {string} directory - JSON data directory.
 * @returns {Promise<object>} Parsed JSON data.
 */
async function readJsonDirectory(directory) {
    if (directory == null) {
        throw new Error("Each gadgetBuild.defines entry needs jsonDirectory.");
    }

    const paths = await readdir(directory);
    const entries = await Promise.all(
        paths.filter(isJsonPath).map(async (path) => {
            const data = await readFile(resolve(directory, path), "utf8");

            return [basename(path, ".json"), JSON.parse(data)];
        }),
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
 * Adds userscript metadata and a MediaWiki-ready bootstrap.
 *
 * @param {string} source - Bundled gadget source.
 * @param {object} metadata - Package metadata.
 * @param {object} [userscriptConfig] - Userscript configuration.
 * @returns {string} Installable userscript source.
 */
function formatUserscript(source, metadata, userscriptConfig = {}) {
    const header = [
        "// ==UserScript==",
        formatUserscriptMetadata(
            "name",
            userscriptConfig.name || metadata.name,
        ),
        formatUserscriptMetadata(
            "namespace",
            userscriptConfig.namespace ||
                "https://github.com/For-Each-Next/mediawiki-gadgets",
        ),
        formatUserscriptMetadata("version", metadata.version),
        formatUserscriptMetadata("description", metadata.description),
        formatUserscriptMetadata("author", metadata.author),
        ...(userscriptConfig.match || []).map((value) =>
            formatUserscriptMetadata("match", value),
        ),
        formatUserscriptMetadata(
            "run-at",
            userscriptConfig.runAt || "document-idle",
        ),
        formatUserscriptMetadata("sandbox", userscriptConfig.sandbox || "raw"),
        ...(userscriptConfig.grant || ["none"]).map((value) =>
            formatUserscriptMetadata("grant", value),
        ),
        "// ==/UserScript==",
    ].join("\n");

    return `${header}\n\n${formatUserscriptBootstrap(source)}`;
}

/**
 * Formats one userscript metadata line.
 *
 * @param {string} key - Metadata key.
 * @param {string} value - Metadata value.
 * @returns {string} Metadata line.
 */
function formatUserscriptMetadata(key, value) {
    return `// @${key.padEnd(13)}${value}`;
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
