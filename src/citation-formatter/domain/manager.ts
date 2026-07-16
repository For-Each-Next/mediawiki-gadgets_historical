/**
 * Citation-management transformations used after initial formatting.
 */

import { isCitationTemplate } from "./templates.ts";
import {
    applyReplacements,
    findRefTags,
    findTemplateCalls,
    splitTopLevel,
} from "./wikitext.ts";
import type { TextReplacement } from "./types.ts";

const NAME_OVERRIDE = /\s*<!--\s*#\s*([\s\S]*?)-->/gu;
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
    const protectedRanges = findProtectedRanges(text);
    for (const call of findTemplateCalls(text)) {
        if (
            !isCitationTemplate(call.name) ||
            isInRanges(call.start, protectedRanges)
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
    const protectedRanges = findProtectedRanges(text);
    for (const call of findTemplateCalls(text)) {
        if (isInRanges(call.start, protectedRanges)) {
            continue;
        }
        const replacement = buildOverrideReplacement(call, byId);
        if (replacement != null) {
            replacements.push(replacement);
        }
    }
    return applyReplacements(text, replacements);
}

function addCallNameFields(
    fields: Map<string, NameOverrideField>,
    call: ReturnType<typeof findTemplateCalls>[number],
): void {
    const title = call.params.find((param) => param.name === "title");
    call.params.forEach(function addField(param, index) {
        if (!isNameParam(param.name)) {
            return;
        }
        const override = getNameOverride(param.value);
        const enteredValue = removeNameOverride(param.value).trim();
        const displayValue = cleanDisplayName(enteredValue);
        if (!/[^\u0000-\u007f]/u.test(displayValue)) {
            return;
        }
        addNameField(fields, {
            displayValue,
            id: `${call.start}:${index}`,
            label: `${call.name} · ${param.name}`,
            occurrence: {
                id: `${call.start}:${index}`,
                override,
                parameter: normalizeUsageParameter(param.name),
                source: removeNameOverride(title?.value || "").trim(),
                template: normalizeUsageTemplate(call.name),
            },
            override,
            source: removeNameOverride(title?.value || "").trim(),
            usage: "",
            usageItems: [],
        });
    });
}

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

function buildNameOverrideUsageItems(
    field: NameOverrideField,
): NameOverrideUsageItem[] {
    const groups = Map.groupBy(
        field.occurrences,
        (occurrence) => occurrence.parameter,
    );
    const result = Array.from(groups, ([parameter, uses]) => ({
        count: uses.length,
        label: formatUsageChipParameter(parameter),
    }));
    return result;
}

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
    const details = Array.from(groups, ([parameter, uses]) => {
        return `${formatUsageParameter(parameter)} (${uses.length})`;
    });
    const summary = joinNaturalList(details);
    return `Used ${field.occurrences.length} times across ${summary}.`;
}

function formatSingleUsage(occurrence: NameOverrideOccurrence): string {
    const parameter = formatUsageParameter(occurrence.parameter);
    return `Used once as ${parameter} in a ${occurrence.template} citation.`;
}

function formatRepeatedUsage(occurrences: NameOverrideOccurrence[]): string {
    const parameter = formatUsageParameter(occurrences[0].parameter);
    const templates = Map.groupBy(occurrences, (item) => item.template);
    const details = Array.from(templates, ([template, items]) => {
        return `${items.length} ${template}`;
    });
    const summary = joinNaturalList(details);
    const result = `Used ${occurrences.length} times as ${parameter} across ` +
        `${summary} citations.`;
    return result;
}

function formatUsageParameter(parameter: string): string {
    const numbered = /^(?:author|editor|editor-last|last)$/u.test(parameter);
    return `|${parameter}${numbered ? "#" : ""}=`;
}

function joinNaturalList(items: string[]): string {
    if (items.length < 2) {
        return items[0] || "";
    }
    if (items.length === 2) {
        return `${items[0]} and ${items[1]}`;
    }
    return `${items.slice(0, -1).join(", ")}, and ${items.at(-1)}`;
}

function getSharedOverride(occurrences: NameOverrideOccurrence[]): string {
    const values = new Set(
        occurrences.map((occurrence) => occurrence.override),
    );
    return values.size === 1 ? occurrences[0]?.override || "" : "";
}

