/**
 * Source parsing, matching, editing, and serialization.
 */

import {
    canonicalizeCitation,
    cleanValue,
    formatBlockCitation,
    formatInlineCitation,
    getCitationIdentity,
    getCitationNameContributors,
} from "./citation.ts";
import {
    citationTemplateData as templateData,
    findShortFootnoteCitations,
} from "#shared/citation";
import { wikitext, type ParsedTemplateCall } from "#shared/wikitext";
import { serializeGenericCitation } from "./generic-citation.ts";
import { getCitationOutputParams } from "./post-formatter.ts";
import {
    findSourceDiscoveryProtectedRanges,
    isInWikitextRanges,
    maskWikitextRanges,
} from "./protected-wikitext.ts";
import {
    decodeReferenceAttribute,
    escapeReferenceName,
    formatReferenceGroupAttribute,
    stripOptionalReferenceNameQuotes,
} from "./ref-attributes.ts";
import {
    normalizeSourceUrl,
    parseSourceInput,
    parseSourceUrl,
} from "./source-url.ts";
import {
    getCanonicalTemplateName,
    isCitationTemplate,
    isCitePrefixedTemplate,
    isEditableCitationTemplate,
    isMetadataFreeCitationTemplate,
    normalizeTemplateName,
} from "./templates.ts";
import type {
    CitationLayout,
    CitationParam,
    CitationTemplate,
    TextReplacement,
} from "./types.ts";
import { applyReplacements } from "./wikitext.ts";

const DEFAULT_SOURCE_FIELDS = [
    "author",
    "title",
    "url",
    "website",
    "publisher",
    "date",
    "access-date",
    "archive-url",
    "archive-date",
    "url-status",
    "language",
] as const;
const SOURCE_FIELD_PROFILES: Record<string, readonly string[]> = {
    citation: [
        "author",
        "title",
        "work",
        "publisher",
        "date",
        "edition",
        "series",
        "volume",
        "issue",
        "pages",
        "location",
        "isbn",
        "issn",
        "doi",
        "language",
        "url",
        "access-date",
        "archive-url",
        "archive-date",
        "url-status",
    ],
    "cite book": [
        "author",
        "title",
        "work",
        "publisher",
        "date",
        "edition",
        "series",
        "volume",
        "page",
        "pages",
        "location",
        "isbn",
        "language",
        "url",
        "access-date",
        "archive-url",
        "archive-date",
        "url-status",
    ],
    "cite journal": [
        "author",
        "title",
        "journal",
        "publisher",
        "date",
        "volume",
        "issue",
        "page",
        "pages",
        "doi",
        "issn",
        "language",
        "url",
        "access-date",
        "archive-url",
        "archive-date",
        "url-status",
    ],
    "cite magazine": [
        "author",
        "title",
        "magazine",
        "publisher",
        "date",
        "volume",
        "issue",
        "page",
        "pages",
        "location",
        "issn",
        "language",
        "url",
        "access-date",
        "archive-url",
        "archive-date",
        "url-status",
    ],
    "cite news": [
        "author",
        "title",
        "work",
        "publisher",
        "date",
        "page",
        "pages",
        "location",
        "language",
        "url",
        "access-date",
        "archive-url",
        "archive-date",
        "url-status",
    ],
    "cite tweet": [
        "author",
        "user",
        "number",
        "date",
        "title",
        "language",
        "access-date",
        "link",
    ],
};
const SOURCE_CONTAINER_FIELDS = new Set([
    "journal",
    "magazine",
    "newspaper",
    "periodical",
    "website",
    "work",
]);
const SOURCE_CONTAINER_FIELD_BY_TEMPLATE: Record<string, string> = {
    citation: "work",
    "cite book": "work",
    "cite journal": "journal",
    "cite magazine": "magazine",
    "cite news": "work",
    "cite web": "website",
};
const CREATOR_ALIAS_PARAMETER_PATTERNS = [
    /^(?:author|last|editor|interviewer)\d*$/u,
    /^(?:contributor|translator|host|cartography)\d*$/u,
    /^(?:editor|interviewer|contributor|translator)(?:-last\d*|\d+-last)$/u,
    /^(?:developer|user)$/u,
];
const UNUSED_SOURCE_SECTION_ID = "unused";
const NON_LATIN_SCRIPT_LANGUAGE_CODES = new Set([
    "ab",
    "am",
    "ar",
    "as",
    "az",
    "be",
    "bg",
    "bn",
    "bo",
    "bs",
    "ce",
    "chr",
    "cu",
    "dv",
    "dz",
    "el",
    "fa",
    "grc",
    "gu",
    "he",
    "hi",
    "hy",
    "ja",
    "ka",
    "kaa",
    "kk",
    "km",
    "kn",
    "ko",
    "ku",
    "ky",
    "lo",
    "mk",
    "ml",
    "mn",
    "mni",
    "mr",
    "my",
    "ne",
    "or",
    "ota",
    "pa",
    "ps",
    "ru",
    "sd",
    "si",
    "sr",
    "syc",
    "ta",
    "te",
    "tg",
    "th",
    "ti",
    "tkr",
    "tt",
    "ug",
    "uk",
    "ur",
    "uz",
    "yi",
    "yue",
    "zh",
    "zgh",
]);

export {
    normalizeSourceUrl,
    parseSourceInput,
    parseSourceUrl,
    sanitizeSourceUrl,
} from "./source-url.ts";
export type { ParsedSourceInput, ParsedSourceUrl } from "./source-url.ts";

export interface SourceDraftRow {
    alias: string;
    directive: string;
    main: boolean;
    name: string;
    positionalIndex?: number;
    value: string;
}

export interface SourceDraft {
    normalizationRequested?: boolean;
    rows: SourceDraftRow[];
    template: string;
}

export type ScriptTitleMode = "all-foreign" | "non-latin";

export interface SourceDraftCitationNameParts {
    author: string;
    part: string;
    year: string;
}

export interface SourceDraftParameterAliasInfo {
    aliases: string[];
    canonical: string;
    isAlias: boolean;
}

/** Signals that a citation changed after its snapshot was taken. */
export class StaleSourceError extends Error {
    override name = "StaleSourceError";
}

/** Describes aliases that resolve to one canonical parameter. */
export class SourceParameterCollisionError extends Error {
    override name = "SourceParameterCollisionError";
    readonly canonicalParameter: string;
    readonly firstParameter: string;
    readonly secondParameter: string;

    constructor(
        firstParameter: string,
        secondParameter: string,
        canonicalParameter: string,
    ) {
        super(
            `${firstParameter} and ${secondParameter} both map to ` +
                `${canonicalParameter}. Remove or rename one parameter.`,
        );
        this.canonicalParameter = canonicalParameter;
        this.firstParameter = firstParameter;
        this.secondParameter = secondParameter;
    }
}

export type SourceDraftCitationNameCell = "alias" | "value";
export type ExistingSourceStatus =
    "metadata-free" | "non-standard" | "standard";

interface DraftAuthorParameter {
    index: number;
    suffix: string;
}

interface StructuredAuthorParameter {
    field: "first" | "last";
    index: number;
    suffix: string;
}

export interface ExistingSource {
    archiveUrl: string;
    draft: SourceDraft;
    group: string;
    id: string;
    rawReference: string;
    rawTemplate: string;
    referenceEnd: number;
    referenceKind?: "reference" | "short-footnote";
    referenceName: string;
    referenceStart: number;
    reuseText: string;
    sectionIds: string[];
    status: ExistingSourceStatus;
    templateEnd: number;
    templateStart: number;
    title: string;
    titleLanguage: string;
    url: string;
    usePositions?: number[];
    usageCount: number;
}

export interface SourceSection {
    depth: number;
    id: string;
    parentId: string;
    start: number;
    title: string;
}

export interface CreatorAliasSuggestion {
    alias: string;
    count: number;
}

interface ReferenceContainer {
    end: number;
    group: string;
    start: number;
}

interface SourceReference {
    end: number;
    group: string;
    name: string;
    raw: string;
    start: number;
}

/**
 * Returns whether a parameter is an unstructured author slot.
 *
 * @param name - Name to process.
 * @returns Whether a parameter is an unstructured author slot.
 */
export function isAuthorDraftParameter(name: string): boolean {
    return parseDraftAuthorParameter(name) != null;
}

/**
 * Returns whether a parameter is a structured last-name slot.
 *
 * @param name - Name to process.
 * @returns Whether a parameter is a structured last-name slot.
 */
export function isLastAuthorDraftParameter(name: string): boolean {
    return parseStructuredAuthorParameter(name)?.field === "last";
}

/**
 * Checks whether an author can use separate first and last fields.
 *
 * @param draft - Source draft to process.
 * @param rowIndex - Row index value.
 * @returns Whether an author can use separate first and last fields.
 */
