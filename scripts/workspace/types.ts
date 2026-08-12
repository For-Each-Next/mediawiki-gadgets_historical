/**
 * Defines package metadata shared by workspace tooling.
 */

export interface GadgetBuildMetadata {
    defines?: unknown;
    entryPoint?: unknown;
    globalName?: unknown;
    headerAuthor?: unknown;
    headerDescription?: unknown;
    noticeFiles?: unknown;
    outputDirectory?: unknown;
    outputName?: unknown;
    target?: unknown;
    userscript?: unknown;
}

export interface VueMetadata {
    assetsDir?: unknown;
    css?: {
        extract?: unknown;
    };
    filenameHashing?: unknown;
    outputDir?: unknown;
}

export interface PackageMetadata {
    author?: unknown;
    browser?: unknown;
    dependencies?: Record<string, unknown>;
    description?: unknown;
    devDependencies?: Record<string, unknown>;
    engines?: Record<string, unknown>;
    exports?: Record<string, unknown>;
    files?: unknown;
    gadgetBuild?: GadgetBuildMetadata;
    imports?: Record<string, unknown>;
    license?: unknown;
    main?: unknown;
    name?: unknown;
    optionalDependencies?: Record<string, unknown>;
    peerDependencies?: Record<string, unknown>;
    peerDependenciesMeta?: Record<string, unknown>;
    private?: unknown;
    scripts?: Record<string, unknown>;
    type?: unknown;
    version?: unknown;
    vue?: VueMetadata;
    workspaces?: unknown;
}

export interface WorkspacePackage {
    directory: string;
    directoryName: string;
    manifestPath: string;
    metadata: PackageMetadata;
}

export interface GadgetPackage extends WorkspacePackage {
    metadata: PackageMetadata & {
        gadgetBuild: GadgetBuildMetadata;
    };
}

export interface WorkspaceDiscovery {
    packages: WorkspacePackage[];
    problems: string[];
}

/** Checks whether a discovered package declares a gadget build. */
export function isGadgetPackage(
    candidate: WorkspacePackage,
): candidate is GadgetPackage {
    return candidate.metadata.gadgetBuild != null;
}
