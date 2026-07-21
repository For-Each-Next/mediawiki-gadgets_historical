/**
 * Formats shared build output for MediaWiki gadget publishing.
 */

export const minifiedOutput = {
    prefix: "//<nowiki>",
    suffix: "//</nowiki>",
};

const USERSCRIPT_METADATA_KEY_WIDTH = 13;

interface BuildMetadata {
    description: string;
    name: string;
    version: string;
}

/**
 * Formats one metadata line.
 *
 * @param key - Metadata key.
 * @param value - Metadata value.
 * @returns Metadata line.
 */
function formatMetadata(key: string, value: string): string {
    return `// @${key.padEnd(USERSCRIPT_METADATA_KEY_WIDTH)}${value}`;
}

/**
 * Wraps minified gadget code for publishing on MediaWiki.
 *
 * @param code - Minified JavaScript.
 * @param metadata - Package metadata.
 * @returns Wrapped JavaScript.
 */
export function formatMinifiedOutput(
    code: string,
    metadata: BuildMetadata,
): string {
    const lines = [
        "// ==UserScript==",
        formatMetadata("name", metadata.name),
        formatMetadata("version", metadata.version),
        formatMetadata("description", metadata.description),
        "// ==/UserScript==",
        "",
        minifiedOutput.prefix,
        code.trim(),
        minifiedOutput.suffix,
        "",
    ];
    return lines.join("\n");
}
