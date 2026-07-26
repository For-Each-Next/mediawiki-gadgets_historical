/**
 * Source parsing, matching, editing, and serialization.
 */

import {
    appendCitationLocator,
    canonicalizeCitation,
    cleanValue,
    formatBlockCitation,
    formatInlineCitation,
    getCitationIdentity,
    getCitationNameContributors,
} from "./citation.ts";
import templateData from "./data/index.ts";
import { getCitationOutputParams } from "./post-formatter.ts";
import { getSourceDraftErrors } from "./source-validation.ts";
import { isCitationTemplate, normalizeTemplateName } from "./templates.ts";
import type {
    CitationLayout,
    CitationParam,
    CitationTemplate,
} from "./types.ts";
import {
    applyReplacements,
    findRefTags,
    findTemplateCalls,
    parseTagAttributes,
    parseTemplateCall,
    splitTopLevel,
} from "./wikitext.ts";

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
const SOURCE_SEARCH_ORGANIZATION_PARAMETERS = new Set([
    "agency",
    "broadcaster",
    "department",
    "institution",
    "journal",
    "magazine",
    "network",
    "newspaper",
    "periodical",
    "platform",
    "publisher",
    "website",
    "work",
]);
const UNUSED_SOURCE_SECTION_ID = "unused";

export interface ParsedSourceUrl {
    archiveDate: string;
    archiveUrl: string;
    originalUrl: string;
}

export interface ParsedSourceInput extends ParsedSourceUrl {
    search: string;
}

export interface SourceDraftRow {
    alias: string;
    directive: string;
    main: boolean;
    name: string;
    value: string;
}

export interface SourceDraft {
    rows: SourceDraftRow[];
    template: string;
}

export type SourceDraftCitationNameCell = "alias" | "value";
export type ExistingSourceStatus = "error" | "non-standard" | "standard";

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
    usageCount: number;
}

