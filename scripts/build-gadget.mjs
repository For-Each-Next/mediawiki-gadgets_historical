/* eslint-disable */

/**
 * Builds a MediaWiki gadget package and an installable userscript.
 */

import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { basename, extname, resolve } from "node:path";
import { build, transform } from "esbuild";
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

const [source, minifiedSource] = await Promise.all([
    bundleSource(entryPoint, config),
    bundleSource(entryPoint, config, { minifyText: true }),
]);
const minifyOptions = {
    compress: {
        passes: 2,
    },
    format: {
        comments: false,
    },
    mangle: true,
};
const minifiedResult = await minify(minifiedSource, minifyOptions);

if (minifiedResult.code == null) {
    throw new Error("Terser did not return minified code.");
}

const code = removeHtmlIntertagWhitespace(minifiedResult.code);
const userscript = await formatUserscript(
    source,
    packageMetadata,
    config.userscript,
);

const outputs = [
    writeFile(
        resolve(outputDirectory, `${outputName}.min.js`),
        formatMinifiedOutput(code, packageMetadata),
    ),
    writeFile(resolve(outputDirectory, `${outputName}.user.js`), userscript),
    rm(resolve(outputDirectory, `${outputName}.js`), { force: true }),
    rm(resolve(outputDirectory, `${outputName}.css`), { force: true }),
];

await Promise.all(outputs);

/**
 * Bundles a gadget package into one browser script.
 *
 * @param {string} entryPoint - Package entry point.
 * @param {object} buildConfig - Gadget build configuration.
 * @param {object} [options] - Bundle options.
 * @param {boolean} [options.minifyText] - Whether to minify injected text.
 * @returns {Promise<string>} Bundled source.
 */
async function bundleSource(entryPoint, buildConfig, options = {}) {
    const buildOptions = {
        bundle: true,
        define: await buildDefines(buildConfig.defines, options),
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
 * @param {object} [options] - Define options.
 * @param {boolean} [options.minifyText] - Whether to minify injected text.
 * @returns {Promise<object>} Serialized esbuild define values.
 */
async function buildDefines(defineConfig = {}, options = {}) {
    const entries = await Promise.all(
        Object.entries(defineConfig).map(async ([placeholder, definition]) => [
            placeholder,
            JSON.stringify(await readDefineValue(definition, options)),
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
 * @param {object} [options] - Define options.
 * @param {boolean} [options.minifyText] - Whether to minify injected text.
 * @returns {Promise<*>} Define value.
 */
async function readDefineValue(definition, options = {}) {
    if (definition.textFile != null) {
        const text = await readFile(definition.textFile, "utf8");

        return options.minifyText
            ? minifyInjectedText(definition.textFile, text)
            : text;
    }

    if (definition.jsonFile != null) {
        const data = await readFile(definition.jsonFile, "utf8");

        return parseDataFile(definition.jsonFile, data);
    }

    return readJsonDirectories(definition);
}

/**
 * Minifies injected text formats supported by the build.
 *
 * @param {string} path - Source path.
 * @param {string} text - Source text.
 * @returns {Promise<string>} Minified or unchanged text.
 */
async function minifyInjectedText(path, text) {
    if (extname(path) !== ".css") {
        return text;
    }

    const result = await transform(text, { loader: "css", minify: true });

    return result.code.trim();
}

/**
 * Removes escaped indentation that exists only between HTML tags.
 *
 * @param {string} code - Minified JavaScript.
 * @returns {string} JavaScript without inter-tag HTML whitespace.
 */
function removeHtmlIntertagWhitespace(code) {
    return code.replace(/>\\n\s*/gu, ">").replace(/\\n\s*</gu, "<");
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
