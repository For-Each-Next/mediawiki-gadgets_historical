/**
 * Canonicalizes and orders citation data and derives ref names.
 */

import type {
    CitationLayout,
    CitationParam,
    CitationTemplate,
    CitationTemplateData,
} from "./types.ts";
import citeBookTemplateData from "./data/cite-book.ts";
import citeWebTemplateData from "./data/cite-web.ts";
import {
    formatBlockCitation,
    formatInlineCitation,
} from "./post-formatter.ts";
import { applyPreFormatHandlers } from "./pre-formatter.ts";
import { normalizeTemplateName } from "./templates.ts";
import { parseTemplateCall } from "./wikitext.ts";

export {
    formatBlockCitation,
    formatInlineCitation,
} from "./post-formatter.ts";

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

const SOURCE_IDENTITY_PARAMS = new Set([
    "agency",
    "arxiv",
    "asin",
    "bibcode",
    "biorxiv",
    "citeseerx",
    "conference",
    "date",
    "department",
    "developer",
    "doi",
    "encyclopedia",
    "event",
    "id",
    "institution",
    "isbn",
    "issn",
    "journal",
    "jstor",
    "lccn",
    "magazine",
    "mr",
    "network",
    "newspaper",
    "number",
    "oclc",
    "ol",
    "organization",
    "orig-date",
    "osti",
    "pmc",
    "pmid",
    "podcast",
    "program",
    "publication-date",
    "publisher",
    "rfc",
    "script-title",
    "series",
    "ssrn",
    "title",
    "trans-title",
    "university",
    "url",
    "user",
    "website",
    "work",
    "year",
    "zbl",
]);

const CREATOR_PARAM_PATTERNS = [
    /^(?:author|editor|first|host|last)(?:-first|-last)?\d*$/u,
    /^(?:contributor|interviewer)(?:-first|-last)?\d*$/u,
    /^(?:cartography|translator)(?:-first|-last)?\d*$/u,
];
const CITATION_AUTHOR_INDEX_PATTERNS = [
    /^author-(?:last|surname)(\d*)$/u,
    /^author(\d+)-(?:last|surname)$/u,
    /^(?:last|surname|author|subject|host)(\d*)$/u,
];

const POSITION_QUERY_PARAMS = new Set([
    "begin",
    "chapter",
    "page",
    "section",
    "start",
    "t",
    "time",
    "time_continue",
    "timestamp",
]);

const CREDITED_ORGANIZATION_PARAMS = ["agency", "organization"];
const PUBLISHER_PARAMS = ["publisher", "institution"];
const PERIODICAL_PARAMS = [
    "periodical",
    "journal",
    "newspaper",
    "magazine",
    "work",
    "website",
    "encyclopedia",
    "encyclopaedia",
    "dictionary",
];
const CITATION_DATE_KEYS = ["date", "year", "publication-date"];
const CITATION_CREATOR_FALLBACK_KEYS = [
    "interviewer-last",
    "cartography",
    "translator-last",
    "contributor-last",
    "developer",
    "user",
    ...CREDITED_ORGANIZATION_PARAMS,
    ...PUBLISHER_PARAMS,
    ...PERIODICAL_PARAMS,
];
const SOURCE_LOCATOR_ENTRIES: Array<[string, string]> = [
    ["page", "p."],
    ["pages", "pp."],
    ["quote-page", "p."],
    ["quote-pages", "pp."],
    ["chapter", "chapter"],
    ["section", "section"],
    ["at", ""],
    ["time", "at time"],
    ["timestamp", "at time"],
    ["minutes", "min."],
    ["duration", "at time"],
    ["level", "level"],
    ["scene", "scene"],
];

const PARAM_ORDER_SCALE = 1_000;
const citeWebParamOrderEntries = citeWebTemplateData.paramOrder.map(
    (name, index) => [name, index] as const,
);
const CITE_WEB_PARAM_ORDER = new Map(citeWebParamOrderEntries);

const citeBookParamOrderEntries = citeBookTemplateData.paramOrder.map(
    (name, index) => [name, index] as const,
);
const CITE_BOOK_PARAM_ORDER = new Map(citeBookParamOrderEntries);

