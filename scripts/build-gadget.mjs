/* eslint-disable */

/**
 * Builds a MediaWiki gadget package and an installable userscript.
 */

import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { basename, extname, resolve } from "node:path";
import { build } from "esbuild";
import { format } from "prettier";
import { minify } from "terser";
import { formatMinifiedOutput } from "../build.config.js";
import { parseJsonc } from "./jsonc.mjs";

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
const styleSource = await readStyleSource(config.styleEntryPoint);
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
const userscript = await formatUserscript(
    source,
    packageMetadata,
    config.userscript,
);

if (code == null) {
    throw new Error("Terser did not return minified code.");
}

const outputs = [
    writeFile(resolve(outputDirectory, `${outputName}.js`), source),
    writeFile(
        resolve(outputDirectory, `${outputName}.min.js`),
        formatMinifiedOutput(code),
    ),
    writeFile(resolve(outputDirectory, `${outputName}.user.js`), userscript),
];

if (styleSource != null) {
    outputs.push(
        writeFile(resolve(outputDirectory, `${outputName}.css`), styleSource),
    );
}

await Promise.all(outputs);

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
            JSON.stringify(await readDefineValue(definition)),
        ]),
    );

    return Object.fromEntries(entries);
}

/**
 * Reads one configured define value.
 *
 * @param {object} definition - Define data configuration.
 * @param {string} [definition.jsonFile] - JSON data file to inject.
 * @param {string} [definition.textFile] - Text file to inject.
 * @returns {Promise<*>} Define value.
 */
async function readDefineValue(definition) {
    if (definition.textFile != null) {
        return readFile(definition.textFile, "utf8");
    }

    if (definition.jsonFile != null) {
        const data = await readFile(definition.jsonFile, "utf8");

        return parseDataFile(definition.jsonFile, data);
    }

    return readJsonDirectories(definition);
}

/**
 * Reads configured JSON directories into one object.
 *
 * @param {object} definition - Define data configuration.
 * @param {string} [definition.jsonDirectory] - Single JSON data directory.
 * @param {Array<string>} [definition.jsonDirectories] - JSON data directories.
 * @returns {Promise<object>} Parsed JSON data.
 */
async function readJsonDirectories(definition) {
    const directories =
        definition.jsonDirectories ||
        (definition.jsonDirectory == null ? [] : [definition.jsonDirectory]);

    if (directories.length === 0) {
        throw new Error(
            "Each gadgetBuild.defines entry needs textFile, jsonFile, jsonDirectory, or jsonDirectories.",
        );
    }

    const data = await Promise.all(directories.map(readJsonDirectory));

    return Object.assign({}, ...data);
}

/**
 * Reads a directory of JSON and JSONC files into an object keyed by basename.
 *
 * @param {string} directory - JSON data directory.
 * @returns {Promise<object>} Parsed JSON data.
 */
async function readJsonDirectory(directory) {
    const paths = await readdir(directory);
    const entries = await Promise.all(
        paths.filter(isDataPath).map(async (path) => {
            const data = await readFile(resolve(directory, path), "utf8");

            return [getDataKey(path), parseDataFile(path, data)];
        }),
    );

    return Object.fromEntries(entries);
}

/**
 * Gets whether a path points to a JSON or JSONC file.
 *
 * @param {string} path - Data file path.
 * @returns {boolean} Whether the path points to JSON data.
 */
function isDataPath(path) {
    return [".json", ".jsonc"].includes(extname(path));
}

/**
 * Gets the extension-independent data key for one path.
 *
 * @param {string} path - Data file path.
 * @returns {string} Data key.
 */
function getDataKey(path) {
    return basename(path, extname(path));
}

/**
 * Parses one JSON or JSONC data file.
 *
 * @param {string} path - Data file path.
 * @param {string} data - Serialized data.
 * @returns {*} Parsed data.
 */
function parseDataFile(path, data) {
    if (extname(path) === ".jsonc") {
        return parseJsonc(data);
    }

    return JSON.parse(data);
}

/**
 * Reads an optional standalone stylesheet source.
 *
 * @param {string} [path] - Stylesheet source path.
 * @returns {Promise<string|null>} Stylesheet source or null.
 */
async function readStyleSource(path) {
    if (path == null) {
        return null;
    }

    return readFile(path, "utf8");
}

/**
 * Adds userscript metadata and a MediaWiki-ready bootstrap.
 *
 * @param {string} source - Bundled gadget source.
 * @param {object} metadata - Package metadata.
 * @param {object} [userscriptConfig] - Userscript configuration.
 * @returns {Promise<string>} Installable userscript source.
 */
async function formatUserscript(source, metadata, userscriptConfig = {}) {
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

    return format(`${header}\n\n${formatUserscriptBootstrap(source)}`, {
        parser: "babel",
    });
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
