/** Enforces dependency direction between gadget architecture layers. */

import { readdir, readFile } from "node:fs/promises";
import { dirname, normalize, relative, resolve } from "node:path";

const SOURCE_ROOT = resolve("src");
const LAYERS = new Set([
    "application",
    "config",
    "domain",
    "infrastructure",
    "presentation",
    "shared",
]);
const ALLOWED_DEPENDENCIES = {
    application: new Set([
        "application",
        "config",
        "domain",
        "infrastructure",
        "shared",
    ]),
    config: new Set(["config", "shared"]),
    domain: new Set(["domain", "shared"]),
    infrastructure: new Set(["config", "domain", "infrastructure", "shared"]),
    presentation: LAYERS,
    shared: new Set(["shared"]),
};

const files = await listTypeScriptFiles(SOURCE_ROOT);
const errors = (await Promise.all(files.map(checkFile))).flat();

if (errors.length > 0) {
    throw new Error(`Architecture violations:\n${errors.join("\n")}`);
}

/** Lists authored TypeScript files below one directory. */
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

/** Checks all relative imports in one source file. */
async function checkFile(file: string): Promise<string[]> {
    const source = await readFile(file, "utf8");
    const sourceLayer = getLayer(file);
    const imports = readRelativeImports(source);

    if (sourceLayer == null) {
        return [];
    }

    return imports.flatMap((specifier) => {
        const target = normalize(resolve(dirname(file), specifier));
        const targetLayer = getLayer(target);
        const allowed = ALLOWED_DEPENDENCIES[sourceLayer];
        if (targetLayer == null || allowed.has(targetLayer)) {
            return [];
        }
        return [`${relative(SOURCE_ROOT, file)} -> ${specifier}`];
    });
}

/** Reads static relative import and re-export specifiers. */
function readRelativeImports(source: string): string[] {
    const pattern = /\b(?:from\s+|import\s+)["'](\.[^"']+)["']/gu;
    return Array.from(source.matchAll(pattern), (match) => match[1]);
}

/** Gets the architecture layer represented by a source path. */
function getLayer(path: string): string | null {
    const parts = relative(SOURCE_ROOT, path).split(/[\\/]/u);
    return parts.find((part) => LAYERS.has(part)) || null;
}
