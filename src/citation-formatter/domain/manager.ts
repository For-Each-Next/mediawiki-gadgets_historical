/**
 * Citation-management transformations used after initial formatting.
 */

import {
    wikitext,
    type ParsedTemplateCall,
    type RefTag,
} from "#shared/wikitext";

import {
    isCitationTemplate,
    isEditableCitationTemplate,
} from "./templates.ts";
import {
    findCitationManagementProtectedRanges,
    isInWikitextRanges,
} from "./protected-wikitext.ts";
import { applyReplacements } from "./wikitext.ts";
import type { CitationLayout, TextReplacement } from "./types.ts";

const HTML_COMMENT = /<!--([\s\S]*?)-->/gu;
const NAME_PARAM = /^(?:author|last|editor|editor-last)\d*$/u;
const NAME_FALLBACK_PARAMS = new Set([
    "agency",
    "cartography",
    "contributor-last",
    "department",
    "developer",
    "host",
    "institution",
    "interviewer-last",
    "organization",
    "publisher",
    "translator-last",
    "university",
    "user",
    "website",
    "work",
]);

export interface NameOverrideField {
    displayValue: string;
    ids: string[];
    label: string;
    occurrences: NameOverrideOccurrence[];
    override: string;
    source: string;
    usage: string;
    usageItems: NameOverrideUsageItem[];
}

export interface NameOverrideUsageItem {
    count: number;
    label: string;
}

export interface NameOverrideOccurrence {
    id: string;
    override: string;
    parameter: string;
    source: string;
    template: string;
}

export interface NameOverrideUpdate {
    ids: string[];
    override: string;
}

/**
 * Finds non-Latin citation names and existing name overrides.
 *
 * @param text - Article wikitext.
 * @returns Editable override fields in source order.
 */
export function findNameOverrideFields(text: string): NameOverrideField[] {
    const fields = new Map<string, NameOverrideField>();
    const protectedRanges = findCitationManagementProtectedRanges(text);
    for (const call of wikitext(text).template.getAll()) {
        if (
            !isCitationTemplate(call.name) ||
            isInWikitextRanges(call.start, protectedRanges)
        ) {
            continue;
        }
        addCallNameFields(fields, call);
    }
    const result = [...fields.values()];
    for (const field of result) {
        field.override = getSharedOverride(field.occurrences);
        field.usage = formatNameOverrideUsage(field);
        field.usageItems = buildNameOverrideUsageItems(field);
    }
    return result;
}

/**
 * Applies edited hashtag-comment overrides without reformatting.
 *
 * @param text - Article wikitext.
 * @param updates - Override values keyed by manager field ID.
 * @returns Updated article wikitext.
 */
export function applyNameOverrides(
    text: string,
    updates: NameOverrideUpdate[],
): string {
    const byId = buildOverrideIndex(updates);
    const replacements: TextReplacement[] = [];
    const protectedRanges = findCitationManagementProtectedRanges(text);
    for (const call of wikitext(text).template.getAll()) {
        if (isInWikitextRanges(call.start, protectedRanges)) {
            continue;
        }
        const replacement = buildOverrideReplacement(call, byId);
        if (replacement != null) {
            replacements.push(replacement);
        }
    }
    return applyReplacements(text, replacements);
}

/**
 * Adds a citation call's non-Latin names to their display groups.
 *
 * @param fields - Mutable grouped override fields.
 * @param call - Parsed citation template call.
 */
function addCallNameFields(
    fields: Map<string, NameOverrideField>,
    call: ParsedTemplateCall,
): void {
    const title = call.params.find((param) => param.name === "title");
    const forEachCallback = function addField(
        param: ParsedTemplateCall["params"][number],
        index: number,
    ) {
        if (!isNameParam(param.name)) {
            return;
        }
        const override = getNameOverride(param.value);
        const enteredValue = removeNameOverride(param.value).trim();
        const displayValue = cleanDisplayName(enteredValue);
        if (!/[^\u0000-\u007f]/u.test(displayValue)) {
            return;
        }
        const parameter = normalizeUsageParameter(param.name);
        const source = removeNameOverride(title?.value || "").trim();
        const template = normalizeUsageTemplate(call.name);
        addNameField(fields, {
            displayValue,
            id: `${call.start}:${index}`,
            label: `${call.name} · ${param.name}`,
            occurrence: {
                id: `${call.start}:${index}`,
                override,
                parameter,
                source,
                template,
            },
            override,
            source,
            usage: "",
            usageItems: [],
        });
    };
    call.params.forEach(forEachCallback);
}

