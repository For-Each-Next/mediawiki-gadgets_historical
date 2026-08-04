/**
 * Coordinates one complete minified gadget build.
 */

import { rm, writeFile } from "node:fs/promises";
import { basename, parse, resolve } from "node:path";
import { minify } from "terser";
import { assertUniqueWorkspaceArtifacts } from "./artifacts.ts";
import { bundleSource } from "./bundle.ts";
import { formatMediaWikiOutput } from "./mediawiki.ts";
import {
    ensureBuildDirectory,
    removeEmptyBuildDirectory,
    validateRetiredBuildDirectory,
} from "./output.ts";
import { loadGadgetBuildPlan } from "./package.ts";
import type { GadgetBuildPlan } from "./types.ts";

/**
 * Builds the minified distributable for a workspace gadget.
 *
 * @param packageRoot - Workspace package directory.
 */
export async function buildGadget(packageRoot: string): Promise<void> {
    const plan = await loadGadgetBuildPlan(packageRoot);
    await assertUniqueWorkspaceArtifacts(packageRoot);
    const outputRoot = resolve(packageRoot, plan.config.outputDirectory);
    assertSharedOutputDirectory(packageRoot, outputRoot);
    const retiredOutputDirectory = createRetiredPackageOutputDirectory(
        packageRoot,
        outputRoot,
        plan.metadata.name,
    );
    await ensureBuildDirectory(outputRoot, "Shared output root");
    const hasRetiredOutputDirectory = await validateRetiredBuildDirectory(
        retiredOutputDirectory,
        "Retired gadget output directory",
    );
    const outputPaths = createOutputPaths(plan, outputRoot);
    const retiredOutputPaths = createOutputPaths(plan, retiredOutputDirectory);
    await cleanBuildOutputs([
        outputPaths,
        ...(hasRetiredOutputDirectory ? [retiredOutputPaths] : []),
    ]);
    if (hasRetiredOutputDirectory) {
        await removeEmptyBuildDirectory(retiredOutputDirectory);
    }

    const minifiedSource = await bundleSource(plan, { minifyText: true });
    const minifiedCode = await minifyBundledSource(minifiedSource);
    await writeBuildOutput(plan, outputPaths.minified, minifiedCode);
}

/**
 * Resolves the retired package directory below the distribution root.
 *
 * @param packageRoot - Workspace package directory.
 * @param outputRoot - Shared workspace distribution directory.
 * @param packageName - Declared package name.
 * @returns Retired package-owned distribution directory.
 */
function createRetiredPackageOutputDirectory(
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
    retiredUserscript: string;
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
        retiredUserscript: resolve(outputDirectory, `${outputName}.user.js`),
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
 * Writes the minified gadget output.
 *
 * @param plan - Resolved gadget build plan.
 * @param outputPath - Exact artifact path owned by the gadget.
 * @param minifiedCode - Minified bundled source.
 */
async function writeBuildOutput(
    plan: GadgetBuildPlan,
    outputPath: string,
    minifiedCode: string,
): Promise<void> {
    const { metadata } = plan;
    const minifiedOutput = formatMediaWikiOutput(
        minifiedCode,
        metadata,
        plan.notices,
    );
    await writeFile(outputPath, minifiedOutput);
}
