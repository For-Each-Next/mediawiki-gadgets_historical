/**
 * Coordinates one complete gadget and userscript build.
 */

import { mkdir, rm, writeFile } from "node:fs/promises";
import { parse, resolve } from "node:path";
import { minify } from "terser";
import { assertUniqueWorkspaceArtifacts } from "./artifacts.ts";
import { bundleSource } from "./bundle.ts";
import {
    formatMediaWikiOutput,
    formatReadableMediaWikiOutput,
} from "./mediawiki.ts";
import { loadGadgetBuildPlan } from "./package.ts";
import type { GadgetBuildPlan } from "./types.ts";
import { formatUserscript } from "./userscript.ts";

/**
 * Builds all distributable forms for a workspace gadget.
 *
 * @param packageRoot - Workspace package directory.
 */
export async function buildGadget(packageRoot: string): Promise<void> {
    const plan = await loadGadgetBuildPlan(packageRoot);
    await assertUniqueWorkspaceArtifacts(packageRoot);
    const outputDirectory = resolve(packageRoot, plan.config.outputDirectory);
    assertSharedOutputDirectory(packageRoot, outputDirectory);
    await mkdir(outputDirectory, { recursive: true });
    const outputPaths = createOutputPaths(plan, outputDirectory);
    await cleanBuildOutputs(outputPaths);

    const [documentedSource, source, minifiedSource] = await Promise.all([
        bundleSource(plan, { preserveDocumentation: true }),
        bundleSource(plan),
        bundleSource(plan, { minifyText: true }),
    ]);
    const minifiedCode = await minifyBundledSource(minifiedSource);
    await writeBuildOutputs(
        plan,
        outputPaths,
        documentedSource,
        source,
        minifiedCode,
    );
}

/**
 * Requires the shared workspace distribution directory.
 *
 * @param packageRoot - Workspace package directory.
 * @param outputDirectory - Resolved output directory.
 */
function assertSharedOutputDirectory(
    packageRoot: string,
    outputDirectory: string,
): void {
    const root = parse(outputDirectory).root;
    const expectedDirectory = resolve(packageRoot, "../../dist");
    if (
        outputDirectory === root ||
        outputDirectory === resolve(packageRoot) ||
        outputDirectory !== expectedDirectory
    ) {
        throw new Error(
            "Gadget output must use the shared workspace dist directory.",
        );
    }
}

interface OutputPaths {
    formatted: string;
    minified: string;
    userscript: string;
}

/** Resolves the three exact artifact paths owned by one gadget. */
function createOutputPaths(
    plan: GadgetBuildPlan,
    outputDirectory: string,
): OutputPaths {
    const outputName = plan.config.outputName;
    return {
        formatted: resolve(outputDirectory, `${outputName}.js`),
        minified: resolve(outputDirectory, `${outputName}.min.js`),
        userscript: resolve(outputDirectory, `${outputName}.user.js`),
    };
}

/** Removes only the three exact outputs owned by one gadget. */
async function cleanBuildOutputs(paths: OutputPaths): Promise<void> {
    await Promise.all(
        Object.values(paths).map((path) => rm(path, { force: true })),
    );
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
    return result.code;
}

/**
 * Writes the readable, minified, and userscript outputs.
 *
 * @param plan - Resolved gadget build plan.
 * @param paths - Exact artifact paths owned by the gadget.
 * @param documentedSource - Bundle retaining authored documentation.
 * @param userscriptSource - Ordinary unminified bundled source.
 * @param minifiedCode - Minified bundled source.
 */
async function writeBuildOutputs(
    plan: GadgetBuildPlan,
    paths: OutputPaths,
    documentedSource: string,
    userscriptSource: string,
    minifiedCode: string,
): Promise<void> {
    const { metadata } = plan;
    const [formattedOutput, userscript] = await Promise.all([
        formatReadableMediaWikiOutput(documentedSource, metadata),
        formatUserscript(userscriptSource, metadata, plan.config.userscript),
    ]);
    const minifiedOutput = formatMediaWikiOutput(minifiedCode, metadata);
    await Promise.all([
        writeFile(paths.formatted, formattedOutput),
        writeFile(paths.minified, minifiedOutput),
        writeFile(paths.userscript, userscript),
    ]);
}