/**
 * Adds one name occurrence to its grouped override field.
 *
 * @param fields - Mutable grouped override fields.
 * @param entered - Name occurrence and display metadata.
 */
function addNameField(
    fields: Map<string, NameOverrideField>,
    entered: Omit<NameOverrideField, "ids" | "occurrences"> & {
        id: string;
        occurrence: NameOverrideOccurrence;
    },
): void {
    const existing = fields.get(entered.displayValue);
    if (existing != null) {
        existing.ids.push(entered.id);
        existing.occurrences.push(entered.occurrence);
        return;
    }
    fields.set(entered.displayValue, {
        displayValue: entered.displayValue,
        ids: [entered.id],
        label: entered.label,
        occurrences: [entered.occurrence],
        override: entered.override,
        source: entered.source,
        usage: entered.usage,
        usageItems: entered.usageItems,
    });
}

/**
 * Builds parameter usage chips for a grouped override field.
 *
 * @param field - Grouped name override field.
 * @returns Parameter usage chips.
 */
function buildNameOverrideUsageItems(
    field: NameOverrideField,
): NameOverrideUsageItem[] {
    const groups = Map.groupBy(
        field.occurrences,
        (occurrence) => occurrence.parameter,
    );
    const buildUsageItem = function buildUsageItem([parameter, uses]: [
        string,
        NameOverrideOccurrence[],
    ]) {
        return {
            count: uses.length,
            label: formatUsageChipParameter(parameter),
        };
    };
    const result = Array.from(groups, buildUsageItem);
    return result;
}

/**
 * Formats a parameter name for a compact usage chip.
 *
 * @param parameter - Normalized citation parameter name.
 * @returns Compact parameter label.
 */
function formatUsageChipParameter(parameter: string): string {
    const numbered = /^(?:author|editor|editor-last|last)$/u.test(parameter);
    return `${parameter}${numbered ? "#" : ""}`;
}

/**
 * Summarizes where one grouped name is used.
 *
 * @param field - Grouped name override field.
 * @returns Parameter and citation-template usage summary.
 */
export function formatNameOverrideUsage(field: NameOverrideField): string {
    const groups = Map.groupBy(
        field.occurrences,
        (occurrence) => occurrence.parameter,
    );
    if (field.occurrences.length === 1) {
        return formatSingleUsage(field.occurrences[0]);
    }
    if (groups.size === 1) {
        return formatRepeatedUsage(field.occurrences);
    }
    const formatGroupedUsage = function formatGroupedUsage([parameter, uses]: [
        string,
        NameOverrideOccurrence[],
    ]) {
        return `${formatUsageParameter(parameter)} (${uses.length})`;
    };
    const details = Array.from(groups, formatGroupedUsage);
    const summary = joinNaturalList(details);
    return `Used ${field.occurrences.length} times across ${summary}.`;
}

/**
 * Formats usage text for a name occurring once.
 *
 * @param occurrence - Single name occurrence.
 * @returns Human-readable usage text.
 */
function formatSingleUsage(occurrence: NameOverrideOccurrence): string {
    const parameter = formatUsageParameter(occurrence.parameter);
    return `Used once as ${parameter} in a ${occurrence.template} citation.`;
}

/**
 * Formats usage text for repeated uses of one parameter.
 *
 * @param occurrences - Repeated name occurrences.
 * @returns Human-readable usage text.
 */
function formatRepeatedUsage(occurrences: NameOverrideOccurrence[]): string {
    const parameter = formatUsageParameter(occurrences[0].parameter);
    const templates = Map.groupBy(occurrences, (item) => item.template);
    const details = Array.from(
        templates,
        function formatTemplateUsage([template, items]) {
            return `${items.length} ${template}`;
        },
    );
    const summary = joinNaturalList(details);
    const result =
        `Used ${occurrences.length} times as ${parameter} across ` +
        `${summary} citations.`;
    return result;
}

