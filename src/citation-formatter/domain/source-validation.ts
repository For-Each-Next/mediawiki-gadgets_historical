/**
 * Reactive validation for editable CS1 citation parameters.
 */

import templateData from "./data/index.ts";
import { getCitationValidationConfig } from "./validation/index.ts";

interface SourceDraftLike {
    rows: SourceDraftRowLike[];
    template: string;
}

interface SourceDraftRowLike {
    alias: string;
    name: string;
    value: string;
}

export interface SourceDraftRowErrors {
    alias?: string;
    name?: string;
    value?: string;
}

export type SourceDraftErrors = Map<number, SourceDraftRowErrors>;

const CS1_DATE_PARAMETERS = [
    "access-date",
    "archive-date",
    "date",
    "doi-broken-date",
    "embargo",
    "lay-date",
    "orig-date",
    "pmc-embargo-date",
    "publication-date",
    "year",
] as const;
const ENGLISH_MONTH_NAMES: Array<[string, number]> = [
    ["january", 1],
    ["february", 2],
    ["march", 3],
    ["april", 4],
    ["may", 5],
    ["june", 6],
    ["july", 7],
    ["august", 8],
    ["september", 9],
    ["october", 10],
    ["november", 11],
    ["december", 12],
];
const ENGLISH_MONTHS = new Map(
    ENGLISH_MONTH_NAMES.flatMap(function addAbbreviation([name, month]) {
        return [
            [name, month],
            [name.slice(0, 3), month],
        ] as Array<[string, number]>;
    }),
);
const SEASONS = /^(?:spring|summer|autumn|fall|winter)\s+[1-9]\d{3}$/iu;
const GLOBAL_CANONICAL_NAMES = buildGlobalCanonicalNames();
const GLOBAL_SUPPORTED_NAMES = buildGlobalSupportedNames();
const PARAMETER_DEPENDENCIES = [
    { source: "access-date", targets: ["url"] },
    { source: "archive-url", targets: ["url"] },
    { source: "asin-tld", targets: ["asin"] },
    { source: "doi-broken-date", targets: ["doi"] },
    { source: "format", targets: ["url"] },
    { source: "pmc-embargo-date", targets: ["pmc"] },
] as const;

/** Returns cell-level errors for an editable source draft. */
export function getSourceDraftErrors(
    draft: SourceDraftLike,
    wikiId: string,
): SourceDraftErrors {
    const config = getCitationValidationConfig(wikiId);
    const metadata = templateData[draft.template] ?? templateData["cite web"];
    const canonicalNames = GLOBAL_CANONICAL_NAMES;
    const supportedNames = new Set([
        ...GLOBAL_SUPPORTED_NAMES,
        ...config.additionalParameters.map(normalizeParameterName),
    ]);
    const dateNames = new Set([
        ...CS1_DATE_PARAMETERS,
        ...(metadata.dateParams ?? []),
    ]);
    const numberedNames = new Set(config.numberedParameters);
    const errors: SourceDraftErrors = new Map();
    for (const [index, row] of draft.rows.entries()) {
        validateDraftRow(row, index, errors, {
            canonicalNames,
            dateNames,
            dateStyle: config.dateStyle,
            numberedNames,
            supportedNames,
        });
    }
    validateArchivePair(draft.rows, canonicalNames, errors);
    validateParameterDependencies(draft.rows, canonicalNames, errors);
    return errors;
}

interface DraftRowValidationContext {
    canonicalNames: Map<string, string>;
    dateNames: Set<string>;
    dateStyle: "english" | "chinese";
    numberedNames: Set<string>;
    supportedNames: Set<string>;
}

/** Validates the three editable cells in one parameter row. */
function validateDraftRow(
    row: SourceDraftRowLike,
    index: number,
    errors: SourceDraftErrors,
    context: DraftRowValidationContext,
): void {
    const name = normalizeParameterName(row.name);
    const hasContent = row.value.trim() !== "" || row.alias.trim() !== "";
    if (name === "" && hasContent) {
        addCellError(errors, index, "name", "Enter a parameter name.");
        return;
    }
    const numberedName = name.replace(/\d+/gu, "#");
    const supported =
        context.supportedNames.has(name) ||
        context.numberedNames.has(numberedName);
    if (name !== "" && !supported) {
        const message = `Unsupported CS1 parameter: ${row.name.trim()}`;
        addCellError(errors, index, "name", message);
    }
    if (row.alias.trim() !== "" && row.value.trim() === "") {
        const message = "Enter a value before adding a reference-name alias.";
        addCellError(errors, index, "alias", message);
    }
    const canonical = context.canonicalNames.get(name) ?? name;
    const invalidDate =
        row.value.trim() !== "" &&
        context.dateNames.has(canonical) &&
        !isValidCitationDate(row.value, context.dateStyle, canonical);
    if (invalidDate) {
        addCellError(errors, index, "value", `Invalid ${canonical} value.`);
    }
}

