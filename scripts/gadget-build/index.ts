/**
 * Exposes the shared gadget builder's public operations.
 */

export {
    findArtifactCollisions,
    reservesAggregateArtifact,
    type ArtifactClaim,
} from "./artifacts.ts";
export {
    AGGREGATE_OUTPUT_FILENAME,
    createGadgetArtifactFilenames,
    type GadgetArtifactFilenames,
} from "./artifact-names.ts";
export { buildAllUserscript } from "./all.ts";
export { buildGadget } from "./build.ts";
export { extractVueTemplate, minifyHtmlTemplate } from "./html-templates.ts";
export {
    isBuildDefineMap,
    isGadgetUserscriptConfig,
    isJavaScriptBindingIdentifier,
    isSafeUserscriptMetadataText,
    isSafeUserscriptMetadataTextArray,
    isSupportedPackageLicense,
    isSupportedGadgetUserscriptField,
} from "./metadata-validation.ts";
export {
    verifyWorkspaceBuild,
    type BuildVerificationResult,
} from "./verify.ts";
export { buildWorkspaceArtifacts } from "./workspace-build.ts";
export type { BuildContextOptions, WorkspaceBuildResult } from "./types.ts";
