/** Validates deployable gadget package metadata. */

import { AGGREGATE_OUTPUT_FILENAME } from "#gadget-build/artifact-names";
import { reservesAggregateArtifact } from "#gadget-build/artifacts";
import {
    isBuildDefineMap,
    isGadgetUserscriptConfig,
    isJavaScriptBindingIdentifier,
    isSupportedPackageLicense,
} from "#gadget-build/metadata-validation";
import { parseMatchPattern } from "#gadget-build/userscript";
import { hasText } from "#workspace/metadata";
import type { GadgetPackage } from "#workspace/types";
import { checkPackageCondition as check } from "./problem.ts";

const REQUIRED_SCRIPTS = ["build", "check", "test"];
const GADGET_BUILD_SCRIPT = "node ../../scripts/gadget-build/cli.ts";
const SEMVER_PATTERN = new RegExp(
    "^(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)" +
        "(?:-(?:dev|post)\\.([1-9]\\d*))?$",
    "u",
);
const OUTPUT_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/u;
const HEADER_SUMMARY_MAX_LENGTH = 75;
const HEADER_DESCRIPTION_MAX_PARAGRAPHS = 3;
export const SHARED_PACKAGE_NAME = "@mediawiki-gadgets/shared";

/** Validates canonical package and build metadata. */
export function checkPackageMetadata(gadget: GadgetPackage): string[] {
    const problems: string[] = [];
    checkCoreMetadata(gadget, problems);
    checkGeneratedMetadata(gadget, problems);
    checkImportAliases(gadget, problems);
    checkBuildMetadata(gadget, problems);
    checkPackageScripts(gadget, problems);
    return problems;
}

/** Validates package identity metadata. */
function checkCoreMetadata(gadget: GadgetPackage, problems: string[]): void {
    const { directoryName: name, metadata } = gadget;
    check(
        metadata.name === name,
        problems,
        name,
        `package.json name must be "${name}".`,
    );
    check(
        metadata.private === true,
        problems,
        name,
        "package.json must keep the workspace package private.",
    );
    check(
        metadata.type === "module",
        problems,
        name,
        'package.json type must be "module".',
    );
    check(
        hasText(metadata.version) && SEMVER_PATTERN.test(metadata.version),
        problems,
        name,
        "version must be SemVer with an optional -dev.N or -post.N suffix.",
    );
}

/** Validates fields copied into generated metadata. */
function checkGeneratedMetadata(
    gadget: GadgetPackage,
    problems: string[],
): void {
    const { directoryName: name, metadata } = gadget;
    check(
        hasText(metadata.author),
        problems,
        name,
        "package.json author must be present for generated metadata.",
    );
    check(
        hasText(metadata.description),
        problems,
        name,
        "package.json description must be present for generated metadata.",
    );
    checkHeaderMetadata(gadget, problems);
    check(
        isSupportedPackageLicense(metadata.license),
        problems,
        name,
        "package.json license must use a supported SPDX identifier.",
    );
    check(
        metadata.main === "./index.ts",
        problems,
        name,
        'package.json main must resolve to "./index.ts".',
    );
    check(
        hasText(metadata.browser),
        problems,
        name,
        "package.json browser must identify the browser entry.",
    );
}

/** Validates short and long generated-header descriptions. */
function checkHeaderMetadata(gadget: GadgetPackage, problems: string[]): void {
    const { directoryName: name, metadata } = gadget;
    check(
        hasText(metadata.description) &&
            [...metadata.description].length <= HEADER_SUMMARY_MAX_LENGTH,
        problems,
        name,
        "package.json description must not exceed 75 characters.",
    );
    check(
        isHeaderDescription(metadata.gadgetBuild.headerDescription),
        problems,
        name,
        "gadgetBuild.headerDescription must contain 1 to 3 safe paragraphs.",
    );
}

/** Checks configured long-description paragraphs. */
function isHeaderDescription(value: unknown): boolean {
    return (
        Array.isArray(value) &&
        value.length >= 1 &&
        value.length <= HEADER_DESCRIPTION_MAX_PARAGRAPHS &&
        value.every(isSafeHeaderParagraph)
    );
}

