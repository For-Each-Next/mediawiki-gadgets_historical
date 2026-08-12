/** Builds every workspace artifact from one shared plan. */

import { buildWorkspaceArtifacts } from "./index.ts";

const result = await buildWorkspaceArtifacts(process.cwd());
console.log(`Built ${result.artifactPaths.length} workspace artifacts.`);
