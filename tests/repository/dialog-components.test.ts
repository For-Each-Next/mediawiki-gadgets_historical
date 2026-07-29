/**
 * Enforces repository-wide dialog component ownership.
 */

import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { compileTemplate, parse } from "@vue/compiler-sfc";
import postcss, { type Rule } from "postcss";
import selectorParser from "postcss-selector-parser";

interface DialogPackage {
    readonly dialogs: readonly string[];
    readonly name: string;
    readonly stylePrefix: string;
}

const DIALOG_PACKAGES: readonly DialogPackage[] = [
    {
        name: "citation-formatter",
        stylePrefix: "cf-",
        dialogs: [
            "main",
            "draft",
            "parameter-alias",
            "tool",
            "close-confirmation",
        ],
    },
    {
        name: "vg-page-assessor",
        stylePrefix: "avgp-",
        dialogs: ["assessment"],
    },
    {
        name: "vg-stub-creator",
        stylePrefix: "vg-stub-creator-",
        dialogs: [
            "main",
            "pre-save",
            "company-category",
            "category-view",
            "page-edit",
            "move",
            "preview",
            "history",
            "history-json",
        ],
    },
];

const sourceRoot = fileURLToPath(new URL("../../src/", import.meta.url));
const dialogCount = DIALOG_PACKAGES.reduce(countDialogs, 0);

test("keeps the fixed fifteen-dialog three-file inventory", () => {
    assert.equal(dialogCount, 15);
    for (const packageConfig of DIALOG_PACKAGES) {
        assertDialogFileSet(packageConfig);
    }
});

test("keeps every dialog Vue template-only and compilable", () => {
    for (const packageConfig of DIALOG_PACKAGES) {
        for (const dialog of packageConfig.dialogs) {
            assertDialogTemplate(packageConfig, dialog);
        }
    }
});

test("maps every dialog asset to a Node-safe build global", () => {
    for (const packageConfig of DIALOG_PACKAGES) {
        assertDialogBuildGlobals(packageConfig);
    }
});

test("keeps every gadget stylesheet package-scoped", () => {
    for (const packageConfig of DIALOG_PACKAGES) {
        assertPackageStyles(packageConfig);
    }
});

test("keeps dialog roots out of authored TypeScript", () => {
    const findings = DIALOG_PACKAGES.flatMap(findLegacyDialogMarkup);

    assert.deepEqual(findings, []);
});

function countDialogs(total: number, packageConfig: DialogPackage): number {
    return total + packageConfig.dialogs.length;
}

function assertDialogFileSet(packageConfig: DialogPackage): void {
    const directory = getDialogDirectory(packageConfig);
    const actual = readdirSync(directory).filter(isDialogAsset).toSorted();
    const expected = packageConfig.dialogs
        .flatMap(buildDialogFilenames)
        .toSorted();

    assert.deepEqual(actual, expected, packageConfig.name);
}

function isDialogAsset(file: string): boolean {
    return /-dialog\.(?:css|ts|vue)$/u.test(file);
}

function buildDialogFilenames(name: string): string[] {
    return ["css", "ts", "vue"].map(function addExtension(extension) {
        return `${name}-dialog.${extension}`;
    });
}

