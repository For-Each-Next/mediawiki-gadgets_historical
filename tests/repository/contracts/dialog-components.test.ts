/** Enforces repository-wide dialog component ownership. */

import assert from "node:assert/strict";
import { readFileSync, readdirSync, type Dirent } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { compileTemplate, parse } from "@vue/compiler-sfc";
import postcss, { type Rule } from "postcss";
import selectorParser from "postcss-selector-parser";
import {
    discoverGadgetPackages,
    type GadgetPackage,
} from "../../../scripts/workspace/index.ts";

interface DialogPackage {
    dialogs: string[];
    gadget: GadgetPackage;
}

interface TextDefinition {
    textFile: string;
}

interface SelectorScope {
    file: string;
    firstClass: string | undefined;
    selector: string;
}

const workspaceRoot = fileURLToPath(new URL("../../../", import.meta.url));
const sourceRoot = join(workspaceRoot, "src");
const gadgetPackages = await discoverGadgetPackages(workspaceRoot);
const dialogPackages = gadgetPackages
    .map(createDialogPackage)
    .filter(hasDialogs);

test("keeps every discovered dialog in a three-file trio", () => {
    const dialogCount = dialogPackages.reduce(countDialogs, 0);
    assert.ok(dialogCount > 0, "The workspace must contain a dialog trio.");

    for (const packageConfig of dialogPackages) {
        assertDialogFileSet(packageConfig);
    }
});

test("keeps every dialog Vue template-only and compilable", () => {
    for (const packageConfig of dialogPackages) {
        for (const dialog of packageConfig.dialogs) {
            assertDialogTemplate(packageConfig, dialog);
        }
    }
});

test("maps every dialog asset to a Node-safe build global", () => {
    for (const packageConfig of dialogPackages) {
        assertDialogBuildGlobals(packageConfig);
    }
});

test("keeps every gadget stylesheet package-scoped", () => {
    for (const gadget of gadgetPackages) {
        assertPackageStyles(gadget);
    }
});

test("keeps dialog roots out of authored TypeScript", () => {
    const findings = gadgetPackages.flatMap(findLegacyDialogMarkup);

    assert.deepEqual(findings, []);
});

test("uses browser-native titles instead of scripted tooltips", () => {
    const files = [
        ...listFiles(sourceRoot, ".ts"),
        ...listFiles(sourceRoot, ".vue"),
    ];
    const findings = files.flatMap(findScriptedTooltips);

    assert.deepEqual(findings, []);
});

/** Discovers dialog basenames from the package's authored assets. */
function createDialogPackage(gadget: GadgetPackage): DialogPackage {
    const directory = getDialogDirectory(gadget);
    const dialogs = listDirectoryFiles(directory)
        .filter(isDialogAsset)
        .map(getDialogName);
    return { dialogs: [...new Set(dialogs)].toSorted(), gadget };
}

/** Narrows packages that contain at least one dialog asset. */
function hasDialogs(packageConfig: DialogPackage): boolean {
    return packageConfig.dialogs.length > 0;
}

/** Counts dynamically discovered dialog basenames. */
function countDialogs(total: number, packageConfig: DialogPackage): number {
    return total + packageConfig.dialogs.length;
}

/** Requires each discovered basename to own CSS, TS, and Vue files. */
function assertDialogFileSet(packageConfig: DialogPackage): void {
    const directory = getDialogDirectory(packageConfig.gadget);
    const actual = listDirectoryFiles(directory)
        .filter(isDialogAsset)
        .toSorted();
    const expected = packageConfig.dialogs
        .flatMap(buildDialogFilenames)
        .toSorted();

    assert.deepEqual(actual, expected, packageConfig.gadget.directoryName);
}

/** Checks whether a file participates in a dialog trio. */
function isDialogAsset(file: string): boolean {
    return /-dialog\.(?:css|ts|vue)$/u.test(file);
}

/** Extracts the common basename from one dialog asset filename. */
function getDialogName(file: string): string {
    return file.replace(/-dialog\.(?:css|ts|vue)$/u, "");
}

/** Builds the required filenames for one dialog basename. */
function buildDialogFilenames(name: string): string[] {
    return ["css", "ts", "vue"].map(function addExtension(extension) {
        return `${name}-dialog.${extension}`;
    });
}

