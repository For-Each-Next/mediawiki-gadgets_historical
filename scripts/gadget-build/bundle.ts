/**
 * Bundles gadget browser source and build-time text definitions.
 */

import { readFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { build, transform, type BuildOptions } from "esbuild";
import { createHtmlTemplateMinifier } from "../minify-html-templates.ts";
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
    const htmlTemplateMinifier = options.minifyText
        ? createHtmlTemplateMinifier()
        : undefined;
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
        plugins:
            htmlTemplateMinifier == null ? undefined : [htmlTemplateMinifier],
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
    const path = resolve(plan.packageRoot, definition.textFile);
    const text = await readFile(path, "utf8");
    const value = options.minifyText
        ? await minifyInjectedText(path, text)
        : text;
    return [placeholder, JSON.stringify(value)];
}

/**
 * Minifies a supported injected text format.
 *
 * @param path - Source file path.
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