export function canSplitAuthorDraftRow(
    draft: SourceDraft,
    rowIndex: number,
): boolean {
    if (getTemplateMetadata(draft.template) == null) {
        return false;
    }
    const row = draft.rows[rowIndex];
    const author = parseDraftAuthorParameter(row?.name || "");
    if (author == null) {
        return false;
    }
    return !draft.rows.some(function isConflictingTarget(candidate, index) {
        if (index === rowIndex) {
            return false;
        }
        const target = parseStructuredAuthorParameter(candidate.name);
        return target != null && target.index === author.index;
    });
}

/**
 * Adds the next blank numbered slot after each populated author row.
 *
 * @param draft - Source draft to process.
 */
export function ensureNextAuthorDraftRows(draft: SourceDraft): void {
    if (getTemplateMetadata(draft.template) == null) {
        return;
    }
    const populated = draft.rows.filter(function isPopulatedAuthor(row) {
        return (
            parseDraftAuthorParameter(row.name) != null &&
            row.value.trim() !== ""
        );
    });
    for (const row of populated) {
        ensureNextAuthorDraftRow(draft, row);
    }
}

/**
 * Reorders all rows into the standard order for the selected template.
 *
 * @param draft - Source draft to process.
 */
export function formatSourceDraftRows(draft: SourceDraft): void {
    draft.rows = sortSourceDraftRows(draft.rows, draft.template);
}

/**
 * Converts one author value into separate last- and first-name rows.
 *
 * @param draft - Source draft to process.
 * @param rowIndex - Row index value.
 * @returns Value.
 */
export function splitAuthorDraftRow(
    draft: SourceDraft,
    rowIndex: number,
): boolean {
    if (!canSplitAuthorDraftRow(draft, rowIndex)) {
        return false;
    }
    const row = draft.rows[rowIndex];
    const author = parseDraftAuthorParameter(row.name) as DraftAuthorParameter;
    const parts = splitDraftAuthorValue(row.value) ?? {
        first: "",
        last: row.value.trim(),
    };
    ensureNextAuthorDraftRows(draft);
    const currentIndex = draft.rows.indexOf(row);
    row.name = `last${author.suffix}`;
    row.value = parts.last;
    draft.rows.splice(currentIndex + 1, 0, {
        alias: "",
        directive: "",
        main: row.main,
        name: `first${author.suffix}`,
        value: parts.first,
    });
    return true;
}

/**
 * Checks whether first/last fields can return to one author field.
 *
 * @param draft - Source draft to process.
 * @param rowIndex - Row index value.
 * @returns Whether first/last fields can return to one author field.
 */
export function canJoinAuthorDraftRow(
    draft: SourceDraft,
    rowIndex: number,
): boolean {
    if (getTemplateMetadata(draft.template) == null) {
        return false;
    }
    const row = draft.rows[rowIndex];
    const structured = parseStructuredAuthorParameter(row?.name || "");
    if (structured?.field !== "last") {
        return false;
    }
    const sameSlot = findOtherAuthorSlotRows(
        draft,
        rowIndex,
        structured.index,
    );
    if (sameSlot.some((candidate) => isAuthorDraftParameter(candidate.name))) {
        return false;
    }
    const structuredRows = sameSlot.filter(function isStructured(candidate) {
        return parseStructuredAuthorParameter(candidate.name) != null;
    });
    if (structuredRows.length > 1) {
        return false;
    }
    const first = structuredRows[0];
    if (
        first != null &&
        parseStructuredAuthorParameter(first.name)?.field !== "first"
    ) {
        return false;
    }
    return (
        first == null ||
        (first.alias.trim() === "" && first.directive.trim() === "")
    );
}

function findOtherAuthorSlotRows(
    draft: SourceDraft,
    rowIndex: number,
    slot: number,
): SourceDraftRow[] {
    return draft.rows.filter(
        (candidate, index) =>
            index !== rowIndex && getDraftAuthorSlot(candidate.name) === slot,
    );
}

/**
 * Combines separate last and first fields into one author row.
 *
 * @param draft - Source draft to process.
 * @param rowIndex - Row index value.
 * @returns Whether the condition is met.
 */
export function joinAuthorDraftRow(
    draft: SourceDraft,
    rowIndex: number,
): boolean {
    if (!canJoinAuthorDraftRow(draft, rowIndex)) {
        return false;
    }
    const row = draft.rows[rowIndex];
    const structured = parseStructuredAuthorParameter(
        row.name,
    ) as StructuredAuthorParameter;
    const firstIndex = draft.rows.findIndex(function findFirst(candidate) {
        const parsed = parseStructuredAuthorParameter(candidate.name);
        return parsed?.field === "first" && parsed.index === structured.index;
    });
    const first = firstIndex < 0 ? null : draft.rows[firstIndex];
    row.name = `author${structured.suffix}`;
    row.value = joinDraftAuthorValue(row.value, first?.value || "");
    row.main ||= first?.main === true;
    if (firstIndex >= 0) {
        draft.rows.splice(firstIndex, 1);
    }
    ensureNextAuthorDraftRows(draft);
    return true;
}

/**
 * Parses an unstructured author parameter and its numeric slot.
 *
 * @param name - Name to process.
 * @returns Parsed unstructured author parameter and its numeric slot.
 */
function parseDraftAuthorParameter(name: string): DraftAuthorParameter | null {
    const normalized = name.trim().toLocaleLowerCase("en-US");
    if (normalized === "author") {
        return { index: 1, suffix: "" };
    }
    const match = normalized.match(/^author([1-9]\d*)$/u);
    if (match == null) {
        return null;
    }
    return { index: Number(match[1]), suffix: match[1] };
}

/**
 * Parses a structured first- or last-name parameter.
 *
 * @param name - Name to process.
 * @returns Parsed structured first- or last-name parameter.
 */
function parseStructuredAuthorParameter(
    name: string,
): StructuredAuthorParameter | null {
    const normalized = name.trim().toLocaleLowerCase("en-US");
    const match = normalized.match(/^(first|last)([1-9]\d*)?$/u);
    if (match == null) {
        return null;
    }
    return {
        field: match[1] as "first" | "last",
        index: Number(match[2] || "1"),
        suffix: match[2] || "",
    };
}

/**
 * Splits `Last, First` or a space-delimited `First Last` name.
 *
 * @param value - Value to process.
 * @returns Split `Last, First` or a space-delimited `First Last` name.
 */
function splitDraftAuthorValue(
    value: string,
): { first: string; last: string } | null {
    const parts = wikitext(value).split(",");
    if (parts.length >= 2) {
        const last = parts[0].trim();
        const first = parts.slice(1).join(",").trim();
        return last === "" || first === "" ? null : { first, last };
    }
    const words = value.trim().split(/\s+/u);
    if (words.length < 2) {
        return null;
    }
    const last = words.pop() as string;
    return { first: words.join(" "), last };
}

/**
 * Joins structured name values in an unambiguous display order.
 *
 * @param lastValue - Last value value.
 * @param firstValue - First value value.
 * @returns Resulting text.
 */
function joinDraftAuthorValue(lastValue: string, firstValue: string): string {
    const last = lastValue.trim();
    const first = firstValue.trim();
    if (last === "" || first === "") {
        return last || first;
    }
    return `${last}, ${first}`;
}

/**
 * Adds a blank author row after one populated author slot.
 *
 * @param draft - Source draft to process.
 * @param row - Row value.
 */
function ensureNextAuthorDraftRow(
    draft: SourceDraft,
    row: SourceDraftRow,
): void {
    const author = parseDraftAuthorParameter(row.name);
    if (author == null || row.value.trim() === "") {
        return;
    }
    const nextIndex = author.index + 1;
    const occupied = draft.rows.some(function hasNextAuthor(candidate) {
        return getDraftAuthorSlot(candidate.name) === nextIndex;
    });
    if (occupied) {
        return;
    }
    const rowIndex = draft.rows.indexOf(row);
    draft.rows.splice(rowIndex + 1, 0, {
        alias: "",
        directive: "",
        main: false,
        name: `author${nextIndex}`,
        value: "",
    });
}

/**
 * Gets the slot used by any supported author-name parameter.
 *
 * @param name - Name to process.
 * @returns Operation result.
 */
function getDraftAuthorSlot(name: string): number | null {
    const author = parseDraftAuthorParameter(name);
    if (author != null) {
        return author.index;
    }
    return parseStructuredAuthorParameter(name)?.index ?? null;
}

/**
 * Finds previously used aliases for a matching creator display value.
 *
 * @param sources - Sources value.
 * @param row - Row value.
 * @returns Value.
 */
export function findCreatorAliasSuggestions(
    sources: ExistingSource[],
    row: SourceDraftRow,
): CreatorAliasSuggestion[] {
    if (!isCreatorAliasDraftParameter(row.name)) {
        return [];
    }
    const displayValue = normalizeCreatorAliasValue(row.value);
    if (displayValue === "") {
        return [];
    }
    const counts = new Map<string, number>();
    for (const source of sources) {
        for (const candidate of source.draft.rows) {
            if (!isMatchingCreatorAliasCandidate(candidate, displayValue)) {
                continue;
            }
            const alias = candidate.alias.trim();
            if (alias !== "") {
                counts.set(alias, (counts.get(alias) ?? 0) + 1);
            }
        }
    }
    return [...counts].map(([alias, count]) => ({ alias, count }));
}

