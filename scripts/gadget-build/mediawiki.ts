/**
 * Formats JavaScript for MediaWiki publication.
 */

import type { PackageMetadata } from "./types.ts";

const NOWIKI_PREFIX = "//<nowiki>";
const NOWIKI_SUFFIX = "//</nowiki>";
const HEADER_TEXT_WIDTH = 75;

/**
 * Wraps minified code with a file header and nowiki guards.
 *
 * @param code - Minified JavaScript.
 * @param metadata - Package metadata.
 * @param description - Long description paragraphs.
 * @param includeAuthor - Whether to retain the package author.
 * @returns MediaWiki-ready JavaScript.
 */
export function formatMediaWikiOutput(
    code: string,
    metadata: PackageMetadata,
    description: readonly string[],
    includeAuthor = false,
): string {
    return [
        formatGadgetHeader(metadata, description, includeAuthor),
        "",
        NOWIKI_PREFIX,
        code.trim(),
        NOWIKI_SUFFIX,
        "",
    ].join("\n");
}

/** Formats the retained header of one MediaWiki gadget artifact. */
function formatGadgetHeader(
    metadata: PackageMetadata,
    description: readonly string[],
    includeAuthor: boolean,
): string {
    return [
        "/**",
        ...formatHeaderParagraph(metadata.description),
        ...description.flatMap((paragraph) => [
            " *",
            ...formatHeaderParagraph(paragraph),
        ]),
        " *",
        formatHeaderAttribute("name", metadata.name),
        formatHeaderAttribute("version", metadata.version),
        ...(includeAuthor
            ? [formatHeaderAttribute("author", metadata.author)]
            : []),
        formatHeaderAttribute("license", metadata.license),
        " */",
    ].join("\n");
}

/** Wraps one prose paragraph into doc-comment lines. */
function formatHeaderParagraph(paragraph: string): string[] {
    const lines: string[] = [];
    let line = "";
    for (const word of splitHeaderWords(paragraph)) {
        const candidate = line === "" ? word : `${line} ${word}`;
        if ([...candidate].length <= HEADER_TEXT_WIDTH) {
            line = candidate;
            continue;
        }
        if (line !== "") {
            lines.push(line);
        }
        line = word;
    }
    if (line !== "") {
        lines.push(line);
    }
    return lines.map((value) => ` * ${value}`);
}

/** Splits prose without splitting complete MediaWiki wikilinks. */
function splitHeaderWords(paragraph: string): string[] {
    return paragraph.trim().match(/\[\[[^\]]+\]\][^\s]*|\S+/gu) ?? [];
}

/** Formats one file-header docstring attribute. */
function formatHeaderAttribute(name: string, value: string): string {
    return ` * @${name} ${value}`;
}
