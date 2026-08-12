/** Exposes reusable project-level repository checks. */

export { checkArtifactCollisions } from "./artifacts.ts";
export { checkBrowserEntry } from "./browser-entry.ts";
export { checkLicensing, checkCurrentLicenseMaps } from "./licensing.ts";
export { checkWorkspaceLockfile } from "./lockfile.ts";
export { checkMarkdownLines } from "./markdown.ts";
export { checkPackageDocumentation } from "./package-documentation.ts";
export { checkPackageLicense } from "./package-license.ts";
export {
    checkPackageMetadata,
    matchesPackageVersion,
    SHARED_PACKAGE_NAME,
    usesSharedRuntime,
} from "./package-metadata.ts";
export { checkPackageStructure } from "./package-structure.ts";
export { checkToolingOutputs } from "./tooling-outputs.ts";
export {
    checkDiscoveredGadgetPackages,
    checkGadgetPackageContracts,
    type PackageCheckOptions,
} from "./packages.ts";
export { checkRepository, type RepositoryCheckResult } from "./repository.ts";
export {
    checkSourceBoundaries,
    type SourceBoundaryResult,
} from "./source-boundaries.ts";
export type { CheckResult, PackageContractResult } from "./types.ts";