export interface SourceSection {
    depth: number;
    id: string;
    label: string;
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

/** Returns whether a parameter is an unstructured author slot. */
export function isAuthorDraftParameter(name: string): boolean {
    return parseDraftAuthorParameter(name) != null;
}

/** Returns whether a parameter is a structured last-name slot. */
export function isLastAuthorDraftParameter(name: string): boolean {
    return parseStructuredAuthorParameter(name)?.field === "last";
}

/** Checks whether an author can use separate first and last fields. */
export function canSplitAuthorDraftRow(
    draft: SourceDraft,
    rowIndex: number,
): boolean {
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
 */
export function ensureNextAuthorDraftRows(draft: SourceDraft): void {
    const populated = draft.rows.filter(function isPopulatedAuthor(row) {
        return (
            parseDraftAuthorParameter(row.name) != null &&
            row.value.trim() !== ""
        );
    });
    for (const row of populated) {
        ensureNextAuthorDraftRow(draft, row);
    }
    formatSourceDraftRows(draft);
}

/**
 * Reorders all rows into the standard order for the selected template.
 */
export function formatSourceDraftRows(draft: SourceDraft): void {
    draft.rows = sortSourceDraftRows(draft.rows, draft.template);
}

/**
 * Converts one author value into separate last- and first-name rows.
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

/** Checks whether first/last fields can return to one author field. */
export function canJoinAuthorDraftRow(
    draft: SourceDraft,
    rowIndex: number,
): boolean {
    const row = draft.rows[rowIndex];
    const structured = parseStructuredAuthorParameter(row?.name || "");
    if (structured?.field !== "last") {
        return false;
    }
    const sameSlot = draft.rows.filter(
        function hasSameAuthorSlot(candidate, index) {
            return (
                index !== rowIndex &&
                getDraftAuthorSlot(candidate.name) === structured.index
            );
        },
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

/** Combines separate last and first fields into one author row. */
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

/** Parses an unstructured author parameter and its numeric slot. */
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

/** Parses a structured first- or last-name parameter. */
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

/** Splits `Last, First` or a space-delimited `First Last` name. */
function splitDraftAuthorValue(
    value: string,
): { first: string; last: string } | null {
    const parts = splitTopLevel(value, ",");
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

/** Joins structured name values in an unambiguous display order. */
function joinDraftAuthorValue(lastValue: string, firstValue: string): string {
    const last = lastValue.trim();
    const first = firstValue.trim();
    if (last === "" || first === "") {
        return last || first;
    }
    return `${last}, ${first}`;
}

/** Adds a blank author row after one populated author slot. */
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

/** Gets the slot used by any supported author-name parameter. */
function getDraftAuthorSlot(name: string): number | null {
    const author = parseDraftAuthorParameter(name);
    if (author != null) {
        return author.index;
    }
    return parseStructuredAuthorParameter(name)?.index ?? null;
}

/** Parses a normal HTTP URL or an Internet Archive playback URL. */
export function parseSourceUrl(value: string): ParsedSourceUrl | null {
    const clean = decodeUrlEntities(value.trim());
    const parsed = parseHttpUrl(clean);
    if (parsed == null) {
        return null;
    }
    const wayback = parseWaybackUrl(parsed);
    if (wayback != null) {
        return wayback;
    }
    return {
        archiveDate: "",
        archiveUrl: "",
        originalUrl: sanitizeParsedUrl(parsed),
    };
}

/**
 * Parses a Citoid lookup while retaining URL-specific archive data.
 */
export function parseSourceInput(value: string): ParsedSourceInput | null {
    const search = value.trim();
    if (search === "") {
        return null;
    }
    const parsedUrl = parseSourceUrl(search);
    return {
        archiveDate: parsedUrl?.archiveDate ?? "",
        archiveUrl: parsedUrl?.archiveUrl ?? "",
        originalUrl: parsedUrl?.originalUrl ?? "",
        search: parsedUrl?.originalUrl ?? search,
    };
}

/** Returns a deterministic source URL used only for matching. */
export function normalizeSourceUrl(value: string): string {
    const clean = cleanValue(decodeUrlEntities(value));
    const parsed = parseHttpUrl(clean);
    if (parsed == null) {
        return clean.replace(/#.*$/u, "");
    }
    parsed.hash = "";
    return sanitizeParsedUrl(parsed);
}

/**
 * Finds previously used aliases for a matching creator display value.
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
            if (
                !isCreatorAliasDraftParameter(candidate.name) ||
                normalizeCreatorAliasValue(candidate.value) !== displayValue
            ) {
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
 * Returns whether a draft field contains a creator display or
 * family name.
 */
export function isCreatorAliasDraftParameter(name: string): boolean {
    const normalized = name.trim().toLocaleLowerCase("en-US");
    return CREATOR_ALIAS_PARAMETER_PATTERNS.some((pattern) =>
        pattern.test(normalized),
    );
}

/** Converts a generated or existing citation to editable rows. */
export function parseSourceDraft(raw: string): SourceDraft {
    const call = parseTemplateCall(raw);
    const name = getDraftTemplateName(call.name);
    const metadata = getTemplateMetadata(name);
    const params = call.params.map(function toCitationParam(param) {
        return { name: param.name, value: param.value };
    });
    const canonical = canonicalizeCitation({ name, params }, metadata);
    const outputParams = getCitationOutputParams(canonical, true);
    const enteredRows = outputParams.map(function toDraftRow(param) {
        return buildDraftRow(param.name, param.value, false);
    });
    return { rows: seedMainRows(enteredRows, name), template: name };
}

/** Creates an empty, offline-friendly source draft. */
export function createManualSourceDraft(
    template: string = "cite magazine",
): SourceDraft {
    const name = getDraftTemplateName(template);
    return { rows: seedMainRows([], name), template: name };
}

/**
 * Changes a draft template while retaining entered and custom fields.
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
    return { rows: seedMainRows(rows, name), template: name };
}

/** Serializes populated rows in the selected citation layout. */
export function serializeSourceDraft(
    draft: SourceDraft,
    layout: CitationLayout = "block",
): string {
    const citation = buildDraftCitation(draft);
    return layout === "inline"
        ? formatInlineCitation(citation)
        : formatBlockCitation(citation);
}

/**
 * Serializes rows without canonicalizing entered parameter aliases.
 */
export function serializeSourceDraftPreservingNames(
    draft: SourceDraft,
    layout: CitationLayout = "block",
): string {
    const name = getDraftTemplateName(draft.template);
    const params = draft.rows
        .filter((row) => row.name.trim() !== "")
        .filter(hasDraftRowContent)
        .map(buildDraftParam);
    assertUniqueCanonicalParams(name, params);
    const citation = { name, params };
    return layout === "inline"
        ? formatInlineCitation(citation)
        : formatBlockCitation(citation);
}

/** Builds the immediate reference-name preview for a source draft. */
export function getSourceDraftCitationName(draft: SourceDraft): string {
    const identity = getCitationIdentity(buildDraftCitation(draft));
    return appendCitationLocator(identity.baseName, identity.locator);
}

/** Lists canonical names offered by the parameter combobox. */
export function listSourceDraftParameterNames(draft: SourceDraft): string[] {
    return [...getTemplateMetadata(draft.template).paramOrder];
}

/**
 * Moves a foreign title with one language into its script field.
 */
export function moveSourceDraftTitleToScriptTitle(
    draft: SourceDraft,
    wikiId: string,
): boolean {
    const language = getDraftValue(draft, "language").trim();
    const codePattern = /^[a-z]{2,3}(?:-[a-z0-9]+)*$/iu;
    const localLanguage = getCitationWikiLanguage(wikiId);
    if (
        !codePattern.test(language) ||
        (localLanguage !== "" &&
            language.toLocaleLowerCase("en-US").startsWith(localLanguage))
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
    target.value = `${language.toLocaleLowerCase("en-US")}:${titleValue}`;
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

/** Gets the local language whose titles stay in the normal field. */
function getCitationWikiLanguage(wikiId: string): string {
    return (
        {
            enwiki: "en",
            zhwiki: "zh",
        }[wikiId] ?? ""
    );
}

/** Moves eligible titles before formatting all article citations. */
export function moveSourceTitlesToScriptTitle(
    text: string,
    wikiId: string,
): { moved: number; text: string } {
    const replacements = [];
    const protectedRanges = findProtectedRanges(text);
    let moved = 0;
    for (const call of findTemplateCalls(text)) {
        const nestedReplacement = replacements.some(
            (replacement) =>
                call.start >= replacement.start && call.end <= replacement.end,
        );
        if (
            !isCitationTemplate(call.name) ||
            isInRanges(call.start, protectedRanges) ||
            nestedReplacement
        ) {
            continue;
        }
        const draft = parseSourceDraft(call.raw);
        if (!moveSourceDraftTitleToScriptTitle(draft, wikiId)) {
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

/** Canonicalizes the populated rows of one editable source draft. */
function buildDraftCitation(draft: SourceDraft): CitationTemplate {
    const name = getDraftTemplateName(draft.template);
    const params = draft.rows
        .filter((row) => row.name.trim() !== "")
        .filter(hasDraftRowContent)
        .map(buildDraftParam);
    assertUniqueCanonicalParams(name, params);
    return canonicalizeCitation({ name, params }, getTemplateMetadata(name));
}

/**
 * Finds draft rows that actively supply the visible generated ref name.
 */
export function getSourceDraftCitationNameRows(
    draft: SourceDraft,
): Set<number> {
    return new Set(getSourceDraftCitationNameCells(draft).keys());
}

/**
 * Finds the exact value or alias cells supplying the visible ref name.
 */
export function getSourceDraftCitationNameCells(
    draft: SourceDraft,
): Map<number, SourceDraftCitationNameCell> {
    const name = getDraftTemplateName(draft.template);
    const metadata = getTemplateMetadata(name);
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

/** Lists citation definitions contained in active full ref tags. */
export function listExistingSources(
    text: string,
    wikiId: string = "",
): ExistingSource[] {
    const protectedRanges = findProtectedRanges(text);
    const masked = maskProtectedRanges(text, protectedRanges);
    const calls = findRestoredTemplateCalls(text, masked);
    const containers = findReferenceContainers(masked, calls);
    const sources = new Map<number, ExistingSource>();
    addNativeRefSources(sources, text, masked, calls, containers, wikiId);
    addCompactDefinitionSources(sources, calls, containers, wikiId);
    const result = [...sources.values()];
    assignExistingSourceSections(result, masked, calls, containers);
    return result.sort(
        (left, right) => left.templateStart - right.templateStart,
    );
}

/**
 * Lists article sections containing at least one existing source.
 */
export function listExistingSourceSections(
    text: string,
    sources: ExistingSource[],
): SourceSection[] {
    const ranges = findProtectedRanges(text);
    const masked = maskProtectedRanges(text, ranges);
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
            label: "Unused references",
            parentId: "",
            start: Number.MAX_SAFE_INTEGER,
            title: "Unused references",
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
    status: ExistingSourceStatus | "all" = "all",
): ExistingSource[] {
    const matchingStatus =
        status === "all"
            ? sources
            : sources.filter((source) => source.status === status);
    const inSection =
        sectionId === ""
            ? matchingStatus
            : matchingStatus.filter(function matchesSection(source) {
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

/** Checks an alias token against a bounded edit distance. */
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

/** Computes edit distance, stopping after the limit. */
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

/** Lists author and publication names for source searching. */
export function listExistingSourceSearchSuggestions(
    sources: ExistingSource[],
): string[] {
    const counts = new Map<string, number>();
    for (const source of sources) {
        const sourceValues = new Set<string>();
        for (const row of source.draft.rows) {
            const name = row.name.trim().toLocaleLowerCase("en-US");
            if (
                !isCreatorAliasDraftParameter(name) &&
                !SOURCE_SEARCH_ORGANIZATION_PARAMETERS.has(name)
            ) {
                continue;
            }
            const display = cleanValue(row.alias || row.value);
            if (display !== "") {
                sourceValues.add(display);
            }
        }
        for (const display of sourceValues) {
            counts.set(display, (counts.get(display) ?? 0) + 1);
        }
    }
    return [...counts.keys()].sort(function sortSuggestions(left, right) {
        const countDifference =
            (counts.get(right) ?? 0) - (counts.get(left) ?? 0);
        return (
            countDifference ||
            left.localeCompare(right, undefined, { sensitivity: "base" })
        );
    });
}

/** Checks source use in a selected section or descendant. */
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

/** Finds citations matching an original or archive URL. */
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
 * Finds the most reusable citation matching an original or archive URL.
 */
export function findExistingSource(
    text: string,
    enteredUrl: string,
): ExistingSource | null {
    const matches = findExistingSources(text, enteredUrl);
    const ungrouped = matches.find(
        (source) => source.referenceName !== "" && source.group === "",
    );
    const named = matches.find((source) => source.referenceName !== "");
    return ungrouped ?? named ?? matches[0] ?? null;
}

/** Builds a reuse tag when named, otherwise returns the full ref. */
export function buildExistingSourceReference(
    source: Pick<ExistingSource, "group" | "rawReference" | "referenceName">,
    compact: boolean = false,
): string {
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
    const name = escapeRefName(source.referenceName);
    const group = buildGroupAttribute(source.group);
    return `<ref name="${name}"${group} />`;
}

/** Replaces a source template at its recorded range. */
export function replaceExistingSource(
    text: string,
    source: ExistingSource,
    draft: SourceDraft,
    layout: CitationLayout = "block",
): string {
    const current = text.slice(source.templateStart, source.templateEnd);
    if (current !== source.rawTemplate) {
        throw new Error("The source changed after it was opened.");
    }
    const citation = serializeSourceDraft(draft, layout);
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

/** Converts unsupported content into a native citation reference. */
function buildConvertedReference(
    source: ExistingSource,
    citation: string,
): string {
    const name =
        source.referenceName === ""
            ? ""
            : ` name="${escapeRefName(source.referenceName)}"`;
    const group = buildGroupAttribute(source.group);
    return `<ref${name}${group}>${citation}</ref>`;
}

/** Builds searchable text from visible and editable source details. */
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

/** Normalizes a creator display value for exact suggestion matching. */
function normalizeCreatorAliasValue(value: string): string {
    return cleanValue(value).normalize("NFC").toLocaleLowerCase("en-US");
}

/**
 * Assigns every source to all article sections where its ref is used.
 */
function assignExistingSourceSections(
    sources: ExistingSource[],
    masked: string,
    calls: ReturnType<typeof findTemplateCalls>,
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

/** Builds ref-name/group keys to all prose-use positions. */
function buildReferenceUsageIndex(
    masked: string,
    calls: ReturnType<typeof findTemplateCalls>,
    containers: ReferenceContainer[],
): Map<string, number[]> {
    const result = new Map<string, number[]>();
    for (const tag of findRefTags(masked)) {
        if (isInReferenceContainer(tag.start, containers)) {
            continue;
        }
        const name = decodeAttribute(tag.attributes.name || "");
        const group = decodeAttribute(tag.attributes.group || "");
        addReferenceUsage(result, name, group, tag.start);
    }
    for (const call of calls) {
        addCompactReferenceUsages(result, call, containers);
    }
    return result;
}

/** Adds every name called by one active R template. */
function addCompactReferenceUsages(
    usages: Map<string, number[]>,
    call: ReturnType<typeof findTemplateCalls>[number],
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
    const group = decodeAttribute(named.get("group") ?? named.get("g") ?? "");
    for (const name of names) {
        const cleanName = decodeAttribute(stripOptionalQuotes(name));
        addReferenceUsage(usages, cleanName, group, call.start);
    }
}

/** Adds one nonempty reference use to its name/group index. */
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

/** Gets all known prose positions for one source definition. */
function getExistingSourceUsePositions(
    source: ExistingSource,
    usages: Map<string, number[]>,
    containers: ReferenceContainer[],
): number[] {
    if (source.referenceName !== "") {
        const key = buildReferenceUsageKey(source.referenceName, source.group);
        return usages.get(key) ?? [];
    }
    return isInReferenceContainer(source.referenceStart, containers)
        ? []
        : [source.referenceStart];
}

/** Creates a collision-safe reference name/group lookup key. */
function buildReferenceUsageKey(name: string, group: string): string {
    return `${group}\u0000${name}`;
}

/** Finds numbered active headings plus the article lead. */
function findSourceSections(masked: string): SourceSection[] {
    const result: SourceSection[] = [
        {
            depth: 0,
            id: "0",
            label: "§ 0 Lead",
            parentId: "",
            start: -1,
            title: "Lead",
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
            label: formatSourceSectionLabel(id, title),
            parentId,
            start: match.index,
            title,
        });
    }
    return result;
}

/** Finds the nearest active shallower heading. */
function findActiveParentId(activeIds: string[], depth: number): string {
    for (let index = depth - 1; index >= 0; index -= 1) {
        if (activeIds[index] !== "") {
            return activeIds[index];
        }
    }
    return "";
}

/** Formats the compact label shown in the section selectors. */
function formatSourceSectionLabel(id: string, title: string): string {
    return `§ ${id} ${title}`.trim();
}

/** Resolves a source offset to its nearest preceding heading. */
function getSourceSectionAtPosition(
    position: number,
    sections: SourceSection[],
): string {
    const section = sections.findLast(
        (candidate) => candidate.start < position,
    );
    return section?.id ?? "0";
}

/** Checks whether an offset is contained by a reference-list body. */
function isInReferenceContainer(
    position: number,
    containers: ReferenceContainer[],
): boolean {
    return containers.some(
        (container) => position >= container.start && position < container.end,
    );
}

function parseHttpUrl(value: string): URL | null {
    try {
        const parsed = new URL(value);
        return ["http:", "https:"].includes(parsed.protocol) ? parsed : null;
    } catch {
        return null;
    }
}

function parseWaybackUrl(parsed: URL): ParsedSourceUrl | null {
    if (!isWaybackHost(parsed.hostname)) {
        return null;
    }
    const match = parsed.pathname.match(
        /^\/web\/(\d{4}(?:\d{2}){0,5})(?:[a-z][a-z0-9_-]*)?\/(.+)$/iu,
    );
    if (match == null) {
        return null;
    }
    const original = decodeWaybackTarget(
        `${match[2]}${parsed.search}${parsed.hash}`,
    );
    const originalUrl = parseHttpUrl(original);
    if (originalUrl == null) {
        return null;
    }
    return {
        archiveDate: formatWaybackDate(match[1]),
        archiveUrl: sanitizeParsedUrl(parsed),
        originalUrl: sanitizeParsedUrl(originalUrl),
    };
}

function isWaybackHost(hostname: string): boolean {
    const normalized = hostname.toLocaleLowerCase("en-US");
    return normalized === "archive.org" || normalized.endsWith(".archive.org");
}

function decodeWaybackTarget(value: string): string {
    if (/^https?:\/\//iu.test(value)) {
        return value;
    }
    try {
        return decodeURIComponent(value);
    } catch {
        return value;
    }
}

function formatWaybackDate(timestamp: string): string {
    const match = timestamp.match(/^(\d{4})(\d{2})(\d{2})/u);
    if (match == null || !isCalendarDate(match[1], match[2], match[3])) {
        return "";
    }
    return `${match[1]}-${match[2]}-${match[3]}`;
}

function decodeUrlEntities(value: string): string {
    return value
        .replace(/&amp;/giu, "&")
        .replace(/&#0*38;/giu, "&")
        .replace(/&#x0*26;/giu, "&");
}

/**
 * Encodes template delimiters that URL parsing deliberately preserves.
 */
export function sanitizeSourceUrl(value: string): string {
    const clean = decodeUrlEntities(value.trim());
    const parsed = parseHttpUrl(clean);
    return parsed == null
        ? clean.replace(/\|/gu, "%7C")
        : sanitizeParsedUrl(parsed);
}

function sanitizeParsedUrl(url: URL): string {
    return url.toString().replace(/\|/gu, "%7C");
}

function getDraftTemplateName(entered: string): string {
    const normalized = normalizeTemplateName(entered);
    return isCitationTemplate(normalized) ? normalized : "cite web";
}

function getTemplateMetadata(name: string) {
    return templateData[name] || templateData["cite web"];
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

/** Sorts rows by canonical TemplateData parameter order. */
function sortSourceDraftRows(
    rows: SourceDraftRow[],
    template: string,
): SourceDraftRow[] {
    const metadata = getTemplateMetadata(template);
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

/** Keeps script-title beside title despite TemplateData order. */
function getRelatedTitleParamOrder(
    name: string,
    order: Map<string, number>,
): number | null {
    const titleOrder = order.get("title");
    return name === "script-title" && titleOrder != null
        ? 1_000 + titleOrder + 0.5
        : null;
}

/** Keeps author/interviewee slots together before other rows. */
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
 */
function getSupportedDraftFieldNames(template: string): Set<string> {
    const metadata = getTemplateMetadata(template);
    const names = new Set(metadata.paramOrder);
    for (const [canonical, aliases] of Object.entries(metadata.aliases)) {
        names.add(canonical);
        for (const alias of aliases) {
            names.add(alias);
        }
    }
    return new Set([...names].map((name) => name.toLocaleLowerCase("en-US")));
}

/** Seeds one main field, including a structured first author. */
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

/** Takes an unstructured or structured first-author group. */
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

/** Takes entered rows for one normalized parameter name. */
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
 */
function assertUniqueCanonicalParams(
    template: string,
    params: CitationParam[],
): void {
    const metadata = getTemplateMetadata(template);
    const byName = new Map<string, string>();
    for (const param of params) {
        const canonical = canonicalizeCitation(
            { name: template, params: [param] },
            metadata,
        );
        const name = canonical.params[0]?.name ?? param.name;
        const existing = byName.get(name);
        if (existing != null) {
            throw new Error(
                `${existing} and ${param.name} both map to ${name}. ` +
                    "Remove or rename one parameter.",
            );
        }
        byName.set(name, param.name);
    }
}

function buildDraftRow(
    name: string,
    enteredValue: string,
    main: boolean,
): SourceDraftRow {
    const comment = extractAliasComment(enteredValue);
    return {
        alias: comment.alias,
        directive: comment.directive,
        main,
        name,
        value: comment.value,
    };
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

function buildDraftParam(row: SourceDraftRow): CitationParam {
    const enteredValue = row.value.trim();
    const value =
        enteredValue === ""
            ? ""
            : addAliasComment(enteredValue, row.alias, row.directive);
    return { name: row.name.trim(), value };
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

function findProtectedRanges(text: string): Array<[number, number]> {
    const pattern = new RegExp(
        String.raw`<!--[\s\S]*?-->|` +
            String.raw`<(nowiki|pre|source|syntaxhighlight|math|code|` +
            String.raw`templatedata|templatestyles|graph|timeline|score|` +
            String.raw`mapframe)\b` +
            String.raw`[^>]*>[\s\S]*?<\/\1\s*>`,
        "giu",
    );
    return Array.from(text.matchAll(pattern), function toRange(match) {
        return [match.index, match.index + match[0].length];
    });
}

function isInRanges(index: number, ranges: Array<[number, number]>): boolean {
    return ranges.some(([start, end]) => index >= start && index < end);
}

/** Masks protected regions while preserving source offsets. */
function maskProtectedRanges(
    text: string,
    ranges: Array<[number, number]>,
): string {
    const replacements = ranges.map(function maskRange([start, end]) {
        return { end, start, text: " ".repeat(end - start) };
    });
    return applyReplacements(text, replacements);
}

/** Restores template text after scanning a protected-range mask. */
function findRestoredTemplateCalls(text: string, masked: string) {
    return findTemplateCalls(masked).map(function restoreCall(call) {
        const raw = text.slice(call.start, call.end);
        return parseTemplateCall(raw, call.start);
    });
}

/** Adds citation definitions written as native full ref tags. */
// eslint-disable-next-line max-lines-per-function, max-params
function addNativeRefSources(
    sources: Map<number, ExistingSource>,
    text: string,
    masked: string,
    calls: ReturnType<typeof findTemplateCalls>,
    containers: ReferenceContainer[],
    wikiId: string,
): void {
    const tags = findRefTags(masked).filter((tag) => !tag.selfClosing);
    for (const tag of tags) {
        const openingEnd = masked.indexOf(">", tag.start) + 1;
        const closingLength = tag.raw.match(/<\/ref\s*>$/iu)?.[0].length ?? 0;
        const contentEnd = tag.end - closingLength;
        const enteredGroup = tag.attributes.group || "";
        const group =
            enteredGroup === ""
                ? getContainerGroup(tag.start, containers)
                : decodeAttribute(enteredGroup);
        const reference = {
            end: tag.end,
            group,
            name: decodeAttribute(tag.attributes.name || ""),
            raw: text.slice(tag.start, tag.end),
            start: tag.start,
        };
        const nested = calls.filter(
            (call) => call.start >= openingEnd && call.end <= contentEnd,
        );
        const added = addReferenceCitationSources(
            sources,
            reference,
            nested,
            wikiId,
        );
        if (!added) {
            sources.set(
                reference.start,
                buildNonStandardSource(reference, tag.content),
            );
        }
    }
}

/** Adds citation definitions written with R's ref parameter. */
function addCompactDefinitionSources(
    sources: Map<number, ExistingSource>,
    calls: ReturnType<typeof findTemplateCalls>,
    containers: ReferenceContainer[],
    wikiId: string,
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
            wikiId,
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

/** Parses an R call carrying a full reference definition. */
function parseCompactDefinition(
    call: ReturnType<typeof findTemplateCalls>[number],
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
            : decodeAttribute(enteredGroup);
    const reference = {
        end: call.end,
        group,
        name: decodeAttribute(stripOptionalQuotes(enteredName || "")),
        raw: call.raw,
        start: call.start,
    };
    return { content, reference };
}

/** Adds supported citation calls within one reference definition. */
function addReferenceCitationSources(
    sources: Map<number, ExistingSource>,
    reference: SourceReference,
    calls: ReturnType<typeof findTemplateCalls>,
    wikiId: string,
): boolean {
    let added = false;
    for (const call of calls) {
        if (isCitationTemplate(call.name) && !sources.has(call.start)) {
            sources.set(
                call.start,
                buildExistingSource(reference, call, wikiId),
            );
            added = true;
        }
    }
    return added;
}

/** Builds source data from a reference and one contained citation. */
function buildExistingSource(
    reference: SourceReference,
    call: ReturnType<typeof findTemplateCalls>[number],
    wikiId: string,
): ExistingSource {
    const draft = parseSourceDraft(call.raw);
    const title = getExistingSourceTitle(draft);
    const status: ExistingSourceStatus =
        getSourceDraftErrors(draft, wikiId).size === 0 ? "standard" : "error";
    const partial = {
        archiveUrl: getDraftValue(draft, "archive-url"),
        draft,
        group: reference.group,
        id: `${reference.start}:${call.start}`,
        rawReference: reference.raw,
        rawTemplate: call.raw,
        referenceEnd: reference.end,
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

/** Builds a list row for a plain or unsupported reference. */
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

/** Finds native references-list container ranges and their groups. */
function findReferenceContainers(
    text: string,
    calls: ReturnType<typeof findTemplateCalls>,
): ReferenceContainer[] {
    const result: ReferenceContainer[] = [];
    const opening = /<references\b([^>]*?)(\/?)>/giu;
    for (const match of text.matchAll(opening)) {
        if (match[2] === "/") {
            continue;
        }
        const start = match.index;
        const openingEnd = start + match[0].length;
        const closing = /<\/references\s*>/giu;
        closing.lastIndex = openingEnd;
        const closingMatch = closing.exec(text);
        if (closingMatch == null) {
            continue;
        }
        const attributes = parseTagAttributes(match[1]);
        result.push({
            end: closing.lastIndex,
            group: decodeAttribute(attributes.group || ""),
            start,
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

/** Builds the range of a Reflist refs/list parameter. */
function buildReflistContainer(
    call: ReturnType<typeof findTemplateCalls>[number],
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
        group: decodeAttribute(group?.value || ""),
        start,
    };
}

/** Gets the group inherited from the enclosing references container. */
function getContainerGroup(
    index: number,
    containers: ReferenceContainer[],
): string {
    const container = containers.find(
        (candidate) => index >= candidate.start && index < candidate.end,
    );
    return container?.group || "";
}

/** Removes optional matching quote marks used by R names. */
function stripOptionalQuotes(value: string): string {
    return value.trim().replace(/^(?:"([\s\S]*)"|'([\s\S]*)')$/u, "$1$2");
}

/** Checks whether three numeric components form a calendar date. */
function isCalendarDate(year: string, month: string, day: string): boolean {
    const date = new Date(
        Date.UTC(Number(year), Number(month) - 1, Number(day)),
    );
    return (
        date.getUTCFullYear() === Number(year) &&
        date.getUTCMonth() === Number(month) - 1 &&
        date.getUTCDate() === Number(day)
    );
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

function decodeAttribute(value: string): string {
    return value
        .replace(/&quot;/giu, '"')
        .replace(/&amp;/giu, "&")
        .replace(/&#0*38;/giu, "&")
        .replace(/&#x0*26;/giu, "&");
}

function escapeRefName(value: string): string {
    return value.replace(/&amp;/giu, "&").replace(/"/gu, "&quot;");
}

function buildGroupAttribute(value: string): string {
    if (value === "") {
        return "";
    }
    const escaped = value.replace(/&/gu, "&amp;").replace(/"/gu, "&quot;");
    return ` group="${escaped}"`;
}