/**
 * Formats a citation parameter for usage text.
 *
 * @param parameter - Normalized citation parameter name.
 * @returns Wikitext-style parameter label.
 */
function formatUsageParameter(parameter: string): string {
    const numbered = /^(?:author|editor|editor-last|last)$/u.test(parameter);
    return `|${parameter}${numbered ? "#" : ""}=`;
}

/**
 * Joins text items as a natural-language list.
 *
 * @param items - Text items to join.
 * @returns Natural-language list.
 */
function joinNaturalList(items: string[]): string {
    if (items.length < 2) {
        return items[0] || "";
    }
    if (items.length === 2) {
        return `${items[0]} and ${items[1]}`;
    }
    return `${items.slice(0, -1).join(", ")}, and ${items.at(-1)}`;
}

/**
 * Gets the override shared by every occurrence, if any.
 *
 * @param occurrences - Grouped name occurrences.
 * @returns Shared override or an empty string.
 */
function getSharedOverride(occurrences: NameOverrideOccurrence[]): string {
    const overrideValues = occurrences.map(
        (occurrence) => occurrence.override,
    );
    const values = new Set(overrideValues);
    return values.size === 1 ? occurrences[0]?.override || "" : "";
}

/**
 * Normalizes a citation parameter for usage grouping.
 *
 * @param parameter - Entered parameter name.
 * @returns Normalized parameter family.
 */
function normalizeUsageParameter(parameter: string): string {
    return parameter.trim().toLocaleLowerCase("en-US").replace(/\d+$/u, "");
}

/**
 * Normalizes a citation template for usage text.
 *
 * @param template - Entered citation template name.
 * @returns Normalized template label.
 */
function normalizeUsageTemplate(template: string): string {
    const result = template
        .trim()
        .toLocaleLowerCase("en-US")
        .replace(/^cite\s+/u, "");
    return result;
}

/**
 * Indexes override updates by occurrence ID.
 *
 * @param updates - Entered name override updates.
 * @returns Overrides keyed by occurrence ID.
 */
function buildOverrideIndex(
    updates: NameOverrideUpdate[],
): Map<string, string> {
    const result = new Map<string, string>();
    for (const update of updates) {
        for (const id of update.ids) {
            result.set(id, update.override);
        }
    }
    return result;
}

/**
 * Builds the replacement for one citation template call.
 *
 * @param call - Parsed citation template call.
 * @param byId - Overrides keyed by occurrence ID.
 * @returns Text replacement when the call has updates.
 */
function buildOverrideReplacement(
    call: ParsedTemplateCall,
    byId: Map<string, string>,
): TextReplacement | null {
    const buildOverrideEntry = function buildOverrideEntry(
        _parameter: ParsedTemplateCall["params"][number],
        index: number,
    ) {
        return {
            index,
            override: byId.get(`${call.start}:${index}`),
        };
    };
    const entries = call.params
        .map(buildOverrideEntry)
        .filter((entry) => entry.override != null);
    if (entries.length === 0) {
        return null;
    }
    const body = call.raw.slice(2, -2);
    const parts = wikitext(body).split("|");
    for (const entry of entries) {
        parts[entry.index + 1] = updateParamPart(
            parts[entry.index + 1],
            entry.override || "",
        );
    }
    const text = `{{${parts.join("|")}}}`;
    return { end: call.end, start: call.start, text };
}

/**
 * Compacts adjacent native reuse tags into temporary R calls.
 *
 * @param text - Article wikitext.
 * @returns Wikitext with compact reuse calls.
 */
