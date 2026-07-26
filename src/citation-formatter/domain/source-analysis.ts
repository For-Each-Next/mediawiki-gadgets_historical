/**
 * Article-wide citation summaries and opt-in consistency replacements.
 */

import { cleanValue } from "./citation.ts";
import {
    normalizeSourceUrl,
    serializeSourceDraftPreservingNames,
    type ExistingSource,
    type SourceDraft,
} from "./source-manager.ts";
import { getCanonicalTemplateName } from "./templates.ts";
import { applyReplacements } from "./wikitext.ts";

const PUBLICATION_PARAMETERS = new Set([
    "journal",
    "magazine",
    "newspaper",
    "periodical",
    "website",
    "work",
]);
const ALIAS_ORGANIZATION_PARAMETERS = new Set([
    "agency",
    "department",
    "institution",
    "organization",
    "publisher",
]);
const CREATOR_PARAMETER_PREFIX =
    "^(?:author|last|editor|interviewer|contributor|translator|" +
    "host|developer|user)";
const SUMMARY_CREATOR_PARAMETER = new RegExp(
    `${CREATOR_PARAMETER_PREFIX}(?:\\d*|(?:-last\\d*|\\d+-last))$`,
    "u",
);
const REPLACEABLE_AUTHOR_PARAMETER = new RegExp(
    `${CREATOR_PARAMETER_PREFIX}\\d*$`,
    "u",
);

export type SourceAnalysisFindingCategory =
    "alias" | "author" | "publication" | "publisher";

export type SourceAnalysisCell = "alias" | "value";

export interface SourceAnalysisValue {
    count: number;
    value: string;
}

export interface SourceAnalysisOccurrence {
    cell: SourceAnalysisCell;
    displayValue: string;
    id: string;
    parameter: string;
    referenceName: string;
    rowIndex: number;
    sourceId: string;
    template: string;
    title: string;
    value: string;
}

export interface SourceAnalysisFinding {
    category: SourceAnalysisFindingCategory;
    domain: string;
    id: string;
    label: string;
    occurrences: SourceAnalysisOccurrence[];
    options: SourceAnalysisValue[];
    reason: string;
    suggestedValue: string;
}

export interface CitationSourceAnalysis {
    findings: SourceAnalysisFinding[];
}

export interface SourceAnalysisReplacement {
    cell: SourceAnalysisCell;
    oldValue: string;
    parameter: string;
    replacement: string;
    rowIndex: number;
    sourceId: string;
}

interface FieldOccurrence extends SourceAnalysisOccurrence {
    category: "publication" | "publisher";
    domain: string;
}

/** Builds summary counts and likely formatting inconsistencies. */
export function analyzeCitationSources(
    enteredSources: ExistingSource[],
): CitationSourceAnalysis {
    const sources = enteredSources.filter(
        (source) => source.status !== "non-standard",
    );
    return {
        findings: [
            ...findDomainFieldInconsistencies(sources),
            ...findAuthorFormattingInconsistencies(sources),
            ...findAliasInconsistencies(sources),
        ],
    };
}

/** Applies selected replacements and preserves unselected sources. */
export function applySourceAnalysisReplacements(
    text: string,
    sources: ExistingSource[],
    replacements: SourceAnalysisReplacement[],
): string {
    const sourcesById = new Map(sources.map((source) => [source.id, source]));
    const replacementsBySource = groupSourceAnalysisReplacements(replacements);
    const textReplacements = [];
    for (const [sourceId, selected] of replacementsBySource) {
        const source = sourcesById.get(sourceId);
        if (source == null) {
            throw new Error(
                "A selected citation source is no longer present.",
            );
        }
        assertCurrentSource(text, source);
        const draft = cloneSourceDraft(source.draft);
        applyDraftReplacements(draft, selected);
        const layout = source.rawTemplate.includes("\n") ? "block" : "inline";
        textReplacements.push({
            end: source.templateEnd,
            start: source.templateStart,
            text: serializeSourceDraftPreservingNames(draft, layout),
        });
    }
    return applyReplacements(text, textReplacements);
}

/** Finds publication and publisher variants for each exact URL host. */
function findDomainFieldInconsistencies(
    sources: ExistingSource[],
): SourceAnalysisFinding[] {
    const grouped = groupDomainFieldOccurrences(sources);
    return [...grouped.values()].flatMap(buildDomainFieldFinding);
}

