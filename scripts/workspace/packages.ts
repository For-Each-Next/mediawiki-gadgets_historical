/**
 * Discovers source packages and parses their manifests once.
 */

import { readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { compareText } from "./files.ts";
import { hasErrorCode, readPackageMetadata } from "./metadata.ts";
import { formatWorkspacePath } from "./paths.ts";
import {
    isGadgetPackage,
    type GadgetPackage,
    type WorkspaceDiscovery,
    type WorkspacePackage,
} from "./types.ts";

/** Inspects every package manifest below `src/`. */
export async function inspectWorkspacePackages(
    workspaceRoot: string,
): Promise<WorkspaceDiscovery> {
    const sourceRoot = resolve(workspaceRoot, "src");
    const entries = (await readdir(sourceRoot, { withFileTypes: true }))
        .filter((entry) => entry.isDirectory())
        .toSorted((left, right) => compareText(left.name, right.name));
    const candidates = await Promise.all(
        entries.map((entry) => inspectCandidate(workspaceRoot, entry.name)),
    );
    return {
        packages: candidates.flatMap((candidate) => candidate.packages),
        problems: candidates.flatMap((candidate) => candidate.problems),
    };
}

/** Discovers source packages or rejects malformed manifests. */
export async function discoverWorkspacePackages(
    workspaceRoot: string,
): Promise<WorkspacePackage[]> {
    const result = await inspectWorkspacePackages(workspaceRoot);
    if (result.problems.length > 0) {
        throw new Error(result.problems.join("\n"));
    }
    return result.packages;
}

/** Discovers deployable gadgets in stable directory-name order. */
export async function discoverGadgetPackages(
    workspaceRoot: string,
): Promise<GadgetPackage[]> {
    const packages = await discoverWorkspacePackages(workspaceRoot);
    return packages.filter(isGadgetPackage);
}

/** Reads one directory when it contains a package manifest. */
async function inspectCandidate(
    workspaceRoot: string,
    directoryName: string,
): Promise<WorkspaceDiscovery> {
    const directory = resolve(workspaceRoot, "src", directoryName);
    const manifestPath = join(directory, "package.json");
    try {
        const metadata = await readPackageMetadata(manifestPath);
        return {
            packages: [{ directory, directoryName, manifestPath, metadata }],
            problems: [],
        };
    } catch (error) {
        return handleManifestError(workspaceRoot, manifestPath, error);
    }
}

/** Converts manifest failures to deterministic discovery results. */
function handleManifestError(
    workspaceRoot: string,
    manifestPath: string,
    error: unknown,
): WorkspaceDiscovery {
    if (hasErrorCode(error, "ENOENT")) {
        return { packages: [], problems: [] };
    }
    if (error instanceof SyntaxError || error instanceof TypeError) {
        const path = formatWorkspacePath(workspaceRoot, manifestPath);
        return {
            packages: [],
            problems: [`${path}: package manifest is not valid JSON.`],
        };
    }
    throw error;
}
