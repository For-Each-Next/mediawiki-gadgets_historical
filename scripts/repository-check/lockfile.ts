/** Validates package-lock metadata against source manifests. */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { compareText } from "#workspace/files";
import {
    hasErrorCode,
    hasText,
    isRecord,
    readPackageMetadata,
} from "#workspace/metadata";
import type { PackageMetadata, WorkspacePackage } from "#workspace/types";

interface Lockfile {
    lockfileVersion?: unknown;
    packages?: Record<string, unknown>;
}

const DEPENDENCY_MAP_FIELDS = [
    "dependencies",
    "devDependencies",
    "optionalDependencies",
    "peerDependencies",
    "peerDependenciesMeta",
] as const;

type DependencyMapField = (typeof DEPENDENCY_MAP_FIELDS)[number];

/** Checks lockfile v3 package entries and workspace links. */
export async function checkWorkspaceLockfile(
    workspaceRoot: string,
    packages: WorkspacePackage[],
): Promise<string[]> {
    const lockfile = await readLockfile(workspaceRoot);
    if (lockfile == null) {
        return ["workspace: package-lock.json is missing or invalid."];
    }
    const problems: string[] = [];
    if (lockfile.lockfileVersion !== 3) {
        problems.push("workspace: package-lock.json must use lockfile v3.");
    }
    if (lockfile.packages == null) {
        problems.push("workspace: package-lock.json must contain packages.");
        return problems;
    }
    const rootMetadata = await readPackageMetadata(
        join(workspaceRoot, "package.json"),
    );
    problems.push(...checkManifestEntry("", rootMetadata, lockfile.packages));
    problems.push(...checkWorkspaceEntries(packages, lockfile.packages));
    problems.push(...checkStaleWorkspaceEntries(packages, lockfile.packages));
    return problems;
}

/** Reads and narrows the tracked npm lockfile. */
async function readLockfile(workspaceRoot: string): Promise<Lockfile | null> {
    try {
        const value: unknown = JSON.parse(
            await readFile(join(workspaceRoot, "package-lock.json"), "utf8"),
        );
        if (!isRecord(value)) {
            return null;
        }
        const packages = isRecord(value.packages) ? value.packages : undefined;
        return { lockfileVersion: value.lockfileVersion, packages };
    } catch (error) {
        if (hasErrorCode(error, "ENOENT") || error instanceof SyntaxError) {
            return null;
        }
        throw error;
    }
}

/** Checks source entries and their node_modules links. */
function checkWorkspaceEntries(
    packages: WorkspacePackage[],
    entries: Record<string, unknown>,
): string[] {
    return packages.flatMap((workspacePackage) => {
        const key = `src/${workspacePackage.directoryName}`;
        return [
            ...checkManifestEntry(
                key,
                workspacePackage.metadata,
                entries,
                workspacePackage.directoryName,
            ),
            ...checkWorkspaceLink(workspacePackage, entries),
        ];
    });
}

/** Validates identity and dependency fields copied from a manifest. */
function checkManifestEntry(
    key: string,
    metadata: PackageMetadata,
    entries: Record<string, unknown>,
    fallbackName?: string,
): string[] {
    const entry = entries[key];
    const label = key === "" ? "root package" : key;
    if (!isRecord(entry)) {
        return [`package-lock.json: missing ${label} entry.`];
    }
    const problems: string[] = [];
    const effectiveName = entry.name ?? fallbackName;
    compareField(label, "name", metadata.name, effectiveName, problems);
    compareField(label, "version", metadata.version, entry.version, problems);
    compareField(label, "license", metadata.license, entry.license, problems);
    compareField(label, "engines", metadata.engines, entry.engines, problems);
    compareField(
        label,
        "workspaces",
        metadata.workspaces,
        entry.workspaces,
        problems,
    );
    for (const field of DEPENDENCY_MAP_FIELDS) {
        compareDependencyMap(label, field, metadata, entry, problems);
    }
    return problems;
}

/** Adds a diagnostic for one manifest field mismatch. */
function compareField(
    label: string,
    field: string,
    expected: unknown,
    actual: unknown,
    problems: string[],
): void {
    if (!sameJsonValue(expected, actual)) {
        problems.push(
            `package-lock.json: ${label} ${field} does not match its ` +
                "manifest.",
        );
    }
}

/** Compares scalar or JSON-compatible manifest values. */
function sameJsonValue(expected: unknown, actual: unknown): boolean {
    return (
        JSON.stringify(sortJsonValue(expected)) ===
        JSON.stringify(sortJsonValue(actual))
    );
}

/** Recursively sorts JSON objects for stable semantic comparison. */
function sortJsonValue(value: unknown): unknown {
    if (Array.isArray(value)) {
        return value.map(sortJsonValue);
    }
    if (!isRecord(value)) {
        return value;
    }
    return Object.fromEntries(
        Object.entries(value)
            .toSorted(([left], [right]) => compareText(left, right))
            .map(([key, nested]) => [key, sortJsonValue(nested)]),
    );
}

/** Compares one complete dependency-related manifest map. */
function compareDependencyMap(
    label: string,
    field: DependencyMapField,
    metadata: PackageMetadata,
    entry: Record<string, unknown>,
    problems: string[],
): void {
    const manifest = normalizeDependencyMap(metadata[field]);
    const locked = normalizeDependencyMap(entry[field]);
    if (!sameJsonValue(manifest, locked)) {
        problems.push(
            `package-lock.json: ${label} ${field} do not ` +
                "match its manifest.",
        );
    }
}

/** Treats an omitted dependency map like an empty manifest map. */
function normalizeDependencyMap(value: unknown): unknown {
    return value === undefined ? {} : value;
}

/** Checks npm's link entry for one source workspace. */
function checkWorkspaceLink(
    workspacePackage: WorkspacePackage,
    entries: Record<string, unknown>,
): string[] {
    const name = workspacePackage.metadata.name;
    if (!hasText(name)) {
        return [];
    }
    const key = `node_modules/${name}`;
    const entry = entries[key];
    const target = `src/${workspacePackage.directoryName}`;
    if (isExpectedWorkspaceLink(entry, target)) {
        return [];
    }
    return [`package-lock.json: ${key} must link to ${target}.`];
}

/** Checks one npm workspace-link entry. */
function isExpectedWorkspaceLink(entry: unknown, target: string): boolean {
    return isRecord(entry) && entry.link === true && entry.resolved === target;
}

/** Rejects source workspace entries with no current manifest. */
function checkStaleWorkspaceEntries(
    packages: WorkspacePackage[],
    entries: Record<string, unknown>,
): string[] {
    const expected = new Set(
        packages.map((entry) => `src/${entry.directoryName}`),
    );
    return Object.keys(entries)
        .filter((key) => /^src\/[^/]+$/u.test(key) && !expected.has(key))
        .toSorted(compareText)
        .map((key) => `package-lock.json: stale workspace entry ${key}.`);
}
