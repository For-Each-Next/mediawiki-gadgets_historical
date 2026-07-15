/** Builds named MediaWiki reference wikitext. */

export interface CitationReference {
    citation: string;
    name: string;
    [key: string]: unknown;
}

interface ReferencesSectionOptions {
    heading: string;
    responsive?: boolean;
}

/** Assigns deterministic names to citation references. */
export function nameCitationReferences(
    references: Array<Partial<CitationReference>>,
): CitationReference[] {
    return references.map(createNamedCitationReference);
}

/** Creates one named citation reference. */
function createNamedCitationReference(
    reference: Partial<CitationReference>,
    index: number,
): CitationReference {
    return {
        ...reference,
        citation: reference.citation || "",
        name: reference.name || `:${index + 1}`,
    };
}

/** Builds a full named `<ref>...</ref>` tag. */
export function buildNamedReferenceTag(reference: CitationReference): string {
    return [
        '<ref name="',
        escapeReferenceName(reference.name),
        '">',
        reference.citation,
        "</ref>",
    ].join("");
}

/** Builds a self-closing tag that reuses a named reference. */
export function buildReferenceReuseTag(name: string): string {
    return `<ref name="${escapeReferenceName(name)}" />`;
}

/** Builds a references section containing full named references. */
export function buildReferencesSection(
    references: CitationReference[],
    options: ReferencesSectionOptions,
): string {
    if (references.length === 0) {
        return "";
    }
    const responsive = options.responsive === false ? "" : " responsive";
    return [
        `== ${options.heading} ==`,
        "",
        `<references${responsive}>`,
        references.map(buildNamedReferenceTag).join("\n"),
        "</references>",
    ].join("\n");
}

/** Escapes a reference name for a wikitext tag attribute. */
function escapeReferenceName(name: string): string {
    return String(name).replace(/&/gu, "&amp;").replace(/"/gu, "&quot;");
}
