/**
 * Checks gadget styles against official Codex design tokens.
 */

import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import postcss, { type Declaration } from "postcss";

interface PackageMetadata {
    gadgetBuild?: unknown;
}

const require = createRequire(import.meta.url);
const repositoryRoot = fileURLToPath(new URL("../../", import.meta.url));
const sourceRoot = join(repositoryRoot, "src");
const declarationPath = join(sourceRoot, "shared", "mediawiki-codex.d.css");
const tokenPackagePath =
    "@wikimedia/codex-design-tokens/theme-wikimedia-ui.css";
const tokenStylesheetPath = require.resolve(tokenPackagePath);
const variablePattern = /\bvar\(\s*(--[A-Za-z0-9_-]+)/gu;

test("loads official Codex tokens for stylesheet tooling", () => {
    const source = readFileSync(declarationPath, "utf8");

    assert.ok(source.includes(`@import "${tokenPackagePath}";`));
    assert.deepEqual(collectDeclaredTokens([declarationPath]), new Set());
});

test("uses only official or locally declared CSS custom properties", () => {
    const officialTokens = collectDeclaredTokens([tokenStylesheetPath]);
    const findings = discoverGadgetRoots().flatMap(
        function inspectGadget(gadgetRoot) {
            return findUnknownTokens(gadgetRoot, officialTokens);
        },
    );

    assert.ok(officialTokens.size > 0);
    assert.deepEqual(findings.toSorted(), []);
});

function discoverGadgetRoots(): string[] {
    return readdirSync(sourceRoot, { withFileTypes: true }).flatMap(
        function selectGadget(entry) {
            if (!entry.isDirectory()) {
                return [];
            }

            const gadgetRoot = join(sourceRoot, entry.name);
            const packagePath = join(gadgetRoot, "package.json");
            let metadata: PackageMetadata;

            try {
                metadata = JSON.parse(
                    readFileSync(packagePath, "utf8"),
                ) as PackageMetadata;
            } catch {
                return [];
            }

            return metadata.gadgetBuild == null ? [] : [gadgetRoot];
        },
    );
}

function findUnknownTokens(
    gadgetRoot: string,
    officialTokens: ReadonlySet<string>,
): string[] {
    const cssFiles = listCssFiles(join(gadgetRoot, "ui"));
    const localTokens = collectDeclaredTokens(cssFiles);
    const findings: string[] = [];

    for (const file of cssFiles) {
        const root = postcss.parse(readFileSync(file, "utf8"), { from: file });
        root.walkDecls(function inspectDeclaration(declaration) {
            collectUnknownDeclarationTokens(
                declaration,
                file,
                officialTokens,
                localTokens,
                findings,
            );
        });
    }

    return findings;
}

function collectUnknownDeclarationTokens(
    declaration: Declaration,
    file: string,
    officialTokens: ReadonlySet<string>,
    localTokens: ReadonlySet<string>,
    findings: string[],
): void {
    for (const match of declaration.value.matchAll(variablePattern)) {
        const token = match[1];

        if (
            token != null &&
            !officialTokens.has(token) &&
            !localTokens.has(token)
        ) {
            findings.push(`${relative(repositoryRoot, file)}: ${token}`);
        }
    }
}

function collectDeclaredTokens(files: readonly string[]): Set<string> {
    const tokens = new Set<string>();

    for (const file of files) {
        const root = postcss.parse(readFileSync(file, "utf8"), { from: file });
        root.walkDecls(function collectDeclaration(declaration) {
            if (declaration.prop.startsWith("--")) {
                tokens.add(declaration.prop);
            }
        });
    }

    return tokens;
}

function listCssFiles(directory: string): string[] {
    const files: string[] = [];

    for (const entry of readdirSync(directory, { withFileTypes: true })) {
        const path = join(directory, entry.name);

        if (entry.isDirectory()) {
            files.push(...listCssFiles(path));
        } else if (path.endsWith(".css")) {
            files.push(path);
        }
    }

    return files;
}
