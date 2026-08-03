/**
 * Validates the release contract shared by every gadget package.
 */

import { readdir, readFile } from "node:fs/promises";
import { basename, join, relative, sep } from "node:path";
import { pathToFileURL } from "node:url";

const REQUIRED_FILES = [
    "AGENTS.md",
    "CHANGELOG.md",
    "README.md",
    "index.ts",
    "main.ts",
];
const REQUIRED_README_SECTIONS = [
    "Run",
    "Features",
    "Development",
    "Architecture",
    "License",
];
const REQUIRED_SCRIPTS = ["build", "check", "test"];
const GADGET_BUILD_SCRIPT = "node ../../scripts/gadget-build/cli.ts";
const FORBIDDEN_TOP_LEVEL_DIRECTORIES = new Map([
    ["app", "use main.ts and responsibility-named modules"],
]);
const FORBIDDEN_RESPONSIBILITY_NAME_PATTERN =
    /^(?:common|helpers|utils)(?:\.ts)?$/u;
const SEMVER_PATTERN = new RegExp(
    "^(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)" +
        "(?:-(?:dev|post)\\.([1-9]\\d*))?$",
    "u",
);
const CHANGELOG_HEADING_PATTERN =
    /^### (\S+) \(\d{4}-\d{2}-\d{2} \d{2}:\d{2} UTC\)$/mu;