/** Validates one template-only Vue dialog component. */
function assertDialogTemplate(
    packageConfig: DialogPackage,
    name: string,
): void {
    const filename = join(
        getDialogDirectory(packageConfig.gadget),
        `${name}-dialog.vue`,
    );
    const source = readFileSync(filename, "utf8");
    const parsed = parse(source, { filename });
    const template = parsed.descriptor.template;

    assert.deepEqual(parsed.errors, [], filename);
    assert.ok(template, `${filename} must contain one template block.`);
    assert.equal(parsed.descriptor.script, null, filename);
    assert.equal(parsed.descriptor.scriptSetup, null, filename);
    assert.deepEqual(parsed.descriptor.styles, [], filename);
    assert.deepEqual(parsed.descriptor.customBlocks, [], filename);
    assert.doesNotMatch(
        template.content,
        /\sstyle\s*=/u,
        `${filename} must keep static presentation in its CSS file.`,
    );
    assertDialogRoot(template.content, filename);
    assertCompiles(template.content, filename, packageConfig, name);
}

/** Requires a single Codex dialog at the component root. */
function assertDialogRoot(template: string, filename: string): void {
    assert.equal(countMatches(template, /<cdx-dialog\b/gu), 1, filename);
    assert.equal(countMatches(template, /<\/cdx-dialog>/gu), 1, filename);
    assert.match(template, /^\s*<cdx-dialog\b/u, filename);
    assert.match(template, /<\/cdx-dialog>\s*$/u, filename);
}

/** Requires Vue to compile one authored dialog template. */
function assertCompiles(
    source: string,
    filename: string,
    packageConfig: DialogPackage,
    dialogName: string,
): void {
    const packageName = packageConfig.gadget.directoryName;
    const compiled = compileTemplate({
        filename,
        id: `${packageName}-${dialogName}`,
        source,
    });

    assert.deepEqual(compiled.errors, [], filename);
}

/** Validates manifest mappings and fallbacks for every dialog. */
function assertDialogBuildGlobals(packageConfig: DialogPackage): void {
    const packageRoot = packageConfig.gadget.directory;
    const definitions = readBuildDefinitions(packageConfig.gadget);
    const declarations = readFileSync(
        join(packageRoot, "globals.d.ts"),
        "utf8",
    );

    for (const name of packageConfig.dialogs) {
        const modulePath = join(
            getDialogDirectory(packageConfig.gadget),
            `${name}-dialog.ts`,
        );
        assertDialogAssetGlobals(
            packageConfig,
            name,
            definitions,
            declarations,
            readFileSync(modulePath, "utf8"),
        );
    }
}

/** Reads text definitions from already discovered package metadata. */
function readBuildDefinitions(
    gadget: GadgetPackage,
): Array<[string, TextDefinition]> {
    const config = gadget.metadata.gadgetBuild as { defines?: unknown };
    assert.ok(
        isRecord(config.defines),
        `${gadget.directoryName}: gadgetBuild.defines must be an object.`,
    );
    return Object.entries(config.defines).map(
        function validateDefinition(entry) {
            const [name, value] = entry;
            assert.ok(isRecord(value), `${gadget.directoryName}: ${name}`);
            assert.equal(
                typeof value.textFile,
                "string",
                `${gadget.directoryName}: ${name}.textFile`,
            );
            return [name, { textFile: value.textFile as string }];
        },
    );
}

/** Requires exactly one injected Vue and CSS global for one dialog. */
function assertDialogAssetGlobals(
    packageConfig: DialogPackage,
    name: string,
    definitions: Array<[string, TextDefinition]>,
    declarations: string,
    moduleSource: string,
): void {
    for (const extension of ["vue", "css"]) {
        const textFile = `ui/dialogs/${name}-dialog.${extension}`;
        const matches = definitions.filter(([, definition]) => {
            return definition.textFile === textFile;
        });

        const packageName = packageConfig.gadget.directoryName;
        assert.equal(matches.length, 1, `${packageName}: ${textFile}`);
        const globalName = matches[0]?.[0];
        assert.ok(globalName);
        assertBuildGlobal(globalName, declarations, moduleSource);
    }
}