function groupDomainFieldOccurrences(
    sources: ExistingSource[],
): Map<string, FieldOccurrence[]> {
    const grouped = new Map<string, FieldOccurrence[]>();
    for (const source of sources) {
        const domain = getSourceDomain(source);
        if (domain === "") {
            continue;
        }
        for (const [rowIndex, row] of source.draft.rows.entries()) {
            const parameter = normalizeParameterName(row.name);
            const category = getDomainFieldCategory(parameter);
            if (category == null || row.value.trim() === "") {
                continue;
            }
            const occurrence = buildAnalysisOccurrence(
                source,
                rowIndex,
                parameter,
                row.value.trim(),
            );
            const key = `${category}\u0000${domain}`;
            const matches = grouped.get(key) ?? [];
            matches.push({ ...occurrence, category, domain });
            grouped.set(key, matches);
        }
    }
    return grouped;
}

function buildDomainFieldFinding(
    occurrences: FieldOccurrence[],
): SourceAnalysisFinding[] {
    const options = countOccurrenceValues(occurrences);
    if (options.length < 2) {
        return [];
    }
    const { category, domain } = occurrences[0];
    const displayValues = new Set(
        options.map((option) => normalizeDisplayValue(option.value)),
    );
    const fieldLabel =
        category === "publication" ? "Website/work" : "Publisher";
    return [
        {
            category,
            domain,
            id: `${category}:${domain}`,
            label: `${domain} · ${fieldLabel}`,
            occurrences,
            options,
            reason: getDomainFindingReason(displayValues.size),
            suggestedValue: options[0].value,
        },
    ];
}

function getDomainFindingReason(displayValueCount: number): string {
    return displayValueCount === 1
        ? "Only link, case, spacing, or wikitext style differs."
        : "Different values are used for the same URL host.";
}

function getDomainFieldCategory(
    parameter: string,
): "publication" | "publisher" | null {
    if (PUBLICATION_PARAMETERS.has(parameter)) {
        return "publication";
    }
    return parameter === "publisher" ? "publisher" : null;
}

/** Finds repeated author text with differing presentation markup. */
function findAuthorFormattingInconsistencies(
    sources: ExistingSource[],
): SourceAnalysisFinding[] {
    const grouped = groupAuthorOccurrences(sources);
    return [...grouped.entries()].flatMap(buildAuthorFinding);
}

function groupAuthorOccurrences(
    sources: ExistingSource[],
): Map<string, SourceAnalysisOccurrence[]> {
    const grouped = new Map<string, SourceAnalysisOccurrence[]>();
    for (const source of sources) {
        for (const [rowIndex, row] of source.draft.rows.entries()) {
            const parameter = normalizeParameterName(row.name);
            const value = row.value.trim();
            if (
                !REPLACEABLE_AUTHOR_PARAMETER.test(parameter) ||
                value === ""
            ) {
                continue;
            }
            const identity = normalizeDisplayValue(value);
            const occurrences = grouped.get(identity) ?? [];
            occurrences.push(
                buildAnalysisOccurrence(source, rowIndex, parameter, value),
            );
            grouped.set(identity, occurrences);
        }
    }
    return grouped;
}

function buildAuthorFinding([identity, occurrences]: [
    string,
    SourceAnalysisOccurrence[],
]): SourceAnalysisFinding[] {
    const options = countOccurrenceValues(occurrences);
    if (identity === "" || options.length < 2) {
        return [];
    }
    const display = cleanValue(options[0].value);
    return [
        {
            category: "author",
            domain: "",
            id: `author:${identity}`,
            label: `Author formatting · ${display}`,
            occurrences,
            options,
            reason:
                "The same displayed creator uses different wikitext, " +
                "link, case, or spacing style.",
            suggestedValue: options[0].value,
        },
    ];
}

/** Finds inconsistent hashtag aliases for repeated displayed values. */
function findAliasInconsistencies(
    sources: ExistingSource[],
): SourceAnalysisFinding[] {
    const grouped = groupAliasOccurrences(sources);
    return [...grouped.entries()].flatMap(buildAliasFinding);
}

