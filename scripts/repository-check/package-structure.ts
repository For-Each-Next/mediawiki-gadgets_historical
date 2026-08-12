/** Validates deployable gadget package structure. */

import { lstat } from "node:fs/promises";
import { basename, join, relative } from "node:path";
import {
    compareText,
    hasErrorCode,
    inspectAuthoredTree,
    toPosixPath,
    type GadgetPackage,
} from "../workspace/index.ts";

const REQUIRED_FILES = [
    "AGENTS.md",
    "browser.ts",
    "CHANGELOG.md",
    "LICENSE",
    "README.md",
    "index.ts",
    "main.ts",
    "package.json",
];
const ALLOWED_TOP_LEVEL_DIRECTORIES = new Set([
    "adapters",
    "config",
    "contracts",
    "docs",
    "domain",
    "i18n",
    "ui",
    "workflows",
]);
const ALLOWED_TOP_LEVEL_FILES = new Set([...REQUIRED_FILES, "globals.d.ts"]);
const LEGACY_TOP_LEVEL_DIRECTORIES = new Map([
    ["app", "use main.ts as the composition root"],
    ["handlers", "move external-system handlers below adapters/"],
    ["infra", "rename external-system implementations to adapters/"],
    ["jobs", "move use-case coordination below workflows/"],
    ["publishing", "move publishing integrations below adapters/"],
    ["services", "classify services as workflows or adapters"],
    ["sources", "move external data sources below adapters/"],
    ["support", "replace support/ with its concrete responsibility"],
]);
const GENERIC_NAME_PATTERN = /^(?:common|helpers|utils)(?:\.ts)?$/u;

/** Checks required entries and responsibility-oriented names. */
export async function checkPackageStructure(
    gadget: GadgetPackage,
): Promise<string[]> {
    const problems = await checkRequiredFiles(gadget);
    const tree = await inspectAuthoredTree(gadget.directory);
    problems.push(...checkTopLevelEntries(gadget, tree));
    const genericPaths = findGenericPaths(gadget.directory, tree);
    for (const path of genericPaths) {
        const localPath = toPosixPath(relative(gadget.directory, path));
        problems.push(
            `${gadget.directoryName}: replace generic path ${localPath} ` +
                "with a responsibility name.",
        );
    }
    problems.push(...(await checkEmittedJavaScript(gadget)));
    return problems;
}

/** Rejects TypeScript compiler output beside authored source. */
async function checkEmittedJavaScript(
    gadget: GadgetPackage,
): Promise<string[]> {
    const tree = await inspectAuthoredTree(gadget.directory, {
        extensions: new Set([".js", ".map"]),
    });
    return tree.files
        .filter((path) => /(?:\.js|\.js\.map)$/u.test(path))
        .map((path) => {
            const localPath = toPosixPath(relative(gadget.directory, path));
            return (
                `${gadget.directoryName}: remove emitted JavaScript ` +
                `${localPath} from authored source.`
            );
        });
}

/** Requires package entry documents and modules to be files. */
async function checkRequiredFiles(gadget: GadgetPackage): Promise<string[]> {
    const results = await Promise.all(
        REQUIRED_FILES.map(async (name) => ({
            name,
            status: await getPathStatus(join(gadget.directory, name)),
        })),
    );
    return results.flatMap(({ name, status }) =>
        status === "file"
            ? []
            : [
                  `${gadget.directoryName}: missing required package path: ` +
                      `${name}.`,
              ],
    );
}

/** Rejects unknown roots, legacy layers, and empty branches. */
function checkTopLevelEntries(
    gadget: GadgetPackage,
    tree: Awaited<ReturnType<typeof inspectAuthoredTree>>,
): string[] {
    const problems: string[] = [];
    const directories = tree.directories.filter(
        (path) => !toPosixPath(relative(gadget.directory, path)).includes("/"),
    );
    const files = tree.files.filter(
        (path) => !toPosixPath(relative(gadget.directory, path)).includes("/"),
    );
    for (const path of directories) {
        const name = basename(path);
        const guidance = LEGACY_TOP_LEVEL_DIRECTORIES.get(name);
        if (guidance != null) {
            problems.push(
                `${gadget.directoryName}: ${name}/ is not a package ` +
                    `responsibility; ${guidance}.`,
            );
        } else if (!ALLOWED_TOP_LEVEL_DIRECTORIES.has(name)) {
            problems.push(
                `${gadget.directoryName}: ${name}/ is not an allowed ` +
                    "top-level source responsibility.",
            );
        } else if (!hasAuthoredFile(path, tree.files)) {
            problems.push(
                `${gadget.directoryName}: remove empty optional layer ` +
                    `${name}/.`,
            );
        }
    }
    problems.push(...checkTopLevelFiles(gadget, files));
    return problems;
}

/** Rejects files outside the small package-root contract. */
function checkTopLevelFiles(gadget: GadgetPackage, files: string[]): string[] {
    return files.flatMap((path) => {
        const name = basename(path);
        return ALLOWED_TOP_LEVEL_FILES.has(name)
            ? []
            : [
                  `${gadget.directoryName}: ${name} is not an allowed ` +
                      "package-root file.",
              ];
    });
}

/** Finds generic names through the shared authored-tree inventory. */
function findGenericPaths(
    directory: string,
    tree: Awaited<ReturnType<typeof inspectAuthoredTree>>,
): string[] {
    return [...tree.directories, ...tree.files, ...tree.symbolicLinks]
        .filter((path) => GENERIC_NAME_PATTERN.test(basename(path)))
        .toSorted(compareText);
}

/** Checks whether one branch contains an authored file. */
function hasAuthoredFile(directory: string, files: string[]): boolean {
    const prefix = `${directory}/`;
    return files.some((file) => file.startsWith(prefix));
}

/** Classifies a path without treating symlinks as required files. */
async function getPathStatus(
    path: string,
): Promise<"directory" | "file" | "other" | null> {
    try {
        const entry = await lstat(path);
        if (entry.isFile() && !entry.isSymbolicLink()) {
            return "file";
        }
        return entry.isDirectory() ? "directory" : "other";
    } catch (error) {
        if (hasErrorCode(error, "ENOENT")) {
            return null;
        }
        throw error;
    }
}
