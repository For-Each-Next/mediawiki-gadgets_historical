/** Resolves {{sfn}} calls to matching bibliography citations. */

import { wikitext, type ParsedTemplateCall } from "../wikitext/index.ts";

export interface ShortFootnoteCitation {
    end: number;
    raw: string;
    reuseText: string;
    start: number;
    usePositions: number[];
}

/** Normalizes a transcluded template title for matching. */
export type TemplateNameNormalizer = (value: string) => string;

const DEFAULT_NORMALIZER: TemplateNameNormalizer = (value) =>
    wikitext.template.normalizeName(value);

interface TemplateCall {
    descriptor: TemplateDescriptor;
    end: number;
    raw: string;
    start: number;
}

interface TemplateDescriptor {
    name: string;
    named: Map<string, string>;
    positional: string[];
}

interface CitationCandidate extends ShortFootnoteCitation {
    authors: string[];
    ref: string;
    year: string;
}

interface ShortFootnoteUse {
    authors: string[];
    position: number;
    ref: string;
    reuseText: string;
    year: string;
}

/**
 * Finds bibliography citations actively referenced by {{sfn}}.
 *
 * @param source - Source text.
 * @returns Bibliography citations actively referenced by {{sfn}}.
 */
export function findShortFootnoteCitations(
    source: string,
    normalizeTemplateName: TemplateNameNormalizer = DEFAULT_NORMALIZER,
): ShortFootnoteCitation[] {
    const calls = findTemplateCalls(source, normalizeTemplateName);
    const uses = calls.flatMap(function parseUse(call) {
        const use = buildShortFootnoteUse(call);
        return use == null ? [] : [use];
    });
    const candidates = calls.flatMap(function parseCitation(call) {
        const candidate = buildCitationCandidate(call);
        return candidate == null ? [] : [candidate];
    });
    return candidates.flatMap(function resolveCandidate(candidate) {
        const matches = uses.filter((use) => matchesCitation(use, candidate));
        if (matches.length === 0) {
            return [];
        }
        return [
            {
                ...candidate,
                reuseText: matches[0].reuseText,
                usePositions: matches.map((match) => match.position),
            },
        ];
    });
}

/**
 * Resolves one complete {{sfn}} call to citation template wikitext.
 *
 * @param source - Source text.
 * @param shortFootnote - Short footnote value.
 * @returns Citation wikitext resolved from a complete {{sfn}} call.
 */
export function resolveShortFootnoteCitation(
    source: string,
    shortFootnote: string,
    normalizeTemplateName: TemplateNameNormalizer = DEFAULT_NORMALIZER,
): string {
    const useCall = findTemplateCalls(shortFootnote, normalizeTemplateName)[0];
    const use = useCall == null ? null : buildShortFootnoteUse(useCall);
    if (use == null) {
        return "";
    }
    const citations = findTemplateCalls(source, normalizeTemplateName).flatMap(
        (call) => {
            const candidate = buildCitationCandidate(call);
            return candidate == null ? [] : [candidate];
        },
    );
    return citations.find((item) => matchesCitation(use, item))?.raw ?? "";
}

function buildShortFootnoteUse(call: TemplateCall): ShortFootnoteUse | null {
    if (call.descriptor.name !== "sfn") {
        return null;
    }
    const values = call.descriptor.positional;
    const yearIndex = values.findLastIndex((value) => getYear(value) !== "");
    if (yearIndex < 0) {
        return null;
    }
    const displayed = values.slice(0, yearIndex + 1).map(cleanDisplayValue);
    return {
        authors: values
            .slice(0, yearIndex)
            .map(normalizeValue)
            .filter(Boolean),
        position: call.start,
        ref: normalizeValue(call.descriptor.named.get("ref") ?? ""),
        reuseText: `{{sfn|${displayed.join("|")}}}`,
        year: getYear(values[yearIndex]),
    };
}

function buildCitationCandidate(call: TemplateCall): CitationCandidate | null {
    if (!/^(?:cite(?:\s|$)|citation$)/u.test(call.descriptor.name)) {
        return null;
    }
    const authors = getCitationAuthors(call.descriptor);
    const year = getCitationYear(call.descriptor);
    if (authors.length === 0 || year === "") {
        return null;
    }
    return {
        authors,
        end: call.end,
        raw: call.raw,
        ref: normalizeValue(call.descriptor.named.get("ref") ?? ""),
        reuseText: "",
        start: call.start,
        usePositions: [],
        year,
    };
}

function getCitationAuthors(descriptor: TemplateDescriptor): string[] {
    const entries = [...descriptor.named];
    const authors = entries
        .filter(([name]) => isCitationAuthorParameter(name))
        .map(([_name, value]) => normalizeValue(value))
        .filter(Boolean);
    if (authors.length > 0) {
        return [...new Set(authors)];
    }
    return entries
        .filter(([name]) => /^(?:agency|organization|publisher)$/u.test(name))
        .map(([_name, value]) => normalizeValue(value))
        .filter(Boolean);
}

function isCitationAuthorParameter(name: string): boolean {
    return /^(?:last|surname|author|editor-last|editor-surname)\d*$/u.test(
        name,
    );
}

function getCitationYear(descriptor: TemplateDescriptor): string {
    const values = ["year", "date", "publication-date", "orig-year"];
    for (const name of values) {
        const year = getYear(descriptor.named.get(name) ?? "");
        if (year !== "") {
            return year;
        }
    }
    return "";
}

function matchesCitation(
    use: ShortFootnoteUse,
    candidate: CitationCandidate,
): boolean {
    if (use.ref !== "" && use.ref === candidate.ref) {
        return true;
    }
    return (
        use.year === candidate.year &&
        use.authors.length > 0 &&
        use.authors.every((author) => candidate.authors.includes(author))
    );
}

function getYear(value: string): string {
    return (
        value
            .match(/(?:^|\D)(\d{4}[a-z]?)(?:\D|$)/iu)?.[1]
            .toLocaleLowerCase("en-US") ?? ""
    );
}

function cleanDisplayValue(value: string): string {
    return value.replace(/<!--[\s\S]*?-->/gu, "").trim();
}

function normalizeValue(value: string): string {
    return cleanDisplayValue(value)
        .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/gu, "$2")
        .replace(/\[\[([^\]]+)\]\]/gu, "$1")
        .replace(/<[^>]*>/gu, " ")
        .replace(/'{2,5}/gu, "")
        .replace(/&nbsp;/giu, " ")
        .replace(/_/gu, " ")
        .replace(/\s+/gu, " ")
        .trim()
        .toLocaleLowerCase("en-US");
}

function findTemplateCalls(
    source: string,
    normalizeTemplateName: TemplateNameNormalizer,
): TemplateCall[] {
    return wikitext(source)
        .template.getAll()
        .flatMap(function describe(call) {
            const descriptor = createTemplateDescriptor(
                call,
                normalizeTemplateName,
            );
            return descriptor == null ? [] : [{ ...call, descriptor }];
        });
}

function createTemplateDescriptor(
    call: ParsedTemplateCall,
    normalizeTemplateName: TemplateNameNormalizer,
): TemplateDescriptor | null {
    const name = normalizeTemplateName(call.name);
    if (name === "") {
        return null;
    }
    const named = new Map<string, string>();
    const positional: string[] = [];
    for (const param of call.params) {
        if (param.positional) {
            positional.push(param.value);
        } else {
            named.set(normalizeName(param.name), param.value);
        }
    }
    return { name, named, positional };
}

function normalizeName(value: string): string {
    return value
        .trim()
        .replace(/[_\s]+/gu, " ")
        .toLocaleLowerCase("en-US");
}
