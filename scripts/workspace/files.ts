/**
 * Walks authored workspace entries in stable order.
 */

import { readdir } from "node:fs/promises";
import { extname, join } from "node:path";

const DEFAULT_EXCLUDED_DIRECTORIES = new Set([
    ".git",
    ".cache",
    "dist",
    "node_modules",
]);

export interface AuthoredFileOptions {
    excludedDirectories?: ReadonlySet<string>;
    extensions?: ReadonlySet<string>;
}

export interface AuthoredTree {
    directories: string[];
    files: string[];
    symbolicLinks: string[];
}

/** Recursively collects regular authored files in stable path order. */
export async function collectAuthoredFiles(
    root: string,
    options: AuthoredFileOptions = {},
): Promise<string[]> {
    return (await inspectAuthoredTree(root, options)).files;
}

/** Collects every authored entry type in stable path order. */
export async function inspectAuthoredTree(
    root: string,
    options: AuthoredFileOptions = {},
): Promise<AuthoredTree> {
    const exclusions =
        options.excludedDirectories ?? DEFAULT_EXCLUDED_DIRECTORIES;
    const tree = await walkAuthoredTree(root, exclusions, options.extensions);
    return {
        directories: tree.directories.toSorted(compareText),
        files: tree.files.toSorted(compareText),
        symbolicLinks: tree.symbolicLinks.toSorted(compareText),
    };
}

/** Walks one directory while recording each authored entry type. */
async function walkAuthoredTree(
    directory: string,
    exclusions: ReadonlySet<string>,
    extensions: ReadonlySet<string> | undefined,
): Promise<AuthoredTree> {
    const entries = (
        await readdir(directory, { withFileTypes: true })
    ).toSorted((left, right) => compareText(left.name, right.name));
    const result: AuthoredTree = {
        directories: [],
        files: [],
        symbolicLinks: [],
    };
    for (const entry of entries) {
        const path = join(directory, entry.name);
        if (entry.isSymbolicLink()) {
            result.symbolicLinks.push(path);
        } else if (entry.isDirectory() && !exclusions.has(entry.name)) {
            result.directories.push(path);
            const nested = await walkAuthoredTree(
                path,
                exclusions,
                extensions,
            );
            result.directories.push(...nested.directories);
            result.files.push(...nested.files);
            result.symbolicLinks.push(...nested.symbolicLinks);
        } else if (entry.isFile() && matchesExtension(path, extensions)) {
            result.files.push(path);
        }
    }
    return result;
}

/** Checks a path against an optional lowercase extension allowlist. */
function matchesExtension(
    path: string,
    extensions: ReadonlySet<string> | undefined,
): boolean {
    return extensions == null || extensions.has(extname(path).toLowerCase());
}

/** Compares path and package names deterministically. */
export function compareText(left: string, right: string): number {
    return left < right ? -1 : left > right ? 1 : 0;
}
