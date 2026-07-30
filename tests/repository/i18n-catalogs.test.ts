/**
 * Enforces JSON-backed locale catalogs for every deployable gadget.
 */

import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const sourceRoot = fileURLToPath(new URL("../../src/", import.meta.url));
const LOCALES = ["en", "zh-Hans", "zh-Hant"] as const;
const CHINESE_LOCALES = ["zh-Hans", "zh-Hant"] as const;
const spacedChineseWesternBoundary =
    /\p{Script=Han} +[A-Za-z0-9]|[A-Za-z0-9] +\p{Script=Han}/u;

type MessageCatalog = Record<string, string>;

test("stores every gadget locale catalog as flat JSON", () => {
    for (const packageRoot of listGadgetPackageRoots()) {
        assertJsonCatalogs(packageRoot);
    }
});

test("omits spaces at Chinese and Western message boundaries", () => {
    for (const packageRoot of listGadgetPackageRoots()) {
        assertChineseCatalogSpacing(packageRoot);
    }
});

function listGadgetPackageRoots(): string[] {
    return readdirSync(sourceRoot)
        .map((name) => join(sourceRoot, name))
        .filter(isGadgetPackage);
}

function isGadgetPackage(packageRoot: string): boolean {
    if (!statSync(packageRoot).isDirectory()) {
        return false;
    }
    const metadataPath = join(packageRoot, "package.json");
    const metadata = JSON.parse(readFileSync(metadataPath, "utf8")) as {
        gadgetBuild?: unknown;
    };
    return metadata.gadgetBuild != null;
}

function assertJsonCatalogs(packageRoot: string): void {
    const i18nRoot = join(packageRoot, "i18n");
    const catalogFiles = readdirSync(i18nRoot)
        .filter((file) => file !== "index.ts")
        .toSorted();
    const expectedFiles = LOCALES.map((locale) => `${locale}.json`).toSorted();

    assert.deepEqual(catalogFiles, expectedFiles, basename(packageRoot));
    const catalogs = LOCALES.map((locale) =>
        readCatalog(join(i18nRoot, `${locale}.json`)),
    );
    assertCatalogsAlign(catalogs, basename(packageRoot));
}

function assertChineseCatalogSpacing(packageRoot: string): void {
    for (const locale of CHINESE_LOCALES) {
        const catalog = readCatalog(
            join(packageRoot, "i18n", `${locale}.json`),
        );
        for (const [id, message] of Object.entries(catalog)) {
            const context = `${basename(packageRoot)}: ${locale}: ${id}`;
            assert.equal(message, message.trim(), context);
            assert.doesNotMatch(
                exposeWesternMessageTokens(message),
                spacedChineseWesternBoundary,
                context,
            );
        }
    }
}

function readCatalog(path: string): MessageCatalog {
    const value = JSON.parse(readFileSync(path, "utf8")) as unknown;
    assert.ok(isMessageCatalog(value), path);
    for (const id of Object.keys(value)) {
        assert.match(id, /^[^.]+\.[^.]+/u, path);
    }
    return value;
}

function isMessageCatalog(value: unknown): value is MessageCatalog {
    return (
        typeof value === "object" &&
        value != null &&
        !Array.isArray(value) &&
        Object.values(value).every((message) => typeof message === "string")
    );
}

function assertCatalogsAlign(
    catalogs: MessageCatalog[],
    packageName: string,
): void {
    const [english, ...translations] = catalogs;
    assert.ok(english);
    const messageIds = Object.keys(english).toSorted();
    for (const catalog of translations) {
        assert.deepEqual(Object.keys(catalog).toSorted(), messageIds);
        for (const id of messageIds) {
            assert.deepEqual(
                listPlaceholders(catalog[id] ?? ""),
                listPlaceholders(english[id] ?? ""),
                `${packageName}: ${id}`,
            );
        }
    }
}

function listPlaceholders(message: string): string[] {
    return [...message.matchAll(/(?<!\{)\{([A-Za-z][A-Za-z0-9]*)\}(?!\})/gu)]
        .map((match) => match[1])
        .toSorted();
}

function exposeWesternMessageTokens(message: string): string {
    return message
        .replace(/\{\{[^{}]*\}\}/gu, "Token9")
        .replace(/\[\[[^\[\]]+\]\]/gu, "Token9")
        .replace(/<[^<>]+>/gu, "Token9")
        .replace(/\|[A-Za-z][A-Za-z0-9-]*=?/gu, "Token9")
        .replace(/\{[A-Za-z][A-Za-z0-9]*\}/gu, "Token9");
}