function groupAliasOccurrences(
    sources: ExistingSource[],
): Map<string, SourceAnalysisOccurrence[]> {
    const grouped = new Map<string, SourceAnalysisOccurrence[]>();
    for (const source of sources) {
        for (const [rowIndex, row] of source.draft.rows.entries()) {
            const parameter = normalizeParameterName(row.name);
            const family = getAliasParameterFamily(parameter);
            const displayValue = row.value.trim();
            if (family == null || displayValue === "") {
                continue;
            }
            const identity = getAliasSubjectIdentity(parameter, displayValue);
            if (identity === "") {
                continue;
            }
            const key = `${family}\u0000${identity}`;
            const occurrences = grouped.get(key) ?? [];
            occurrences.push(
                buildAliasOccurrence(source, rowIndex, parameter),
            );
            grouped.set(key, occurrences);
        }
    }
    return grouped;
}

function getAliasParameterFamily(parameter: string): string | null {
    if (parameter === "url") {
        return "source-key";
    }
    if (SUMMARY_CREATOR_PARAMETER.test(parameter)) {
        return "creator";
    }
    if (PUBLICATION_PARAMETERS.has(parameter)) {
        return "publication";
    }
    if (ALIAS_ORGANIZATION_PARAMETERS.has(parameter)) {
        return "organization";
    }
    return ["script-title", "title"].includes(parameter) ? "title" : null;
}

function getAliasSubjectIdentity(
    parameter: string,
    displayValue: string,
): string {
    return parameter === "url"
        ? normalizeSourceUrl(displayValue)
        : normalizeDisplayValue(displayValue);
}

function buildAliasOccurrence(
    source: ExistingSource,
    rowIndex: number,
    parameter: string,
): SourceAnalysisOccurrence {
    const row = source.draft.rows[rowIndex];
    const occurrence = buildAnalysisOccurrence(
        source,
        rowIndex,
        parameter,
        row.value.trim(),
    );
    return {
        ...occurrence,
        cell: "alias",
        displayValue: row.value.trim(),
        value: row.alias.trim(),
    };
}

function buildAliasFinding([key, occurrences]: [
    string,
    SourceAnalysisOccurrence[],
]): SourceAnalysisFinding[] {
    const options = countAliasValues(occurrences);
    const populated = options.filter((option) => option.value !== "");
    if (
        occurrences.length < 2 ||
        populated.length === 0 ||
        options.length < 2
    ) {
        return [];
    }
    const sourceKey = key.startsWith("source-key\u0000");
    const display = cleanValue(occurrences[0].displayValue);
    const hasMissing = options.some((option) => option.value === "");
    return [
        {
            category: "alias",
            domain: "",
            id: `alias:${key}`,
            label: `${sourceKey ? "Source key" : "# alias"} · ${display}`,
            occurrences,
            options,
            reason: getAliasFindingReason(sourceKey, hasMissing),
            suggestedValue: populated[0].value,
        },
    ];
}

function getAliasFindingReason(
    sourceKey: boolean,
    hasMissing: boolean,
): string {
    const kind = sourceKey ? "source key" : "# alias";
    return hasMissing
        ? `Some repeated uses have a ${kind} and others do not.`
        : `The repeated value uses different ${kind} comments.`;
}

function countAliasValues(
    occurrences: SourceAnalysisOccurrence[],
): SourceAnalysisValue[] {
    const counted = new Map<string, SourceAnalysisValue & { order: number }>();
    for (const [order, occurrence] of occurrences.entries()) {
        const value = occurrence.value.trim().normalize("NFC");
        const existing = counted.get(value);
        if (existing == null) {
            counted.set(value, { count: 1, order, value });
        } else {
            existing.count += 1;
        }
    }
    return [...counted.values()]
        .sort(
            (left, right) =>
                Number(left.value === "") - Number(right.value === "") ||
                right.count - left.count ||
                left.order - right.order,
        )
        .map(({ count, value }) => ({ count, value }));
}

function buildAnalysisOccurrence(
    source: ExistingSource,
    rowIndex: number,
    parameter: string,
    value: string,
): SourceAnalysisOccurrence {
    return {
        cell: "value",
        displayValue: value,
        id: `${source.id}:${rowIndex}`,
        parameter,
        referenceName: source.referenceName,
        rowIndex,
        sourceId: source.id,
        template: getCanonicalTemplateName(source.draft.template),
        title: source.title || source.url || "Untitled source",
        value,
    };
}