/** Requires an injected global declaration and Node-safe fallback. */
function assertBuildGlobal(
    globalName: string,
    declarations: string,
    moduleSource: string,
): void {
    const escapedName = escapeRegExp(globalName);
    const namePattern = new RegExp(`\\b${escapedName}\\b`, "u");
    const condition =
        `typeof\\s+${escapedName}\\s*===\\s*["']undefined["']` +
        `\\s*\\?\\s*(?:""|'')`;

    assert.match(declarations, namePattern);
    assert.match(moduleSource, namePattern);
    assert.match(moduleSource, new RegExp(condition, "u"));
}

/** Infers and enforces one package-owned CSS namespace. */
function assertPackageStyles(gadget: GadgetPackage): void {
    const uiDirectory = join(gadget.directory, "ui");
    const cssFiles = listFiles(uiDirectory, ".css");
    const scopes = cssFiles.flatMap(collectSelectorScopes);
    if (scopes.length === 0) {
        return;
    }
    const missingClasses = scopes
        .filter((scope) => scope.firstClass == null)
        .map(formatSelectorScope);
    assert.deepEqual(missingClasses, [], gadget.directoryName);

    const prefix = inferStylePrefix(gadget, scopes);
    const findings = scopes
        .filter((scope) => !scope.firstClass?.startsWith(prefix))
        .map(formatSelectorScope);
    assert.deepEqual(findings, [], gadget.directoryName);
}

/** Parses the leading class from every non-keyframe selector. */
function collectSelectorScopes(file: string): SelectorScope[] {
    const scopes: SelectorScope[] = [];
    const css = readFileSync(file, "utf8");

    postcss.parse(css, { from: file }).walkRules(function inspectRule(rule) {
        if (!isKeyframeStep(rule)) {
            scopes.push(...parseSelectorScopes(rule, file));
        }
    });
    return scopes;
}

/** Parses each selector in one CSS rule independently. */
function parseSelectorScopes(rule: Rule, file: string): SelectorScope[] {
    const scopes: SelectorScope[] = [];
    const selectorRoot = selectorParser().astSync(rule.selector);

    selectorRoot.each(function inspectSelector(selector) {
        let firstClass: string | undefined;
        selector.walkClasses(function collectFirstClass(classNode) {
            firstClass ??= classNode.value;
        });
        scopes.push({
            file,
            firstClass,
            selector: selector.toString(),
        });
    });
    return scopes;
}

/** Infers the longest shared hyphen-delimited class namespace. */
function inferStylePrefix(
    gadget: GadgetPackage,
    scopes: SelectorScope[],
): string {
    const classes = scopes.map((scope) => scope.firstClass!);
    const common = classes.reduce(commonTextPrefix);
    const boundary = common.lastIndexOf("-");
    assert.ok(
        boundary > 0,
        `${gadget.directoryName}: selectors need one shared class prefix.`,
    );
    const prefix = common.slice(0, boundary + 1);
    assert.match(prefix, /^[a-z][a-z0-9-]*-$/u, gadget.directoryName);
    assert.ok(
        !isExternalStylePrefix(prefix),
        `${gadget.directoryName}: ${prefix} is not package-owned.`,
    );
    assertAuthoredStylePrefix(gadget, prefix);
    return prefix;
}

/** Finds the exact character prefix shared by two class names. */
function commonTextPrefix(left: string, right: string): string {
    const length = Math.min(left.length, right.length);
    let index = 0;
    while (index < length && left[index] === right[index]) {
        index += 1;
    }
    return left.slice(0, index);
}

/** Rejects namespaces owned by known browser and component systems. */
function isExternalStylePrefix(prefix: string): boolean {
    return ["cdx-", "mw-", "oo-ui-", "skin-", "vector-"].some(
        function matchesExternalPrefix(externalPrefix) {
            return prefix.startsWith(externalPrefix);
        },
    );
}

