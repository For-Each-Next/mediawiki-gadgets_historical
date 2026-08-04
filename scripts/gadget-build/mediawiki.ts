/**
 * Formats JavaScript for MediaWiki publication.
 */

import type { PackageMetadata } from "./types.ts";
import { describeArtifactLicense, formatMetadata } from "./metadata.ts";
import { formatLegalNotices } from "./notices.ts";

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
    notices: readonly string[] = [],
): string {
    const legalNotices = formatLegalNotices(notices);
    return [
        "// ==UserScript==",
        formatMetadata("name", metadata.name),
        formatMetadata("version", metadata.version),
        formatMetadata("description", metadata.description),
        formatMetadata(
            "license",
            describeArtifactLicense(metadata.license, notices.length > 0),
        ),
        "// ==/UserScript==",
        "",
        ...(legalNotices === "" ? [] : [legalNotices, ""]),
        NOWIKI_PREFIX,
        code.trim(),
        NOWIKI_SUFFIX,
        "",
    ].join("\n");
}
