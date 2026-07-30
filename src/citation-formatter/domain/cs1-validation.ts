/**
 * Maps live CS1 validation output back to citation draft rows.
 */

import { serializeSourceDraft, type SourceDraft } from "./source-manager.ts";
import type {
    SourceDraftErrors,
    SourceDraftRowErrors,
} from "./source-validation.ts";

export interface Cs1ValidationResult {
    cellErrors: SourceDraftErrors;
    issueCount: number;
    messages: string[];
}

export type Cs1IssueSeverity = "error" | "maintenance";

export interface Cs1Issue {
    message: string;
    severity: Cs1IssueSeverity;
}

/** Orders errors first while retaining order inside each group. */
export function orderCs1ItemsBySeverity<
    Item extends { severity: Cs1IssueSeverity },
>(items: readonly Item[]): Item[] {
    return [
        ...items.filter((item) => item.severity === "error"),
        ...items.filter((item) => item.severity === "maintenance"),
    ];
}

const CS1_MESSAGE_SPAN_PATTERN = new RegExp(
    [
        String.raw`<span\b(?=[^>]*\sclass\s*=\s*`,
        String.raw`(?:"([^"]*)"|'([^']*)'))[^>]*>`,
        String.raw`([\s\S]*?)<\/span>`,
    ].join(""),
    "giu",
);
const CS1_ERROR_CLASSES = new Set(["cs1-hidden-error", "cs1-visible-error"]);
const PARAMETER_PATTERN = /\|([A-Za-z][A-Za-z0-9_-]*)\s*=/gu;
const HTML_ENTITY_PATTERN = /&(?:#(\d+)|#x([0-9a-f]+)|([a-z]+));/giu;
const CS1_CATEGORY_PATTERN = new RegExp(
    [
        String.raw`^(?:CS1 (?:errors|maint):|`,
        String.raw`引文格式1(?:错误|錯誤|維護|维护)[：:])`,
    ].join(""),
    "u",
);
const CS1_ERROR_CATEGORY_PATTERN =
    /^(?:CS1 errors:|引文格式1(?:错误|錯誤)[：:])/u;
const COMMON_PARAMETER_ALIASES: Record<string, string> = {
    accessdate: "access-date",
    archivedate: "archive-date",
    archiveurl: "archive-url",
    booktitle: "book-title",
    lang: "language",
    location: "place",
    p: "page",
    pp: "pages",
    publicationdate: "publication-date",
    publicationplace: "publication-place",
};

/**
 * Serializes only draft content that can affect live CS1 validation.
 *
 * Reference-name aliases and formatter directives are HTML comments, so
 * changing them must not hide issues returned for the citation fields.
 */
export function getCs1DraftFingerprint(draft: SourceDraft): string {
    return serializeSourceDraft(
        {
            rows: draft.rows.map(function omitReferenceNaming(row) {
                return { ...row, alias: "", directive: "" };
            }),
            template: draft.template,
        },
        "inline",
    );
}

/** Combines local and live cell errors without dropping messages. */
export function mergeSourceDraftErrors(
    local: SourceDraftErrors,
    live: SourceDraftErrors,
): SourceDraftErrors {
    const result: SourceDraftErrors = new Map();
    for (const [index, errors] of local) {
        result.set(index, { ...errors });
    }
    for (const [index, errors] of live) {
        const combined = result.get(index) ?? {};
        for (const cell of ["alias", "name", "value"] as const) {
            appendMessage(combined, cell, errors[cell]);
        }
        result.set(index, combined);
    }
    return result;
}

/**
 * Extracts all CS1 error and maintenance messages from parse output.
 *
 * This avoids an HTML-library dependency, allowing Node unit tests and
 * browser use.
 */
export function parseCs1ValidationResult(
    draft: SourceDraft,
    html: string,
    categories: readonly string[] = [],
): Cs1ValidationResult {
    const messages = extractCs1IssueMessages(html, categories);
    const cellErrors: SourceDraftErrors = new Map();
    const unmapped: string[] = [];
    for (const message of messages) {
        const indexes = findMessageRowIndexes(draft, message);
        if (indexes.length === 0) {
            unmapped.push(message);
            continue;
        }
        const cell = getMessageCell(message);
        for (const index of indexes) {
            const rowErrors = cellErrors.get(index) ?? {};
            appendMessage(rowErrors, cell, message);
            cellErrors.set(index, rowErrors);
        }
    }
    return {
        cellErrors,
        issueCount: messages.length,
        messages: unmapped,
    };
}

/** Extracts unique CS1 messages from parse output. */
export function extractCs1IssueMessages(
    html: string,
    categories: readonly string[] = [],
): string[] {
    const categoryIssues = extractCs1CategoryIssues(categories);
    return deduplicateCs1Issues([
        ...extractCs1HtmlIssues(html, categoryIssues, false),
        ...categoryIssues,
    ]).map((issue) => issue.message);
}

/**
 * Extracts issues from one isolated citation fragment.
 *
 * Green citation comments are maintenance results.
 * A matching page category refines their severity.
 */
export function extractCs1FragmentIssueMessages(
    html: string,
    categories: readonly string[] = [],
): string[] {
    return extractCs1FragmentIssues(html, categories).map(
        (issue) => issue.message,
    );
}

/** Extracts typed CS1 issues from one isolated citation fragment. */
export function extractCs1FragmentIssues(
    html: string,
    categories: readonly string[] = [],
): Cs1Issue[] {
    return extractCs1HtmlIssues(
        html,
        extractCs1CategoryIssues(categories),
        true,
    );
}

function extractCs1HtmlIssues(
    html: string,
    categoryIssues: readonly Cs1Issue[],
    includePlainComments: boolean,
): Cs1Issue[] {
    const issues: Cs1Issue[] = [];
    const categorySeverities = new Map(
        categoryIssues.map((issue) => [issue.message, issue.severity]),
    );
    for (const match of html.matchAll(CS1_MESSAGE_SPAN_PATTERN)) {
        const classNames = new Set(
            (match[1] ?? match[2] ?? "")
                .toLocaleLowerCase("en-US")
                .split(/\s+/gu)
                .filter(Boolean),
        );
        const message = normalizeHtmlText(match[3]);
        const severity = getCs1SpanSeverity(
            classNames,
            categorySeverities.get(message),
            includePlainComments,
        );
        if (message === "" || severity == null) {
            continue;
        }
        issues.push({ message, severity });
    }
    return deduplicateCs1Issues(issues);
}

function extractCs1CategoryIssues(categories: readonly string[]): Cs1Issue[] {
    const issues: Cs1Issue[] = [];
    for (const category of categories) {
        const normalized = category.trim();
        if (CS1_CATEGORY_PATTERN.test(normalized)) {
            issues.push({
                message: normalized,
                severity: CS1_ERROR_CATEGORY_PATTERN.test(normalized)
                    ? "error"
                    : "maintenance",
            });
        }
    }
    return deduplicateCs1Issues(issues);
}

function getCs1SpanSeverity(
    classNames: Set<string>,
    categorySeverity: Cs1IssueSeverity | undefined,
    includePlainComments: boolean,
): Cs1IssueSeverity | null {
    if (
        [...CS1_ERROR_CLASSES].some((name) => classNames.has(name)) ||
        (classNames.has("error") && classNames.has("citation-comment"))
    ) {
        return "error";
    }
    if (classNames.has("cs1-maint")) {
        return categorySeverity ?? "maintenance";
    }
    if (classNames.has("citation-comment")) {
        if (categorySeverity != null) {
            return categorySeverity;
        }
        return includePlainComments ? "maintenance" : null;
    }
    return null;
}

function deduplicateCs1Issues(issues: readonly Cs1Issue[]): Cs1Issue[] {
    const unique = new Map<string, Cs1Issue>();
    for (const issue of issues) {
        const existing = unique.get(issue.message);
        if (existing == null || issue.severity === "error") {
            unique.set(issue.message, issue);
        }
    }
    return orderCs1ItemsBySeverity([...unique.values()]);
}

function normalizeHtmlText(html: string): string {
    const text = decodeHtmlEntities(
        html
            .replace(/<br\s*\/?>/giu, " ")
            .replace(/<[^>]*>/gu, "")
            .replace(/\s+/gu, " ")
            .trim(),
    );
    return text.replace(/\s*\((?:help|link|帮助)\)$/iu, "");
}

function decodeHtmlEntities(value: string): string {
    const named: Record<string, string> = {
        amp: "&",
        apos: "'",
        gt: ">",
        lt: "<",
        nbsp: " ",
        quot: '"',
    };
    return value.replace(
        HTML_ENTITY_PATTERN,
        function replaceEntity(_entity, decimal, hexadecimal, name) {
            if (decimal != null) {
                return String.fromCodePoint(Number(decimal));
            }
            if (hexadecimal != null) {
                return String.fromCodePoint(Number.parseInt(hexadecimal, 16));
            }
            return named[String(name).toLocaleLowerCase("en-US")] ?? _entity;
        },
    );
}

function findMessageRowIndexes(draft: SourceDraft, message: string): number[] {
    const referenced = new Set(
        [...message.matchAll(PARAMETER_PATTERN)].map((match) =>
            normalizeComparableName(match[1]),
        ),
    );
    const direct = draft.rows.flatMap(function findDirect(row, index) {
        return referenced.has(normalizeComparableName(row.name))
            ? [index]
            : [];
    });
    if (direct.length > 0) {
        return direct;
    }
    const normalizedMessage = message.toLocaleLowerCase("en-US");
    if (normalizedMessage.includes("author-name-list parameters")) {
        return findNameListRows(draft, "author");
    }
    if (normalizedMessage.includes("editor-name-list parameters")) {
        return findNameListRows(draft, "editor");
    }
    if (
        normalizedMessage.includes("vancouver style error") ||
        message.includes("温哥华格式")
    ) {
        return draft.rows.flatMap(function findVancouver(row, index) {
            const name = normalizeName(row.name);
            return ["vauthors", "veditors"].includes(name) &&
                row.value.trim() !== ""
                ? [index]
                : [];
        });
    }
    return [];
}

function findNameListRows(
    draft: SourceDraft,
    role: "author" | "editor",
): number[] {
    return draft.rows.flatMap(function findNameRow(row, index) {
        if (row.value.trim() === "" || !isNameListParameter(row.name, role)) {
            return [];
        }
        return [index];
    });
}

function isNameListParameter(
    entered: string,
    role: "author" | "editor",
): boolean {
    const name = normalizeName(entered);
    if (
        role === "author" &&
        ["authors", "people", "credits", "vauthors"].includes(name)
    ) {
        return true;
    }
    if (role === "editor" && ["editors", "veditors"].includes(name)) {
        return true;
    }
    if (role === "author") {
        return new RegExp(
            "^(?:author|first|given|host|last|subject|surname)" +
                "(?:(?:-first|-given|-last|-surname)?\\d*|" +
                "\\d+-(?:first|given|last|surname))$",
            "u",
        ).test(name);
    }
    return new RegExp(
        "^(?:editor)(?:(?:-first|-given|-last|-surname)?\\d*|" +
            "\\d+-(?:first|given|last|surname))$",
        "u",
    ).test(name);
}

function getMessageCell(message: string): keyof SourceDraftRowErrors {
    const ignoredParameter =
        /(?:unknown|unsupported|deprecated) parameter|\bignored\b/iu;
    const ignoredChineseParameter =
        /未知参数|已忽略.*参数|参数.*(?:不支持|已弃用)/u;
    return ignoredParameter.test(message) ||
        ignoredChineseParameter.test(message)
        ? "name"
        : "value";
}

function normalizeName(name: string): string {
    return name.trim().toLocaleLowerCase("en-US");
}

function normalizeComparableName(name: string): string {
    const normalized = normalizeName(name);
    return COMMON_PARAMETER_ALIASES[normalized] ?? normalized;
}

function appendMessage(
    errors: SourceDraftRowErrors,
    cell: keyof SourceDraftRowErrors,
    message: string | undefined,
): void {
    if (message == null || message === "") {
        return;
    }
    const current = errors[cell];
    if (current == null || current === "") {
        errors[cell] = message;
    } else if (!current.split("\n").includes(message)) {
        errors[cell] = `${current}\n${message}`;
    }
}
