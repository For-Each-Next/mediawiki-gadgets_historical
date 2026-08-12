/** Verifies reproducibility in isolated output directories. */

import { mkdtemp, readFile, readdir, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import { compareText } from "../workspace/index.ts";
import { buildWorkspaceArtifacts } from "./workspace-build.ts";

const VERIFICATION_TIME = new Date("2000-01-01T00:00:00.000Z");

export interface BuildVerificationResult {
    artifactNames: string[];
}

/** Builds twice at a fixed time and compares inventory and bytes. */
export async function verifyWorkspaceBuild(
    workspaceRoot: string,
): Promise<BuildVerificationResult> {
    const temporaryRoot = await mkdtemp(
        join(tmpdir(), "mediawiki-gadgets-build-verify-"),
    );
    const firstRoot = join(temporaryRoot, "first");
    const secondRoot = join(temporaryRoot, "second");
    try {
        const first = await buildWorkspaceArtifacts(workspaceRoot, {
            now: VERIFICATION_TIME,
            outputRoot: firstRoot,
        });
        const second = await buildWorkspaceArtifacts(workspaceRoot, {
            now: VERIFICATION_TIME,
            outputRoot: secondRoot,
        });
        const expectedNames = first.artifactPaths
            .map((path) => relative(firstRoot, path))
            .toSorted(compareText);
        assertExpectedArtifactPaths(
            secondRoot,
            second.artifactPaths,
            expectedNames,
        );
        await compareOutputTrees(firstRoot, secondRoot, expectedNames);
        return { artifactNames: expectedNames };
    } finally {
        await rm(temporaryRoot, { force: true, recursive: true });
    }
}

/** Requires the repeated build API result to match its inventory. */
function assertExpectedArtifactPaths(
    outputRoot: string,
    artifactPaths: string[],
    expectedNames: string[],
): void {
    const actualNames = artifactPaths
        .map((path) => relative(outputRoot, path))
        .toSorted(compareText);
    if (!sameTextList(actualNames, expectedNames)) {
        throw new Error(
            "Repeated workspace builds returned different artifacts.",
        );
    }
}

/** Requires both output trees to contain identical file bytes. */
async function compareOutputTrees(
    firstRoot: string,
    secondRoot: string,
    expectedNames: string[],
): Promise<void> {
    const [firstNames, secondNames] = await Promise.all([
        collectFileNames(firstRoot),
        collectFileNames(secondRoot),
    ]);
    if (
        !sameTextList(firstNames, expectedNames) ||
        !sameTextList(secondNames, expectedNames)
    ) {
        throw new Error("Workspace build produced an unexpected inventory.");
    }
    for (const name of expectedNames) {
        const [first, second] = await Promise.all([
            readFile(resolve(firstRoot, name)),
            readFile(resolve(secondRoot, name)),
        ]);
        if (!first.equals(second)) {
            throw new Error(`Workspace artifact ${name} is not reproducible.`);
        }
    }
}

/** Recursively lists regular output files in stable path order. */
async function collectFileNames(
    root: string,
    directory: string = root,
): Promise<string[]> {
    const entries = await readdir(directory, { withFileTypes: true });
    const names: string[] = [];
    for (const entry of entries.toSorted(compareEntries)) {
        const path = resolve(directory, entry.name);
        if (entry.isDirectory()) {
            names.push(...(await collectFileNames(root, path)));
            continue;
        }
        const info = await stat(path);
        if (!entry.isFile() || !info.isFile()) {
            throw new Error("Workspace build output must contain real files.");
        }
        names.push(relative(root, path));
    }
    return names.toSorted(compareText);
}

/** Checks two already sorted text arrays for exact equality. */
function sameTextList(left: string[], right: string[]): boolean {
    return (
        left.length === right.length &&
        left.every((value, index) => value === right[index])
    );
}

/** Orders directory entries by code-unit name order. */
function compareEntries(
    left: { name: string },
    right: { name: string },
): number {
    return compareText(left.name, right.name);
}
