/** Protects build output directories from unsafe entries. */

import { lstat, mkdir } from "node:fs/promises";

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

/** Checks an unknown error for one Node error code. */
function hasErrorCode(error: unknown, code: string): boolean {
    return (
        typeof error === "object" &&
        error != null &&
        "code" in error &&
        error.code === code
    );
}