/** Adds a message without hiding a more specific earlier error. */
function addCellError(
    errors: SourceDraftErrors,
    index: number,
    cell: keyof SourceDraftRowErrors,
    message: string,
): void {
    const row = errors.get(index) ?? {};
    row[cell] ??= message;
    errors.set(index, row);
}

/** Builds the shared CS1 whitelist from all generated TemplateData. */
function buildGlobalSupportedNames(): Set<string> {
    const names = new Set<string>();
    for (const metadata of Object.values(templateData)) {
        for (const name of metadata.paramOrder) {
            names.add(normalizeParameterName(name));
        }
        for (const [canonical, aliases] of Object.entries(metadata.aliases)) {
            names.add(normalizeParameterName(canonical));
            for (const alias of aliases) {
                names.add(normalizeParameterName(alias));
            }
        }
    }
    return names;
}

/** Maps all generated TemplateData aliases to canonical parameters. */
function buildGlobalCanonicalNames(): Map<string, string> {
    const result = new Map<string, string>();
    for (const metadata of Object.values(templateData)) {
        for (const [canonical, aliases] of Object.entries(metadata.aliases)) {
            const normalizedCanonical = normalizeParameterName(canonical);
            result.set(normalizedCanonical, normalizedCanonical);
            for (const alias of aliases) {
                result.set(normalizeParameterName(alias), normalizedCanonical);
            }
        }
    }
    return result;
}

function normalizeParameterName(name: string): string {
    return name.trim().toLocaleLowerCase("en-US");
}

/** Validates the paired archive fields and marks the missing field. */
function validateArchivePair(
    rows: SourceDraftRowLike[],
    canonicalNames: Map<string, string>,
    errors: SourceDraftErrors,
): void {
    const byName = new Map<string, number>();
    for (const [index, row] of rows.entries()) {
        const name = normalizeParameterName(row.name);
        byName.set(canonicalNames.get(name) ?? name, index);
    }
    const archiveUrlIndex = byName.get("archive-url");
    const archiveDateIndex = byName.get("archive-date");
    const archiveUrl = getTrimmedValue(rows, archiveUrlIndex);
    const archiveDate = getTrimmedValue(rows, archiveDateIndex);
    if (archiveUrl !== "" && archiveDate === "") {
        addMissingArchiveError(
            errors,
            archiveDateIndex,
            archiveUrlIndex,
            "archive-date",
            "Archive URL requires an archive date.",
        );
    }
    if (archiveDate !== "" && archiveUrl === "") {
        addMissingArchiveError(
            errors,
            archiveUrlIndex,
            archiveDateIndex,
            "archive-url",
            "Archive date requires an archive URL.",
        );
    }
}

function getTrimmedValue(
    rows: SourceDraftRowLike[],
    index: number | undefined,
): string {
    return index == null ? "" : (rows[index]?.value.trim() ?? "");
}

function addMissingArchiveError(
    errors: SourceDraftErrors,
    preferredIndex: number | undefined,
    fallbackIndex: number | undefined,
    missingName: string,
    message: string,
): void {
    if (preferredIndex != null) {
        addCellError(errors, preferredIndex, "value", message);
    } else if (fallbackIndex != null) {
        addCellError(
            errors,
            fallbackIndex,
            "value",
            `${message} Add the ${missingName} parameter.`,
        );
    }
}

/** Validates CS1 parameters that depend on another parameter. */
function validateParameterDependencies(
    rows: SourceDraftRowLike[],
    canonicalNames: Map<string, string>,
    errors: SourceDraftErrors,
): void {
    const byName = buildDraftRowIndex(rows, canonicalNames);
    for (const dependency of PARAMETER_DEPENDENCIES) {
        validateDependency(rows, byName, errors, dependency.source, [
            ...dependency.targets,
        ]);
    }
    for (const [name, index] of byName) {
        if (getTrimmedValue(rows, index) === "") {
            continue;
        }
        if (name.endsWith("-access")) {
            validateDependency(rows, byName, errors, name, [
                name.slice(0, -"-access".length),
            ]);
        }
        if (name.endsWith("-format")) {
            const base = name.slice(0, -"-format".length);
            validateDependency(rows, byName, errors, name, [`${base}-url`]);
        }
        if (name.startsWith("trans-")) {
            const base = name.slice("trans-".length);
            validateDependency(rows, byName, errors, name, [
                base,
                `script-${base}`,
            ]);
        }
    }
}

