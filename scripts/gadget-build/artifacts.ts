/**
 * Protects the shared distribution directory from artifact collisions.
 */

import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

export interface ArtifactClaim {
    outputName: string;
    owner: string;
}

export interface ArtifactCollision {
    filename: string;
    owners: string[];
}

/** Lists the three artifact names claimed by one gadget basename. */
export function createArtifactNames(outputName: string): string[] {
    return [
        `${outputName}.js`,
        `${outputName}.min.js`,
        `${outputName}.user.js`,
    ];
}

/** Finds case-insensitive collisions between gadget artifact claims. */
export function findArtifactCollisions(
    claims: ArtifactClaim[],
): ArtifactCollision[] {
    const ownersByFilename = new Map<string, Set<string>>();
    for (const claim of claims) {
        for (const filename of createArtifactNames(claim.outputName)) {
            const key = filename.toLowerCase();
            const owners = ownersByFilename.get(key) ?? new Set<string>();
            owners.add(claim.owner);
            ownersByFilename.set(key, owners);
        }
    }
    return [...ownersByFilename.entries()]
        .filter(([, owners]) => owners.size > 1)
        .map(([filename, owners]) => ({
            filename,
            owners: [...owners].sort(),
        }));
}

/**
 * Rejects workspace collisions before a build removes any output.
 *
 * @param packageRoot - Workspace gadget package directory.
 */
export async function assertUniqueWorkspaceArtifacts(
    packageRoot: string,
): Promise<void> {
    const claims = await readWorkspaceArtifactClaims(packageRoot);
    const collision = findArtifactCollisions(claims)[0];
    if (collision == null) {
        return;
    }
    throw new Error(
        `Generated artifact ${collision.filename} collides between ` +
            `${collision.owners.join(", ")}.`,
    );
}

/** Reads artifact claims from every deployable sibling package. */
async function readWorkspaceArtifactClaims(
    packageRoot: string,
): Promise<ArtifactClaim[]> {
    const sourceRoot = resolve(packageRoot, "..");
    const entries = await readdir(sourceRoot, { withFileTypes: true });
    const claims = await Promise.all(
        entries
            .filter((entry) => entry.isDirectory())
            .map((entry) =>
                readArtifactClaim(resolve(sourceRoot, entry.name), entry.name),
            ),
    );
    return claims.filter((claim) => claim != null);
}

/** Reads one sibling package's effective artifact claim. */
async function readArtifactClaim(
    packageRoot: string,
    packageName: string,
): Promise<ArtifactClaim | null> {
    let source: string;
    try {
        source = await readFile(resolve(packageRoot, "package.json"), "utf8");
    } catch (error) {
        if (hasErrorCode(error, "ENOENT")) {
            return null;
        }
        throw error;
    }
    const metadata = JSON.parse(source) as unknown;
    if (!isRecord(metadata) || !isRecord(metadata.gadgetBuild)) {
        return null;
    }
    const outputName = metadata.gadgetBuild.outputName;
    if (!hasText(outputName)) {
        throw new Error(
            `${packageName} must define gadgetBuild.outputName before build.`,
        );
    }
    return { outputName, owner: packageName };
}

/** Checks whether a value is an object record. */
function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value != null && !Array.isArray(value);
}

/** Checks whether a value contains non-whitespace text. */
function hasText(value: unknown): value is string {
    return typeof value === "string" && value.trim() !== "";
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