/**
 * Checks whether a draft row represents the same visible creator.
 *
 * @param row - Row value.
 * @param displayValue - Display value value.
 * @returns Whether a draft row represents the same visible creator.
 */
function isMatchingCreatorAliasCandidate(
    row: SourceDraftRow,
    displayValue: string,
): boolean {
    return (
        isCreatorAliasDraftParameter(row.name) &&
        normalizeCreatorAliasValue(row.value) === displayValue
    );
}

/**
 * Returns whether a draft field contains a creator display or
 * family name.
 *
 * @param name - Name to process.
 * @returns Whether a field contains a creator display or family name.
 */
export function isCreatorAliasDraftParameter(name: string): boolean {
    const normalized = name.trim().toLocaleLowerCase("en-US");
    return CREATOR_ALIAS_PARAMETER_PATTERNS.some((pattern) =>
        pattern.test(normalized),
    );
}

/**
 * Converts a generated or existing citation to editable rows.
 *
 * @param raw - Raw value.
 * @returns Converted generated or existing citation to editable rows.
 */
export function parseSourceDraft(raw: string): SourceDraft {
    const call = wikitext(raw).templates.parser();
    const name = getEnteredDraftTemplateName(call.name);
    const metadata = getTemplateMetadata(name);
    if (metadata == null) {
        const enteredRows = call.params.map(function toGenericDraftRow(param) {
            return buildDraftRow(
                param.name,
                param.positional ? param.rawValue : param.value,
                false,
                param.positional ? Number(param.name) : undefined,
                false,
            );
        });
        return {
            normalizationRequested: false,
            rows: enteredRows,
            template: name,
        };
    }
    const enteredRows = call.params.map(function toDraftRow(param) {
        return buildDraftRow(param.name, param.value, false);
    });
    return {
        normalizationRequested: false,
        rows: seedMainRowsPreservingOrder(enteredRows, name),
        template: name,
    };
}

/**
 * Creates an empty, offline-friendly source draft.
 *
 * @param template - Template wikitext.
 * @returns Created empty, offline-friendly source draft.
 */
export function createManualSourceDraft(
    template: string = "cite magazine",
): SourceDraft {
    const name = getDraftTemplateName(template);
    return {
        normalizationRequested: true,
        rows: seedMainRows([], name),
        template: name,
    };
}

/**
 * Changes a draft template while retaining entered and custom fields.
 *
 * @param draft - Source draft to process.
 * @param template - Template wikitext.
 * @returns Operation result.
 */
export function changeSourceDraftTemplate(
    draft: SourceDraft,
    template: string,
): SourceDraft {
    const name = getDraftTemplateName(template);
    const rows = draft.rows
        .filter((row) => !row.main || hasDraftRowContent(row))
        .map(function cloneAsExtra(row) {
            return { ...row, main: false };
        });
    migrateSourceContainer(rows, name);
    return {
        normalizationRequested: draft.normalizationRequested === true,
        rows: seedMainRows(rows, name),
        template: name,
    };
}

/**
 * Serializes populated rows in the selected citation layout.
 *
 * @param draft - Source draft to process.
 * @param layout - Citation layout.
 * @returns Serialized populated rows in the selected citation layout.
 */
export function serializeSourceDraft(
    draft: SourceDraft,
    layout: CitationLayout = "block",
): string {
    const citation = buildDraftCitation(draft);
    const preserveParameterNames = getTemplateMetadata(citation.name) == null;
    if (preserveParameterNames) {
        return serializeGenericCitation(citation, layout);
    }
    return layout === "inline"
        ? formatInlineCitation(citation)
        : formatBlockCitation(citation);
}

/**
 * Serializes rows without canonicalizing entered parameter aliases.
 *
 * @param draft - Source draft to process.
 * @param layout - Citation layout.
 * @returns Rows serialized without canonicalizing entered aliases.
 */
export function serializeSourceDraftPreservingNames(
    draft: SourceDraft,
    layout: CitationLayout = "block",
): string {
    const name = getDraftTemplateName(draft.template);
    const metadata = getTemplateMetadata(name);
    const rows = draft.rows
        .filter((row) => row.name.trim() !== "")
        .filter((row) => metadata == null || hasDraftRowContent(row));
    const params = buildDraftParams(rows, metadata == null);
    const preserveParameterNames = metadata == null;
    if (!preserveParameterNames) {
        assertUniqueCanonicalParams(name, params);
    }
    const citation = { name, params };
    if (preserveParameterNames) {
        return serializeGenericCitation(citation, layout);
    }
    return layout === "inline"
        ? formatInlineCitation(citation)
        : formatBlockCitation(citation);
}

/**
 * Serializes a draft according to its explicit normalization state.
 *
 * @param draft - Source draft to process.
 * @param layout - Citation layout.
 * @returns Draft serialized for its explicit normalization state.
 */
export function serializeSourceDraftForEdit(
    draft: SourceDraft,
    layout: CitationLayout = "block",
): string {
    return draft.normalizationRequested === true
        ? serializeSourceDraft(draft, layout)
        : serializeSourceDraftPreservingNames(draft, layout);
}

/**
 * Canonicalizes values and aliases before an item-level sort.
 *
 * @param draft - Source draft to process.
 */
export function canonicalizeSourceDraft(draft: SourceDraft): void {
    const citation = buildDraftCitation(draft);
    const rows = getCitationOutputParams(citation, true).map((param) =>
        buildDraftRow(param.name, param.value, false),
    );
    draft.normalizationRequested = true;
    draft.rows = seedMainRows(rows, draft.template);
}

/**
 * Lists canonical names offered by the parameter combobox.
 *
 * @param draft - Source draft to process.
 * @returns Listed canonical names offered by the parameter combobox.
 */
export function listSourceDraftParameterNames(draft: SourceDraft): string[] {
    return [...(getTemplateMetadata(draft.template)?.paramOrder ?? [])];
}

/**
 * Resolves a parameter to its template-specific alias group.
 *
 * @param draft - Source draft to process.
 * @param enteredName - Entered name value.
 * @returns Resolved parameter to its template-specific alias group.
 */
export function getSourceDraftParameterAliasInfo(
    draft: SourceDraft,
    enteredName: string,
): SourceDraftParameterAliasInfo | null {
    const enteredValue = enteredName.trim();
    const entered = enteredValue.toLocaleLowerCase("en-US");
    if (entered === "") {
        return null;
    }
    const metadata = getTemplateMetadata(draft.template);
    if (metadata == null) {
        return null;
    }
    for (const [canonical, aliases] of Object.entries(metadata.aliases)) {
        const normalizedCanonical = canonical.toLocaleLowerCase("en-US");
        const normalizedAliases = aliases.map((alias) =>
            alias.toLocaleLowerCase("en-US"),
        );
        const matchesAlias = normalizedAliases.includes(entered);
        if (entered !== normalizedCanonical && !matchesAlias) {
            continue;
        }
        return {
            aliases: aliases.filter((alias) => alias !== canonical),
            canonical,
            isAlias: matchesAlias && enteredValue !== canonical,
        };
    }
    return null;
}

/**
 * Moves a foreign title with one language into its script field.
 *
 * @param draft - Source draft to process.
 * @param wikiId - Wiki id value.
 * @param mode - Mode value.
 * @returns Whether the condition is met.
 */
// eslint-disable-next-line max-lines-per-function
export function moveSourceDraftTitleToScriptTitle(
    draft: SourceDraft,
    wikiId: string,
    mode: ScriptTitleMode = "non-latin",
): boolean {
    if (getTemplateMetadata(draft.template) == null) {
        return false;
    }
    const language = getDraftValue(draft, "language").trim();
    const codePattern = /^([a-z]{2,3})(?:-[a-z0-9]+)*$/iu;
    const languageMatch = language.match(codePattern);
    const primaryLanguage =
        languageMatch?.[1].toLocaleLowerCase("en-US") ?? "";
    const localLanguage = getCitationWikiLanguage(wikiId);
    if (
        languageMatch == null ||
        (localLanguage !== "" && primaryLanguage === localLanguage) ||
        (mode === "non-latin" &&
            !NON_LATIN_SCRIPT_LANGUAGE_CODES.has(primaryLanguage))
    ) {
        return false;
    }
    const title = getDraftRow(draft, "title");
    const scriptTitle = getDraftRow(draft, "script-title");
    if (
        title == null ||
        title.value.trim() === "" ||
        scriptTitle?.value.trim()
    ) {
        return false;
    }
    const titleValue = title.value.trim();
    title.value = "";
    const target = scriptTitle ?? buildDraftRow("script-title", "", false);
    target.value = `${primaryLanguage}:${titleValue}`;
    target.alias = title.alias;
    target.directive = title.directive;
    title.alias = "";
    title.directive = "";
    if (scriptTitle == null) {
        draft.rows.push(target);
        formatSourceDraftRows(draft);
    }
    return true;
}

/**
 * Gets the local language whose titles stay in the normal field.
 *
 * @param wikiId - Wiki id value.
 * @returns Resulting text.
 */
