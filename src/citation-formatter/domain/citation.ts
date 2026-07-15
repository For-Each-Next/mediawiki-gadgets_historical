/**
 * Canonical citation formatting and semantic reference-name rules.
 */

import type {
    CitationParam,
    CitationTemplate,
    CitationTemplateData,
} from "./types.ts";
import { normalizeTemplateName } from "./templates.ts";
import { parseTemplateCall } from "./wikitext.ts";

const ENGLISH_MONTHS: Record<string, string> = {
    april: "04",
    august: "08",
    december: "12",
    february: "02",
    january: "01",
    july: "07",
    june: "06",
    march: "03",
    may: "05",
    november: "11",
    october: "10",
    september: "09",
};

const DATE_PARAMS = new Set([
    "access-date",
    "archive-date",
    "date",
    "doi-broken-date",
    "orig-date",
    "publication-date",
]);

const LOCATOR_PARAMS = new Set([
    "at",
    "duration",
    "level",
    "minutes",
    "page",
    "pages",
    "scene",
    "time",
    "timestamp",
]);

const RESPONSIBLE_ORGANIZATION_PARAMS = [
    "agency",
    "institution",
    "organization",
    "department",
];

const DEFAULT_AUTHOR_FALLBACK = ["website", "work", "publisher", "title"];

const TEMPLATE_AUTHOR_FALLBACKS: Record<string, string[]> = {
    "cite av media": ["series", "publisher", "title"],
    "cite av media notes": ["album", "publisher", "title"],
    "cite book": ["series", "publisher", "title", "chapter"],
    "cite conference": ["conference", "book-title", "publisher", "title"],
    "cite encyclopedia": ["encyclopedia", "publisher", "title"],
    "cite episode": ["series", "network", "publisher", "title"],
    "cite interview": ["program", "work", "publisher", "title"],
    "cite journal": ["journal", "work", "publisher", "title"],
    "cite magazine": ["magazine", "work", "publisher", "title"],
    "cite map": ["work", "publisher", "title", "map"],
    "cite news": ["newspaper", "work", "publisher", "title"],
    "cite podcast": ["podcast", "series", "publisher", "title"],
    "cite report": ["series", "publisher", "title"],
    "cite serial": ["series", "network", "publisher", "title"],
    "cite speech": ["event", "conference", "publisher", "title"],
    "cite thesis": ["university", "publisher", "title"],
    "cite video game": ["developer", "work", "publisher", "title"],
};

export interface CitationIdentity {
    author: string;
    baseName: string;
    locator: string;
    sourceSignature: string;
    year: string;
}

/**
 * Parses, canonicalizes, orders, and formats one citation template.
 *
 * @param raw - Complete citation template text.
 * @param metadata - TemplateData metadata.
 * @returns Canonical citation and formatted text.
 */
export function formatCitationTemplate(
    raw: string,
    metadata: CitationTemplateData,
): { citation: CitationTemplate; text: string } {
    const parsed = parseTemplateCall(raw);
    const citation = canonicalizeCitation(
        {
            name: normalizeTemplateName(parsed.name),
            params: parsed.params.map(function mapParam(param) {
                const result = {
                    name: param.name,
                    value: param.value,
                };
                return result;
            }),
        },
        metadata,
    );
    return { citation, text: formatBlockCitation(citation) };
}

/**
 * Canonicalizes aliases, date values, and TemplateData parameter order.
 *
 * @param citation - Parsed citation.
 * @param metadata - TemplateData metadata.
 * @returns Canonical citation.
 */
export function canonicalizeCitation(
    citation: CitationTemplate,
    metadata: CitationTemplateData,
): CitationTemplate {
    const canonicalNames = buildCanonicalNameMap(metadata);
    const deduplicated = new Map<string, CitationParam>();

    for (const param of citation.params) {
        const enteredName = param.name.trim();
        const lookupName = enteredName.toLocaleLowerCase("en-US");
        const name = canonicalNames.get(lookupName) || enteredName;
        let value = param.value.trim();
        const isDate =
            DATE_PARAMS.has(name) || metadata.dateParams?.includes(name);
        if (isDate) {
            value = normalizeEnglishDate(param.value);
        }
        deduplicated.set(name, { name, value });
    }

    const order = new Map(
        metadata.paramOrder.map((name, index) => [name, index]),
    );
    const params = [...deduplicated.values()].sort(
        function sortParams(left, right) {
            const leftOrder = order.get(left.name) ?? Number.MAX_SAFE_INTEGER;
            const rightOrder =
                order.get(right.name) ?? Number.MAX_SAFE_INTEGER;
            return leftOrder - rightOrder;
        },
    );
    return { name: citation.name, params };
}

/**
 * Formats a citation with one parameter per line.
 *
 * @param citation - Canonical citation.
 * @returns Block-style template text.
 */
