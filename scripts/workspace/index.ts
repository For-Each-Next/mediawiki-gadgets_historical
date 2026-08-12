/** Exposes the workspace model used by repository tooling. */

export {
    collectAuthoredFiles,
    compareText,
    inspectAuthoredTree,
    type AuthoredTree,
} from "./files.ts";
export {
    hasErrorCode,
    hasText,
    isRecord,
    readPackageMetadata,
} from "./metadata.ts";
export {
    discoverGadgetPackages,
    discoverWorkspacePackages,
    inspectWorkspacePackages,
} from "./packages.ts";
export {
    formatWorkspacePath,
    isOutsideRoot,
    requireContainedPath,
    resolveContainedPath,
    toPosixPath,
} from "./paths.ts";
export {
    isGadgetPackage,
    type GadgetBuildMetadata,
    type GadgetPackage,
    type PackageMetadata,
    type VueMetadata,
    type WorkspaceDiscovery,
    type WorkspacePackage,
} from "./types.ts";
