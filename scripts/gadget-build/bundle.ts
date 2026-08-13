/**
 * Bundles gadget browser source and build-time text definitions.
 */

import { lstat, readFile, realpath } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { build, transform, type BuildOptions } from "esbuild";
import { requireContainedPath } from "#workspace/paths";
import { extractVueTemplate, minifyHtmlTemplate } from "./html-templates.ts";
import type { BundleOptions, DefineConfig, GadgetBuildPlan } from "./types.ts";

/**
 * Bundles one gadget entry point.
 *
 * @param plan - Resolved gadget build plan.
 * @param options - Text-minification options.
 * @returns Bundled browser source.
 */
export async function bundleSource(
    plan: GadgetBuildPlan,
    options: BundleOptions = {},
): Promise<string> {
    const { config, metadata, packageRoot } = plan;
    const buildOptions: BuildOptions = {
        absWorkingDir: packageRoot,
        bundle: true,
        define: {
            __GADGET_BUILD_TIME__: JSON.stringify(plan.buildTime),
            __GADGET_VERSION__: JSON.stringify(metadata.version),
            ...(await buildDefines(plan, config.defines, options)),
        },
        entryPoints: [config.entryPoint],
        format: "iife",
        globalName: config.globalName,
        logLevel: "silent",
        target: config.target ?? "es2024",
        write: false,
    };
    const result = await build(buildOptions);
    const output = result.outputFiles?.[0];
    if (output == null) {
        throw new Error("esbuild did not return bundled JavaScript.");
    }
    return output.text;
}

/**
 * Builds serialized esbuild define values.
 *
 * @param plan - Resolved gadget build plan.
 * @param definitions - Defines keyed by placeholder.
 * @param options - Text-minification options.
 * @returns Serialized esbuild define values.
 */
async function buildDefines(
    plan: GadgetBuildPlan,
    definitions: Record<string, DefineConfig> = {},
    options: BundleOptions = {},
): Promise<Record<string, string>> {
    const entries = await Promise.all(
        Object.entries(definitions).map(([placeholder, definition]) =>
            buildDefineEntry(plan, placeholder, definition, options),
        ),
    );
    return Object.fromEntries(entries);
}

/**
 * Builds one serialized esbuild define entry.
 *
 * @param plan - Resolved gadget build plan.
 * @param placeholder - Define placeholder.
 * @param definition - Define data configuration.
 * @param options - Text-minification options.
 * @returns Placeholder and serialized value.
 */
async function buildDefineEntry(
    plan: GadgetBuildPlan,
    placeholder: string,
    definition: DefineConfig,
    options: BundleOptions,
): Promise<[string, string]> {
    if (typeof definition.textFile !== "string") {
        throw new TypeError("gadgetBuild define textFile must be a string.");
    }
    const path = requireContainedPath(
        plan.packageRoot,
        resolve(plan.packageRoot, definition.textFile),
        "Build-injected text file",
    );
    const [entry, realRoot, realPath] = await Promise.all([
        lstat(path),
        realpath(plan.packageRoot),
        realpath(path),
    ]);
    requireContainedPath(realRoot, realPath, "Build-injected text file");
    if (!entry.isFile() || entry.isSymbolicLink()) {
        throw new Error("Build-injected text must be a real package file.");
    }
    const text = await readFile(path, "utf8");
    const value = await prepareInjectedText(path, text, options);
    return [placeholder, JSON.stringify(value)];
}

/**
 * Prepares a supported injected text format.
 *
 * @param path - Source file path.
 * @param text - Source text.
 * @param options - Text-minification options.
 * @returns Extracted, minified, or unchanged text.
 */
async function prepareInjectedText(
    path: string,
    text: string,
    options: BundleOptions,
): Promise<string> {
    const extension = extname(path);
    if (extension === ".vue") {
        const template = extractVueTemplate(text, path);
        return options.minifyText ? minifyHtmlTemplate(template) : template;
    }
    if (extension !== ".css" || !options.minifyText) {
        return text;
    }
    const result = await transform(text, { loader: "css", minify: true });
    return result.code.trim();
}