export function compactReferenceCalls(text: string): string {
    const protectedRanges = findCitationManagementProtectedRanges(text);
    const isActiveTag = (tag: RefTag) =>
        !isInWikitextRanges(tag.start, protectedRanges);
    const tags = wikitext(text)
        .reference.getAll()
        .filter(isCompactableReuseTag)
        .filter(isActiveTag);
    const replacements: TextReplacement[] = [];
    let run: typeof tags = [];
    function flushRun(): void {
        if (run.length === 0) {
            return;
        }
        const names = run.map((tag) => tag.attributes.name);
        const nameParams = names.join("|");
        replacements.push({
            end: run[run.length - 1].end,
            start: run[0].start,
            text: `{{r|${nameParams}}}`,
        });
        run = [];
    }
    for (const tag of tags) {
        const previous = run[run.length - 1];
        const gap =
            previous == null ? "" : text.slice(previous.end, tag.start);
        if (previous != null && gap.trim() !== "") {
            flushRun();
        }
        run.push(tag);
    }
    flushRun();
    return applyReplacements(text, replacements);
}

/**
 * Expands simple temporary R calls back to native reuse tags.
 *
 * @param text - Article wikitext.
 * @returns Wikitext with native reuse tags.
 */
export function expandCompactReferenceCalls(text: string): string {
    const protectedRanges = findCitationManagementProtectedRanges(text);
    const isActiveCall = (call: ParsedTemplateCall) =>
        !isInWikitextRanges(call.start, protectedRanges);
    const expandCall = function expandCall(
        call: ParsedTemplateCall,
    ): TextReplacement {
        const names = call.params.map((param) => param.value).filter(Boolean);
        const result = {
            end: call.end,
            start: call.start,
            text: names.map((name) => `<ref name="${name}" />`).join(""),
        };
        return result;
    };
    const replacements = wikitext(text)
        .template.getAll()
        .filter(isRCall)
        .filter(hasOnlyPositionalParams)
        .filter(isActiveCall)
        .map(expandCall);
    return applyReplacements(text, replacements);
}

/**
 * Detects the current citation-template layout for manager defaults.
 *
 * Mixed layouts resolve to block. Applying the manager keeps the
 * default unless every editable citation is inline.
 *
 * @param text - Article wikitext.
 * @returns Detected citation-template output layout.
 */
export function detectCitationLayout(text: string): CitationLayout {
    const protectedRanges = findCitationManagementProtectedRanges(text);
    const definitionTags = wikitext(text)
        .reference.getAll()
        .filter(isFullRefDefinition);
    const isActiveCitation = function isActiveCitation(
        call: ParsedTemplateCall,
    ) {
        return (
            !isInWikitextRanges(call.start, protectedRanges) &&
            isInRefDefinition(call, definitionTags) &&
            isEditableCitationTemplate(call.name)
        );
    };
    const calls = wikitext(text).template.getAll().filter(isActiveCitation);
    if (calls.length === 0) {
        return "block";
    }
    const hasBlockCall = calls.some(isBlockCitationCall);
    return hasBlockCall ? "block" : "inline";
}

/**
 * Checks whether a ref tag contains a full definition.
 *
 * @param tag - Parsed ref tag.
 * @returns Whether the ref has body content.
 */
function isFullRefDefinition(tag: RefTag): boolean {
    return !tag.selfClosing;
}

/**
 * Checks whether a template call belongs to a full ref definition.
 *
 * @param call - Parsed template call.
 * @param tags - Full ref tags in the source.
 * @returns Whether a full ref contains the call.
 */
function isInRefDefinition(call: ParsedTemplateCall, tags: RefTag[]): boolean {
    return tags.some((tag) => call.start > tag.start && call.end < tag.end);
}

/**
 * Checks for the formatter's block-style template opening.
 *
 * @param call - Parsed citation template call.
 * @returns Whether the first parameter starts on a new line.
 */
function isBlockCitationCall(call: ParsedTemplateCall): boolean {
    const inner = call.raw.slice(2, -2);
    const parts = wikitext(inner).split("|");
    return parts.some(hasBoundaryLineBreak);
}

/**
 * Checks for a line break adjoining an outer template separator.
 *
 * @param part - Template name or top-level parameter segment.
 * @returns Whether the segment starts or ends on a separate line.
 */
function hasBoundaryLineBreak(part: string): boolean {
    return /^\s*\r?\n/u.test(part) || /\r?\n\s*$/u.test(part);
}

/**
 * Checks whether a citation parameter supports a name override.
 *
 * @param name - Citation parameter name.
 * @returns Whether the parameter supports an override.
 */