const PRINT_CITATION_TEMPLATES = new Set([
    "cite book",
    "cite conference",
    "cite document",
    "cite encyclopedia",
    "cite journal",
    "cite magazine",
    "cite report",
    "cite tech report",
    "cite thesis",
]);

export interface CitationIdentity {
    author: string;
    baseName: string;
    forceLocator?: boolean;
    locator: string;
    sourceSignature: string;
    year: string;
}

interface CitationParamMetadata extends CitationParam {
    order: number;
}

interface CitationAuthorSelection {
    keys: string[];
    value: string;
}

interface CitationValueSelection {
    key: string;
    value: string;
}

/**
 * Parses, canonicalizes, orders, and formats one citation template.
 *
 * @param raw - Complete citation template text.
 * @param metadata - TemplateData metadata.
 * @param layout - Citation-template output layout.
 * @returns Canonical citation and formatted text.
 */
export function formatCitationTemplate(
    raw: string,
    metadata: CitationTemplateData,
    layout: CitationLayout = "block",
): { citation: CitationTemplate; text: string } {
    const parsed = parseTemplateCall(raw);
    const name = normalizeTemplateName(parsed.name);
    const params = parsed.params.map(function mapParam(param) {
        const result = {
            name: param.name,
            value: param.value,
        };
        return result;
    });
    const citation = canonicalizeCitation({ name, params }, metadata);
    const text =
        layout === "inline"
            ? formatInlineCitation(citation)
            : formatBlockCitation(citation);
    return { citation, text };
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

    for (const param of applyPreFormatHandlers(citation.params)) {
        const enteredName = param.name.trim();
        const lookupName = enteredName.toLocaleLowerCase("en-US");
        const name = canonicalNames.get(lookupName) || enteredName;
        let value = param.value.trim();
        value = normalizeNameOverrideSpacing(value);
        const isDate =
            DATE_PARAMS.has(name) || metadata.dateParams?.includes(name);
        if (isDate) {
            value = normalizeEnglishDate(param.value);
        }
        deduplicated.set(name, { name, value });
    }

    const deduplicatedParams = [...deduplicated.values()];
    const params = sortCitationParams(
        citation.name,
        deduplicatedParams,
        metadata,
    );
    return { name: citation.name, params };
}

/**
 * Normalizes spacing around a reference-name override comment.
 *
 * @param value - Entered citation field value.
 * @returns Value with normalized override spacing.
 */
