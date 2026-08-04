/** Protects build output directories from unsafe entries. */

import { lstat, mkdir, rmdir } from "node:fs/promises";

/**
 * Creates a build directory or rejects links and non-directory entries.
 *
 * @param path - Expected directory path.
 * @param label - Directory label for diagnostics.
 */
export async function ensureBuildDirectory(
    path: string,
    label: string,
): Promise<void> {
    try {
        const stats = await lstat(path);
        if (!stats.isDirectory() || stats.isSymbolicLink()) {
            throw new Error(`${label} must be a real directory.`);
        }
    } catch (error) {
        if (!hasErrorCode(error, "ENOENT")) {
            throw error;
        }
        await mkdir(path);
    }
}

/**
 * Finds a retired directory without following links or ordinary files.
 *
 * @param path - Possible retired directory path.
 * @param label - Directory label for diagnostics.
 * @returns Whether a real directory exists at the path.
 */
export async function validateRetiredBuildDirectory(
    path: string,
    label: string,
): Promise<boolean> {
    try {
        const stats = await lstat(path);
        if (stats.isSymbolicLink()) {
            throw new Error(`${label} must be a real directory.`);
        }
        return stats.isDirectory();
    } catch (error) {
        if (hasErrorCode(error, "ENOENT")) {
            return false;
        }
        throw error;
    }
}

/**
 * Removes a retired directory only when no unrelated entries remain.
 *
 * @param path - Retired directory path.
 */
export async function removeEmptyBuildDirectory(path: string): Promise<void> {
    try {
        await rmdir(path);
    } catch (error) {
        if (
            hasErrorCode(error, "ENOENT") ||
            hasErrorCode(error, "ENOTEMPTY") ||
            hasErrorCode(error, "EEXIST")
        ) {
            return;
        }
        throw error;
    }
}

/** Checks an unknown error for one Node error code. */
function hasErrorCode(error: unknown, code: string): boolean {
    return (
        typeof error === "object" &&
        error != null &&
        "code" in error &&
        error.code === code
    );
}
