/** Verifies deterministic builds from the repository root. */

import { verifyWorkspaceBuild } from "./index.ts";

const result = await verifyWorkspaceBuild(process.cwd());
console.log(
    `Verified ${result.artifactNames.length} reproducible build artifacts.`,
);