function isNameParam(name: string): boolean {
    const normalized = name.trim().toLocaleLowerCase("en-US");
    return NAME_PARAM.test(normalized) || NAME_FALLBACK_PARAMS.has(normalized);
}

/**
 * Extracts a name override from a citation value.
 *
 * @param value - Citation parameter value.
 * @returns Entered override or an empty string.
 */
function getNameOverride(value: string): string {
    const comments = value.matchAll(HTML_COMMENT);
    for (const comment of comments) {
        const hashIndex = comment[1].indexOf("#");
        if (hashIndex >= 0) {
            return comment[1].slice(hashIndex + 1).trim();
        }
    }
    return "";
}

/**
 * Removes a name override from a citation value.
 *
 * @param value - Citation parameter value.
 * @returns Value without its name override.
 */
function removeNameOverride(value: string): string {
    return value.replace(HTML_COMMENT, stripOverrideFromComment);
}

/**
 * Removes an override fragment while preserving other comment text.
 *
 * @param _match - Complete matched comment.
 * @param content - Comment content.
 * @returns Preserved comment text without the override.
 */
function stripOverrideFromComment(_match: string, content: string): string {
    const hashIndex = content.indexOf("#");
    if (hashIndex < 0) {
        return `<!--${content}-->`;
    }
    const prefix = content.slice(0, hashIndex).trim();
    return prefix === "" ? "" : `<!-- ${prefix} -->`;
}

/**
 * Converts a citation name to plain display text.
 *
 * @param value - Wikitext citation name.
 * @returns Plain display text.
 */
function cleanDisplayName(value: string): string {
    const result = value
        .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/gu, "$2")
        .replace(/\[\[([^\]]+)\]\]/gu, "$1")
        .replace(/'{2,}/gu, "")
        .replace(/<[^>]+>/gu, "")
        .replace(/\s+/gu, " ")
        .trim();
    return result;
}

/**
 * Updates one serialized template parameter with an override.
 *
 * @param part - Serialized template parameter.
 * @param enteredOverride - Entered override value.
 * @returns Updated serialized parameter.
 */
function updateParamPart(part: string, enteredOverride: string): string {
    const separator = part.indexOf("=");
    if (separator < 0) {
        return part;
    }
    const before = part.slice(0, separator + 1);
    const enteredValue = part.slice(separator + 1);
    const leading = enteredValue.match(/^\s*/u)?.[0] || "";
    const trailing = enteredValue.match(/\s*$/u)?.[0] || "";
    const value = removeNameOverride(enteredValue).trim();
    const override = enteredOverride.trim().replace(/--+/gu, "-");
    const updatedValue = addNameOverride(value, override);
    return `${before}${leading}${updatedValue}${trailing}`;
}

/**
 * Adds a name override to a citation value.
 *
 * @param value - Citation parameter value.
 * @param override - Entered name override.
 * @returns Value with the override comment.
 */
function addNameOverride(value: string, override: string): string {
    if (override === "") {
        return value;
    }
    const directive = /<!--\s*([^]*?!no-author[^]*?)\s*-->/u;
    if (directive.test(value)) {
        function updateDirective(_match: string, content: string): string {
            return `<!-- ${content.trim()} # ${override} -->`;
        }
        return value.replace(directive, updateDirective);
    }
    return `${value} <!-- # ${override} -->`;
}

/**
 * Checks whether a ref tag can be represented by an R call.
 *
 * @param tag - Parsed ref tag.
 * @returns Whether the tag is compactable.
 */
function isCompactableReuseTag(tag: RefTag): boolean {
    const keys = Object.keys(tag.attributes);
    return tag.selfClosing && keys.length === 1 && tag.attributes.name !== "";
}

/**
 * Checks whether a template call uses the R template.
 *
 * @param call - Parsed template call.
 * @returns Whether the call uses the R template.
 */
function isRCall(call: ParsedTemplateCall): boolean {
    return call.name.trim().toLocaleLowerCase("en-US") === "r";
}

/**
 * Checks whether every template parameter is positional.
 *
 * @param call - Parsed template call.
 * @returns Whether every parameter is positional.
 */
function hasOnlyPositionalParams(call: ParsedTemplateCall): boolean {
    return call.params.every((param) => param.positional);
}
