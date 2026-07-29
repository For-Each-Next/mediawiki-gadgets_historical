/**
 * Coordinates one complete gadget and userscript build.
 */

import { mkdir, rm, writeFile } from "node:fs/promises";
import { parse, resolve } from "node:path";
import { minify } from "terser";
import { bundleSource } from "./bundle.ts";
import { formatMediaWikiOutput } from "./mediawiki.ts";
import { loadGadgetBuildPlan } from "./package.ts";
import type { GadgetBuildPlan } from "./types.ts";
import { formatUserscript } from "./userscript.ts";

/**
 * Builds both distributable forms for a workspace gadget.
 *
 * @param packageRoot - Workspace package directory.
 */
export async function buildGadget(packageRoot: string): Promise<void> {
    const plan = await loadGadgetBuildPlan(packageRoot);
    const outputDirectory = resolve(packageRoot, plan.config.outputDirectory);
    assertDedicatedOutputDirectory(
        packageRoot,
        outputDirectory,
        plan.metadata.name,
    );
    await rm(outputDirectory, { force: true, recursive: true });
    await mkdir(outputDirectory, { recursive: true });

    const [source, minifiedSource] = await Promise.all([
        bundleSource(plan),
        bundleSource(plan, { minifyText: true }),
    ]);
    const minifiedCode = await minifyBundledSource(minifiedSource);
    await writeBuildOutputs(plan, outputDirectory, source, minifiedCode);
}

/**
 * Prevents a misconfigured build from clearing a broad directory.
 *
 * @param packageRoot - Workspace package directory.
 * @param outputDirectory - Resolved output directory.
 * @param packageName - Package name used for the dedicated directory.
 */
function assertDedicatedOutputDirectory(
    packageRoot: string,
    outputDirectory: string,
    packageName: string,
): void {
    const root = parse(outputDirectory).root;
    const expectedDirectory = resolve(packageRoot, "../../dist", packageName);
    if (
        outputDirectory === root ||
        outputDirectory === resolve(packageRoot) ||
        outputDirectory !== expectedDirectory
    ) {
        throw new Error(
            "Gadget output must use its dedicated workspace dist directory.",
        );
    }
}

/**
 * Minifies bundled JavaScript for on-wiki publication.
 *
 * @param source - Bundled source.
 * @returns Minified JavaScript.
 */
async function minifyBundledSource(source: string): Promise<string> {
    const result = await minify(source, {
        compress: { passes: 2 },
        format: { comments: false },
        mangle: true,
    });
    if (result.code == null) {
        throw new Error("Terser did not return minified code.");
    }
    return removeHtmlIntertagWhitespace(result.code);
}

/**
 * Writes the MediaWiki and userscript outputs.
 *
 * @param plan - Resolved gadget build plan.
 * @param outputDirectory - Clean output directory.
 * @param source - Unminified bundled source.
 * @param minifiedCode - Minified bundled source.
 */
async function writeBuildOutputs(
    plan: GadgetBuildPlan,
    outputDirectory: string,
    source: string,
    minifiedCode: string,
): Promise<void> {
    const { metadata } = plan;
    const outputName = plan.config.outputName;
    const minifiedOutput = formatMediaWikiOutput(minifiedCode, metadata);
    const userscript = await formatUserscript(
        source,
        metadata,
        plan.config.userscript,
    );
    await Promise.all([
        writeFile(
            resolve(outputDirectory, `${outputName}.min.js`),
            minifiedOutput,
        ),
        writeFile(
            resolve(outputDirectory, `${outputName}.user.js`),
            userscript,
        ),
    ]);
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
