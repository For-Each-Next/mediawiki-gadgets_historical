/**
 * Coordinates one complete gadget and userscript build.
 */

import { lstat, mkdir, rm, writeFile } from "node:fs/promises";
import { basename, parse, resolve } from "node:path";
import { minify } from "terser";
import { bundleSource } from "./bundle.ts";
import { formatMediaWikiOutput } from "./mediawiki.ts";
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
    const outputRoot = resolve(packageRoot, plan.config.outputDirectory);
    assertSharedOutputDirectory(packageRoot, outputRoot);
    const outputDirectory = createPackageOutputDirectory(
        packageRoot,
        outputRoot,
        plan.metadata.name,
    );
    await ensureBuildDirectory(outputRoot, "Shared output root");
    await ensureBuildDirectory(outputDirectory, "Gadget output directory");
    const outputPaths = createOutputPaths(plan, outputDirectory);
    const legacyOutputPaths = createOutputPaths(plan, outputRoot);
    await cleanBuildOutputs([outputPaths, legacyOutputPaths]);

    const [source, minifiedSource] = await Promise.all([
        bundleSource(plan),
        bundleSource(plan, { minifyText: true }),
    ]);
    const minifiedCode = await minifyBundledSource(minifiedSource);
    await writeBuildOutputs(plan, outputPaths, source, minifiedCode);
}

/**
 * Creates a build directory or rejects links and non-directory entries.
 *
 * @param path - Expected directory path.
 * @param label - Directory label for diagnostics.
 */
async function ensureBuildDirectory(
    path: string,
    label: string,
): Promise<void> {
    try {
        const stats = await lstat(path);
        if (!stats.isDirectory() || stats.isSymbolicLink()) {
            throw new Error(`${label} must be a real directory.`);
        }
    } catch (error) {
        if (!hasErrorCode(error, "ENOENT")) {
            throw error;
        }
        await mkdir(path);
    }
}

/**
 * Checks an unknown error for one Node error code.
 *
 * @param error - Error value to inspect.
 * @param code - Code to compare.
 * @returns Whether the error contains the code.
 */
function hasErrorCode(error: unknown, code: string): boolean {
    return (
        typeof error === "object" &&
        error != null &&
        "code" in error &&
        error.code === code
    );
}

/**
 * Resolves the package directory below the shared distribution root.
 *
 * @param packageRoot - Workspace package directory.
 * @param outputRoot - Shared workspace distribution directory.
 * @param packageName - Declared package name.
 * @returns Package-owned distribution directory.
 */
function createPackageOutputDirectory(
    packageRoot: string,
    outputRoot: string,
    packageName: string,
): string {
    const directoryName = basename(resolve(packageRoot));
    if (packageName !== directoryName) {
        throw new Error(
            "package.json name must match its package directory before build.",
        );
    }
    return resolve(outputRoot, directoryName);
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

interface ArtifactPaths {
    minified: string;
    retiredReadable: string;
    userscript: string;
}

/**
 * Resolves current and retired artifact paths owned by one gadget.
 *
 * @param plan - Plan value.
 * @param outputDirectory - Output directory value.
 * @returns Current and retired artifact paths owned by one gadget.
 */
function createOutputPaths(
    plan: GadgetBuildPlan,
    outputDirectory: string,
): ArtifactPaths {
    const outputName = plan.config.outputName;
    return {
        minified: resolve(outputDirectory, `${outputName}.min.js`),
        retiredReadable: resolve(outputDirectory, `${outputName}.js`),
        userscript: resolve(outputDirectory, `${outputName}.user.js`),
    };
}

/**
 * Removes current outputs and the retired readable artifact.
 *
 * @param pathSets - Current and legacy output paths.
 */
async function cleanBuildOutputs(pathSets: ArtifactPaths[]): Promise<void> {
    await Promise.all(
        pathSets
            .flatMap(Object.values)
            .map((path) => rm(path, { force: true })),
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
 * Writes the minified and userscript outputs.
 *
 * @param plan - Resolved gadget build plan.
 * @param paths - Exact artifact paths owned by the gadget.
 * @param userscriptSource - Ordinary unminified bundled source.
 * @param minifiedCode - Minified bundled source.
 */
async function writeBuildOutputs(
    plan: GadgetBuildPlan,
    paths: ArtifactPaths,
    userscriptSource: string,
    minifiedCode: string,
): Promise<void> {
    const { metadata } = plan;
    const userscript = await formatUserscript(
        userscriptSource,
        metadata,
        plan.config.userscript,
    );
    const minifiedOutput = formatMediaWikiOutput(minifiedCode, metadata);
    await Promise.all([
        writeFile(paths.minified, minifiedOutput),
        writeFile(paths.userscript, userscript),
    ]);
}
