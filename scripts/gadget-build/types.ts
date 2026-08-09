/**
 * Defines structured package and build values for gadget builds.
 */

export interface BundleOptions {
    minifyText?: boolean;
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
    userscript?: UserscriptConfig;
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

export interface UserscriptConfig {
    grant?: string[];
    match?: string[];
    name?: string;
    namespace?: string;
    runAt?: string;
    sandbox?: string;
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
