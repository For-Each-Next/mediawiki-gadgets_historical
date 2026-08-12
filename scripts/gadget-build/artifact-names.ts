/** Defines the exact flat filenames owned by gadget builds. */

export const AGGREGATE_OUTPUT_FILENAME = "00-mediawiki-gadgets.user.js";

export interface GadgetArtifactFilenames {
    readable: string;
    minified: string;
    userscript: string;
}

/** Creates every current or retired filename owned by one gadget. */
export function createGadgetArtifactFilenames(
    outputName: string,
): GadgetArtifactFilenames {
    return {
        readable: `${outputName}.js`,
        minified: `${outputName}.min.js`,
        userscript: `${outputName}.user.js`,
    };
}