function normalizeUsageParameter(parameter: string): string {
    return parameter.trim().toLocaleLowerCase("en-US").replace(/\d+$/u, "");
}

function normalizeUsageTemplate(template: string): string {
    const result = template
        .trim()
        .toLocaleLowerCase("en-US")
        .replace(/^cite\s+/u, "");
    return result;
}

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

function buildOverrideReplacement(
    call: ReturnType<typeof findTemplateCalls>[number],
    byId: Map<string, string>,
): TextReplacement | null {
    const entries = call.params
        .map((param, index) => ({
            index,
            override: byId.get(`${call.start}:${index}`),
        }))
        .filter((entry) => entry.override != null);
    if (entries.length === 0) {
        return null;
    }
    const parts = splitTopLevel(call.raw.slice(2, -2), "|");
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
    const protectedRanges = findProtectedRanges(text);
    const tags = findRefTags(text)
        .filter(isCompactableReuseTag)
        .filter((tag) => !isInRanges(tag.start, protectedRanges));
    const replacements: TextReplacement[] = [];
    let run: typeof tags = [];
    function flushRun(): void {
        if (run.length === 0) {
            return;
        }
        const names = run.map((tag) => tag.attributes.name);
        replacements.push({
            end: run[run.length - 1].end,
            start: run[0].start,
            text: `{{r|${names.join("|")}}}`,
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
    const protectedRanges = findProtectedRanges(text);
    const replacements = findTemplateCalls(text)
        .filter(isRCall)
        .filter(hasOnlyPositionalParams)
        .filter((call) => !isInRanges(call.start, protectedRanges))
        .map(function expandCall(call): TextReplacement {
            const names = call.params
                .map((param) => param.value)
                .filter(Boolean);
            const result = {
                end: call.end,
                start: call.start,
                text: names.map((name) => `<ref name="${name}" />`).join(""),
            };
            return result;
        });
    return applyReplacements(text, replacements);
}

/**
 * Returns whether simple temporary R calls are present.
 *
 * @param text - Article wikitext.
 * @returns Whether compact calls exist.
 */
export function hasCompactReferenceCalls(text: string): boolean {
    const protectedRanges = findProtectedRanges(text);
    const result = findTemplateCalls(text).some(
        (call) =>
            !isInRanges(call.start, protectedRanges) &&
            isRCall(call) &&
            hasOnlyPositionalParams(call),
    );
    return result;
}

function isNameParam(name: string): boolean {
    const normalized = name.trim().toLocaleLowerCase("en-US");
    return NAME_PARAM.test(normalized) || NAME_FALLBACK_PARAMS.has(normalized);
}

function getNameOverride(value: string): string {
    return value.match(/<!--\s*#\s*([\s\S]*?)-->/u)?.[1].trim() || "";
}

function removeNameOverride(value: string): string {
    return value.replace(NAME_OVERRIDE, "");
}

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
    const comment = override === "" ? "" : ` <!-- # ${override} -->`;
    return `${before}${leading}${value}${comment}${trailing}`;
}

function isCompactableReuseTag(
    tag: ReturnType<typeof findRefTags>[number],
): boolean {
    const keys = Object.keys(tag.attributes);
    return tag.selfClosing && keys.length === 1 && tag.attributes.name !== "";
}

function isRCall(call: ReturnType<typeof findTemplateCalls>[number]): boolean {
    return call.name.trim().toLocaleLowerCase("en-US") === "r";
}

function hasOnlyPositionalParams(
    call: ReturnType<typeof findTemplateCalls>[number],
): boolean {
    return call.params.every((param) => param.positional);
}

function findProtectedRanges(text: string): Array<[number, number]> {
    const pattern = new RegExp(
        String.raw`<!--[\s\S]*?-->|` +
            String.raw`<(nowiki|pre|source|syntaxhighlight)\b[^>]*>` +
            String.raw`[\s\S]*?<\/\1\s*>`,
        "giu",
    );
    const result = Array.from(
        text.matchAll(pattern),
        (match): [number, number] => [
            match.index,
            match.index + match[0].length,
        ],
    );
    return result;
}

function isInRanges(index: number, ranges: Array<[number, number]>): boolean {
    return ranges.some(([start, end]) => index >= start && index < end);
}