export function formatBlockCitation(citation: CitationTemplate): string {
    const rows = citation.params
        .filter((param) => param.value !== "")
        .map((param) => `  | ${param.name} = ${param.value}`);
    if (rows.length === 0) {
        return `{{${citation.name}}}`;
    }
    return [`{{${citation.name}`, ...rows, "}}"].join("\n");
}

/**
 * Normalizes unambiguous English dates to ISO 8601 precision.
 *
 * @param value - Entered date text.
 * @returns ISO date when the input is unambiguous.
 */
export function normalizeEnglishDate(value: string): string {
    const trimmed = value.trim();
    const suffix = trimmed.match(/(\s*<!--[\s\S]*?-->\s*)$/u)?.[1] || "";
    const date =
        suffix === "" ? trimmed : trimmed.slice(0, -suffix.length).trim();
    const monthYear = date.match(/^([A-Za-z]+)\s+(\d{4})$/u);
    if (monthYear != null) {
        const month = ENGLISH_MONTHS[monthYear[1].toLocaleLowerCase("en-US")];
        return month == null ? trimmed : `${monthYear[2]}-${month}${suffix}`;
    }

    const monthFirst = date.match(
        /^([A-Za-z]+)\s+(\d{1,2})(?:,)?\s+(\d{4})$/u,
    );
    if (monthFirst != null) {
        const result = buildIsoDate(
            monthFirst[3],
            monthFirst[1],
            monthFirst[2],
            suffix,
        );
        return result;
    }
    const dayFirst = date.match(/^(\d{1,2})\s+([A-Za-z]+)(?:,)?\s+(\d{4})$/u);
    if (dayFirst != null) {
        return buildIsoDate(dayFirst[3], dayFirst[2], dayFirst[1], suffix);
    }
    return trimmed;
}

/**
 * Builds a validated ISO day-precision date.
 *
 * @param year - Four-digit year.
 * @param enteredMonth - English month name.
 * @param enteredDay - Day of month.
 * @param suffix - Preserved trailing comment.
 * @returns ISO date or unchanged-style date.
 */
function buildIsoDate(
    year: string,
    enteredMonth: string,
    enteredDay: string,
    suffix: string,
): string {
    const month = ENGLISH_MONTHS[enteredMonth.toLocaleLowerCase("en-US")];
    const day = Number(enteredDay);
    if (month == null || !isValidCalendarDay(year, month, day)) {
        return `${enteredMonth} ${enteredDay}, ${year}${suffix}`;
    }
    return `${year}-${month}-${String(day).padStart(2, "0")}${suffix}`;
}

/**
 * Checks a day against its actual Gregorian calendar month.
 *
 * @param year - Four-digit year.
 * @param month - Two-digit month.
 * @param day - Day of month.
 * @returns Whether the day exists.
 */
function isValidCalendarDay(
    year: string,
    month: string,
    day: number,
): boolean {
    const date = new Date(Date.UTC(Number(year), Number(month) - 1, day));
    const result =
        day >= 1 &&
        date.getUTCFullYear() === Number(year) &&
        date.getUTCMonth() === Number(month) - 1 &&
        date.getUTCDate() === day;
    return result;
}

/**
 * Derives the APA-style author/date identity and source locator.
 *
 * @param citation - Canonical citation.
 * @returns Semantic reference identity.
 */
export function getCitationIdentity(
    citation: CitationTemplate,
): CitationIdentity {
    const values = Object.fromEntries(
        citation.params.map((param) => [param.name, param.value]),
    );
    const author = getCitationAuthor(citation.name, values);
    const year = getCitationYear(values);
    const locator = getSourceLocator(values);
    const baseName = `${author}, ${year}`;
    const signatureParams = citation.params.filter(
        function omitLocator(param) {
            return !LOCATOR_PARAMS.has(param.name);
        },
    );
    const sourceSignature = JSON.stringify([
        citation.name,
        signatureParams.map((param) => [param.name, cleanValue(param.value)]),
    ]);
    return { author, baseName, locator, sourceSignature, year };
}

/**
 * Appends an APA-style part-of-source locator to a ref name.
 *
 * @param name - Author/date reference name.
 * @param locator - Part-of-source locator.
 * @returns Reference name with its locator.
 */
export function appendCitationLocator(name: string, locator: string): string {
    return locator === "" ? name : `${name}, ${locator}`;
}

/**
 * Selects the author component using a general CS1 fallback chain.
 *
 * @param template - Normalized citation template name.
 * @param values - Citation values keyed by canonical name.
 * @returns Author component for the reference name.
 */
