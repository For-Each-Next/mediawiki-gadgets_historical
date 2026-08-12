/**
 * Provides display and containment helpers for workspace tooling.
 */

import { isAbsolute, relative, resolve, sep } from "node:path";

/** Converts a platform path to repository-style separators. */
export function toPosixPath(path: string): string {
    return path.split(sep).join("/");
}

/** Formats an absolute path relative to a workspace root. */
export function formatWorkspacePath(root: string, path: string): string {
    const displayPath = toPosixPath(relative(resolve(root), resolve(path)));
    return displayPath === "" ? "." : displayPath;
}

/** Requires a path to remain at or below a root directory. */
export function requireContainedPath(
    root: string,
    path: string,
    label: string = "Path",
): string {
    const absoluteRoot = resolve(root);
    const absolutePath = resolve(path);
    const localPath = relative(absoluteRoot, absolutePath);
    if (isOutsideRoot(localPath)) {
        throw new Error(`${label} must remain inside ${absoluteRoot}.`);
    }
    return absolutePath;
}

/** Resolves segments and requires the result to stay below the root. */
export function resolveContainedPath(
    root: string,
    ...segments: string[]
): string {
    return requireContainedPath(root, resolve(root, ...segments));
}

/** Checks whether a relative path escapes its origin. */
export function isOutsideRoot(localPath: string): boolean {
    return (
        isAbsolute(localPath) ||
        localPath === ".." ||
        localPath.startsWith(`..${sep}`)
    );
}