function normalizeNameOverrideSpacing(value: string): string {
    const result = value.replace(
        /\s*<!--\s*([^]*?#\s*[^]*?)\s*-->/gu,
        formatNameOverrideComment,
    );
    return result;
}

/**
 * Formats one reference-name override comment.
 *
 * @param _match - Complete matched comment.
 * @param content - Comment content.
 * @returns Normalized override comment.
 */
function formatNameOverrideComment(_match: string, content: string): string {
    const hashIndex = content.indexOf("#");
    const prefix = content.slice(0, hashIndex).trim();
    const override = content.slice(hashIndex + 1).trim();
    const directive = prefix === "" ? "" : `${prefix} `;
    return ` <!-- ${directive}# ${override} -->`;
}

/**
 * Applies the template's TemplateData order, then a generic fallback.
 *
 * @param template - Normalized citation template name.
 * @param params - Canonical citation parameters.
 * @param metadata - TemplateData metadata.
 * @returns Sorted citation parameters.
 */
function sortCitationParams(
    template: string,
    params: CitationParam[],
    metadata: CitationTemplateData,
): CitationParam[] {
    const orderEntries = metadata.paramOrder.map(
        (name, index) => [name, index] as const,
    );
    const order = new Map(orderEntries);
    let fallbackOrder = CITE_WEB_PARAM_ORDER;
    if (PRINT_CITATION_TEMPLATES.has(template)) {
        fallbackOrder = CITE_BOOK_PARAM_ORDER;
    }
    const addSortOrder = function addSortOrder(
        param: CitationParam,
    ): CitationParamMetadata {
        const orderedParam = {
            ...param,
            order: getCitationParamSortOrder(
                param.name,
                order,
                fallbackOrder,
                metadata.paramOrder.length,
            ),
        };
        return orderedParam;
    };
    const result = params
        .map(addSortOrder)
        .sort((left, right) => left.order - right.order)
        .map(function removeOrder(param): CitationParam {
            return { name: param.name, value: param.value };
        });
    return result;
}

/**
 * Gets the effective sort order for one citation parameter.
 *
 * @param name - Canonical citation parameter name.
 * @param templateOrder - Active template's exact TemplateData order.
 * @param fallbackOrder - Web or print order for additional fields.
 * @param templateSize - Number of template-defined parameters.
 * @returns Parameter sort order.
 */
function getCitationParamSortOrder(
    name: string,
    templateOrder: Map<string, number>,
    fallbackOrder: Map<string, number>,
    templateSize: number,
): number {
    const authorOrder = getAuthorParamOrder(name);
    if (authorOrder != null) {
        return authorOrder;
    }
    const templateIndex = templateOrder.get(name);
    if (templateIndex != null) {
        return templateIndex * PARAM_ORDER_SCALE;
    }
    const titleIndex = templateOrder.get("title");
    if (titleIndex != null && name === "script-title") {
        return titleIndex * PARAM_ORDER_SCALE + 1;
    }
    const fallbackIndex = fallbackOrder.get(name);
    return fallbackIndex == null
        ? Number.MAX_SAFE_INTEGER
        : (templateSize + 1) * PARAM_ORDER_SCALE + fallbackIndex;
}

/**
 * Keeps every numbered author/interviewee slot in one leading group.
 */
function getAuthorParamOrder(name: string): number | null {
    const match = name.match(/^(last|first|author-link)(\d*)$/u);
    if (match == null) {
        return null;
    }
    const index = Number(match[2] || "1");
    const fieldOrder = ["last", "first", "author-link"].indexOf(match[1]);
    return (index - 1) * 3 + fieldOrder;
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
    const numericYear = Number(year);
    const numericMonth = Number(month);
    const timestamp = Date.UTC(numericYear, numericMonth - 1, day);
    const date = new Date(timestamp);
    const validDay = day >= 1;
    const matchingYear = validDay && date.getUTCFullYear() === numericYear;
    const matchingMonth =
        matchingYear && date.getUTCMonth() === numericMonth - 1;
    return matchingMonth && date.getUTCDate() === day;
}

/**
 * Derives the APA-style author/date identity and source locator.
 *
 * @param citation - Canonical citation.
 * @param includeInitials - Whether to add the first author's initials.
 * @returns Semantic reference identity.
 */
export function getCitationIdentity(
    citation: CitationTemplate,
    includeInitials: boolean = false,
): CitationIdentity {
    const valueEntries = citation.params.map(function createValueEntry(param) {
        return [param.name, param.value] as const;
    });
    const values = Object.fromEntries(valueEntries);
    const enteredAuthor = getCitationAuthor(values);
    let author = enteredAuthor;
    if (includeInitials) {
        author = addFirstAuthorInitials(enteredAuthor, values);
    }
    const year = getCitationYear(values);
    const locator = getSourceLocator(values);
    const baseName = `${author}, ${year}`;
    const isSourceIdentity = function isSourceIdentity(param: CitationParam) {
        const result =
            SOURCE_IDENTITY_PARAMS.has(param.name) ||
            isCreatorParam(param.name);
        return result;
    };
    const signatureParams = citation.params.filter(isSourceIdentity);
    const signatureValues = signatureParams.map(mapSourceIdentityParam);
    const sourceKey = getSourceIdentityKey(citation.params);
    const sourceSignature =
        sourceKey === ""
            ? JSON.stringify([citation.name, signatureValues])
            : JSON.stringify(["source-url", sourceKey]);
    return { author, baseName, locator, sourceSignature, year };
}

/**
 * Gets the active citation fields that form the visible reference name.
 *
 * @param citation - Canonical citation.
 * @returns Canonical parameter names contributing the author, year, or
 * locator.
 */
export function getCitationNameContributors(
    citation: CitationTemplate,
): Set<string> {
    const entries = citation.params.map(
        (param) => [param.name, param.value] as const,
    );
    const values = Object.fromEntries(entries);
    const author = selectCitationAuthor(values);
    const authorKeys =
        author.keys.length > 2 ? author.keys.slice(0, 1) : author.keys;
    const year = selectCitationYear(values);
    const locator = selectSourceLocator(values);
    return new Set([
        ...authorKeys,
        ...(year == null ? [] : [year.key]),
        ...(locator == null ? [] : [locator.key]),
    ]);
}

/**
 * Checks whether a parameter names a source creator.
 *
 * @param name - Canonical parameter name.
 * @returns Whether the parameter contributes to source identity.
 */
function isCreatorParam(name: string): boolean {
    if (getCitationAuthorIndex(name) != null) {
        return true;
    }
    for (const pattern of CREATOR_PARAM_PATTERNS) {
        if (pattern.test(name)) {
            return true;
        }
    }
    return false;
}

/**
 * Converts one identity parameter to its comparison representation.
 *
 * @param param - Canonical citation parameter.
 * @returns Name and normalized value.
 */
function mapSourceIdentityParam(param: CitationParam): [string, string] {
    if (param.name === "url") {
        return [param.name, canonicalizeSourceUrl(param.value)];
    }
    return [param.name, cleanValue(param.value)];
}

/**
 * Resolves a shared source key from a citation URL.
 *
 * @param params - Canonical citation parameters.
 * @returns Normalized comment override or actual URL fallback.
 */
function getSourceIdentityKey(params: CitationParam[]): string {
    const url = params.find((param) => param.name === "url");
    if (url == null) {
        return "";
    }
    const override = extractNameOverride(url.value);
    return canonicalizeSourceUrl(override || url.value);
}

/**
 * Prefixes a structured first author's initials for disambiguation.
 *
 * @param author - Family-name-based author key.
 * @param values - Citation values keyed by canonical name.
 * @returns Author key with initials when available.
 */
function addFirstAuthorInitials(
    author: string,
    values: Record<string, string>,
): string {
    const first = cleanValue(values.first || "");
    const extractInitial = (part: string) => part.match(/\p{L}/u)?.[0];
    const initials = first
        .split(/[\s-]+/u)
        .map(extractInitial)
        .filter((letter) => letter != null)
        .map((letter) => `${letter}.`)
        .join(" ");
    return initials === "" ? author : `${initials} ${author}`;
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
 * @param values - Citation values keyed by canonical name.
 * @returns Author component for the reference name.
 */
function getCitationAuthor(values: Record<string, string>): string {
    return selectCitationAuthor(values).value;
}

/**
 * Selects the author text together with the fields that supplied it.
 */
function selectCitationAuthor(
    values: Record<string, string>,
): CitationAuthorSelection {
    const authors = collectCitationAuthors(values);
    if (authors.length > 0) {
        return {
            keys: authors.map((author) => author.key),
            value: formatAuthorList(
                authors.map((author) => authorNameValue(author.value)),
            ),
        };
    }
    for (const key of CITATION_CREATOR_FALLBACK_KEYS) {
        if (
            values[key]?.trim() &&
            !hasFieldDirective(values[key], "no-author")
        ) {
            return { keys: [key], value: nameValue(values[key]) };
        }
    }
    return selectCitationTitleAuthor(values);
}

/** Selects a normal or script title as the final fallback. */
function selectCitationTitleAuthor(
    values: Record<string, string>,
): CitationAuthorSelection {
    const candidates = [
        { key: "title", value: values.title },
        {
            key: "script-title",
            value: stripScriptTitleLanguage(values["script-title"] || ""),
        },
    ];
    const selected = candidates.find(
        (candidate) =>
            candidate.value?.trim() &&
            !hasFieldDirective(candidate.value, "no-author"),
    );
    return selected == null
        ? { keys: [], value: "Untitled source" }
        : {
              keys: [selected.key],
              value: formatTitleNameFallback(selected.value),
          };
}

/** Applies a title alias before using the shortened quoted fallback. */
function formatTitleNameFallback(title: string): string {
    const override = extractNameOverride(title);
    return override === "" ? formatTitleFallback(title) : cleanValue(override);
}

/** Removes the required language-code prefix from a script title. */
function stripScriptTitleLanguage(value: string): string {
    return value.replace(/^[a-z]{2,3}(?:-[a-z0-9]+)*:/iu, "");
}

/**
 * Builds a short reference-name fallback from a citation title.
 *
 * @param title - Entered citation title.
 * @returns Short quoted title or the untitled marker.
 */
function formatTitleFallback(title: string): string {
    const words = cleanValue(title).split(/\s+/u).filter(Boolean);
    const shortened =
        words.length < 3 ? words.join(" ") : words.slice(0, 2).join(" ");
    return shortened === "" ? "Untitled source" : `“${shortened}”`;
}

/**
 * Collects sequential author, subject, and host values.
 *
 * @param values - Citation values.
 * @returns Creator names in entered order.
 */
function collectCitationAuthors(
    values: Record<string, string>,
): CitationValueSelection[] {
    const result: CitationValueSelection[] = [];
    const indexes = new Set<number>();
    for (const name of Object.keys(values)) {
        const index = getCitationAuthorIndex(name);
        if (index != null) {
            indexes.add(index);
        }
    }
    const sortedIndexes = [...indexes].sort((left, right) => left - right);
    for (const index of sortedIndexes) {
        const candidates = getCitationAuthorCandidates(index);
        const identifiesAuthor = function identifiesAuthor(candidate: string) {
            return (
                values[candidate]?.trim() &&
                !hasFieldDirective(values[candidate], "no-author")
            );
        };
        const key = candidates.find(identifiesAuthor);
        if (key == null) {
            continue;
        }
        result.push({ key, value: values[key] });
    }
    return result;
}

/**
 * Gets the positive creator position encoded by an author-family field.
 */
function getCitationAuthorIndex(name: string): number | null {
    for (const pattern of CITATION_AUTHOR_INDEX_PATTERNS) {
        const match = name.match(pattern);
        if (match == null) {
            continue;
        }
        const index = Number(match[1] || "1");
        return Number.isSafeInteger(index) && index > 0 ? index : null;
    }
    return null;
}

/**
 * Lists accepted author-family parameter spellings for one creator
 * position.
 */
function getCitationAuthorCandidates(index: number): string[] {
    const number = String(index);
    const numbered = [
        `author-last${number}`,
        `author${number}-last`,
        `author-surname${number}`,
        `author${number}-surname`,
        `last${number}`,
        `surname${number}`,
        `author${number}`,
        `subject${number}`,
        `host${number}`,
    ];
    if (index > 1) {
        return numbered;
    }
    return [
        "author-last",
        numbered[0],
        numbered[1],
        "author-surname",
        numbered[2],
        numbered[3],
        "last",
        numbered[4],
        "surname",
        numbered[5],
        "author",
        numbered[6],
        "subject",
        numbered[7],
        "host",
        numbered[8],
    ];
}

/**
 * Extracts an explicitly comma-delimited family name for a creator key.
 *
 * @param value - Display citation value or hashtag override.
 * @returns Creator family name when explicitly supplied.
 */
function authorNameValue(value: string): string {
    const name = nameValue(value);
    const family = name.match(/^([^,]+),\s*\S/u)?.[1].trim();
    return family || name;
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
    const selected = selectCitationYear(values);
    const entered = selected?.value ?? "";
    const clean = cleanValue(entered);
    return clean.match(/\b(\d{4})\b/u)?.[1] || "n.d.";
}

/** Selects the first eligible date field. */
function selectCitationYear(
    values: Record<string, string>,
): CitationValueSelection | null {
    for (const key of CITATION_DATE_KEYS) {
        const value = values[key];
        if (value?.trim() && !hasFieldDirective(value, "no-date")) {
            return { key, value };
        }
    }
    return null;
}

/**
 * Selects a page, time, or interactive-media locator.
 *
 * @param values - Citation values.
 * @returns Part-of-source locator.
 */
function getSourceLocator(values: Record<string, string>): string {
    return selectSourceLocator(values)?.value ?? "";
}

/** Selects and formats the first eligible source locator. */
function selectSourceLocator(
    values: Record<string, string>,
): CitationValueSelection | null {
    for (const [key, prefix] of SOURCE_LOCATOR_ENTRIES) {
        if (hasFieldDirective(values[key] || "", "no-part")) {
            continue;
        }
        let value = cleanValue(values[key] || "");
        if (["time", "timestamp", "duration"].includes(key)) {
            value = normalizeLocatorTime(value);
        }
        if (value !== "") {
            const formatted = prefix === "" ? value : `${prefix} ${value}`;
            return { key, value: formatted };
        }
    }
    return null;
}

/**
 * Restores colon notation for a time used in a reference name.
 *
 * @param value - Display-formatted citation time.
 * @returns Colon-delimited locator time.
 */
function normalizeLocatorTime(value: string): string {
    const result = value
        .replace(/(\d+)ʰ(\d{2})′(\d{2})″/gu, "$1:$2:$3")
        .replace(/(\d+)′(\d{2})″/gu, "$1:$2");
    return result;
}

/**
 * Removes source-position data from a URL.
 *
 * @param value - Entered source URL.
 * @returns Deterministic URL used only for source comparison.
 */
function canonicalizeSourceUrl(value: string): string {
    const clean = cleanValue(value).replace(/&amp;/gu, "&");
    try {
        const url = new URL(clean);
        url.hash = "";
        for (const name of [...url.searchParams.keys()]) {
            const normalizedName = name.toLocaleLowerCase("en-US");
            if (POSITION_QUERY_PARAMS.has(normalizedName)) {
                url.searchParams.delete(name);
            }
        }
        url.searchParams.sort();
        return url.toString();
    } catch {
        return clean.replace(/#.*$/u, "");
    }
}

/**
 * Applies a hashtag-comment reference-name override.
 *
 * @param value - Display citation value.
 * @returns Value used in the reference name.
 */
function nameValue(value: string): string {
    const override = extractNameOverride(value);
    return cleanValue(override || value) || "Untitled source";
}

/**
 * Extracts a hashtag reference-name override from comments.
 *
 * @param value - Citation field value.
 * @returns Entered override, if present.
 */
function extractNameOverride(value: string): string {
    const comments = value.matchAll(/<!--([\s\S]*?)-->/gu);
    for (const comment of comments) {
        const hashIndex = comment[1].indexOf("#");
        if (hashIndex >= 0) {
            return comment[1].slice(hashIndex + 1).trim();
        }
    }
    return "";
}

/**
 * Checks whether a citation field comment contains a directive.
 *
 * @param value - Citation field value.
 * @param directive - Directive name without the leading
 *   exclamation mark.
 * @returns Whether the directive is present.
 */
function hasFieldDirective(value: string, directive: string): boolean {
    const comments = value.matchAll(/<!--([\s\S]*?)-->/gu);
    const token = `!${directive}`;
    for (const comment of comments) {
        const words = comment[1].split(/\s+/u);
        if (words.includes(token)) {
            return true;
        }
    }
    return false;
}

/**
 * Removes common wikitext markup from a reference-name value.
 *
 * @param value - Wikitext value.
 * @returns Plain compact text.
 */
export function cleanValue(value: string): string {
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
    const aliasNames = Object.keys(metadata.aliases);
    const canonicalNames = new Set([...metadata.paramOrder, ...aliasNames]);
    for (const canonical of canonicalNames) {
        const normalizedCanonical = canonical.toLocaleLowerCase("en-US");
        result.set(normalizedCanonical, canonical);
        addCanonicalAliases(result, canonical, metadata.aliases[canonical]);
    }
    addNumberedAuthorAliases(result, canonicalNames);
    return result;
}

/**
 * Adds numbered author aliases for canonical family-name parameters.
 *
 * @param names - Mutable canonical-name map.
 * @param canonicalNames - Available canonical parameter names.
 */
function addNumberedAuthorAliases(
    names: Map<string, string>,
    canonicalNames: Set<string>,
): void {
    for (const canonical of canonicalNames) {
        let authorIndex: string | undefined;
        if (canonical === "last") {
            authorIndex = "1";
        } else {
            const numberedLast = canonical.match(/^last([1-9]\d*)$/u)?.[1];
            if (numberedLast != null && numberedLast !== "1") {
                authorIndex = numberedLast;
            }
        }
        if (authorIndex != null) {
            names.set(`author${authorIndex}`, canonical);
        }
    }
}

/**
 * Adds case-normalized aliases for one canonical citation parameter.
 *
 * @param names - Mutable canonical-name map.
 * @param canonical - Canonical parameter name.
 * @param aliases - Configured aliases.
 */
function addCanonicalAliases(
    names: Map<string, string>,
    canonical: string,
    aliases: string[] | undefined,
): void {
    for (const alias of aliases || []) {
        const normalizedAlias = alias.toLocaleLowerCase("en-US");
        names.set(normalizedAlias, canonical);
    }
}
