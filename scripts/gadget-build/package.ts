/**
 * Loads and validates one gadget package's build configuration.
 */

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type {
    GadgetBuildConfig,
    GadgetBuildPlan,
    PackageMetadata,
    ResolvedGadgetBuildConfig,
} from "./types.ts";

const JAVASCRIPT_IDENTIFIER_PATTERN = /^[A-Za-z_$][\w$]*$/u;
const OUTPUT_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/u;

/**
 * Loads a package and resolves the values needed for one build.
 *
 * @param packageRoot - Workspace package directory.
 * @param now - Build timestamp source.
 * @returns Validated gadget build plan.
 */
export async function loadGadgetBuildPlan(
    packageRoot: string,
    now: Date = new Date(),
): Promise<GadgetBuildPlan> {
    const packagePath = resolve(packageRoot, "package.json");
    const packageText = await readFile(packagePath, "utf8");
    const metadata = parsePackageMetadata(JSON.parse(packageText) as unknown);
    const config = resolveBuildConfig(metadata);

    return {
        buildTime: now.toISOString(),
        config,
        metadata,
        packageRoot,
    };
}

/**
 * Validates package metadata received from JSON.
 *
 * @param value - Parsed package JSON.
 * @returns Typed package metadata.
 */
function parsePackageMetadata(value: unknown): PackageMetadata {
    if (!isRecord(value)) {
        throw new TypeError("package.json must contain an object.");
    }
    for (const field of ["author", "description", "name", "version"]) {
        if (!hasText(value[field])) {
            throw new TypeError(`package.json ${field} must be a string.`);
        }
    }
    if (!isRecord(value.gadgetBuild)) {
        throw new TypeError(
            "package.json must define gadgetBuild configuration.",
        );
    }
    return value as unknown as PackageMetadata;
}

/**
 * Resolves required build values from package metadata.
 *
 * @param metadata - Validated package metadata.
 * @returns Build configuration with required values.
 */
function resolveBuildConfig(
    metadata: PackageMetadata,
): ResolvedGadgetBuildConfig {
    const config: GadgetBuildConfig = metadata.gadgetBuild;
    if (config.target != null && config.target !== "es2024") {
        throw new Error("gadgetBuild.target must be es2024.");
    }
    const entryPoint = requireEntryPoint(config, metadata);
    const globalName = requireGlobalName(config);
    const outputName = requireOutputName(config);
    const outputDirectory = requireOutputDirectory(metadata);
    return {
        ...config,
        entryPoint,
        globalName,
        outputDirectory,
        outputName,
    };
}

/**
 * Resolves the Vue-compatible shared distribution path.
 *
 * @param metadata - Citation metadata.
 * @returns Resolved the Vue-compatible shared distribution path.
 */
function requireOutputDirectory(metadata: PackageMetadata): string {
    const vue = metadata.vue;
    if (
        vue?.assetsDir !== "" ||
        vue.filenameHashing !== false ||
        vue.css?.extract !== false
    ) {
        throw new Error(
            "package.json vue settings must keep flat, embedded assets.",
        );
    }
    const outputDirectory = vue.outputDir;
    if (!hasText(outputDirectory)) {
        throw new Error("package.json vue.outputDir must be defined.");
    }
    return outputDirectory;
}

/**
 * Resolves the required browser entry point.
 *
 * @param config - Operation configuration.
 * @param metadata - Citation metadata.
 * @returns Resolved the required browser entry point.
 */
function requireEntryPoint(
    config: GadgetBuildConfig,
    metadata: PackageMetadata,
): string {
    const entryPoint = config.entryPoint ?? metadata.browser ?? metadata.main;
    if (!hasText(entryPoint)) {
        throw new Error(
            "gadgetBuild.entryPoint, browser, or main must be defined.",
        );
    }
    return entryPoint;
}

/**
 * Validates the required JavaScript global identifier.
 *
 * @param config - Operation configuration.
 * @returns Resulting text.
 */
function requireGlobalName(config: GadgetBuildConfig): string {
    const { globalName } = config;
    if (!hasText(globalName)) {
        throw new Error("gadgetBuild.globalName must be defined.");
    }
    if (!JAVASCRIPT_IDENTIFIER_PATTERN.test(globalName)) {
        throw new Error(
            "gadgetBuild.globalName must be a JavaScript identifier.",
        );
    }
    return globalName;
}

/**
 * Validates the generated JavaScript file basename.
 *
 * @param config - Operation configuration.
 * @returns Resulting text.
 */
function requireOutputName(config: GadgetBuildConfig): string {
    const { outputName } = config;
    if (!hasText(outputName)) {
        throw new Error("gadgetBuild.outputName must be defined.");
    }
    if (!OUTPUT_NAME_PATTERN.test(outputName)) {
        throw new Error(
            "gadgetBuild.outputName must be a safe file basename.",
        );
    }
    return outputName;
}

/**
 * Checks whether a value is an object record.
 *
 * @param value - Unknown value.
 * @returns Whether the value is a record.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value != null && !Array.isArray(value);
}

/**
 * Checks whether a value contains non-whitespace text.
 *
 * @param value - Unknown value.
 * @returns Whether the value is nonempty text.
 */
function hasText(value: unknown): value is string {
    return typeof value === "string" && value.trim() !== "";
}