function getSourceDomain(source: ExistingSource): string {
    try {
        const hostname = new URL(source.url).hostname
            .toLocaleLowerCase("en-US")
            .replace(/\.$/u, "");
        return hostname.replace(/^www\./u, "");
    } catch {
        return "";
    }
}

function countOccurrenceValues(
    occurrences: SourceAnalysisOccurrence[],
): SourceAnalysisValue[] {
    return countAnalysisValues(
        occurrences.map((occurrence) => occurrence.value),
    );
}

function countAnalysisValues(values: string[]): SourceAnalysisValue[] {
    const counted = new Map<string, SourceAnalysisValue & { order: number }>();
    for (const [order, entered] of values.entries()) {
        const value = entered.trim().normalize("NFC");
        if (value === "") {
            continue;
        }
        const existing = counted.get(value);
        if (existing == null) {
            counted.set(value, { count: 1, order, value });
        } else {
            existing.count += 1;
        }
    }
    return [...counted.values()]
        .sort(
            (left, right) =>
                right.count - left.count ||
                left.order - right.order ||
                left.value.localeCompare(right.value),
        )
        .map(({ count, value }) => ({ count, value }));
}

function normalizeDisplayValue(value: string): string {
    return cleanValue(value)
        .normalize("NFC")
        .toLocaleLowerCase("en-US")
        .replace(/\s+/gu, " ")
        .trim();
}

function normalizeParameterName(name: string): string {
    return name.trim().toLocaleLowerCase("en-US");
}

function groupSourceAnalysisReplacements(
    replacements: SourceAnalysisReplacement[],
): Map<string, SourceAnalysisReplacement[]> {
    const result = new Map<string, SourceAnalysisReplacement[]>();
    const enteredCells = new Map<string, SourceAnalysisReplacement>();
    for (const replacement of replacements) {
        if (isEmptySourceAnalysisReplacement(replacement)) {
            continue;
        }
        const added = registerSourceAnalysisReplacement(
            enteredCells,
            replacement,
        );
        if (!added) {
            continue;
        }
        const selected = result.get(replacement.sourceId) ?? [];
        selected.push(replacement);
        result.set(replacement.sourceId, selected);
    }
    return result;
}

function isEmptySourceAnalysisReplacement(
    replacement: SourceAnalysisReplacement,
): boolean {
    const emptyValue =
        replacement.cell === "value" && replacement.replacement.trim() === "";
    const unchanged = replacement.replacement === replacement.oldValue;
    return emptyValue || unchanged;
}

function registerSourceAnalysisReplacement(
    enteredCells: Map<string, SourceAnalysisReplacement>,
    replacement: SourceAnalysisReplacement,
): boolean {
    const rowKey = `${replacement.sourceId}\u0000${replacement.rowIndex}`;
    const cellKey = `${rowKey}\u0000${replacement.cell}`;
    const existing = enteredCells.get(cellKey);
    if (existing != null && existing.replacement !== replacement.replacement) {
        throw new Error(
            "One citation field has conflicting replacement values.",
        );
    }
    if (existing != null) {
        return false;
    }
    enteredCells.set(cellKey, replacement);
    return true;
}

function assertCurrentSource(text: string, source: ExistingSource): void {
    const current = text.slice(source.templateStart, source.templateEnd);
    if (current !== source.rawTemplate) {
        throw new Error("A citation source changed after analysis opened.");
    }
}

function cloneSourceDraft(draft: SourceDraft): SourceDraft {
    return {
        rows: draft.rows.map((row) => ({ ...row })),
        template: draft.template,
    };
}

function applyDraftReplacements(
    draft: SourceDraft,
    replacements: SourceAnalysisReplacement[],
): void {
    for (const replacement of replacements) {
        const row = draft.rows[replacement.rowIndex];
        const currentValue =
            replacement.cell === "alias"
                ? row?.alias.trim()
                : row?.value.trim();
        if (
            row == null ||
            normalizeParameterName(row.name) !== replacement.parameter ||
            currentValue !== replacement.oldValue
        ) {
            throw new Error(
                "A selected citation field changed after analysis opened.",
            );
        }
    }
    for (const replacement of replacements) {
        const row = draft.rows[replacement.rowIndex];
        if (replacement.cell === "alias") {
            row.alias = replacement.replacement;
        } else {
            row.value = replacement.replacement;
        }
    }
}
