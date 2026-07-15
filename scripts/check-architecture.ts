/**
 * Enforces dependency direction between gadget architecture layers.
 */

import { readdir, readFile } from "node:fs/promises";
import { dirname, normalize, relative, resolve } from "node:path";

const SOURCE_ROOT = resolve("src");
const LAYERS = new Set(["app", "config", "domain", "infra", "shared", "ui"]);
const ALLOWED_DEPENDENCIES = {
    app: new Set(["app", "config", "domain", "infra", "shared"]),
    config: new Set(["config", "shared"]),
    domain: new Set(["config", "domain", "shared"]),
    infra: new Set(["config", "domain", "infra", "shared"]),
    shared: new Set(["shared"]),
    ui: LAYERS,
};
const ALIAS_LAYERS = new Map([["#shared", "shared"]]);

const files = await listTypeScriptFiles(SOURCE_ROOT);
const errors = (await Promise.all(files.map(checkFile))).flat();

if (errors.length > 0) {
    throw new Error(`Architecture violations:\n${errors.join("\n")}`);
}

/**
 * Lists authored TypeScript files below one directory.
 *
 * @param directory - Directory to inspect.
 * @returns Authored TypeScript files below one directory.
 */
async function listTypeScriptFiles(directory: string): Promise<string[]> {
    const entries = await readdir(directory, { withFileTypes: true });
    const groups = await Promise.all(
        entries.map(async (entry) => {
            const path = resolve(directory, entry.name);
            return entry.isDirectory() ? listTypeScriptFiles(path) : [path];
        }),
    );
    return groups.flat().filter((path) => path.endsWith(".ts"));
}

/**
 * Checks all local imports in one source file.
 *
 * @param file - Source file.
 * @returns Result when the function
 *   checks all local imports in one source file.
 */
async function checkFile(file: string): Promise<string[]> {
    const source = await readFile(file, "utf8");
    const sourceLayer = getLayer(file);
    const imports = readLocalImports(source);

    if (sourceLayer == null) {
        return [];
    }

    const result = imports.flatMap((specifier) => {
        const targetLayer = getImportLayer(file, specifier);
        const allowed = ALLOWED_DEPENDENCIES[sourceLayer];
        if (targetLayer == null || allowed.has(targetLayer)) {
            return [];
        }
        return [`${relative(SOURCE_ROOT, file)} -> ${specifier}`];
    });
    return result;
}

/**
 * Reads static relative and package-import specifiers.
 *
 * @param source - Source text.
 * @returns Static relative and package-import specifiers.
 */
function readLocalImports(source: string): string[] {
    const pattern = /\b(?:from\s+|import\s+)["']((?:\.|#)[^"']+)["']/gu;
    return Array.from(source.matchAll(pattern), (match) => match[1]);
}

/**
 * Gets the target architecture layer for one local import.
 *
 * @param file - Source file.
 * @param specifier - Specifier value.
 * @returns The target architecture layer for one local import.
 */
function getImportLayer(file: string, specifier: string): string | null {
    if (specifier.startsWith(".")) {
        return getLayer(normalize(resolve(dirname(file), specifier)));
    }
    if (specifier.startsWith("#me/")) {
        const [packageName] = relative(SOURCE_ROOT, file).split(/[\\/]/u);
        const packagePath = specifier.slice("#me/".length);
        return getLayer(resolve(SOURCE_ROOT, packageName, packagePath));
    }

    const alias = Array.from(ALIAS_LAYERS.keys())
        .sort((left, right) => right.length - left.length)
        .find(
            (prefix) =>
                specifier === prefix || specifier.startsWith(`${prefix}/`),
        );
    return alias == null ? null : ALIAS_LAYERS.get(alias) || null;
}

/**
 * Gets the architecture layer represented by a source path.
 *
 * @param path - File path.
 * @returns The architecture layer represented by a source path.
 */
function getLayer(path: string): string | null {
    const parts = relative(SOURCE_ROOT, path).split(/[\\/]/u);
    if (parts.includes("i18n")) {
        return "config";
    }
    return parts.find((part) => LAYERS.has(part)) || null;
}
