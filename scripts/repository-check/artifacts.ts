/** Validates collision-free names in the flat distribution. */

import { AGGREGATE_OUTPUT_FILENAME } from "#gadget-build/artifact-names";
import {
    findArtifactCollisions,
    reservesAggregateArtifact,
} from "#gadget-build/artifacts";
import { hasText } from "#workspace/metadata";
import type { GadgetPackage } from "#workspace/types";

/** Rejects generated artifact names that collide by path or case. */
export function checkArtifactCollisions(gadgets: GadgetPackage[]): string[] {
    const claims = gadgets.flatMap((gadget) => {
        const outputName = gadget.metadata.gadgetBuild.outputName;
        return hasText(outputName)
            ? [{ outputName, owner: gadget.directoryName }]
            : [];
    });
    const reservationProblems = claims.flatMap((claim) =>
        reservesAggregateArtifact(claim.outputName)
            ? [
                  `${claim.owner}: generated artifact ` +
                      `${AGGREGATE_OUTPUT_FILENAME} collides with the ` +
                      "aggregate userscript.",
              ]
            : [],
    );
    const collisionProblems = findArtifactCollisions(claims).map(
        ({ filename, owners }) =>
            `${owners.join(", ")}: generated artifact ${filename} ` +
            "collides in the shared dist directory.",
    );
    return [...reservationProblems, ...collisionProblems];
}
