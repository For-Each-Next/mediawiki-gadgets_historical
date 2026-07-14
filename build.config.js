/* eslint-disable */

/**
 * Formats shared build output for MediaWiki gadget publishing.
 */

export const minifiedOutput = {
    prefix: "//<nowiki>",
    suffix: "//</nowiki>",
};

/**
 * Wraps minified gadget code for publishing on MediaWiki.
 *
 * @param {string} code - Minified JavaScript.
 * @param {object} metadata - Package metadata.
 * @param {string} metadata.description - Package description.
 * @param {string} metadata.name - Package name.
 * @param {string} metadata.version - Package version.
 * @returns {string} Wrapped JavaScript.
 */
export function formatMinifiedOutput(code, metadata) {
    const header = [
        "// ==UserScript==",
        formatMetadata("name", metadata.name),
        formatMetadata("version", metadata.version),
        formatMetadata("description", metadata.description),
        "// ==/UserScript==",
    ].join("\n");

    return `${header}\n\n${minifiedOutput.prefix}\n${code.trim()}\n${minifiedOutput.suffix}\n`;
}

/**
 * Formats one metadata line.
 *
 * @param {string} key - Metadata key.
 * @param {string} value - Metadata value.
 * @returns {string} Metadata line.
 */
function formatMetadata(key, value) {
    return `// @${key.padEnd(13)}${value}`;
}