function getCitationWikiLanguage(wikiId: string): string {
    return (
        {
            enwiki: "en",
            zhwiki: "zh",
        }[wikiId] ?? ""
    );
}

/**
 * Moves eligible titles before formatting all article citations.
 *
 * @param text - Text to process.
 * @param wikiId - Wiki id value.
 * @param mode - Mode value.
 * @returns Operation result.
 */
export function moveSourceTitlesToScriptTitle(
    text: string,
    wikiId: string,
    mode: ScriptTitleMode = "non-latin",
): { moved: number; text: string } {
    const replacements: TextReplacement[] = [];
    const protectedRanges = findSourceDiscoveryProtectedRanges(text);
    let moved = 0;
    for (const call of wikitext(text).template.getAll()) {
        const nestedReplacement = replacements.some(
            (replacement) =>
                call.start >= replacement.start && call.end <= replacement.end,
        );
        if (
            !isCitationTemplate(call.name) ||
            isInWikitextRanges(call.start, protectedRanges) ||
            nestedReplacement
        ) {
            continue;
        }
        const draft = parseSourceDraft(call.raw);
        if (!moveSourceDraftTitleToScriptTitle(draft, wikiId, mode)) {
            continue;
        }
        const layout = call.raw.includes("\n") ? "block" : "inline";
        replacements.push({
            end: call.end,
            start: call.start,
            text: serializeSourceDraft(draft, layout),
        });
        moved += 1;
    }
    return { moved, text: applyReplacements(text, replacements) };
}

/**
 * Canonicalizes the populated rows of one editable source draft.
 *
 * @param draft - Source draft to process.
 * @returns Operation result.
 */
function buildDraftCitation(draft: SourceDraft): CitationTemplate {
    const name = getDraftTemplateName(draft.template);
    const metadata = getTemplateMetadata(name);
    const rows = draft.rows
        .filter((row) => row.name.trim() !== "")
        .filter((row) => metadata == null || hasDraftRowContent(row));
    const params = buildDraftParams(rows, metadata == null);
    if (metadata == null) {
        return { name, params };
    }
    assertUniqueCanonicalParams(name, params);
    return canonicalizeCitation({ name, params }, metadata);
}

/**
 * Returns whether a draft has local CS1 metadata and citation identity.
 *
 * @param draft - Source draft to process.
 * @returns Whether a draft has local CS1 metadata and identity.
 */
export function hasSourceDraftCitationIdentity(draft: SourceDraft): boolean {
    return getTemplateMetadata(draft.template) != null;
}

/**
 * Finds the exact value or alias cells supplying the visible ref name.
 *
 * @param draft - Source draft to process.
 * @returns Value.
 */
export function getSourceDraftCitationNameCells(
    draft: SourceDraft,
): Map<number, SourceDraftCitationNameCell> {
    const name = getDraftTemplateName(draft.template);
    const metadata = getTemplateMetadata(name);
    if (metadata == null) {
        return new Map();
    }
    const rowByCanonicalName = new Map<string, number>();
    const params: CitationParam[] = [];
    for (const [index, row] of draft.rows.entries()) {
        if (row.name.trim() === "" || !hasDraftRowContent(row)) {
            continue;
        }
        const param = buildDraftParam(row);
        params.push(param);
        const canonical = canonicalizeCitation(
            { name, params: [param] },
            metadata,
        );
        rowByCanonicalName.set(canonical.params[0]?.name ?? param.name, index);
    }
    const citation = canonicalizeCitation({ name, params }, metadata);
    const contributors = getCitationNameContributors(citation);
    const result = new Map<number, SourceDraftCitationNameCell>();
    for (const contributor of contributors) {
        const rowIndex = rowByCanonicalName.get(contributor);
        if (rowIndex != null) {
            const row = draft.rows[rowIndex];
            result.set(rowIndex, row.alias.trim() === "" ? "value" : "alias");
        }
    }
    return result;
}

/**
 * Gets a draft's generated author, year, and part name components.
 *
 * @param draft - Source draft to process.
 * @returns Operation result.
 */
export function getSourceDraftCitationNameParts(
    draft: SourceDraft,
): SourceDraftCitationNameParts {
    if (!hasSourceDraftCitationIdentity(draft)) {
        return { author: "", part: "", year: "" };
    }
    const identity = getCitationIdentity(buildDraftCitation(draft));
    return {
        author: identity.author,
        part: identity.locator,
        year: identity.year,
    };
}

/**
 * Lists citation definitions contained in active full ref tags.
 *
 * @param text - Text to process.
 * @returns Citation definitions in active full ref tags.
 */
export function listExistingSources(text: string): ExistingSource[] {
    const protectedRanges = findSourceDiscoveryProtectedRanges(text);
    const masked = maskWikitextRanges(text, protectedRanges);
    const calls = findRestoredTemplateCalls(text, masked);
    const containers = findReferenceContainers(masked, calls);
    const sources = new Map<number, ExistingSource>();
    addNativeRefSources(sources, text, masked, calls, containers);
    addCompactDefinitionSources(sources, calls, containers);
    addShortFootnoteSources(sources, text, calls);
    const result = [...sources.values()];
    assignExistingSourceSections(result, masked, calls, containers);
    return result.sort(
        (left, right) => left.templateStart - right.templateStart,
    );
}

/**
 * Lists article sections containing at least one existing source.
 *
 * @param text - Text to process.
 * @param sources - Sources value.
 * @returns Article sections containing an existing source.
 */
export function listExistingSourceSections(
    text: string,
    sources: ExistingSource[],
): SourceSection[] {
    const ranges = findSourceDiscoveryProtectedRanges(text);
    const masked = maskWikitextRanges(text, ranges);
    const sections = findSourceSections(masked);
    const usedIds = sources.flatMap((source) => source.sectionIds);
    const used = new Set(usedIds);
    const available = sections.filter(function hasSource(section) {
        return usedIds.some(
            (id) => id === section.id || id.startsWith(`${section.id}.`),
        );
    });
    if (used.has(UNUSED_SOURCE_SECTION_ID)) {
        available.push({
            depth: 0,
            id: UNUSED_SOURCE_SECTION_ID,
            parentId: "",
            start: Number.MAX_SAFE_INTEGER,
            title: "",
        });
    }
    return available;
}

/**
 * Filters existing citations by case-insensitive source keywords.
 *
 * @param sources - Existing citations in article order.
 * @param query - Whitespace-delimited keywords.
 * @param sectionId - Selected section whose subtree should be included.
 * @returns Sources containing every entered keyword.
 */
export function filterExistingSources(
    sources: ExistingSource[],
    query: string,
    sectionId: string = "",
): ExistingSource[] {
    const inSection =
        sectionId === ""
            ? sources
            : sources.filter(function matchesSection(source) {
                  return matchesSourceSection(source, sectionId);
              });
    const normalizedQuery = query.trim().toLocaleLowerCase("en-US");
    if (normalizedQuery === "") {
        return inSection;
    }
    const keywords = normalizedQuery.split(/\s+/u);
    return inSection.filter(function matchesKeywords(source) {
        const searchText = buildExistingSourceSearchText(source);
        return keywords.every(function includesKeyword(keyword) {
            return (
                searchText.includes(keyword) ||
                matchesCreatorAliasKeyword(source, keyword)
            );
        });
    });
}

/**
 * Tolerates a small spelling error when searching creator aliases.
 *
 * Alias comments are often the field being corrected, so an entered
 * correction such as `Hiroya` should still find a stored `Horiya`.
 *
 * @param source - Source text.
 * @param keyword - Keyword value.
 * @returns Whether the condition is met.
 */
function matchesCreatorAliasKeyword(
    source: ExistingSource,
    keyword: string,
): boolean {
    if (keyword.length < 5) {
        return false;
    }
    return source.draft.rows.some(function hasNearbyAlias(row) {
        if (!isCreatorAliasDraftParameter(row.name)) {
            return false;
        }
        const normalized = row.alias.toLocaleLowerCase("en-US");
        const tokens = normalized.match(/[\p{L}\p{N}]+/gu) ?? [];
        return tokens.some((token) => isNearbySearchToken(keyword, token));
    });
}

/**
 * Checks an alias token against a bounded edit distance.
 *
 * @param keyword - Keyword value.
 * @param token - Token value.
 * @returns Whether the condition is met.
 */
function isNearbySearchToken(keyword: string, token: string): boolean {
    const shortest = Math.min(keyword.length, token.length);
    if (shortest < 5) {
        return false;
    }
    const limit = Math.min(2, Math.floor(shortest / 3));
    if (Math.abs(keyword.length - token.length) > limit) {
        return false;
    }
    return getEditDistance(keyword, token, limit) <= limit;
}

/**
 * Computes edit distance, stopping after the limit.
 *
 * @param left - Left value to compare.
 * @param right - Right value to compare.
 * @param limit - Limit value.
 * @returns Computed edit distance, stopping after the limit.
 */
