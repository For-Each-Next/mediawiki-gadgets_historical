/**
 * Defines structured package and build values for gadget builds.
 */

export interface BundleOptions {
    minifyText?: boolean;
}

export interface BuildContextOptions {
    now?: Date;
    outputRoot?: string;
}

export interface BuildContext {
    buildTime: string;
    now: Date;
    outputRoot?: string;
}

export interface DefineConfig {
    textFile: string;
}

export interface GadgetBuildConfig {
    defines?: Record<string, DefineConfig>;
    entryPoint?: string;
    globalName?: string;
    headerAuthor?: boolean;
    headerDescription?: string[];
    noticeFiles?: string[];
    outputName?: string;
    target?: "es2024";
    userscript?: GadgetUserscriptConfig;
}

export interface UserscriptMetadata {
    author: string;
    description: string;
    license: string;
    name: string;
    version: string;
}

export interface PackageMetadata extends UserscriptMetadata {
    browser?: string;
    gadgetBuild: GadgetBuildConfig;
    main?: string;
    vue?: VueConfig;
}

export interface ResolvedGadgetBuildConfig extends GadgetBuildConfig {
    entryPoint: string;
    globalName: string;
    headerDescription: string[];
    outputDirectory: string;
    outputName: string;
}

export interface GadgetBuildPlan {
    buildTime: string;
    config: ResolvedGadgetBuildConfig;
    metadata: PackageMetadata;
    notices: string[];
    packageRoot: string;
}

export interface WorkspaceBuildPlan {
    context: BuildContext;
    gadgets: GadgetBuildPlan[];
    outputRoot: string;
    workspaceRoot: string;
}

export interface WorkspaceBuildResult {
    artifactPaths: string[];
    outputRoot: string;
}

export interface GadgetUserscriptConfig {
    grant?: string[];
    match?: string[];
    runAt?: string;
    sandbox?: string;
}

export interface AggregateUserscriptConfig extends GadgetUserscriptConfig {
    name?: string;
    namespace?: string;
}

export interface UserscriptProgram {
    matches: string[];
    name: string;
    source: string;
}

export interface VueConfig {
    assetsDir?: string;
    css?: {
        extract?: boolean;
    };
    filenameHashing?: boolean;
    outputDir?: string;
}