/** Checks one generated-header paragraph. */
function isSafeHeaderParagraph(value: unknown): value is string {
    return (
        hasText(value) &&
        !/[\r\n\u2028\u2029]/u.test(value) &&
        !value.includes("*/")
    );
}

/** Validates local and shared import aliases. */
function checkImportAliases(gadget: GadgetPackage, problems: string[]): void {
    const { directoryName: name, metadata } = gadget;
    const imports = metadata.imports ?? {};
    check(
        imports["#gadget"] === "./index.ts",
        problems,
        name,
        'package.json imports["#gadget"] must resolve to "./index.ts".',
    );
    check(
        imports["#gadget/*"] === "./*",
        problems,
        name,
        'package.json imports["#gadget/*"] must resolve to "./*".',
    );
    check(
        !Object.keys(imports).some(isLegacyAlias),
        problems,
        name,
        "package.json must not define the legacy #me alias.",
    );
    checkSharedMetadata(gadget, problems);
}

/** Checks whether one package alias is the retired local alias. */
function isLegacyAlias(specifier: string): boolean {
    return specifier === "#me" || specifier.startsWith("#me/");
}

/** Validates the shared alias and dependency together. */
function checkSharedMetadata(gadget: GadgetPackage, problems: string[]): void {
    const { directoryName: name, metadata } = gadget;
    const imports = metadata.imports ?? {};
    const dependency = metadata.dependencies?.[SHARED_PACKAGE_NAME];
    check(
        imports["#shared"] == null,
        problems,
        name,
        "package.json must not define the aggregate #shared alias.",
    );
    check(
        imports["#shared/*"] == null ||
            imports["#shared/*"] === `${SHARED_PACKAGE_NAME}/*`,
        problems,
        name,
        "#shared/* must resolve to the workspace shared package.",
    );
    check(
        (imports["#shared/*"] == null && dependency == null) ||
            (imports["#shared/*"] != null && dependency === "*"),
        problems,
        name,
        "#shared/* and the shared workspace dependency must be declared " +
            "together.",
    );
}

/** Validates build configuration. */
function checkBuildMetadata(gadget: GadgetPackage, problems: string[]): void {
    checkVueOutputMetadata(gadget, problems);
    checkArtifactMetadata(gadget, problems);
    checkBuildEntryMetadata(gadget, problems);
    checkBuildDefines(gadget, problems);
    checkUserscriptMetadata(gadget, problems);
    const { directoryName: name, metadata } = gadget;
    check(
        Array.isArray(metadata.gadgetBuild.noticeFiles) &&
            metadata.gadgetBuild.noticeFiles.every(hasText) &&
            metadata.gadgetBuild.noticeFiles.includes("LICENSE"),
        problems,
        name,
        "gadgetBuild.noticeFiles must retain the package LICENSE.",
    );
    check(
        metadata.gadgetBuild.headerAuthor == null ||
            typeof metadata.gadgetBuild.headerAuthor === "boolean",
        problems,
        name,
        "gadgetBuild.headerAuthor must be a boolean when specified.",
    );
}

/** Validates Vue-compatible output settings. */
function checkVueOutputMetadata(
    gadget: GadgetPackage,
    problems: string[],
): void {
    const { directoryName: name, metadata } = gadget;
    check(
        metadata.gadgetBuild.outputDirectory == null,
        problems,
        name,
        "gadgetBuild.outputDirectory must be consolidated into vue.outputDir.",
    );
    check(
        metadata.vue?.outputDir === "../../dist",
        problems,
        name,
        'vue.outputDir must be "../../dist".',
    );
    check(
        metadata.vue?.assetsDir === "",
        problems,
        name,
        "vue.assetsDir must keep generated assets flat.",
    );
    check(
        metadata.vue?.filenameHashing === false,
        problems,
        name,
        "vue.filenameHashing must keep stable artifact names.",
    );
    check(
        metadata.vue?.css?.extract === false,
        problems,
        name,
        "vue.css.extract must keep gadget styles embedded.",
    );
}

