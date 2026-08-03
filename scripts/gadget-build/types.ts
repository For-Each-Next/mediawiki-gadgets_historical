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
    outputName?: string;
    target?: "es2024";
    userscript?: UserscriptConfig;
}

export interface PackageMetadata {
    author: string;
    browser?: string;
    description: string;
    gadgetBuild: GadgetBuildConfig;
    main?: string;
    name: string;
    version: string;
    vue?: VueConfig;
}

export interface ResolvedGadgetBuildConfig extends GadgetBuildConfig {
    entryPoint: string;
    globalName: string;
    outputDirectory: string;
    outputName: string;
}

export interface GadgetBuildPlan {
    buildTime: string;
    config: ResolvedGadgetBuildConfig;
    metadata: PackageMetadata;
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

export interface VueConfig {
    assetsDir?: string;
    css?: {
        extract?: boolean;
    };
    filenameHashing?: boolean;
    outputDir?: string;
}
