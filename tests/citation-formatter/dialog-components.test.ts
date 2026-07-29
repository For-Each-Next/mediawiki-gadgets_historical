/**
 * Tests the source-manager dialog asset sets and scoped styles.
 */

import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { compileTemplate, parse } from "@vue/compiler-sfc";
import postcss, { type Rule } from "postcss";
import selectorParser from "postcss-selector-parser";

import { DIALOG_NAMES } from "./dialog-fixtures.ts";

const packageRoot = fileURLToPath(
    new URL("../../src/citation-formatter/", import.meta.url),
);
const dialogDirectory = join(packageRoot, "ui/dialogs");

test("keeps every source-manager dialog in a three-file set", () => {
    const actual = readdirSync(dialogDirectory)
        .filter((file) => /-dialog\.(?:css|ts|vue)$/u.test(file))
        .toSorted();
    const expected = DIALOG_NAMES.flatMap(buildDialogFilenames).toSorted();

    assert.deepEqual(actual, expected);
});

test("keeps dialog Vue files template-only and compilable", () => {
    for (const name of DIALOG_NAMES) {
        assertDialogTemplate(name);
    }
});

test("maps every dialog asset to a Node-safe build global", () => {
    const metadata = readPackageMetadata();
    const definitions = Object.entries(metadata.gadgetBuild.defines);

    for (const name of DIALOG_NAMES) {
        assertDialogBuildGlobals(name, definitions);
    }
});

test("keeps every Citation Formatter selector package-scoped", () => {
    const unsafeFixture = [
        ".cdx-dialog__body > :last-child,",
        ".cf-source-manager .cdx-dialog__body { margin: 0; }",
    ].join("\n");
    assert.deepEqual(findUnscopedSelectors(unsafeFixture), [
        ".cdx-dialog__body > :last-child",
    ]);

    const unscoped = listCssFiles().flatMap(findUnscopedFileSelectors);
    assert.deepEqual(unscoped, []);
});

function assertDialogTemplate(name: (typeof DIALOG_NAMES)[number]): void {
    const filename = join(dialogDirectory, `${name}-dialog.vue`);
    const source = readFileSync(filename, "utf8");
    const parsed = parse(source, { filename });
    const template = parsed.descriptor.template;

    assert.deepEqual(parsed.errors, [], filename);
    assert.ok(template, `${filename} must contain one template block.`);
    assert.equal(parsed.descriptor.script, null, filename);
    assert.equal(parsed.descriptor.scriptSetup, null, filename);
    assert.deepEqual(parsed.descriptor.styles, [], filename);
    assert.equal(countMatches(template.content, /<cdx-dialog\b/gu), 1);
    assert.match(template.content, /^\s*<cdx-dialog\b/u);
    assert.match(template.content, /<\/cdx-dialog>\s*$/u);
    assert.match(
        template.content,
        /<div class="cf-source-manager__dialog-body-content">/u,
    );
    const compiled = compileTemplate({
        filename,
        id: `citation-formatter-${name}`,
        source: template.content,
    });
    assert.deepEqual(compiled.errors, [], filename);
}

interface GadgetMetadata {
    gadgetBuild: {
        defines: Record<string, { textFile: string }>;
    };
}

function readPackageMetadata(): GadgetMetadata {
    const packagePath = join(packageRoot, "package.json");
    return JSON.parse(readFileSync(packagePath, "utf8")) as GadgetMetadata;
}

function assertDialogBuildGlobals(
    name: (typeof DIALOG_NAMES)[number],
    definitions: Array<[string, { textFile: string }]>,
): void {
    const modulePath = join(dialogDirectory, `${name}-dialog.ts`);
    const moduleSource = readFileSync(modulePath, "utf8");
    for (const extension of ["vue", "css"]) {
        const textFile = `ui/dialogs/${name}-dialog.${extension}`;
        const entry = definitions.find(([, value]) => {
            return value.textFile === textFile;
        });
        assert.ok(entry, `${textFile} must have a gadget build definition.`);
        const [globalName] = entry;
        assert.match(moduleSource, new RegExp(`\\b${globalName}\\b`, "u"));
        assert.match(
            moduleSource,
            new RegExp(
                `typeof\\s+${globalName}\\s*===\\s*` +
                    `"undefined"\\s*\\?\\s*""`,
                "u",
            ),
        );
    }
}

function listCssFiles(): string[] {
    return [
        join(packageRoot, "ui/styles.css"),
        ...DIALOG_NAMES.map(getDialogStylesheetPath),
    ];
}

function findUnscopedFileSelectors(file: string): string[] {
    const selectors = findUnscopedSelectors(readFileSync(file, "utf8"));
    return selectors.map(function addFilename(selector) {
        return `${basename(file)}: ${selector}`;
    });
}

function findUnscopedSelectors(css: string): string[] {
    const unscoped: string[] = [];
    postcss.parse(css).walkRules(function inspectRule(rule) {
        if (!isKeyframeStep(rule)) {
            inspectSelectorRule(rule, unscoped);
        }
    });
    return unscoped;
}

function inspectSelectorRule(rule: Rule, unscoped: string[]): void {
    const selectorRoot = selectorParser().astSync(rule.selector);
    selectorRoot.each(function inspectSelector(selector) {
        const classes: string[] = [];
        selector.walkClasses(function collectClass(classNode) {
            classes.push(classNode.value);
        });
        if (classes[0]?.startsWith("cf-") !== true) {
            unscoped.push(selector.toString());
        }
    });
}

function isKeyframeStep(rule: Rule): boolean {
    const parent = rule.parent;
    return parent?.type === "atrule" && /(?:^|-)keyframes$/u.test(parent.name);
}

function countMatches(value: string, pattern: RegExp): number {
    return [...value.matchAll(pattern)].length;
}

function buildDialogFilenames(name: (typeof DIALOG_NAMES)[number]): string[] {
    return ["css", "ts", "vue"].map(function addExtension(extension) {
        return `${name}-dialog.${extension}`;
    });
}

function getDialogStylesheetPath(name: (typeof DIALOG_NAMES)[number]): string {
    return join(dialogDirectory, `${name}-dialog.css`);
}