function getEditDistance(left: string, right: string, limit: number): number {
    let previous = Array.from(
        { length: right.length + 1 },
        (_, index) => index,
    );
    for (const [leftIndex, leftCharacter] of [...left].entries()) {
        const current = [leftIndex + 1];
        let rowMinimum = current[0];
        for (const [rightIndex, rightCharacter] of [...right].entries()) {
            const insertion = current[rightIndex] + 1;
            const deletion = previous[rightIndex + 1] + 1;
            const substitution =
                previous[rightIndex] +
                (leftCharacter === rightCharacter ? 0 : 1);
            const distance = Math.min(insertion, deletion, substitution);
            current.push(distance);
            rowMinimum = Math.min(rowMinimum, distance);
        }
        if (rowMinimum > limit) {
            return limit + 1;
        }
        previous = current;
    }
    return previous.at(-1) ?? limit + 1;
}

/**
 * Checks source use in a selected section or descendant.
 *
 * @param source - Source text.
 * @param sectionId - Section id value.
 * @returns Whether the condition is met.
 */
function matchesSourceSection(
    source: ExistingSource,
    sectionId: string,
): boolean {
    if (sectionId === "") {
        return true;
    }
    if (sectionId.endsWith(".0")) {
        return source.sectionIds.includes(sectionId.slice(0, -2));
    }
    return source.sectionIds.some(
        (id) => id === sectionId || id.startsWith(`${sectionId}.`),
    );
}

/**
 * Finds citations matching an original or archive URL.
 *
 * @param text - Text to process.
 * @param enteredUrl - Entered url value.
 * @returns Citations matching an original or archive URL.
 */
export function findExistingSources(
    text: string,
    enteredUrl: string,
): ExistingSource[] {
    const entered = buildComparableUrls(enteredUrl);
    if (entered.size === 0) {
        return [];
    }
    return listExistingSources(text).filter(function hasMatchingUrl(source) {
        const existing = buildSourceComparableUrls(source);
        return setsIntersect(entered, existing);
    });
}

/**
 * Builds a reuse tag when named, otherwise returns the full ref.
 *
 * @param source - Source text.
 * @param compact - Compact value.
 * @returns Built reuse tag when named, otherwise returns the full ref.
 */
export function buildExistingSourceReference(
    source: Pick<
        ExistingSource,
        "group" | "rawReference" | "referenceKind" | "referenceName"
    > &
        Partial<Pick<ExistingSource, "reuseText">>,
    compact: boolean = false,
): string {
    if (source.referenceKind === "short-footnote") {
        return source.reuseText ?? source.rawReference;
    }
    if (source.referenceName === "") {
        return source.rawReference;
    }
    if (
        compact &&
        source.group === "" &&
        !/[|={}]/u.test(source.referenceName)
    ) {
        return `{{r|${source.referenceName}}}`;
    }
    const name = escapeSourceReferenceName(source.referenceName);
    const group = formatReferenceGroupAttribute(source.group);
    return `<ref name="${name}"${group} />`;
}

/**
 * Replaces a source template at its recorded range.
 *
 * @param text - Text to process.
 * @param source - Source text.
 * @param draft - Source draft to process.
 * @param layout - Citation layout.
 * @returns Resulting text.
 */
export function replaceExistingSource(
    text: string,
    source: ExistingSource,
    draft: SourceDraft,
    layout: CitationLayout = "block",
): string {
    const current = text.slice(source.templateStart, source.templateEnd);
    if (current !== source.rawTemplate) {
        throw new StaleSourceError("The source changed after it was opened.");
    }
    const citation = serializeSourceDraftForEdit(draft, layout);
    const replacementText =
        source.status === "non-standard"
            ? buildConvertedReference(source, citation)
            : citation;
    const replacement = {
        end: source.templateEnd,
        start: source.templateStart,
        text: replacementText,
    };
    return applyReplacements(text, [replacement]);
}

/**
 * Converts unsupported content into a native citation reference.
 *
 * @param source - Source text.
 * @param citation - Citation value.
 * @returns Unsupported content converted to a native citation ref.
 */
function buildConvertedReference(
    source: ExistingSource,
    citation: string,
): string {
    const name =
        source.referenceName === ""
            ? ""
            : ` name="${escapeSourceReferenceName(source.referenceName)}"`;
    const group = formatReferenceGroupAttribute(source.group);
    return `<ref${name}${group}>${citation}</ref>`;
}

/**
 * Builds searchable text from visible and editable source details.
 *
 * @param source - Source text.
 * @returns Searchable text from visible and editable source details.
 */
function buildExistingSourceSearchText(source: ExistingSource): string {
    const draftText = source.draft.rows.flatMap(function getDraftRowText(row) {
        return [row.name, row.value, row.alias, row.directive];
    });
    return [
        source.referenceName,
        source.title,
        source.url,
        source.archiveUrl,
        source.group,
        source.draft.template,
        ...draftText,
    ]
        .join("\n")
        .toLocaleLowerCase("en-US");
}

/**
 * Normalizes a creator display value for exact suggestion matching.
 *
 * @param value - Value to process.
 * @returns Creator display value for exact suggestion matching.
 */
function normalizeCreatorAliasValue(value: string): string {
    return cleanValue(value).normalize("NFC").toLocaleLowerCase("en-US");
}

/**
 * Assigns every source to all article sections where its ref is used.
 *
 * @param sources - Sources value.
 * @param masked - Masked value.
 * @param calls - Calls value.
 * @param containers - Containers value.
 */
function assignExistingSourceSections(
    sources: ExistingSource[],
    masked: string,
    calls: ParsedTemplateCall[],
    containers: ReferenceContainer[],
): void {
    const sections = findSourceSections(masked);
    const usageIndex = buildReferenceUsageIndex(masked, calls, containers);
    for (const source of sources) {
        const positions = getExistingSourceUsePositions(
            source,
            usageIndex,
            containers,
        );
        const ids = positions.map((position) =>
            getSourceSectionAtPosition(position, sections),
        );
        source.sectionIds =
            ids.length === 0 ? [UNUSED_SOURCE_SECTION_ID] : [...new Set(ids)];
        source.usageCount = positions.length;
    }
}

/**
 * Builds ref-name/group keys to all prose-use positions.
 *
 * @param masked - Masked value.
 * @param calls - Calls value.
 * @param containers - Containers value.
 * @returns Built ref-name/group keys to all prose-use positions.
 */
function buildReferenceUsageIndex(
    masked: string,
    calls: ParsedTemplateCall[],
    containers: ReferenceContainer[],
): Map<string, number[]> {
    const result = new Map<string, number[]>();
    for (const tag of wikitext(masked).reference.getAll()) {
        if (isInReferenceContainer(tag.start, containers)) {
            continue;
        }
        const name = decodeReferenceAttribute(tag.attributes.name || "");
        const group = decodeReferenceAttribute(tag.attributes.group || "");
        addReferenceUsage(result, name, group, tag.start);
    }
    for (const call of calls) {
        addCompactReferenceUsages(result, call, containers);
    }
    return result;
}

/**
 * Adds every name called by one active R template.
 *
 * @param usages - Usages value.
 * @param call - Call value.
 * @param containers - Containers value.
 */
function addCompactReferenceUsages(
    usages: Map<string, number[]>,
    call: ParsedTemplateCall,
    containers: ReferenceContainer[],
): void {
    if (
        normalizeTemplateName(call.name) !== "r" ||
        isInReferenceContainer(call.start, containers)
    ) {
        return;
    }
    const named = new Map<string, string>();
    const positional: string[] = [];
    for (const param of call.params) {
        if (param.positional) {
            positional.push(param.value);
        } else {
            named.set(param.name.toLocaleLowerCase("en-US"), param.value);
        }
    }
    const enteredName = named.get("name") ?? named.get("n");
    const names = enteredName == null ? positional : [enteredName];
    const group = decodeReferenceAttribute(
        named.get("group") ?? named.get("g") ?? "",
    );
    for (const name of names) {
        const cleanName = decodeReferenceAttribute(
            stripOptionalReferenceNameQuotes(name),
        );
        addReferenceUsage(usages, cleanName, group, call.start);
    }
}

/**
 * Adds one nonempty reference use to its name/group index.
 *
 * @param usages - Usages value.
 * @param name - Name to process.
 * @param group - Reference group.
 * @param position - Source position.
 */
function addReferenceUsage(
    usages: Map<string, number[]>,
    name: string,
    group: string,
    position: number,
): void {
    if (name === "") {
        return;
    }
    const key = buildReferenceUsageKey(name, group);
    const positions = usages.get(key) ?? [];
    positions.push(position);
    usages.set(key, positions);
}

/**
 * Gets all known prose positions for one source definition.
 *
 * @param source - Source text.
 * @param usages - Usages value.
 * @param containers - Containers value.
 * @returns Resulting values.
 */
function getExistingSourceUsePositions(
    source: ExistingSource,
    usages: Map<string, number[]>,
    containers: ReferenceContainer[],
): number[] {
    if (source.referenceKind === "short-footnote") {
        return source.usePositions ?? [];
    }
    if (source.referenceName !== "") {
        const key = buildReferenceUsageKey(source.referenceName, source.group);
        return usages.get(key) ?? [];
    }
    return isInReferenceContainer(source.referenceStart, containers)
        ? []
        : [source.referenceStart];
}

