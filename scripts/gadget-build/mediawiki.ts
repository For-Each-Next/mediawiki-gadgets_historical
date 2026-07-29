/**
 * Formats JavaScript for MediaWiki publication.
 */

import type { PackageMetadata } from "./types.ts";
import { formatMetadata } from "./metadata.ts";
import { formatReadableJavaScript } from "./readable-javascript.ts";

const NOWIKI_PREFIX = "//<nowiki>";
const NOWIKI_SUFFIX = "//</nowiki>";

/**
 * Wraps minified gadget code with metadata and nowiki guards.
 *
 * @param code - Minified JavaScript.
 * @param metadata - Package metadata.
 * @returns MediaWiki-ready JavaScript.
 */
export function formatMediaWikiOutput(
    code: string,
    metadata: PackageMetadata,
): string {
    return [
        "// ==UserScript==",
        formatMetadata("name", metadata.name),
        formatMetadata("version", metadata.version),
        formatMetadata("description", metadata.description),
        "// ==/UserScript==",
        "",
        NOWIKI_PREFIX,
        code.trim(),
        NOWIKI_SUFFIX,
        "",
    ].join("\n");
}

/**
 * Formats a readable documented gadget for MediaWiki publication.
 *
 * @param source - Bundled JavaScript with documentation comments.
 * @param metadata - Package metadata.
 * @returns Formatted MediaWiki-ready JavaScript.
 */
export async function formatReadableMediaWikiOutput(
    source: string,
    metadata: PackageMetadata,
): Promise<string> {
    const formatted = await formatReadableJavaScript(source);
    return formatMediaWikiOutput(formatted, metadata);
}
