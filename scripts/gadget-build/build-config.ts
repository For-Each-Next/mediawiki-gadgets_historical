/** Resolves the build configuration declared by one gadget package. */

import { hasText, isRecord } from "#workspace/metadata";
import { AGGREGATE_OUTPUT_FILENAME } from "./artifact-names.ts";
import { reservesAggregateArtifact } from "./artifacts.ts";
import {
    isBuildDefineMap,
    isJavaScriptBindingIdentifier,
    isSafeUserscriptMetadataText,
    isSafeUserscriptMetadataTextArray,
    isSupportedGadgetUserscriptField,
} from "./metadata-validation.ts";
import type {
    GadgetBuildConfig,
    PackageMetadata,
    ResolvedGadgetBuildConfig,
} from "./types.ts";

const OUTPUT_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/u;
const HEADER_SUMMARY_MAX_LENGTH = 75;
const HEADER_DESCRIPTION_MAX_PARAGRAPHS = 3;

/** Resolves all required build values from package metadata. */
export function resolveBuildConfig(
    metadata: PackageMetadata,
): ResolvedGadgetBuildConfig {
    const config = metadata.gadgetBuild;
    validateOptionalSettings(config);
    return {
        ...config,
        entryPoint: requireEntryPoint(config, metadata),
        globalName: requireGlobalName(config),
        headerDescription: requireHeaderDescription(config, metadata),
        outputDirectory: requireOutputDirectory(metadata),
        outputName: requireOutputName(config),
    };
}

/** Validates optional settings before their defaults are applied. */
function validateOptionalSettings(config: GadgetBuildConfig): void {
    if (hasUnsupportedTarget(config.target)) {
        throw new Error("gadgetBuild.target must be es2024.");
    }
    if (hasInvalidHeaderAuthor(config.headerAuthor)) {
        throw new Error("gadgetBuild.headerAuthor must be a boolean.");
    }
    validateDefines(config.defines);
    validateUserscriptConfig(config.userscript);
}

/** Checks a declared build target before defaulting. */
function hasUnsupportedTarget(target: unknown): boolean {
    return target != null && target !== "es2024";
}

/** Checks a declared header-author flag before defaulting. */
function hasInvalidHeaderAuthor(value: unknown): boolean {
    return value != null && typeof value !== "boolean";
}

/** Validates all build-time injected-text declarations. */
function validateDefines(value: unknown): void {
    if (value == null) {
        return;
    }
    if (!isBuildDefineMap(value)) {
        throw new TypeError(
            "gadgetBuild.defines must map names to textFile values.",
        );
    }
}

/** Validates userscript metadata before aggregate planning. */
function validateUserscriptConfig(value: unknown): void {
    if (value == null) {
        return;
    }
    if (!isRecord(value)) {
        throw new TypeError("gadgetBuild.userscript must be an object.");
    }
    for (const field of Object.keys(value)) {
        if (!isSupportedGadgetUserscriptField(field)) {
            throw new TypeError(
                `gadgetBuild.userscript.${field} is not supported.`,
            );
        }
    }
    for (const field of ["grant", "match"] as const) {
        validateUserscriptList(value, field);
    }
    for (const field of ["runAt", "sandbox"] as const) {
        validateUserscriptText(value, field);
    }
}

/** Validates one optional userscript list field. */
function validateUserscriptList(
    config: Record<string, unknown>,
    field: "grant" | "match",
): void {
    const value = config[field];
    if (value != null && !isSafeUserscriptMetadataTextArray(value)) {
        throw new TypeError(
            `gadgetBuild.userscript.${field} must be a single-line ` +
                "text array.",
        );
    }
}

/** Validates one optional userscript scalar field. */
function validateUserscriptText(
    config: Record<string, unknown>,
    field: "runAt" | "sandbox",
): void {
    const value = config[field];
    if (value != null && !isSafeUserscriptMetadataText(value)) {
        throw new TypeError(
            `gadgetBuild.userscript.${field} must be nonempty single-line ` +
                "text.",
        );
    }
}

/** Requires a short summary and one to three safe detail paragraphs. */
function requireHeaderDescription(
    config: GadgetBuildConfig,
    metadata: PackageMetadata,
): string[] {
    if ([...metadata.description].length > HEADER_SUMMARY_MAX_LENGTH) {
        throw new Error("package.json description must not exceed 75 chars.");
    }
    const paragraphs = config.headerDescription;
    if (
        !Array.isArray(paragraphs) ||
        paragraphs.length < 1 ||
        paragraphs.length > HEADER_DESCRIPTION_MAX_PARAGRAPHS ||
        !paragraphs.every(isSafeHeaderParagraph)
    ) {
        throw new Error(
            "gadgetBuild.headerDescription must contain 1 to 3 safe " +
                "paragraphs.",
        );
    }
    return paragraphs;
}

/** Checks one configured header paragraph. */
function isSafeHeaderParagraph(value: unknown): value is string {
    return (
        hasText(value) &&
        !/[\r\n\u2028\u2029]/u.test(value) &&
        !value.includes("*/")
    );
}

/** Resolves the Vue-compatible shared distribution path. */
function requireOutputDirectory(metadata: PackageMetadata): string {
    const vue = metadata.vue;
    if (!hasFlatEmbeddedVueOutput(vue)) {
        throw new Error(
            "package.json vue settings must keep flat, embedded assets.",
        );
    }
    if (!hasText(vue.outputDir)) {
        throw new Error("package.json vue.outputDir must be defined.");
    }
    return vue.outputDir;
}

/** Checks Vue output settings shared by every gadget. */
function hasFlatEmbeddedVueOutput(
    vue: PackageMetadata["vue"],
): vue is NonNullable<PackageMetadata["vue"]> {
    return (
        vue?.assetsDir === "" &&
        vue.filenameHashing === false &&
        vue.css?.extract === false
    );
}

/** Resolves the required browser entry point. */
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

/** Validates the required JavaScript global identifier. */
function requireGlobalName(config: GadgetBuildConfig): string {
    const { globalName } = config;
    if (!hasText(globalName)) {
        throw new Error("gadgetBuild.globalName must be defined.");
    }
    if (!isJavaScriptBindingIdentifier(globalName)) {
        throw new Error(
            "gadgetBuild.globalName must be a JavaScript binding identifier.",
        );
    }
    return globalName;
}

/** Validates the generated JavaScript file basename. */
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
    if (reservesAggregateArtifact(outputName)) {
        throw new Error(
            "gadgetBuild.outputName must not reserve the aggregate " +
                `${AGGREGATE_OUTPUT_FILENAME} path.`,
        );
    }
    return outputName;
}