function getCitationAuthor(
    template: string,
    values: Record<string, string>,
): string {
    const authors = collectNumberedValues(values, ["last", "author"]);
    if (authors.length > 0) {
        return formatAuthorList(authors);
    }
    const editors = collectNumberedValues(values, ["editor-last", "editor"]);
    if (editors.length > 0) {
        return `${formatAuthorList(editors)} (ed.)`;
    }

    const creatorFallbacks = [
        "interviewer-last",
        "host",
        "cartography",
        "translator-last",
        "contributor-last",
    ];
    const configured =
        TEMPLATE_AUTHOR_FALLBACKS[template] || DEFAULT_AUTHOR_FALLBACK;
    const fallbackKeys = [
        ...creatorFallbacks,
        ...RESPONSIBLE_ORGANIZATION_PARAMS,
        ...configured,
    ];
    for (const key of fallbackKeys) {
        if (values[key]?.trim()) {
            return nameValue(values[key]);
        }
    }
    return "Untitled source";
}

/**
 * Collects sequential creator values.
 *
 * @param values - Citation values.
 * @param bases - Candidate parameter bases.
 * @returns Creator names in entered order.
 */
function collectNumberedValues(
    values: Record<string, string>,
    bases: string[],
): string[] {
    const result: string[] = [];
    for (let index = 1; index <= 50; index += 1) {
        const suffix = index === 1 ? "" : String(index);
        const candidates = bases.map((base) => `${base}${suffix}`);
        if (index === 1) {
            candidates.push(...bases.map((base) => `${base}1`));
        }
        const key = candidates.find((candidate) => values[candidate]?.trim());
        if (key == null) {
            if (index > 1) {
                break;
            }
            continue;
        }
        result.push(nameValue(values[key]));
    }
    return result;
}

/**
 * Formats one, two, or many authors for an APA-style key.
 *
 * @param authors - Author family names.
 * @returns Formatted author component.
 */
function formatAuthorList(authors: string[]): string {
    if (authors.length === 1) {
        return authors[0];
    }
    if (authors.length === 2) {
        return `${authors[0]} & ${authors[1]}`;
    }
    return `${authors[0]} et al.`;
}

/**
 * Extracts a citation year or the APA no-date marker.
 *
 * @param values - Citation values.
 * @returns Four-digit year or n.d.
 */
function getCitationYear(values: Record<string, string>): string {
    const entered =
        values.date || values.year || values["publication-date"] || "";
    const clean = cleanValue(entered);
    return clean.match(/\b(\d{4})\b/u)?.[1] || "n.d.";
}

/**
 * Selects a page, timestamp, or interactive-media locator.
 *
 * @param values - Citation values.
 * @returns Part-of-source locator.
 */
function getSourceLocator(values: Record<string, string>): string {
    const locatorEntries: Array<[string, string]> = [
        ["page", "p."],
        ["pages", "pp."],
        ["at", ""],
        ["time", "timestamp"],
        ["timestamp", "timestamp"],
        ["minutes", "min."],
        ["duration", "timestamp"],
        ["level", "level"],
        ["scene", "scene"],
    ];
    for (const [key, prefix] of locatorEntries) {
        const value = cleanValue(values[key] || "");
        if (value !== "") {
            return prefix === "" ? value : `${prefix} ${value}`;
        }
    }
    return "";
}

/**
 * Applies a hashtag-comment reference-name override.
 *
 * @param value - Display citation value.
 * @returns Value used in the reference name.
 */
function nameValue(value: string): string {
    const override = value.match(/<!--\s*#\s*([\s\S]*?)-->/u)?.[1].trim();
    return cleanValue(override || value) || "Untitled source";
}

/**
 * Removes common wikitext markup from a reference-name value.
 *
 * @param value - Wikitext value.
 * @returns Plain compact text.
 */
function cleanValue(value: string): string {
    const result = value
        .replace(/<!--[\s\S]*?-->/gu, "")
        .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/gu, "$2")
        .replace(/\[\[([^\]]+)\]\]/gu, "$1")
        .replace(/'{2,}/gu, "")
        .replace(/<[^>]+>/gu, "")
        .replace(/\s+/gu, " ")
        .trim();
    return result;
}

/**
 * Maps canonical parameter names and aliases to canonical names.
 *
 * @param metadata - TemplateData metadata.
 * @returns Case-normalized canonical-name map.
 */
function buildCanonicalNameMap(
    metadata: CitationTemplateData,
): Map<string, string> {
    const result = new Map<string, string>();
    const canonicalNames = new Set([
        ...metadata.paramOrder,
        ...Object.keys(metadata.aliases),
    ]);
    for (const canonical of canonicalNames) {
        result.set(canonical.toLocaleLowerCase("en-US"), canonical);
        for (const alias of metadata.aliases[canonical] || []) {
            result.set(alias.toLocaleLowerCase("en-US"), canonical);
        }
    }
    return result;
}
