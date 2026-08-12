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
    "CHANGELOG.md",
    "LICENSE",
    "README.md",
    "index.ts",
    "main.ts",
];
const FORBIDDEN_TOP_LEVEL_DIRECTORIES = new Map([
    ["app", "use main.ts and responsibility-named modules"],
]);
const GENERIC_NAME_PATTERN = /^(?:common|helpers|utils)(?:\.ts)?$/u;

/** Checks required entries and responsibility-oriented names. */
export async function checkPackageStructure(
    gadget: GadgetPackage,
): Promise<string[]> {
    const problems = await checkRequiredFiles(gadget);
    problems.push(...(await checkTopLevelDirectories(gadget)));
    const genericPaths = await findGenericPaths(gadget.directory);
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

/** Rejects obsolete top-level responsibility directories. */
async function checkTopLevelDirectories(
    gadget: GadgetPackage,
): Promise<string[]> {
    const problems: string[] = [];
    for (const [name, guidance] of FORBIDDEN_TOP_LEVEL_DIRECTORIES) {
        const status = await getPathStatus(join(gadget.directory, name));
        if (status != null) {
            problems.push(
                `${gadget.directoryName}: ${name}/ is not a package ` +
                    `responsibility; ${guidance}.`,
            );
        }
    }
    return problems;
}

/** Finds generic names through the shared authored-tree inventory. */
async function findGenericPaths(directory: string): Promise<string[]> {
    const tree = await inspectAuthoredTree(directory);
    return [...tree.directories, ...tree.files, ...tree.symbolicLinks]
        .filter((path) => GENERIC_NAME_PATTERN.test(basename(path)))
        .toSorted(compareText);
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
