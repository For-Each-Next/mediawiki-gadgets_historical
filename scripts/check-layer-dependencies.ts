/**
 * Enforces downward dependencies between gadget architecture layers.
 */

import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative, sep } from "node:path";
import { pathToFileURL } from "node:url";

const LAYER_NAMES = new Set([
    "contracts",
    "domain",
    "infra",
    "jobs",
    "publishing",
    "services",
    "sources",
    "support",
    "ui",
    "workflows",
]);
const FORBIDDEN_IMPORTS: Record<string, Set<string>> = {
    contracts: new Set([
        "infra",
        "jobs",
        "publishing",
        "services",
        "sources",
        "ui",
        "workflows",
    ]),
    domain: new Set([
        "infra",
        "jobs",
        "publishing",
        "services",
        "sources",
        "ui",
        "workflows",
    ]),
    infra: new Set(["jobs", "services", "ui", "workflows"]),
    jobs: new Set(["ui"]),
    publishing: new Set(["jobs", "services", "ui", "workflows"]),
    services: new Set(["jobs", "ui", "workflows"]),
    sources: new Set(["jobs", "services", "ui", "workflows"]),
    support: new Set(["jobs", "services", "ui", "workflows"]),
    ui: new Set([
        "infra",
        "jobs",
        "publishing",
        "services",
        "sources",
        "workflows",
    ]),
    workflows: new Set(["ui"]),
};
const IMPORT_PATTERN = /\b(?:from\s+|import\s*\(\s*)["']([^"']+)["']/gu;

export interface LayerCheckResult {
    fileCount: number;
    problems: string[];
}

/**
 * Checks every gadget TypeScript file for upward layer imports.
 *
 * @param workspaceRoot - Repository root containing `src/`.
 * @returns Checked file count and dependency violations.
 */
export async function checkLayerDependencies(
    workspaceRoot: string,
): Promise<LayerCheckResult> {
    const sourceRoot = join(workspaceRoot, "src");
    const files = await collectTypeScriptFiles(sourceRoot);
    const results = await Promise.all(
        files.map((file) => checkFile(sourceRoot, file)),
    );

    return {
        fileCount: files.length,
        problems: results.flat(),
    };
}

/**
 * Recursively collects authored TypeScript files.
 *
 * @param directory - Directory to visit.
 * @returns TypeScript file paths.
 */
async function collectTypeScriptFiles(directory: string): Promise<string[]> {
    const entries = await readdir(directory, { withFileTypes: true });
    const files: string[] = [];
    for (const entry of entries) {
        const path = join(directory, entry.name);
        if (entry.isDirectory()) {
            files.push(...(await collectTypeScriptFiles(path)));
        } else if (extname(entry.name) === ".ts") {
            files.push(path);
        }
    }
    return files;
}

/**
 * Checks imports in one layered source file.
 *
 * @param sourceRoot - Workspace source directory.
 * @param file - Source file path.
 * @returns File-scoped dependency violations.
 */
async function checkFile(sourceRoot: string, file: string): Promise<string[]> {
    const sourcePath = relative(sourceRoot, file).split(sep).join("/");
    const [, sourceLayer] = sourcePath.split("/");
    const source = await readFile(file, "utf8");
    const imports = [...source.matchAll(IMPORT_PATTERN)];
    const problems = getImportConventionProblems(sourcePath, imports);
    if (!LAYER_NAMES.has(sourceLayer)) {
        return problems;
    }
    for (const match of imports) {
        const targetLayer = getTargetLayer(match[1]);
        if (
            targetLayer != null &&
            FORBIDDEN_IMPORTS[sourceLayer].has(targetLayer)
        ) {
            const prefix =
                `${sourcePath}: ${sourceLayer} must not import ` +
                `${targetLayer} `;
            problems.push(`${prefix}through "${match[1]}".`);
        }
    }
    return problems;
}

/** Checks aliases that apply independently of architecture layers. */
function getImportConventionProblems(
    sourcePath: string,
    imports: RegExpMatchArray[],
): string[] {
    if (sourcePath.startsWith("shared/")) {
        return [];
    }
    return imports.flatMap(function checkSpecifier(match) {
        const specifier = match[1];
        if (specifier === "#me" || specifier.startsWith("#me/")) {
            return [
                `${sourcePath}: replace legacy import "${specifier}" ` +
                    "with #gadget.",
            ];
        }
        if (specifier === "#shared") {
            return [
                `${sourcePath}: replace aggregate #shared with an explicit ` +
                    "shared subpath.",
            ];
        }
        return [];
    });
}

/**
 * Extracts a package-local architecture layer from an import specifier.
 *
 * @param specifier - TypeScript import specifier.
 * @returns Target layer, when the import addresses one.
 */
function getTargetLayer(specifier: string): string | null {
    const layerNames = [...LAYER_NAMES].join("|");
    const aliasPattern = new RegExp(`^#gadget/(${layerNames})(?:/|$)`, "u");
    const aliasMatch = specifier.match(aliasPattern);
    if (aliasMatch != null) {
        return aliasMatch[1];
    }
    const relativePattern = new RegExp(
        `^(?:\\.\\./)+(${layerNames})(?:/|$)`,
        "u",
    );
    const relativeMatch = specifier.match(relativePattern);
    return relativeMatch?.[1] ?? null;
}

/**
 * Runs validation when this module is the process entry point.
 */
async function main(): Promise<void> {
    const result = await checkLayerDependencies(process.cwd());
    if (result.problems.length > 0) {
        throw new Error(
            `Layer dependency check failed:\n${result.problems.join("\n")}`,
        );
    }
    console.log(`Checked layer imports in ${result.fileCount} files.`);
}

const entryUrl =
    process.argv[1] == null ? null : pathToFileURL(process.argv[1]).href;
if (entryUrl === import.meta.url) {
    await main();
}