/**
 * Creates a collision-safe reference name/group lookup key.
 *
 * @param name - Name to process.
 * @param group - Reference group.
 * @returns Created collision-safe reference name/group lookup key.
 */
function buildReferenceUsageKey(name: string, group: string): string {
    return `${group}\u0000${name}`;
}

/**
 * Finds numbered active headings plus the article lead.
 *
 * @param masked - Masked value.
 * @returns Numbered active headings plus the article lead.
 */
function findSourceSections(masked: string): SourceSection[] {
    const result: SourceSection[] = [
        {
            depth: 0,
            id: "0",
            parentId: "",
            start: -1,
            title: "",
        },
    ];
    const counters = [0, 0, 0, 0, 0];
    const activeIds = ["", "", "", "", ""];
    const pattern = /^(={2,6})\s*(.*?)\s*\1\s*$/gmu;
    for (const match of masked.matchAll(pattern)) {
        const depth = match[1].length - 2;
        counters[depth] += 1;
        counters.fill(0, depth + 1);
        const id = counters.slice(0, depth + 1).join(".");
        const title = match[2].trim();
        const parentId = findActiveParentId(activeIds, depth);
        activeIds[depth] = id;
        activeIds.fill("", depth + 1);
        result.push({
            depth,
            id,
            parentId,
            start: match.index,
            title,
        });
    }
    return result;
}

/**
 * Finds the nearest active shallower heading.
 *
 * @param activeIds - Active ids value.
 * @param depth - Depth value.
 * @returns The nearest active shallower heading.
 */
function findActiveParentId(activeIds: string[], depth: number): string {
    for (let index = depth - 1; index >= 0; index -= 1) {
        if (activeIds[index] !== "") {
            return activeIds[index];
        }
    }
    return "";
}

/**
 * Resolves a source offset to its nearest preceding heading.
 *
 * @param position - Source position.
 * @param sections - Sections value.
 * @returns Resolved source offset to its nearest preceding heading.
 */
function getSourceSectionAtPosition(
    position: number,
    sections: SourceSection[],
): string {
    const section = sections.findLast(
        (candidate) => candidate.start < position,
    );
    return section?.id ?? "0";
}

/**
 * Checks whether an offset is contained by a reference-list body.
 *
 * @param position - Source position.
 * @param containers - Containers value.
 * @returns Whether an offset is contained by a reference-list body.
 */
function isInReferenceContainer(
    position: number,
    containers: ReferenceContainer[],
): boolean {
    return containers.some(
        (container) => position >= container.start && position < container.end,
    );
}

function getDraftTemplateName(entered: string): string {
    if (Object.hasOwn(templateData, entered)) {
        return entered;
    }
    return getEnteredDraftTemplateName(entered);
}

function getEnteredDraftTemplateName(entered: string): string {
    const normalized = normalizeTemplateName(entered);
    if (isCitationTemplate(entered)) {
        return normalized;
    }
    return isMetadataFreeCitationTemplate(entered)
        ? getCanonicalTemplateName(entered)
        : "cite web";
}

function getTemplateMetadata(name: string) {
    const metadata = Object.hasOwn(templateData, name)
        ? templateData[name]
        : undefined;
    if (metadata != null) {
        return metadata;
    }
    if (isCitePrefixedTemplate(name)) {
        return null;
    }
    return templateData["cite web"];
}

function seedMainRows(
    entered: SourceDraftRow[],
    template: string,
): SourceDraftRow[] {
    const byName = new Map<string, SourceDraftRow[]>();
    for (const row of entered) {
        const name = row.name.toLocaleLowerCase("en-US");
        const matches = byName.get(name) ?? [];
        matches.push(row);
        byName.set(name, matches);
    }
    const used = new Set<SourceDraftRow>();
    const profile = SOURCE_FIELD_PROFILES[template] ?? DEFAULT_SOURCE_FIELDS;
    const supported = getSupportedDraftFieldNames(template);
    const mainFields = profile.filter((name) => supported.has(name));
    const main = mainFields.flatMap(function getMainRows(name) {
        return seedMainField(name, byName, used);
    });
    const extras = entered.filter(function isRemainingRow(row) {
        return !used.has(row);
    });
    return sortSourceDraftRows([...main, ...extras], template);
}

/**
 * Adds empty fields without changing entered order or spelling.
 *
 * @param entered - Entered value.
 * @param template - Template wikitext.
 * @returns Resulting values.
 */
function seedMainRowsPreservingOrder(
    entered: SourceDraftRow[],
    template: string,
): SourceDraftRow[] {
    const metadata = getTemplateMetadata(template);
    if (metadata == null) {
        return entered;
    }
    const profile = SOURCE_FIELD_PROFILES[template] ?? DEFAULT_SOURCE_FIELDS;
    const supported = getSupportedDraftFieldNames(template);
    const mainFields = profile.filter((name) => supported.has(name));
    const canonicalNames = new Set<string>();
    const rows = entered.map(function markEnteredMain(row) {
        const canonical = canonicalizeCitation(
            {
                name: template,
                params: [{ name: row.name, value: "__draft_seed__" }],
            },
            metadata,
        ).params[0]?.name;
        const profileName =
            getDraftAuthorSlot(row.name) === 1 ? "author" : canonical;
        if (profileName != null) {
            canonicalNames.add(profileName);
        }
        return {
            ...row,
            main: profileName != null && mainFields.includes(profileName),
        };
    });
    const missing = mainFields
        .filter((name) => !canonicalNames.has(name))
        .map((name) => buildDraftRow(name, "", true));
    return [...rows, ...missing];
}

/**
 * Sorts rows by canonical TemplateData parameter order.
 *
 * @param rows - Rows value.
 * @param template - Template wikitext.
 * @returns Sorted rows by canonical TemplateData parameter order.
 */
function sortSourceDraftRows(
    rows: SourceDraftRow[],
    template: string,
): SourceDraftRow[] {
    const metadata = getTemplateMetadata(template);
    if (metadata == null) {
        return rows;
    }
    const order = new Map(
        metadata.paramOrder.map((name, index) => [name, index] as const),
    );
    const ranked = rows.map(function addRank(row, index) {
        const canonical = canonicalizeCitation(
            {
                name: template,
                params: [{ name: row.name, value: "__draft_order__" }],
            },
            metadata,
        );
        const name = canonical.params[0]?.name ?? row.name;
        const authorOrder = getDraftAuthorParamOrder(name);
        const standardOrder = order.get(name);
        const relatedTitleOrder = getRelatedTitleParamOrder(name, order);
        const rank =
            authorOrder ??
            (standardOrder == null
                ? (relatedTitleOrder ?? Number.MAX_SAFE_INTEGER)
                : 1_000 + standardOrder);
        return { index, rank, row };
    });
    ranked.sort(
        (left, right) => left.rank - right.rank || left.index - right.index,
    );
    return ranked.map((entry) => entry.row);
}

/**
 * Keeps script-title beside title despite TemplateData order.
 *
 * @param name - Name to process.
 * @param order - Order value.
 * @returns Operation result.
 */
function getRelatedTitleParamOrder(
    name: string,
    order: Map<string, number>,
): number | null {
    const titleOrder = order.get("title");
    return name === "script-title" && titleOrder != null
        ? 1_000 + titleOrder + 0.5
        : null;
}

/**
 * Keeps author/interviewee slots together before other rows.
 *
 * @param name - Name to process.
 * @returns Operation result.
 */
function getDraftAuthorParamOrder(name: string): number | null {
    const match = name.match(/^(last|first|author-link)(\d*)$/u);
    if (match == null) {
        return null;
    }
    const authorIndex = Number(match[2] || "1");
    const fieldIndex = ["last", "first", "author-link"].indexOf(match[1]);
    return (authorIndex - 1) * 3 + fieldIndex;
}

/**
 * Lists canonical and alias parameter names supported by one template.
 *
 * @param template - Template wikitext.
 * @returns Value.
 */
function getSupportedDraftFieldNames(template: string): Set<string> {
    const metadata = getTemplateMetadata(template);
    if (metadata == null) {
        return new Set();
    }
    const names = new Set(metadata.paramOrder);
    for (const [canonical, aliases] of Object.entries(metadata.aliases)) {
        names.add(canonical);
        for (const alias of aliases) {
            names.add(alias);
        }
    }
    return new Set([...names].map((name) => name.toLocaleLowerCase("en-US")));
}

/**
 * Seeds one main field, including a structured first author.
 *
 * @param name - Name to process.
 * @param byName - By name value.
 * @param used - Used value.
 * @returns Resulting values.
 */
function seedMainField(
    name: string,
    byName: Map<string, SourceDraftRow[]>,
    used: Set<SourceDraftRow>,
): SourceDraftRow[] {
    const entered =
        name === "author"
            ? takeFirstAuthorRows(byName)
            : takeDraftRows(byName, name, 1);
    if (entered.length === 0) {
        return [buildDraftRow(name, "", true)];
    }
    for (const row of entered) {
        used.add(row);
    }
    return entered.map(function markMain(row) {
        return { ...row, main: true };
    });
}

