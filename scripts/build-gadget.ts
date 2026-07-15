/**
 * Builds a MediaWiki gadget package and an installable userscript.
 */

import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { build, transform, type BuildOptions } from "esbuild";
import { format } from "prettier";
import { minify } from "terser";
import { formatMinifiedOutput } from "../build.config.ts";

interface BundleOptions {
    minifyText?: boolean;
}

interface DefineConfig {
    textFile: string;
}

interface GadgetBuildConfig {
    defines?: Record<string, DefineConfig>;
    entryPoint?: string;
    globalName?: string;
    outputDirectory?: string;
    outputName?: string;
    target?: BuildOptions["target"];
    userscript?: UserscriptConfig;
}

interface PackageMetadata {
    author: string;
    browser?: string;
    description: string;
    gadgetBuild?: GadgetBuildConfig;
    main?: string;
    name: string;
    version: string;
}

interface UserscriptConfig {
    grant?: string[];
    match?: string[];
    name?: string;
    namespace?: string;
    runAt?: string;
    sandbox?: string;
}

const packagePath = resolve("package.json");
const packageMetadata = JSON.parse(
    await readFile(packagePath, "utf8"),
) as PackageMetadata;
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
 * @param entryPoint - Package entry point.
 * @param buildConfig - Gadget build configuration.
 * @param options - Bundle options.
 * @returns Bundled source.
 */
async function bundleSource(
    entryPoint: string,
    buildConfig: GadgetBuildConfig,
    options: BundleOptions = {},
): Promise<string> {
    const buildOptions: BuildOptions = {
        bundle: true,
        define: await buildDefines(buildConfig.defines, options),
        entryPoints: [entryPoint],
        format: "iife",
        globalName: buildConfig.globalName,
        logLevel: "silent",
        target: buildConfig.target || "es2025",
        write: false,
    };
    const result = await build(buildOptions);

    return result.outputFiles[0].text;
}

/**
 * Builds esbuild define values from package configuration.
 *
 * @param defineConfig - Defines keyed by placeholder.
 * @param options - Define options.
 * @returns Serialized esbuild define values.
 */
async function buildDefines(
    defineConfig: Record<string, DefineConfig> = {},
    options: BundleOptions = {},
): Promise<Record<string, string>> {
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
 * @param definition - Define data configuration.
 * @param options - Define options.
 * @returns Define value.
 */
async function readDefineValue(
    definition: DefineConfig,
    options: BundleOptions = {},
): Promise<string> {
    if (definition.textFile == null) {
        throw new Error("Each gadgetBuild.defines entry needs textFile.");
    }

    const text = await readFile(definition.textFile, "utf8");

    if (options.minifyText) {
        return minifyInjectedText(definition.textFile, text);
    }

    return text;
}

/**
 * Minifies injected text formats supported by the build.
 *
 * @param path - Source path.
 * @param text - Source text.
 * @returns Minified or unchanged text.
 */
async function minifyInjectedText(
    path: string,
    text: string,
): Promise<string> {
    if (extname(path) !== ".css") {
        return text;
    }

    const result = await transform(text, { loader: "css", minify: true });

    return result.code.trim();
}

/**
 * Removes escaped indentation that exists only between HTML tags.
 *
 * @param code - Minified JavaScript.
 * @returns JavaScript without inter-tag HTML whitespace.
 */
function removeHtmlIntertagWhitespace(code: string): string {
    return code.replace(/>\\n\s*/gu, ">").replace(/\\n\s*</gu, "<");
}

/**
 * Adds userscript metadata and a MediaWiki-ready bootstrap.
 *
 * @param source - Bundled gadget source.
 * @param metadata - Package metadata.
 * @param userscriptConfig - Userscript configuration.
 * @returns Installable userscript source.
 */
async function formatUserscript(
    source: string,
    metadata: PackageMetadata,
    userscriptConfig: UserscriptConfig = {},
): Promise<string> {
    const header = buildUserscriptHeader(metadata, userscriptConfig);
    const bootstrap = formatUserscriptBootstrap(source);
    const userscript = await format(`${header}\n\n${bootstrap}`, {
        parser: "babel",
    });

    return userscript;
}

/**
 * Builds a userscript metadata header.
 *
 * @param metadata - Article metadata.
 * @param userscriptConfig - Userscript config value.
 * @returns A userscript metadata header.
 */
function buildUserscriptHeader(
    metadata: PackageMetadata,
    userscriptConfig: UserscriptConfig,
): string {
    const matches = buildUserscriptMetadataList(
        "match",
        userscriptConfig.match || [],
    );
    const grants = buildUserscriptMetadataList(
        "grant",
        userscriptConfig.grant || ["none"],
    );

    const core = buildCoreUserscriptMetadata(metadata, userscriptConfig);
    const lines = [
        "// ==UserScript==",
        ...core,
        ...matches,
        ...grants,
        "// ==/UserScript==",
    ];

    return lines.join("\n");
}

/**
 * Builds the single-value userscript metadata lines.
 *
 * @param metadata - Article metadata.
 * @param userscriptConfig - Userscript config value.
 * @returns The single-value userscript metadata lines.
 */
function buildCoreUserscriptMetadata(
    metadata: PackageMetadata,
    userscriptConfig: UserscriptConfig,
): string[] {
    const lines = [
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
        formatUserscriptMetadata(
            "run-at",
            userscriptConfig.runAt || "document-idle",
        ),
        formatUserscriptMetadata("sandbox", userscriptConfig.sandbox || "raw"),
    ];

    return lines;
}

/**
 * Builds repeated userscript metadata lines.
 *
 * @param key - Lookup key.
 * @param values - Input values.
 * @returns Repeated userscript metadata lines.
 */
function buildUserscriptMetadataList(key: string, values: string[]): string[] {
    return values.map((value) => formatUserscriptMetadata(key, value));
}

/**
 * Formats one userscript metadata line.
 *
 * @param key - Metadata key.
 * @param value - Metadata value.
 * @returns Metadata line.
 */
function formatUserscriptMetadata(key: string, value: string): string {
    return `// @${key.padEnd(13)}${value}`;
}

/**
 * Waits for MediaWiki before running the bundled gadget.
 *
 * @param source - Bundled gadget source.
 * @returns Userscript bootstrap source.
 */
function formatUserscriptBootstrap(source: string): string {
    const result = `(() => {
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
    return result;
}