function assertDialogTemplate(
    packageConfig: DialogPackage,
    name: string,
): void {
    const filename = join(
        getDialogDirectory(packageConfig),
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
    assertCompiles(template.content, filename, packageConfig.name, name);
}

function assertDialogRoot(template: string, filename: string): void {
    assert.equal(countMatches(template, /<cdx-dialog\b/gu), 1, filename);
    assert.equal(countMatches(template, /<\/cdx-dialog>/gu), 1, filename);
    assert.match(template, /^\s*<cdx-dialog\b/u, filename);
    assert.match(template, /<\/cdx-dialog>\s*$/u, filename);
}

function assertCompiles(
    source: string,
    filename: string,
    packageName: string,
    dialogName: string,
): void {
    const compiled = compileTemplate({
        filename,
        id: `${packageName}-${dialogName}`,
        source,
    });

    assert.deepEqual(compiled.errors, [], filename);
}

interface GadgetMetadata {
    gadgetBuild: {
        defines: Record<string, { textFile: string }>;
    };
}

function assertDialogBuildGlobals(packageConfig: DialogPackage): void {
    const packageRoot = getPackageRoot(packageConfig);
    const metadata = readPackageMetadata(packageRoot);
    const definitions = Object.entries(metadata.gadgetBuild.defines);
    const declarations = readFileSync(
        join(packageRoot, "globals.d.ts"),
        "utf8",
    );

    for (const name of packageConfig.dialogs) {
        const modulePath = join(
            getDialogDirectory(packageConfig),
            `${name}-dialog.ts`,
        );
        const moduleSource = readFileSync(modulePath, "utf8");
        assertDialogAssetGlobals(
            packageConfig,
            name,
            definitions,
            declarations,
            moduleSource,
        );
    }
}

function assertDialogAssetGlobals(
    packageConfig: DialogPackage,
    name: string,
    definitions: Array<[string, { textFile: string }]>,
    declarations: string,
    moduleSource: string,
): void {
    for (const extension of ["vue", "css"]) {
        const textFile = `ui/dialogs/${name}-dialog.${extension}`;
        const matches = definitions.filter(([, definition]) => {
            return definition.textFile === textFile;
        });

        assert.equal(matches.length, 1, `${packageConfig.name}: ${textFile}`);
        const globalName = matches[0]?.[0];
        assert.ok(globalName);
        assertBuildGlobal(globalName, declarations, moduleSource);
    }
}

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

function readPackageMetadata(packageRoot: string): GadgetMetadata {
    const path = join(packageRoot, "package.json");
    return JSON.parse(readFileSync(path, "utf8")) as GadgetMetadata;
}

function assertPackageStyles(packageConfig: DialogPackage): void {
    const uiDirectory = join(getPackageRoot(packageConfig), "ui");
    const cssFiles = listFiles(uiDirectory, ".css");
    const findings = cssFiles.flatMap(function inspectFile(file) {
        return findUnscopedSelectors(file, packageConfig.stylePrefix);
    });

    assert.deepEqual(findings, [], packageConfig.name);
}

function findUnscopedSelectors(file: string, prefix: string): string[] {
    const findings: string[] = [];
    const css = readFileSync(file, "utf8");

    postcss.parse(css, { from: file }).walkRules(function inspectRule(rule) {
        if (!isKeyframeStep(rule)) {
            inspectSelectorRule(rule, file, prefix, findings);
        }
    });
    return findings;
}

function inspectSelectorRule(
    rule: Rule,
    file: string,
    prefix: string,
    findings: string[],
): void {
    const selectorRoot = selectorParser().astSync(rule.selector);

    selectorRoot.each(function inspectSelector(selector) {
        const classes: string[] = [];
        selector.walkClasses(function collectClass(classNode) {
            classes.push(classNode.value);
        });
        if (!classes[0]?.startsWith(prefix)) {
            findings.push(`${file}: ${selector.toString()}`);
        }
    });
}

function isKeyframeStep(rule: Rule): boolean {
    const parent = rule.parent;
    return parent?.type === "atrule" && /(?:^|-)keyframes$/u.test(parent.name);
}

function findLegacyDialogMarkup(packageConfig: DialogPackage): string[] {
    const uiDirectory = join(getPackageRoot(packageConfig), "ui");
    const files = listFiles(uiDirectory, ".ts").filter(isOutsideDialogs);

    return files.flatMap(findLegacyMarkupInFile);
}

function isOutsideDialogs(file: string): boolean {
    return !/[\\/]ui[\\/]dialogs[\\/]/u.test(file);
}

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

function listFiles(directory: string, extension: string): string[] {
    const files: string[] = [];
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
        const path = join(directory, entry.name);
        if (entry.isDirectory()) {
            files.push(...listFiles(path, extension));
        } else if (path.endsWith(extension)) {
            files.push(path);
        }
    }
    return files;
}

function getDialogDirectory(packageConfig: DialogPackage): string {
    return join(getPackageRoot(packageConfig), "ui/dialogs");
}

function getPackageRoot(packageConfig: DialogPackage): string {
    return join(sourceRoot, packageConfig.name);
}

function countMatches(value: string, pattern: RegExp): number {
    return [...value.matchAll(pattern)].length;
}

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}