/**
 * Takes an unstructured or structured first-author group.
 *
 * @param byName - By name value.
 * @returns Resulting values.
 */
function takeFirstAuthorRows(
    byName: Map<string, SourceDraftRow[]>,
): SourceDraftRow[] {
    const unstructured =
        takeDraftRows(byName, "author", 1)[0] ??
        takeDraftRows(byName, "author1", 1)[0];
    if (unstructured != null) {
        return [unstructured];
    }
    const last =
        takeDraftRows(byName, "last", 1)[0] ??
        takeDraftRows(byName, "last1", 1)[0];
    if (last == null) {
        return [];
    }
    const suffix = last.name.toLocaleLowerCase("en-US") === "last1" ? "1" : "";
    const first = takeDraftRows(byName, `first${suffix}`, 1)[0];
    return first == null ? [last] : [last, first];
}

/**
 * Takes entered rows for one normalized parameter name.
 *
 * @param byName - By name value.
 * @param name - Name to process.
 * @param count - Count value.
 * @returns Resulting values.
 */
function takeDraftRows(
    byName: Map<string, SourceDraftRow[]>,
    name: string,
    count: number,
): SourceDraftRow[] {
    const rows = byName.get(name) ?? [];
    return rows.splice(0, count);
}

function hasDraftRowContent(row: SourceDraftRow): boolean {
    return [row.value, row.alias, row.directive].some(
        function hasValue(value) {
            return value.trim() !== "";
        },
    );
}

/**
 * Moves one periodical/container value to the destination's main field.
 *
 * @param rows - Rows value.
 * @param template - Template wikitext.
 */
function migrateSourceContainer(
    rows: SourceDraftRow[],
    template: string,
): void {
    const populated = rows.filter(function isPopulatedContainer(row) {
        const name = row.name.toLocaleLowerCase("en-US");
        return SOURCE_CONTAINER_FIELDS.has(name) && hasDraftRowContent(row);
    });
    if (populated.length !== 1) {
        return;
    }
    const target = SOURCE_CONTAINER_FIELD_BY_TEMPLATE[template];
    if (target == null) {
        return;
    }
    populated[0].name = target;
}

/**
 * Prevents alias-equivalent populated rows from silently overwriting.
 *
 * @param template - Template wikitext.
 * @param params - Params value.
 */
function assertUniqueCanonicalParams(
    template: string,
    params: CitationParam[],
): void {
    const metadata = getTemplateMetadata(template);
    if (metadata == null) {
        return;
    }
    const byName = new Map<string, string>();
    for (const param of params) {
        const canonical = canonicalizeCitation(
            { name: template, params: [param] },
            metadata,
        );
        const name = canonical.params[0]?.name ?? param.name;
        const existing = byName.get(name);
        if (existing != null) {
            throw new SourceParameterCollisionError(
                existing,
                param.name,
                name,
            );
        }
        byName.set(name, param.name);
    }
}

function buildDraftRow(
    name: string,
    enteredValue: string,
    main: boolean,
    positionalIndex?: number,
    parseAlias: boolean = true,
): SourceDraftRow {
    const comment = parseAlias
        ? extractAliasComment(enteredValue)
        : { alias: "", directive: "", value: enteredValue };
    const row: SourceDraftRow = {
        alias: comment.alias,
        directive: comment.directive,
        main,
        name,
        value: comment.value,
    };
    if (positionalIndex != null) {
        row.positionalIndex = positionalIndex;
    }
    return row;
}

function extractAliasComment(value: string): {
    alias: string;
    directive: string;
    value: string;
} {
    const pattern = /\s*<!--\s*((?:(?!-->)[\s\S])*?)\s*-->\s*$/u;
    const match = value.match(pattern);
    if (match == null) {
        return { alias: "", directive: "", value };
    }
    const withoutComment = value.slice(0, match.index).trim();
    if (!match[1].includes("#")) {
        const directive = match[1].trim();
        return /(?:^|\s)!\S+/u.test(directive)
            ? { alias: "", directive, value: withoutComment }
            : { alias: "", directive: "", value };
    }
    const hash = match[1].indexOf("#");
    const directive = match[1].slice(0, hash).trim();
    const alias = match[1].slice(hash + 1).trim();
    return { alias, directive, value: withoutComment };
}

function buildDraftParams(
    rows: SourceDraftRow[],
    preservePositionals: boolean,
): CitationParam[] {
    let nextPositionalIndex = 1;
    return rows.map(function buildParam(row) {
        const positional =
            preservePositionals &&
            row.positionalIndex === nextPositionalIndex &&
            row.name.trim() === String(row.positionalIndex) &&
            wikitext(row.value).split("=").length === 1;
        if (positional) {
            nextPositionalIndex += 1;
        }
        return buildDraftParam(row, positional);
    });
}

function buildDraftParam(
    row: SourceDraftRow,
    positional: boolean = false,
): CitationParam {
    const name = row.name.trim();
    if (positional) {
        return { name, positional: true, value: row.value };
    }
    const enteredValue = row.value.trim();
    const value =
        enteredValue === ""
            ? ""
            : addAliasComment(enteredValue, row.alias, row.directive);
    return { name, value };
}

function addAliasComment(
    value: string,
    enteredAlias: string,
    enteredDirective: string,
): string {
    const alias = enteredAlias.trim();
    const directive = enteredDirective.trim();
    if (alias === "" && directive === "") {
        return value;
    }
    const space = directive === "" ? "" : " ";
    const hash = alias === "" ? "" : `${space}# ${alias}`;
    return `${value} <!-- ${directive}${hash} -->`.trim();
}

/**
 * Restores template text after scanning a protected-range mask.
 *
 * @param text - Text to process.
 * @param masked - Masked value.
 * @returns Resulting values.
 */
function findRestoredTemplateCalls(text: string, masked: string) {
    return wikitext(masked)
        .templates.getAll()
        .map(function restoreCall(call) {
            const raw = text.slice(call.start, call.end);
            return wikitext(raw).templates.parser(call.start);
        });
}

/**
 * Adds citation definitions written as native full ref tags.
 *
 * @param sources - Sources value.
 * @param text - Text to process.
 * @param masked - Masked value.
 * @param calls - Calls value.
 * @param containers - Containers value.
 */
function addNativeRefSources(
    sources: Map<number, ExistingSource>,
    text: string,
    masked: string,
    calls: ParsedTemplateCall[],
    containers: ReferenceContainer[],
): void {
    const tags = wikitext(masked)
        .reference.getAll()
        .filter((tag) => !tag.selfClosing);
    for (const tag of tags) {
        const openingEnd = masked.indexOf(">", tag.start) + 1;
        const closingLength = tag.raw.match(/<\/ref\s*>$/iu)?.[0].length ?? 0;
        const contentEnd = tag.end - closingLength;
        const enteredGroup = tag.attributes.group || "";
        const group =
            enteredGroup === ""
                ? getContainerGroup(tag.start, containers)
                : decodeReferenceAttribute(enteredGroup);
        const reference = {
            end: tag.end,
            group,
            name: decodeReferenceAttribute(tag.attributes.name || ""),
            raw: text.slice(tag.start, tag.end),
            start: tag.start,
        };
        const nested = calls.filter(
            (call) => call.start >= openingEnd && call.end <= contentEnd,
        );
        const added = addReferenceCitationSources(sources, reference, nested);
        if (!added) {
            sources.set(
                reference.start,
                buildNonStandardSource(reference, tag.content),
            );
        }
    }
}

/**
 * Adds citation definitions written with R's ref parameter.
 *
 * @param sources - Sources value.
 * @param calls - Calls value.
 * @param containers - Containers value.
 */
function addCompactDefinitionSources(
    sources: Map<number, ExistingSource>,
    calls: ParsedTemplateCall[],
    containers: ReferenceContainer[],
): void {
    for (const call of calls) {
        const definition = parseCompactDefinition(call, containers);
        if (definition == null) {
            continue;
        }
        const nested = calls.filter(
            (candidate) =>
                candidate.start > call.start &&
                candidate.end < call.end &&
                definition.content.includes(candidate.raw),
        );
        const added = addReferenceCitationSources(
            sources,
            definition.reference,
            nested,
        );
        if (!added) {
            sources.set(
                definition.reference.start,
                buildNonStandardSource(
                    definition.reference,
                    definition.content,
                ),
            );
        }
    }
}

/**
 * Adds bibliography citations actively referenced by {{sfn}}.
 *
 * @param sources - Sources value.
 * @param text - Text to process.
 * @param calls - Calls value.
 */