const JAVASCRIPT_IDENTIFIER_PATTERN = /^[A-Za-z_$][\w$]*$/u;
const OUTPUT_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/u;
const START_IMPORT_PATTERN =
    /import\s*\{\s*start\s*\}\s*from\s*["']#gadget\/main\.ts["']/su;

interface GadgetBuildMetadata {
    entryPoint?: string;
    globalName?: string;
    outputDirectory?: unknown;
    outputName?: string;
    target?: unknown;
}

interface VueMetadata {
    assetsDir?: unknown;
    css?: {
        extract?: unknown;
    };
    filenameHashing?: unknown;
    outputDir?: unknown;
}

interface PackageMetadata {
    author?: string;
    browser?: string;
    description?: string;
    gadgetBuild?: GadgetBuildMetadata;
    imports?: Record<string, string>;
    name?: string;
    main?: string;
    private?: boolean;
    scripts?: Record<string, string>;
    type?: string;
    version?: string;
    vue?: VueMetadata;
}

export interface PackageContractResult {
    gadgetCount: number;
    problems: string[];
}

/**
 * Validates deployable packages below a workspace source directory.
 *
 * @param workspaceRoot - Repository root containing `src/`.
 * @returns Gadget count and all contract violations.
 */
export async function checkGadgetPackages(
    workspaceRoot: string,
): Promise<PackageContractResult> {
    const sourceRoot = join(workspaceRoot, "src");
    const entries = await readdir(sourceRoot, { withFileTypes: true });
    const packageDirectories = entries
        .filter((entry) => entry.isDirectory())
        .map((entry) => join(sourceRoot, entry.name));
    const packages = await Promise.all(
        packageDirectories.map(readPackageCandidate),
    );
    const gadgets = packages.filter(isGadgetPackage);
    const results = await Promise.all(
        gadgets.map(({ directory, metadata }) =>
            checkGadgetPackage(directory, metadata),
        ),
    );

    return {
        gadgetCount: gadgets.length,
        problems: results.flat(),
    };
}

/**
 * Reads a possible workspace package.
 *
 * @param directory - Candidate package directory.
 * @returns Parsed package metadata, when present.
 */
async function readPackageCandidate(
    directory: string,
): Promise<{ directory: string; metadata: PackageMetadata | null }> {
    try {
        const source = await readFile(join(directory, "package.json"), "utf8");
        return {
            directory,
            metadata: JSON.parse(source) as PackageMetadata,
        };
    } catch (error) {
        if (hasErrorCode(error, "ENOENT")) {
            return { directory, metadata: null };
        }
        throw error;
    }
}

/**
 * Identifies package metadata for a deployable gadget.
 *
 * @param candidate - Possible package metadata.
 * @returns Whether the package declares `gadgetBuild`.
 */
function isGadgetPackage(candidate: {
    directory: string;
    metadata: PackageMetadata | null;
}): candidate is { directory: string; metadata: PackageMetadata } {
    return candidate.metadata?.gadgetBuild != null;
}

/**
 * Validates one gadget's metadata, structure, README, and changelog.
 *
 * @param directory - Gadget package directory.
 * @param metadata - Parsed package metadata.
 * @returns Package-scoped violations.
 */
async function checkGadgetPackage(
    directory: string,
    metadata: PackageMetadata,
): Promise<string[]> {
    const packageName = basename(directory);
    const problems: string[] = [];

    checkPackageMetadata(packageName, metadata, problems);
    await checkRequiredPaths(directory, problems);
    await checkBrowserEntry(directory, packageName, metadata, problems);
    await checkReadme(directory, packageName, metadata, problems);
    await checkChangelog(directory, packageName, metadata, problems);

    return problems;
}

/**
 * Checks that the browser bundle starts the gadget without exporting
 * internals.
 *
 * @param directory - Gadget package directory.
 * @param packageName - Gadget package name.
 * @param metadata - Parsed package metadata.
 * @param problems - Mutable problem collection.
 */
async function checkBrowserEntry(
    directory: string,
    packageName: string,
    metadata: PackageMetadata,
    problems: string[],
): Promise<void> {
    const entryPoint =
        metadata.gadgetBuild?.entryPoint ?? metadata.browser ?? metadata.main;
    if (!hasText(entryPoint)) {
        return;
    }
    const source = await readBrowserEntry(
        directory,
        packageName,
        entryPoint,
        problems,
    );
    if (source != null) {
        checkBrowserEntrySource(source, packageName, problems);
    }
}

/**
 * Reads one browser entry and records a missing path.
 *
 * @param directory - Directory to inspect.
 * @param packageName - Package name value.
 * @param entryPoint - Entry point value.
 * @param problems - Problems value.
 * @returns Read browser entry and records a missing path.
 */
async function readBrowserEntry(
    directory: string,
    packageName: string,
    entryPoint: string,
    problems: string[],
): Promise<string | null> {
    try {
        return await readFile(join(directory, entryPoint), "utf8");
    } catch (error) {
        if (hasErrorCode(error, "ENOENT")) {
            problems.push(
                `${packageName}: browser entry does not exist: ${entryPoint}.`,
            );
            return null;
        }
        throw error;
    }
}

/**
 * Validates startup and encapsulation in browser entry source.
 *
 * @param source - Source text.
 * @param packageName - Package name value.
 * @param problems - Problems value.
 */
function checkBrowserEntrySource(
    source: string,
    packageName: string,
    problems: string[],
): void {
    check(
        !/^\s*export\b/mu.test(source),
        problems,
        packageName,
        "browser entry must not expose private operations on the gadget " +
            "global.",
    );
    check(
        START_IMPORT_PATTERN.test(source),
        problems,
        packageName,
        'browser entry must import { start } from "#gadget/main.ts".',
    );
    const sourceWithoutImport = source.replace(START_IMPORT_PATTERN, "");
    check(
        /\bstart\s*[()]/u.test(sourceWithoutImport),
        problems,
        packageName,
        "browser entry must invoke the imported start function.",
    );
}

/**
 * Validates canonical package and build metadata.
 *
 * @param packageName - Directory-derived package name.
 * @param metadata - Parsed package metadata.
 * @param problems - Mutable problem collection.
 */
function checkPackageMetadata(
    packageName: string,
    metadata: PackageMetadata,
    problems: string[],
): void {
    checkCoreMetadata(packageName, metadata, problems);
    checkGeneratedMetadata(packageName, metadata, problems);
    checkImportAliases(packageName, metadata, problems);
    checkBuildMetadata(packageName, metadata, problems);
    checkPackageScripts(packageName, metadata, problems);
}

/**
 * Validates canonical package identity metadata.
 *
 * @param packageName - Directory-derived package name.
 * @param metadata - Parsed package metadata.
 * @param problems - Mutable problem collection.
 */
function checkCoreMetadata(
    packageName: string,
    metadata: PackageMetadata,
    problems: string[],
): void {
    check(
        metadata.name === packageName,
        problems,
        packageName,
        `package.json name must be "${packageName}".`,
    );
    check(
        metadata.private === true,
        problems,
        packageName,
        "package.json must keep the workspace package private.",
    );
    check(
        metadata.type === "module",
        problems,
        packageName,
        'package.json type must be "module".',
    );
    check(
        metadata.version != null && SEMVER_PATTERN.test(metadata.version),
        problems,
        packageName,
        "version must be SemVer with an optional -dev.N or -post.N suffix.",
    );
}

/**
 * Validates package fields copied into entries and generated metadata.
 *
 * @param packageName - Package name value.
 * @param metadata - Citation metadata.
 * @param problems - Problems value.
 */
function checkGeneratedMetadata(
    packageName: string,
    metadata: PackageMetadata,
    problems: string[],
): void {
    check(
        hasText(metadata.author),
        problems,
        packageName,
        "package.json author must be present for generated metadata.",
    );
    check(
        hasText(metadata.description),
        problems,
        packageName,
        "package.json description must be present for generated metadata.",
    );
    check(
        metadata.main === "./index.ts",
        problems,
        packageName,
        'package.json main must resolve to "./index.ts".',
    );
    check(
        hasText(metadata.browser),
        problems,
        packageName,
        "package.json browser must identify the browser entry.",
    );
}

/**
 * Validates the common package-local import aliases.
 *
 * @param packageName - Directory-derived package name.
 * @param metadata - Parsed package metadata.
 * @param problems - Mutable problem collection.
 */
function checkImportAliases(
    packageName: string,
    metadata: PackageMetadata,
    problems: string[],
): void {
    check(
        metadata.imports?.["#gadget"] === "./index.ts",
        problems,
        packageName,
        'package.json imports["#gadget"] must resolve to "./index.ts".',
    );
    check(
        metadata.imports?.["#gadget/*"] === "./*",
        problems,
        packageName,
        'package.json imports["#gadget/*"] must resolve to "./*".',
    );
    check(
        !Object.keys(metadata.imports ?? {}).some(
            (specifier) => specifier === "#me" || specifier.startsWith("#me/"),
        ),
        problems,
        packageName,
        "package.json must not define the legacy #me alias.",
    );
    const sharedEntry = metadata.imports?.["#shared"];
    const sharedSubpaths = metadata.imports?.["#shared/*"];
    check(
        (sharedEntry == null && sharedSubpaths == null) ||
            (sharedEntry === "@mediawiki-gadgets/shared" &&
                sharedSubpaths === "@mediawiki-gadgets/shared/*"),
        problems,
        packageName,
        "#shared and #shared/* must be absent together or use the workspace " +
            "shared package.",
    );
}

/**
 * Validates required gadget build metadata.
 *
 * @param packageName - Directory-derived package name.
 * @param metadata - Parsed package metadata.
 * @param problems - Mutable problem collection.
 */
function checkBuildMetadata(
    packageName: string,
    metadata: PackageMetadata,
    problems: string[],
): void {
    checkBuildOutputMetadata(packageName, metadata, problems);
    checkBuildEntryMetadata(packageName, metadata, problems);
}

/**
 * Validates generated file and global identifiers.
 *
 * @param packageName - Package name value.
 * @param metadata - Citation metadata.
 * @param problems - Problems value.
 */
function checkBuildOutputMetadata(
    packageName: string,
    metadata: PackageMetadata,
    problems: string[],
): void {
    checkVueOutputMetadata(packageName, metadata, problems);
    checkArtifactOutputMetadata(packageName, metadata, problems);
}

/**
 * Validates Vue-compatible settings consumed by the native builder.
 *
 * @param packageName - Package name value.
 * @param metadata - Citation metadata.
 * @param problems - Problems value.
 */
function checkVueOutputMetadata(
    packageName: string,
    metadata: PackageMetadata,
    problems: string[],
): void {
    check(
        metadata.gadgetBuild?.outputDirectory == null,
        problems,
        packageName,
        "gadgetBuild.outputDirectory must be consolidated into vue.outputDir.",
    );
    check(
        metadata.vue?.outputDir === "../../dist",
        problems,
        packageName,
        'vue.outputDir must be "../../dist".',
    );
    check(
        metadata.vue?.assetsDir === "",
        problems,
        packageName,
        "vue.assetsDir must keep generated assets flat.",
    );
    check(
        metadata.vue?.filenameHashing === false,
        problems,
        packageName,
        "vue.filenameHashing must keep stable artifact names.",
    );
    check(
        metadata.vue?.css?.extract === false,
        problems,
        packageName,
        "vue.css.extract must keep gadget styles embedded.",
    );
}

/**
 * Validates artifact basenames, globals, and JavaScript targets.
 *
 * @param packageName - Package name value.
 * @param metadata - Citation metadata.
 * @param problems - Problems value.
 */
function checkArtifactOutputMetadata(
    packageName: string,
    metadata: PackageMetadata,
    problems: string[],
): void {
    check(
        hasText(metadata.gadgetBuild?.globalName) &&
            JAVASCRIPT_IDENTIFIER_PATTERN.test(
                metadata.gadgetBuild.globalName,
            ),
        problems,
        packageName,
        "gadgetBuild.globalName must be a JavaScript identifier.",
    );
    check(
        hasText(metadata.gadgetBuild?.outputName) &&
            OUTPUT_NAME_PATTERN.test(metadata.gadgetBuild.outputName),
        problems,
        packageName,
        "gadgetBuild.outputName must be a safe file basename.",
    );
    check(
        metadata.gadgetBuild?.target == null ||
            metadata.gadgetBuild.target === "es2024",
        problems,
        packageName,
        "gadgetBuild.target must be es2024 when specified.",
    );
}

/**
 * Validates the browser source selected by the builder.
 *
 * @param packageName - Package name value.
 * @param metadata - Citation metadata.
 * @param problems - Problems value.
 */
function checkBuildEntryMetadata(
    packageName: string,
    metadata: PackageMetadata,
    problems: string[],
): void {
    const entryPoint =
        metadata.gadgetBuild?.entryPoint ?? metadata.browser ?? metadata.main;
    check(
        hasText(entryPoint),
        problems,
        packageName,
        "package.json must resolve one gadget entry point.",
    );
    check(
        entryPoint === metadata.browser,
        problems,
        packageName,
        "the gadget build entry point must match package.json browser.",
    );
}

/**
 * Validates scripts required by the package workflow.
 *
 * @param packageName - Directory-derived package name.
 * @param metadata - Parsed package metadata.
 * @param problems - Mutable problem collection.
 */
function checkPackageScripts(
    packageName: string,
    metadata: PackageMetadata,
    problems: string[],
): void {
    check(
        metadata.scripts?.build === GADGET_BUILD_SCRIPT,
        problems,
        packageName,
        `package.json scripts.build must be "${GADGET_BUILD_SCRIPT}".`,
    );
    for (const script of REQUIRED_SCRIPTS) {
        check(
            hasText(metadata.scripts?.[script]),
            problems,
            packageName,
            `package.json scripts.${script} must be present.`,
        );
    }
}

/**
 * Checks the common layer and package-entry paths.
 *
 * @param directory - Gadget package directory.
 * @param problems - Mutable problem collection.
 */
async function checkRequiredPaths(
    directory: string,
    problems: string[],
): Promise<void> {
    const packageName = basename(directory);
    const entries = new Set(await readdir(directory));
    for (const path of REQUIRED_FILES) {
        check(
            entries.has(path),
            problems,
            packageName,
            `missing required package path: ${path}.`,
        );
    }
    for (const [path, guidance] of FORBIDDEN_TOP_LEVEL_DIRECTORIES) {
        check(
            !entries.has(path),
            problems,
            packageName,
            `${path}/ is not a package responsibility; ${guidance}.`,
        );
    }
    const genericPaths = await findGenericPaths(directory);
    for (const path of genericPaths) {
        problems.push(
            `${packageName}: replace generic path ${path} with a ` +
                "responsibility name.",
        );
    }
}

/**
 * Finds generic module and directory names below one gadget.
 *
 * @param directory - Directory to inspect.
 * @param packageRoot - Gadget package directory.
 * @returns Generic module and directory names below one gadget.
 */
async function findGenericPaths(
    directory: string,
    packageRoot: string = directory,
): Promise<string[]> {
    const entries = await readdir(directory, { withFileTypes: true });
    const paths: string[] = [];
    for (const entry of entries) {
        const path = join(directory, entry.name);
        if (FORBIDDEN_RESPONSIBILITY_NAME_PATTERN.test(entry.name)) {
            paths.push(relative(packageRoot, path).split(sep).join("/"));
        }
        if (entry.isDirectory()) {
            paths.push(...(await findGenericPaths(path, packageRoot)));
        }
    }
    return paths;
}

/**
 * Checks the common package README structure and cross-links.
 *
 * @param directory - Gadget package directory.
 * @param packageName - Gadget package name.
 * @param metadata - Parsed package metadata.
 * @param problems - Mutable problem collection.
 */
async function checkReadme(
    directory: string,
    packageName: string,
    metadata: PackageMetadata,
    problems: string[],
): Promise<void> {
    const readme = await readFile(join(directory, "README.md"), "utf8");

    check(
        /^# [^\n]+\n/u.test(readme),
        problems,
        packageName,
        "README.md must begin with one package title.",
    );
    checkReadmeSections(readme, packageName, problems);
    checkReadmeLinks(readme, packageName, problems);
    check(
        readme.includes(`npm run build -w ${metadata.name}`),
        problems,
        packageName,
        "README.md must show the package build command.",
    );
    check(
        readme.includes("```text"),
        problems,
        packageName,
        "README.md architecture must include a text dependency tree.",
    );
    check(
        readme.includes("main.ts"),
        problems,
        packageName,
        "README.md architecture must identify the composition root.",
    );
}

/**
 * Checks the required README sections.
 *
 * @param readme - Package README source.
 * @param packageName - Gadget package name.
 * @param problems - Mutable problem collection.
 */
function checkReadmeSections(
    readme: string,
    packageName: string,
    problems: string[],
): void {
    for (const section of REQUIRED_README_SECTIONS) {
        check(
            readme.includes(`\n## ${section}\n`),
            problems,
            packageName,
            `README.md must contain "## ${section}".`,
        );
    }
}

/**
 * Checks the required package-document links.
 *
 * @param readme - Package README source.
 * @param packageName - Gadget package name.
 * @param problems - Mutable problem collection.
 */
function checkReadmeLinks(
    readme: string,
    packageName: string,
    problems: string[],
): void {
    for (const link of [
        "CHANGELOG.md",
        "AGENTS.md",
        "../../AGENTS.md",
        "../../LICENSE",
    ]) {
        check(
            readme.includes(link),
            problems,
            packageName,
            `README.md must link to ${link}.`,
        );
    }
}

/**
 * Checks that active changelog metadata matches the package version.
 *
 * @param directory - Gadget package directory.
 * @param packageName - Gadget package name.
 * @param metadata - Parsed package metadata.
 * @param problems - Mutable problem collection.
 */
async function checkChangelog(
    directory: string,
    packageName: string,
    metadata: PackageMetadata,
    problems: string[],
): Promise<void> {
    const changelog = await readFile(join(directory, "CHANGELOG.md"), "utf8");
    const heading = CHANGELOG_HEADING_PATTERN.exec(changelog);
    const versionMatch = metadata.version?.match(SEMVER_PATTERN);
    const nextMinor = versionMatch
        ? `${versionMatch[1]}.${Number(versionMatch[2]) + 1}`
        : null;

    check(
        changelog.startsWith("# Changelog\n"),
        problems,
        packageName,
        'CHANGELOG.md must begin with "# Changelog".',
    );
    check(
        heading?.[1] === metadata.version,
        problems,
        packageName,
        "active CHANGELOG.md version must match package.json.",
    );
    if (heading != null) {
        const overviewStart = heading.index + heading[0].length;
        check(
            changelog.slice(overviewStart).startsWith("\n\nOverview: "),
            problems,
            packageName,
            "active changelog entry must begin with an Overview paragraph.",
        );
    }
    check(
        nextMinor != null && changelog.includes(`\n## Until ${nextMinor}\n`),
        problems,
        packageName,
        "active changelog group must use the next minor-version boundary.",
    );
}

/**
 * Adds a package-scoped validation problem when a condition is false.
 *
 * @param condition - Contract condition.
 * @param problems - Mutable problem collection.
 * @param packageName - Gadget package name.
 * @param message - Violation message.
 */
function check(
    condition: boolean,
    problems: string[],
    packageName: string,
    message: string,
): void {
    if (!condition) {
        problems.push(`${packageName}: ${message}`);
    }
}

/**
 * Checks whether a value is a nonempty string.
 *
 * @param value - Possible text.
 * @returns Whether the value contains non-whitespace text.
 */
function hasText(value: unknown): value is string {
    return typeof value === "string" && value.trim() !== "";
}

/**
 * Checks an unknown exception for a Node error code.
 *
 * @param error - Unknown exception.
 * @param code - Expected Node error code.
 * @returns Whether the exception carries the expected code.
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
 * Runs package validation when this module is the process entry point.
 */
async function main(): Promise<void> {
    const result = await checkGadgetPackages(process.cwd());
    if (result.problems.length > 0) {
        throw new Error(
            `Gadget package contract failed:\n${result.problems.join("\n")}`,
        );
    }
    console.log(`Validated ${result.gadgetCount} gadget packages.`);
}

const entryUrl =
    process.argv[1] == null ? null : pathToFileURL(process.argv[1]).href;
if (entryUrl === import.meta.url) {
    await main();
}
