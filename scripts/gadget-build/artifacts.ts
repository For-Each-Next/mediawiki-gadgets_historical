/**
 * Protects the shared distribution directory from artifact collisions.
 */

import { resolve } from "node:path";
import {
    discoverGadgetPackages,
    type GadgetPackage,
} from "../workspace/index.ts";
import {
    AGGREGATE_OUTPUT_FILENAME,
    createGadgetArtifactFilenames,
} from "./artifact-names.ts";

export interface ArtifactClaim {
    outputName: string;
    owner: string;
}

export interface ArtifactCollision {
    filename: string;
    owners: string[];
}

/**
 * Finds case-insensitive collisions between gadget artifact claims.
 *
 * @param claims - Artifact claims to inspect.
 * @returns Case-insensitive collisions between gadget artifact claims.
 */
export function findArtifactCollisions(
    claims: ArtifactClaim[],
): ArtifactCollision[] {
    const ownersByFilename = new Map<string, Set<string>>();
    for (const claim of claims) {
        const filenames = createGadgetArtifactFilenames(claim.outputName);
        for (const filename of Object.values(filenames)) {
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

/** Checks whether a gadget basename claims the aggregate path. */
export function reservesAggregateArtifact(outputName: string): boolean {
    const filenames = createGadgetArtifactFilenames(outputName);
    return Object.values(filenames).some(
        (filename) => filename.toLowerCase() === AGGREGATE_OUTPUT_FILENAME,
    );
}

/** Rejects the first collision in a collection of artifact claims. */
export function assertUniqueArtifactClaims(claims: ArtifactClaim[]): void {
    const reserved = claims.find((claim) =>
        reservesAggregateArtifact(claim.outputName),
    );
    if (reserved != null) {
        throw new Error(
            `Generated artifact ${AGGREGATE_OUTPUT_FILENAME} collides ` +
                `between aggregate userscript, ${reserved.owner}.`,
        );
    }
    const collision = findArtifactCollisions(claims)[0];
    if (collision == null) {
        return;
    }
    throw new Error(
        `Generated artifact ${collision.filename} collides between ` +
            `${collision.owners.join(", ")}.`,
    );
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
    assertUniqueArtifactClaims(claims);
}

/** Reads artifact claims from every deployable sibling package. */
async function readWorkspaceArtifactClaims(
    packageRoot: string,
): Promise<ArtifactClaim[]> {
    const workspaceRoot = resolve(packageRoot, "../..");
    const gadgets = await discoverGadgetPackages(workspaceRoot);
    return gadgets.map((gadget) => ({
        outputName: requireOutputName(gadget),
        owner: gadget.directoryName,
    }));
}

/** Requires one discovered gadget to claim a concrete artifact name. */
function requireOutputName(gadget: GadgetPackage): string {
    const outputName = gadget.metadata.gadgetBuild.outputName;
    if (typeof outputName === "string" && outputName.trim() !== "") {
        return outputName;
    }
    throw new Error(
        `${gadget.directoryName} must define gadgetBuild.outputName before ` +
            "build.",
    );
}