function addShortFootnoteSources(
    sources: Map<number, ExistingSource>,
    text: string,
    calls: ParsedTemplateCall[],
): void {
    const callsByStart = new Map(calls.map((call) => [call.start, call]));
    for (const definition of findShortFootnoteCitations(text)) {
        const call = callsByStart.get(definition.start);
        if (call == null || sources.has(call.start)) {
            continue;
        }
        const draft = parseSourceDraft(call.raw);
        const title = getExistingSourceTitle(draft);
        sources.set(call.start, {
            archiveUrl: getDraftValue(draft, "archive-url"),
            draft,
            group: "",
            id: `sfn:${call.start}`,
            rawReference: definition.reuseText,
            rawTemplate: call.raw,
            referenceEnd: call.end,
            referenceKind: "short-footnote",
            referenceName: definition.reuseText,
            referenceStart: call.start,
            reuseText: definition.reuseText,
            sectionIds: [],
            status: "standard",
            templateEnd: call.end,
            templateStart: call.start,
            title: title.text,
            titleLanguage: title.language,
            url: getDraftValue(draft, "url"),
            usePositions: definition.usePositions,
            usageCount: 0,
        });
    }
}

/**
 * Parses an R call carrying a full reference definition.
 *
 * @param call - Call value.
 * @param containers - Containers value.
 * @returns Parsed R call carrying a full reference definition.
 */
function parseCompactDefinition(
    call: ParsedTemplateCall,
    containers: ReferenceContainer[],
): { content: string; reference: SourceReference } | null {
    if (normalizeTemplateName(call.name) !== "r") {
        return null;
    }
    const named = new Map<string, string>();
    const positional: string[] = [];
    for (const param of call.params) {
        if (param.positional) {
            positional.push(param.value);
        } else {
            named.set(param.name.toLocaleLowerCase("en-US"), param.value);
        }
    }
    const content = named.get("ref") ?? named.get("r");
    if (content == null) {
        return null;
    }
    const enteredName = named.get("name") ?? named.get("n") ?? positional[0];
    const enteredGroup = named.get("group") ?? named.get("g") ?? "";
    const group =
        enteredGroup === ""
            ? getContainerGroup(call.start, containers)
            : decodeReferenceAttribute(enteredGroup);
    const reference = {
        end: call.end,
        group,
        name: decodeReferenceAttribute(
            stripOptionalReferenceNameQuotes(enteredName || ""),
        ),
        raw: call.raw,
        start: call.start,
    };
    return { content, reference };
}

/**
 * Adds editable citation calls within one reference definition.
 *
 * @param sources - Sources value.
 * @param reference - Reference wikitext.
 * @param calls - Calls value.
 * @returns Whether the condition is met.
 */
function addReferenceCitationSources(
    sources: Map<number, ExistingSource>,
    reference: SourceReference,
    calls: ParsedTemplateCall[],
): boolean {
    let added = false;
    for (const call of calls) {
        if (
            isEditableCitationTemplate(call.name) &&
            !sources.has(call.start)
        ) {
            sources.set(call.start, buildExistingSource(reference, call));
            added = true;
        }
    }
    return added;
}

/**
 * Builds source data from a reference and one contained citation.
 *
 * @param reference - Reference wikitext.
 * @param call - Call value.
 * @returns Source data from a ref and one contained citation.
 */
function buildExistingSource(
    reference: SourceReference,
    call: ParsedTemplateCall,
): ExistingSource {
    const draft = parseSourceDraft(call.raw);
    const title = getExistingSourceTitle(draft);
    const status = isCitationTemplate(call.name)
        ? ("standard" as const)
        : ("metadata-free" as const);
    const partial = {
        archiveUrl: getDraftValue(draft, "archive-url"),
        draft,
        group: reference.group,
        id: `${reference.start}:${call.start}`,
        rawReference: reference.raw,
        rawTemplate: call.raw,
        referenceEnd: reference.end,
        referenceKind: "reference" as const,
        referenceName: reference.name,
        referenceStart: reference.start,
        sectionIds: [],
        status,
        templateEnd: call.end,
        templateStart: call.start,
        title: title.text,
        titleLanguage: title.language,
        url: getDraftValue(draft, "url"),
        usageCount: 0,
    };
    return { ...partial, reuseText: buildExistingSourceReference(partial) };
}

/**
 * Builds a list row for a plain or unsupported reference.
 *
 * @param reference - Reference wikitext.
 * @param content - Content value.
 * @returns Built list row for a plain or unsupported reference.
 */
function buildNonStandardSource(
    reference: SourceReference,
    content: string,
): ExistingSource {
    const draft = createManualSourceDraft("cite web");
    const summary =
        cleanValue(content).replace(/\s+/gu, " ").trim() || "Empty reference";
    const partial = {
        archiveUrl: "",
        draft,
        group: reference.group,
        id: `${reference.start}:non-standard`,
        rawReference: reference.raw,
        rawTemplate: reference.raw,
        referenceEnd: reference.end,
        referenceKind: "reference" as const,
        referenceName: reference.name,
        referenceStart: reference.start,
        sectionIds: [],
        status: "non-standard" as const,
        templateEnd: reference.end,
        templateStart: reference.start,
        title: summary,
        titleLanguage: "",
        url: "",
        usageCount: 0,
    };
    return { ...partial, reuseText: buildExistingSourceReference(partial) };
}

/**
 * Gets a normal title or a language-aware script-title fallback.
 *
 * @param draft - Source draft to process.
 * @returns Operation result.
 */
function getExistingSourceTitle(draft: SourceDraft): {
    language: string;
    text: string;
} {
    const title = getDraftValue(draft, "title");
    if (title !== "") {
        return { language: "", text: title };
    }
    const scriptTitle = getDraftValue(draft, "script-title");
    const pattern = /^([a-z]{2,3}(?:-[a-z0-9]+)*):(.*)$/isu;
    const prefixed = scriptTitle.match(pattern);
    return prefixed == null
        ? { language: "", text: scriptTitle }
        : { language: prefixed[1], text: prefixed[2].trimStart() };
}

/**
 * Finds native references-list container ranges and their groups.
 *
 * @param text - Text to process.
 * @param calls - Calls value.
 * @returns Native references-list container ranges and their groups.
 */
function findReferenceContainers(
    text: string,
    calls: ParsedTemplateCall[],
): ReferenceContainer[] {
    const result: ReferenceContainer[] = [];
    for (const tag of wikitext(text).tags.getAll("references")) {
        if (tag.selfClosing || !tag.closed) {
            continue;
        }
        result.push({
            end: tag.end,
            group: decodeReferenceAttribute(tag.attributes.group || ""),
            start: tag.start,
        });
    }
    for (const call of calls) {
        if (normalizeTemplateName(call.name) !== "reflist") {
            continue;
        }
        const container = buildReflistContainer(call);
        if (container != null) {
            result.push(container);
        }
    }
    return result;
}

/**
 * Builds the range of a Reflist refs/list parameter.
 *
 * @param call - Call value.
 * @returns Built the range of a Reflist refs/list parameter.
 */
function buildReflistContainer(
    call: ParsedTemplateCall,
): ReferenceContainer | null {
    const list = call.params.find(function isListParam(param) {
        const name = param.name.toLocaleLowerCase("en-US");
        return !param.positional && ["list", "refs"].includes(name);
    });
    if (list == null || list.value === "") {
        return null;
    }
    const group = call.params.find(
        (param) =>
            !param.positional &&
            param.name.toLocaleLowerCase("en-US") === "group",
    );
    const valueOffset = call.raw.indexOf(list.value);
    const start = call.start + valueOffset;
    return {
        end: start + list.value.length,
        group: decodeReferenceAttribute(group?.value || ""),
        start,
    };
}

/**
 * Gets the group inherited from the enclosing references container.
 *
 * @param index - Source index.
 * @param containers - Containers value.
 * @returns Resulting text.
 */
function getContainerGroup(
    index: number,
    containers: ReferenceContainer[],
): string {
    const container = containers.find(
        (candidate) => index >= candidate.start && index < candidate.end,
    );
    return container?.group || "";
}

function getDraftValue(draft: SourceDraft, name: string): string {
    return getDraftRow(draft, name)?.value || "";
}

function getDraftRow(
    draft: SourceDraft,
    name: string,
): SourceDraftRow | undefined {
    const normalized = name.toLocaleLowerCase("en-US");
    return draft.rows.find(function hasName(candidate) {
        return candidate.name.toLocaleLowerCase("en-US") === normalized;
    });
}

function buildComparableUrls(value: string): Set<string> {
    const parsed = parseSourceUrl(value);
    if (parsed == null) {
        return new Set();
    }
    const values = [parsed.originalUrl, parsed.archiveUrl].filter(Boolean);
    return new Set(values.map(normalizeSourceUrl));
}

function buildSourceComparableUrls(source: ExistingSource): Set<string> {
    const values = [source.url, source.archiveUrl];
    const result = new Set<string>();
    for (const value of values) {
        for (const normalized of buildComparableUrls(value)) {
            result.add(normalized);
        }
    }
    return result;
}

function setsIntersect(left: Set<string>, right: Set<string>): boolean {
    return [...left].some((value) => right.has(value));
}

/**
 * Escapes a source-manager name using its historical entity policy.
 *
 * @param value - Value to process.
 * @returns Escaped name using the historical entity policy.
 */
function escapeSourceReferenceName(value: string): string {
    return escapeReferenceName(value, { caseInsensitiveAmpEntity: true });
}