/** Validates generated artifact identifiers. */
function checkArtifactMetadata(
    gadget: GadgetPackage,
    problems: string[],
): void {
    const { directoryName: name, metadata } = gadget;
    const { globalName, outputName, target } = metadata.gadgetBuild;
    check(
        isJavaScriptBindingIdentifier(globalName),
        problems,
        name,
        "gadgetBuild.globalName must be a JavaScript binding identifier.",
    );
    check(
        hasText(outputName) && OUTPUT_NAME_PATTERN.test(outputName),
        problems,
        name,
        "gadgetBuild.outputName must be a safe file basename.",
    );
    check(
        !hasText(outputName) || !reservesAggregateArtifact(outputName),
        problems,
        name,
        "gadgetBuild.outputName must not reserve the aggregate " +
            `${AGGREGATE_OUTPUT_FILENAME} path.`,
    );
    check(
        target == null || target === "es2024",
        problems,
        name,
        "gadgetBuild.target must be es2024 when specified.",
    );
}

/** Validates build-time injected text declarations. */
function checkBuildDefines(gadget: GadgetPackage, problems: string[]): void {
    const { directoryName: name } = gadget;
    const value = gadget.metadata.gadgetBuild.defines;
    check(
        value == null || isBuildDefineMap(value),
        problems,
        name,
        "gadgetBuild.defines must map names to nonempty textFile values.",
    );
}

/** Validates the manifest-facing aggregate userscript settings. */
function checkUserscriptMetadata(
    gadget: GadgetPackage,
    problems: string[],
): void {
    const { directoryName: name } = gadget;
    const value = gadget.metadata.gadgetBuild.userscript;
    check(
        value == null || isGadgetUserscriptConfig(value),
        problems,
        name,
        "gadgetBuild.userscript must contain only safe grant, match, " +
            "runAt, and sandbox values.",
    );
    check(
        value == null ||
            !isGadgetUserscriptConfig(value) ||
            hasSupportedMatchPatterns(value.match, name),
        problems,
        name,
        "gadgetBuild.userscript.match must use supported HTTP patterns.",
    );
}

/** Checks every configured match against the aggregate grammar. */
function hasSupportedMatchPatterns(
    matches: string[] | undefined,
    packageName: string,
): boolean {
    try {
        for (const match of matches ?? []) {
            parseMatchPattern(match, packageName);
        }
        return true;
    } catch {
        return false;
    }
}

/** Validates the browser source selected by the builder. */
function checkBuildEntryMetadata(
    gadget: GadgetPackage,
    problems: string[],
): void {
    const { directoryName: name, metadata } = gadget;
    const entryPoint =
        metadata.gadgetBuild.entryPoint ?? metadata.browser ?? metadata.main;
    check(
        hasText(entryPoint),
        problems,
        name,
        "package.json must resolve one gadget entry point.",
    );
    check(
        entryPoint === metadata.browser,
        problems,
        name,
        "the gadget build entry point must match package.json browser.",
    );
}

/** Validates scripts required by the package workflow. */
function checkPackageScripts(gadget: GadgetPackage, problems: string[]): void {
    const { directoryName: name, metadata } = gadget;
    check(
        metadata.scripts?.build === GADGET_BUILD_SCRIPT,
        problems,
        name,
        `package.json scripts.build must be "${GADGET_BUILD_SCRIPT}".`,
    );
    for (const script of REQUIRED_SCRIPTS) {
        check(
            hasText(metadata.scripts?.[script]),
            problems,
            name,
            `package.json scripts.${script} must be present.`,
        );
    }
}

/** Checks whether a package uses the shared source package. */
export function usesSharedRuntime(gadget: GadgetPackage): boolean {
    return (
        gadget.metadata.imports?.["#shared/*"] ===
            `${SHARED_PACKAGE_NAME}/*` &&
        gadget.metadata.dependencies?.[SHARED_PACKAGE_NAME] === "*"
    );
}

/** Exposes the supported package version syntax to sibling checks. */
export function matchesPackageVersion(value: unknown): value is string {
    return hasText(value) && SEMVER_PATTERN.test(value);
}