function buildDraftRowIndex(
    rows: SourceDraftRowLike[],
    canonicalNames: Map<string, string>,
): Map<string, number> {
    const byName = new Map<string, number>();
    for (const [index, row] of rows.entries()) {
        const name = normalizeParameterName(row.name);
        byName.set(canonicalNames.get(name) ?? name, index);
    }
    return byName;
}

function validateDependency(
    rows: SourceDraftRowLike[],
    byName: Map<string, number>,
    errors: SourceDraftErrors,
    sourceName: string,
    targetNames: string[],
): void {
    const sourceIndex = byName.get(sourceName);
    if (
        getTrimmedValue(rows, sourceIndex) === "" ||
        targetNames.some(
            (name) => getTrimmedValue(rows, byName.get(name)) !== "",
        )
    ) {
        return;
    }
    const targetIndex = targetNames
        .map((name) => byName.get(name))
        .find((index) => index != null);
    const alternatives = targetNames.map((name) => `|${name}=`).join(" or ");
    const message = `|${sourceName}= requires ${alternatives}.`;
    addCellError(
        errors,
        targetIndex ?? sourceIndex ?? 0,
        "value",
        targetIndex == null
            ? `${message} Add the ${targetNames[0]} parameter.`
            : message,
    );
}

/** Recognizes unambiguous date forms accepted by the two CS1 sites. */
function isValidCitationDate(
    entered: string,
    style: "english" | "chinese",
    canonicalName: string,
): boolean {
    const value = entered
        .replace(/<!--[\s\S]*?-->/gu, "")
        .trim()
        .replace(/\s+/gu, " ");
    if (value === "") {
        return true;
    }
    if (/[{}[\]<>]/u.test(value)) {
        return true;
    }
    if (canonicalName === "date" && /^(?:n\.d\.|nd)$/iu.test(value)) {
        return true;
    }
    if (/^[1-9]\d{3}$/u.test(value) || SEASONS.test(value)) {
        return true;
    }
    const range = value.match(/^([1-9]\d{3})\s*[–—]\s*([1-9]\d{3})$/u);
    if (range != null) {
        return Number(range[1]) <= Number(range[2]);
    }
    if (style === "chinese" && isValidChineseDate(value)) {
        return true;
    }
    return isValidIsoDate(value) || isValidEnglishDate(value);
}

function isValidChineseDate(value: string): boolean {
    const match = value.match(
        /^([1-9]\d{3})年(?:(\d{1,2})月(?:(\d{1,2})日)?)?$/u,
    );
    if (match == null) {
        return false;
    }
    const month = match[2] == null ? 1 : Number(match[2]);
    const day = match[3] == null ? 1 : Number(match[3]);
    return isValidCalendarDate(Number(match[1]), month, day);
}

function isValidIsoDate(value: string): boolean {
    const match = value.match(/^([1-9]\d{3})-(\d{2})(?:-(\d{2}))?$/u);
    if (match == null) {
        return false;
    }
    return isValidCalendarDate(
        Number(match[1]),
        Number(match[2]),
        Number(match[3] ?? "1"),
    );
}

function isValidEnglishDate(value: string): boolean {
    const monthFirst = value.match(
        /^([A-Za-z]+)\s+(?:(\d{1,2}),\s*)?([1-9]\d{3})$/u,
    );
    if (monthFirst != null) {
        return isValidNamedMonthDate(
            monthFirst[3],
            monthFirst[1],
            monthFirst[2] ?? "1",
        );
    }
    const dayFirst = value.match(/^(\d{1,2})\s+([A-Za-z]+)\s+([1-9]\d{3})$/u);
    return (
        dayFirst != null &&
        isValidNamedMonthDate(dayFirst[3], dayFirst[2], dayFirst[1])
    );
}

function isValidNamedMonthDate(
    year: string,
    monthName: string,
    day: string,
): boolean {
    const month = ENGLISH_MONTHS.get(monthName.toLocaleLowerCase("en-US"));
    return (
        month != null && isValidCalendarDate(Number(year), month, Number(day))
    );
}

function isValidCalendarDate(
    year: number,
    month: number,
    day: number,
): boolean {
    if (month < 1 || month > 12 || day < 1) {
        return false;
    }
    return day <= new Date(Date.UTC(year, month, 0)).getUTCDate();
}