/** Requires the inferred namespace in package-authored UI code. */
function assertAuthoredStylePrefix(
    gadget: GadgetPackage,
    prefix: string,
): void {
    const uiDirectory = join(gadget.directory, "ui");
    const authoredFiles = [
        ...listFiles(uiDirectory, ".ts"),
        ...listFiles(uiDirectory, ".vue"),
    ];
    const source = authoredFiles
        .map((file) => readFileSync(file, "utf8"))
        .join("\n");
    const pattern = new RegExp(
        `\\b${escapeRegExp(prefix)}[A-Za-z0-9_-]+\\b`,
        "u",
    );
    assert.match(source, pattern, gadget.directoryName);
}

/** Formats one unscoped selector finding. */
function formatSelectorScope(scope: SelectorScope): string {
    return `${scope.file}: ${scope.selector}`;
}

/** Checks whether a rule represents a keyframe step. */
function isKeyframeStep(rule: Rule): boolean {
    const parent = rule.parent;
    return parent?.type === "atrule" && /(?:^|-)keyframes$/u.test(parent.name);
}

/** Finds TypeScript that recreates dialog roots outside the trio. */
function findLegacyDialogMarkup(gadget: GadgetPackage): string[] {
    const uiDirectory = join(gadget.directory, "ui");
    const files = listFiles(uiDirectory, ".ts").filter(isOutsideDialogs);

    return files.flatMap(findLegacyMarkupInFile);
}

/** Checks whether a file sits outside the dialog asset directory. */
function isOutsideDialogs(file: string): boolean {
    return !/[\\/]ui[\\/]dialogs[\\/]/u.test(file);
}

/** Reports obsolete authored dialog markup patterns in one file. */
function findLegacyMarkupInFile(file: string): string[] {
    const source = readFileSync(file, "utf8");
    const patterns = [
        /createElement\(\s*["'](?:cdx-)?dialog["']/u,
        /<\s*(?:cdx-)?dialog\b/iu,
        /template\s*:\s*createDialogTemplate\(/u,
    ];

    return patterns
        .filter(function matchesSource(pattern) {
            return pattern.test(source);
        })
        .map(function describePattern(pattern) {
            return `${file}: ${pattern.source}`;
        });
}

/** Reports scripted tooltip implementations in one authored file. */
function findScriptedTooltips(file: string): string[] {
    const source = readFileSync(file, "utf8");
    const patterns = [
        /\bv-tooltip\b/u,
        /\bCdxTooltip\b/u,
        /\brole\s*=\s*["']tooltip["']/u,
    ];

    return patterns
        .filter(function matchesSource(pattern) {
            return pattern.test(source);
        })
        .map(function describePattern(pattern) {
            return `${file}: ${pattern.source}`;
        });
}

/** Recursively lists authored files with one extension. */
function listFiles(directory: string, extension: string): string[] {
    const files: string[] = [];
    for (const entry of listDirectoryEntries(directory)) {
        const path = join(directory, entry.name);
        if (entry.isDirectory()) {
            files.push(...listFiles(path, extension));
        } else if (entry.isFile() && path.endsWith(extension)) {
            files.push(path);
        }
    }
    return files.toSorted();
}

/** Lists regular filenames in one optional directory. */
function listDirectoryFiles(directory: string): string[] {
    return listDirectoryEntries(directory)
        .filter((entry) => entry.isFile())
        .map((entry) => entry.name)
        .toSorted();
}

/** Reads an optional directory, returning nothing when it is absent. */
function listDirectoryEntries(directory: string): Dirent[] {
    try {
        return readdirSync(directory, { withFileTypes: true });
    } catch (error) {
        if (hasErrorCode(error, "ENOENT")) {
            return [];
        }
        throw error;
    }
}

/** Resolves one package's co-located dialog directory. */
function getDialogDirectory(gadget: GadgetPackage): string {
    return join(gadget.directory, "ui/dialogs");
}

/** Checks parsed metadata for a non-array object. */
function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value != null && !Array.isArray(value);
}

/** Checks an unknown error for one Node filesystem code. */
function hasErrorCode(error: unknown, code: string): boolean {
    return (
        typeof error === "object" &&
        error != null &&
        "code" in error &&
        error.code === code
    );
}

/** Counts all non-overlapping matches produced by a global pattern. */
function countMatches(value: string, pattern: RegExp): number {
    return [...value.matchAll(pattern)].length;
}

/** Escapes ordinary text for insertion into a regular expression. */
function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}
