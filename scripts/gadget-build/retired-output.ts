/** Plans and removes only explicitly owned build artifacts. */

import type { Stats } from "node:fs";
import { lstat, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { hasErrorCode } from "#workspace/metadata";
import {
    removeEmptyBuildDirectory,
    validateRetiredBuildDirectory,
} from "./output.ts";

export interface RetiredOutputSpec {
    directoryName: string;
    filenames: string[];
    label: string;
}

export interface OutputCleanupPlan {
    filenames: string[];
    retiredDirectory: string | null;
    retiredFilenames: string[];
}

/** Validates every cleanup target without changing the filesystem. */
export async function planOutputCleanup(
    outputRoot: string,
    filenames: string[],
    retired: RetiredOutputSpec,
): Promise<OutputCleanupPlan> {
    await validateOwnedFiles(outputRoot, filenames, "Build output");
    const retiredDirectory = await findRetiredDirectory(
        outputRoot,
        retired.directoryName,
        retired.label,
    );
    if (retiredDirectory != null) {
        await validateOwnedFiles(
            retiredDirectory,
            retired.filenames,
            "Retired build output",
        );
    }
    return {
        filenames,
        retiredDirectory,
        retiredFilenames: retired.filenames,
    };
}

/** Applies a previously validated cleanup plan. */
export async function cleanPlannedOutput(
    outputRoot: string,
    plan: OutputCleanupPlan,
): Promise<void> {
    await removeFiles(outputRoot, plan.filenames);
    if (plan.retiredDirectory != null) {
        await cleanRetiredDirectory(
            plan.retiredDirectory,
            plan.retiredFilenames,
        );
    }
}

/** Resolves a former directory after rejecting unsafe entries. */
export async function findRetiredDirectory(
    outputRoot: string,
    directoryName: string,
    label: string,
): Promise<string | null> {
    const directory = resolve(outputRoot, directoryName);
    const exists = await validateRetiredBuildDirectory(directory, label);
    return exists ? directory : null;
}

/** Removes owned files and then a former directory when it is empty. */
export async function cleanRetiredDirectory(
    directory: string,
    filenames: string[],
): Promise<void> {
    await removeFiles(directory, filenames);
    await removeEmptyBuildDirectory(directory);
}

/** Removes an explicit list of owned flat outputs. */
export async function removeFiles(
    outputRoot: string,
    filenames: string[],
): Promise<void> {
    await Promise.all(
        filenames.map((filename) =>
            rm(resolve(outputRoot, filename), { force: true }),
        ),
    );
}

/** Rejects owned file paths that cleanup cannot remove safely. */
async function validateOwnedFiles(
    root: string,
    filenames: string[],
    label: string,
): Promise<void> {
    for (const filename of filenames) {
        const stats = await readOwnedEntry(resolve(root, filename));
        if (stats?.isDirectory() === true && !stats.isSymbolicLink()) {
            throw new Error(`${label} must not be a directory.`);
        }
    }
}

/** Reads a possible owned output without rejecting a missing path. */
async function readOwnedEntry(path: string): Promise<Stats | null> {
    try {
        return await lstat(path);
    } catch (error) {
        if (hasErrorCode(error, "ENOENT")) {
            return null;
        }
        throw error;
    }
}
