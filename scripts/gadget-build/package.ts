/**
 * Loads and validates one gadget package's build configuration.
 */

import { lstat, readFile, realpath } from "node:fs/promises";
import { basename, isAbsolute, relative, resolve, sep } from "node:path";
import type {
    GadgetBuildConfig,
    GadgetBuildPlan,
    PackageMetadata,
    ResolvedGadgetBuildConfig,
} from "./types.ts";

const JAVASCRIPT_IDENTIFIER_PATTERN = /^[A-Za-z_$][\w$]*$/u;
const OUTPUT_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/u;
const AGGREGATE_OUTPUT_NAME = "00-mediawiki-gadgets";
const HEADER_SUMMARY_MAX_LENGTH = 75;
const HEADER_DESCRIPTION_MAX_PARAGRAPHS = 3;

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
    assertPackageIdentity(packageRoot, metadata);
    const config = resolveBuildConfig(metadata);
    const noticePaths = requireNoticeFilePaths(config.noticeFiles);
    const notices = await loadNoticeFiles(packageRoot, noticePaths);
    validateLicenseNotice(metadata, noticePaths, notices);

    return {
        buildTime: now.toISOString(),
        config,
        metadata,
        notices,
        packageRoot,
    };
}

/** Requires package metadata to identify its containing directory. */
function assertPackageIdentity(
    packageRoot: string,
    metadata: PackageMetadata,
): void {
    if (metadata.name !== basename(resolve(packageRoot))) {
        throw new Error(
            "package.json name must match its package directory before build.",
        );
    }
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
    for (const field of [
        "author",
        "description",
        "license",
        "name",
        "version",
    ]) {
        const fieldValue = value[field];
        if (!hasText(fieldValue)) {
            throw new TypeError(`package.json ${field} must be a string.`);
        }
        if (/[\r\n\u2028\u2029]/u.test(fieldValue)) {
            throw new TypeError(`package.json ${field} must fit on one line.`);
        }
        if (fieldValue.includes("*/")) {
            throw new TypeError(
                `package.json ${field} must be JavaScript-comment-safe.`,
            );
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
 * Reads package-owned legal notices without permitting path traversal.
 */
async function loadNoticeFiles(
    packageRoot: string,
    paths: string[],
): Promise<string[]> {
    const root = resolve(packageRoot);
    const realRoot = await realpath(root);
    return Promise.all(
        paths.map((path) => loadNoticeFile(root, realRoot, path)),
    );
}

/** Validates and narrows the configured notice-file list. */
function requireNoticeFilePaths(paths: unknown): string[] {
    if (!Array.isArray(paths)) {
        throw new TypeError("gadgetBuild.noticeFiles must be an array.");
    }
    if (!paths.every(hasText)) {
        throw new TypeError(
            "gadgetBuild.noticeFiles entries must be strings.",
        );
    }
    return paths;
}

/** Loads one package-owned, JavaScript-safe notice. */
async function loadNoticeFile(
    root: string,
    realRoot: string,
    path: string,
): Promise<string> {
    const noticePath = requireContainedPath(root, resolve(root, path));
    const entry = await lstat(noticePath);
    if (!entry.isFile() || entry.isSymbolicLink()) {
        throw new Error("gadgetBuild.noticeFiles must be real files.");
    }
    requireContainedPath(realRoot, await realpath(noticePath));
    const notice = (await readFile(noticePath, "utf8")).trim();
    if (notice === "" || notice.includes("*/")) {
        throw new Error(
            `${path} must contain a nonempty JavaScript-safe notice.`,
        );
    }
    return notice;
}

/** Requires a path to remain below a package directory. */
function requireContainedPath(root: string, path: string): string {
    const localPath = relative(root, path);
    if (
        isAbsolute(localPath) ||
        localPath === ".." ||
        localPath.startsWith(`..${sep}`)
    ) {
        throw new Error(
            "gadgetBuild.noticeFiles must remain inside the package.",
        );
    }
    return path;
}

/** Requires LICENSE to match package release metadata. */
function validateLicenseNotice(
    metadata: PackageMetadata,
    paths: string[],
    notices: string[],
): void {
    const licenseIndex = paths.indexOf("LICENSE");
    if (licenseIndex < 0) {
        throw new Error("gadgetBuild.noticeFiles must include LICENSE.");
    }
    const license = notices[licenseIndex]!;
    const scope = `Release-Scope: ${metadata.name}@${metadata.version}`;
    const identifier = `SPDX-License-Identifier: ${metadata.license}`;
    const lines = new Set(license.split(/\r?\n/u));
    if (!lines.has(scope) || !lines.has(identifier)) {
        throw new Error(
            "Package LICENSE must match its release scope and license.",
        );
    }
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
    if (
        config.headerAuthor != null &&
        typeof config.headerAuthor !== "boolean"
    ) {
        throw new Error("gadgetBuild.headerAuthor must be a boolean.");
    }
    const entryPoint = requireEntryPoint(config, metadata);
    const globalName = requireGlobalName(config);
    const headerDescription = requireHeaderDescription(config, metadata);
    const outputName = requireOutputName(config);
    const outputDirectory = requireOutputDirectory(metadata);
    return {
        ...config,
        entryPoint,
        globalName,
        headerDescription,
        outputDirectory,
        outputName,
    };
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
        const message =
            "gadgetBuild.headerDescription must contain " +
            "1 to 3 safe paragraphs.";
        throw new Error(message);
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
    if (outputName.toLowerCase() === AGGREGATE_OUTPUT_NAME) {
        throw new Error(
            "gadgetBuild.outputName must not reserve the aggregate " +
                `${AGGREGATE_OUTPUT_NAME}.user.js path.`,
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
