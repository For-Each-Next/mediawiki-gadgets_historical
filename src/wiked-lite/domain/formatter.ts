/** Deterministic wikEd-style safe formatting operations. */

import {
    wikitext,
    type ParsedTemplateCall,
    type SourceRange,
} from "#shared/wikitext";

export type FirstParameterLayout = "align-separator" | "compact" | "preserve";

export type SubsequentParameterLayout =
    "align-columns" | "align-columns-completely" | "compact" | "preserve";

export interface FormatterOptions {
    firstParameterLayout?: FirstParameterLayout;
    fullWidthRatio?: number;
    indentPipes?: boolean;
    normalizeConversion?: boolean;
    subsequentParameterLayout?: SubsequentParameterLayout;
}

export interface FormatterResult {
    changed: boolean;
    text: string;
}

interface BlockTemplateLine {
    closingDepth?: number;
    templateDepth: number;
    templateId?: number;
    text: string;
}

interface BlockParameterLine {
    content: string;
    indentation: string;
}

interface BlockParameterCell {
    name: string;
    named: boolean;
    raw: string;
    value: string;
}

interface BlockTemplateColumn {
    contentWidth: number;
    equalsWidth: number;
}

interface BlockTemplateLayout {
    columns: Map<number, BlockTemplateColumn[]>;
    firstParameterLayout: FirstParameterLayout;
    indentPipes: boolean;
    ratio: number;
    subsequentParameterLayout: SubsequentParameterLayout;
}

interface FormatterNestingState {
    comment: boolean;
    nextTemplateId: number;
    tableDepth: number;
    templateStack: number[];
    variableStack: FormatterVariableConstruct[];
}

type FormatterVariableConstruct = "parameter" | "template";

const EXPLANATORY_FOOTNOTE_PATTERN = /^efn(?:$|[- /])/u;
const HEADING_PATTERN = /^(={1,6})(?![=])[ \t]*(.*?)[ \t]*\1[ \t]*$/gmu;
const NORMALIZED_HEADING_PATTERN = /^(={1,6})(?![=]) .* \1$/u;

/**
 * Applies basic fixes and explicitly selected layout changes.
 *
 * @param source - Source text.
 * @param options - Operation options.
 * @returns Operation result.
 */
export function formatWikitext(
    source: string,
    options: FormatterOptions = {},
): FormatterResult {
    const protectedSource = protectOpaqueSource(source);
    let text = normalizeBasicLayout(protectedSource.text);
    text = numberExplanatoryFootnoteReferenceArguments(text);
    if (options.normalizeConversion === true) {
        text = normalizeChineseConversion(text);
    }
    if (shouldFormatBlockTemplates(options)) {
        text = formatBlockTemplates(text, options);
    }
    text = protectedSource.restore(text);
    return { changed: text !== source, text };
}

function shouldFormatBlockTemplates(options: FormatterOptions): boolean {
    return (
        options.indentPipes === true ||
        options.firstParameterLayout === "align-separator" ||
        options.firstParameterLayout === "compact" ||
        options.subsequentParameterLayout === "align-columns" ||
        options.subsequentParameterLayout === "align-columns-completely" ||
        options.subsequentParameterLayout === "compact"
    );
}

function normalizeBasicLayout(source: string): string {
    const normalized = source
        .replaceAll("\r\n", "\n")
        .replaceAll("\r", "\n")
        .replace(/[ \t]+$/gmu, "")
        .replace(HEADING_PATTERN, "$1 $2 $1")
        .replace(/^([#*:;]+)[ \t]+/gmu, "$1 ")
        .replace(/^----+\s*$/gmu, "----")
        .replace(/\[\[\s*([^\]|]+?)\s*\|\s*([^\]]+?)\s*\]\]/gu, "[[$1|$2]]")
        .replace(/\[\[\s*([^\]|]+?)\s*\]\]/gu, "[[$1]]");
    return ensureBlankLinesAroundHeadings(normalized);
}

/**
 * Separates every normalized heading from surrounding content.
 *
 * Only headings trigger insertion, so DEFAULTSORT and other magic words
 * keep their surrounding lines. Existing empty lines preserve
 * idempotence.
 *
 * @param source - Normalized wikitext.
 * @returns Wikitext with headings separated from surrounding content.
 */
function ensureBlankLinesAroundHeadings(source: string): string {
    const lines = source.split("\n");
    const separated: string[] = [];
    for (const [index, line] of lines.entries()) {
        if (NORMALIZED_HEADING_PATTERN.test(line) && separated.at(-1) !== "") {
            separated.push("");
        }
        separated.push(line);
        const nextLine = lines[index + 1];
        if (!NORMALIZED_HEADING_PATTERN.test(line)) {
            continue;
        }
        if (nextLine === "") {
            if (index + 1 === lines.length - 1) {
                separated.push("");
            }
            continue;
        }
        separated.push("");
        if (nextLine == null) {
            separated.push("");
        }
    }
    return separated.join("\n");
}

/**
 * Numbers an efn note with an equals sign inside an unclosed ref tag.
 *
 * Complete ref tags are protected extension nodes. An unmatched opening
 * can still turn the preceding text into a parameter name. An explicit
 * number preserves the intended note value.
 */
function numberExplanatoryFootnoteReferenceArguments(source: string): string {
    const query = wikitext(source);
    const referenceOpenings = query.tag
        .getAll("ref")
        .map(function toOpeningRange(tag) {
            return { end: tag.contentStart, start: tag.start };
        });
    const insertionPoints = query.template
        .getAll()
        .flatMap(function findInsertionPoint(template) {
            return findFootnoteInsertionPoint(template, referenceOpenings);
        })
        .toSorted((left, right) => right - left);
    let result = source;
    for (const point of insertionPoints) {
        result = `${result.slice(0, point)}1=${result.slice(point)}`;
    }
    return result;
}

function findFootnoteInsertionPoint(
    template: ParsedTemplateCall,
    referenceOpenings: SourceRange[],
): number[] {
    const name = wikitext.template.normalizeName(template.name);
    if (
        !EXPLANATORY_FOOTNOTE_PATTERN.test(name) ||
        template.params.some((parameter) => parameter.name === "1")
    ) {
        return [];
    }
    const argument = template.params.find(function hasRefSeparator(parameter) {
        if (parameter.positional) {
            return false;
        }
        const separator = parameter.valueStart - 1;
        return referenceOpenings.some(function containsSeparator(opening) {
            return opening.start <= separator && separator < opening.end;
        });
    });
    return argument == null ? [] : [argument.start];
}

function normalizeChineseConversion(source: string): string {
    return source.replace(/-\{([\s\S]*?)\}-/gu, function normalize(_, body) {
        const fixed = String(body)
            .replace(/\s*;\s*/gu, "; ")
            .replace(/;\s*$/u, "");
        return `-{${fixed}}-`;
    });
}

function formatBlockTemplates(
    source: string,
    options: FormatterOptions,
): string {
    const lines = scanBlockTemplateLines(source);
    const ratio = options.fullWidthRatio ?? 5 / 3;
    const layout: BlockTemplateLayout = {
        columns: new Map(),
        firstParameterLayout: options.firstParameterLayout ?? "preserve",
        indentPipes: options.indentPipes === true,
        ratio,
        subsequentParameterLayout:
            options.subsequentParameterLayout ?? "preserve",
    };
    layout.columns = getTemplateColumns(lines, layout);
    return lines.map((line) => formatBlockLine(line, layout)).join("\n");
}

function scanBlockTemplateLines(source: string): BlockTemplateLine[] {
    const state: FormatterNestingState = {
        comment: false,
        nextTemplateId: 1,
        tableDepth: 0,
        templateStack: [],
        variableStack: [],
    };
    return source.split("\n").map(function scanLine(text) {
        const templateDepth = state.templateStack.length;
        const active = isFormatterLineActive(state);
        const closingDepth =
            active && templateDepth > 0 && /^\s*\}\}\s*$/u.test(text)
                ? templateDepth - 1
                : undefined;
        const templateId =
            active && /^\s*\|/u.test(text)
                ? state.templateStack.at(-1)
                : undefined;
        scanFormatterNesting(text, state);
        return { closingDepth, templateDepth, templateId, text };
    });
}

function isFormatterLineActive(state: FormatterNestingState): boolean {
    return (
        !state.comment &&
        state.tableDepth === 0 &&
        state.variableStack.length === 0
    );
}

function scanFormatterNesting(
    line: string,
    state: FormatterNestingState,
): void {
    let index = 0;
    while (index < line.length) {
        const commentEnd = consumeFormatterComment(line, index, state);
        if (commentEnd != null) {
            index = commentEnd;
            continue;
        }
        const variableEnd = consumeFormatterVariable(line, index, state);
        if (variableEnd != null) {
            index = variableEnd;
            continue;
        }
        index = consumeFormatterStructure(line, index, state) ?? index + 1;
    }
}

function consumeFormatterComment(
    line: string,
    index: number,
    state: FormatterNestingState,
): number | undefined {
    if (state.comment) {
        if (line.startsWith("-->", index)) {
            state.comment = false;
            return index + 3;
        }
        return index + 1;
    }
    if (line.startsWith("<!--", index)) {
        state.comment = true;
        return index + 4;
    }
    return undefined;
}

function consumeFormatterVariable(
    line: string,
    index: number,
    state: FormatterNestingState,
): number | undefined {
    const active = state.variableStack.at(-1);
    if (active === "parameter" && line.startsWith("}}}", index)) {
        state.variableStack.pop();
        return index + 3;
    }
    if (active === "template" && line.startsWith("}}", index)) {
        state.variableStack.pop();
        return index + 2;
    }
    if (line.startsWith("{{{", index)) {
        state.variableStack.push("parameter");
        return index + 3;
    }
    if (active == null) {
        return undefined;
    }
    if (line.startsWith("{{", index)) {
        state.variableStack.push("template");
        return index + 2;
    }
    return index + 1;
}

function consumeFormatterStructure(
    line: string,
    index: number,
    state: FormatterNestingState,
): number | undefined {
    if (line.startsWith("{|", index)) {
        state.tableDepth += 1;
        return index + 2;
    }
    if (line.startsWith("|}", index) && state.tableDepth > 0) {
        state.tableDepth -= 1;
        return index + 2;
    }
    if (line.startsWith("{{", index)) {
        state.templateStack.push(state.nextTemplateId);
        state.nextTemplateId += 1;
        return index + 2;
    }
    if (line.startsWith("}}", index) && state.templateStack.length > 0) {
        state.templateStack.pop();
        return index + 2;
    }
    return undefined;
}

function getTemplateColumns(
    lines: BlockTemplateLine[],
    layout: BlockTemplateLayout,
): Map<number, BlockTemplateColumn[]> {
    const columns = new Map<number, BlockTemplateColumn[]>();
    if (!needsColumnMeasurements(layout)) {
        return columns;
    }
    for (const line of lines) {
        updateEqualsWidths(line, columns, layout);
    }
    for (const line of lines) {
        updateContentWidths(line, columns, layout);
    }
    return columns;
}

function needsColumnMeasurements(layout: BlockTemplateLayout): boolean {
    return (
        layout.firstParameterLayout === "align-separator" ||
        layout.subsequentParameterLayout === "align-columns" ||
        layout.subsequentParameterLayout === "align-columns-completely"
    );
}

function updateEqualsWidths(
    line: BlockTemplateLine,
    columns: Map<number, BlockTemplateColumn[]>,
    layout: BlockTemplateLayout,
): void {
    const cells = getLayoutCells(line);
    if (line.templateId == null || cells == null) {
        return;
    }
    const templateColumns = getOrCreateColumns(columns, line.templateId);
    for (const [index, cell] of cells.entries()) {
        if (!shouldAlignCellSeparator(index, layout) || !cell.named) {
            continue;
        }
        const column = getOrCreateColumn(templateColumns, index);
        column.equalsWidth = Math.max(
            column.equalsWidth,
            getDisplayWidth(cell.name, layout.ratio),
        );
    }
}

function shouldAlignCellSeparator(
    index: number,
    layout: BlockTemplateLayout,
): boolean {
    return index === 0
        ? layout.firstParameterLayout === "align-separator"
        : layout.subsequentParameterLayout === "align-columns-completely";
}

function updateContentWidths(
    line: BlockTemplateLine,
    columns: Map<number, BlockTemplateColumn[]>,
    layout: BlockTemplateLayout,
): void {
    if (
        layout.subsequentParameterLayout !== "align-columns" &&
        layout.subsequentParameterLayout !== "align-columns-completely"
    ) {
        return;
    }
    const cells = getLayoutCells(line);
    const templateColumns =
        line.templateId == null ? undefined : columns.get(line.templateId);
    if (cells == null || templateColumns == null) {
        return;
    }
    for (const [index, cell] of cells.entries()) {
        if (index === cells.length - 1) {
            continue;
        }
        const column = getOrCreateColumn(templateColumns, index);
        const content = formatParameterSegment(
            cell,
            index,
            column.equalsWidth,
            layout,
            true,
        );
        column.contentWidth = Math.max(
            column.contentWidth,
            getDisplayWidth(content, layout.ratio),
        );
    }
}

function getLayoutCells(
    line: BlockTemplateLine,
): BlockParameterCell[] | undefined {
    if (line.templateId == null) {
        return undefined;
    }
    const parameter = parseBlockParameterLine(line.text);
    if (parameter == null) {
        return undefined;
    }
    return parseBlockParameterCells(parameter.content);
}

function getOrCreateColumns(
    columns: Map<number, BlockTemplateColumn[]>,
    templateId: number,
): BlockTemplateColumn[] {
    const existing = columns.get(templateId);
    if (existing != null) {
        return existing;
    }
    const created: BlockTemplateColumn[] = [];
    columns.set(templateId, created);
    return created;
}

function getOrCreateColumn(
    columns: BlockTemplateColumn[],
    index: number,
): BlockTemplateColumn {
    const existing = columns[index];
    if (existing != null) {
        return existing;
    }
    const created = { contentWidth: 0, equalsWidth: 0 };
    columns[index] = created;
    return created;
}

function parseBlockParameterLine(
    text: string,
): BlockParameterLine | undefined {
    const match = text.match(/^(\s*)\|(.*)$/u);
    return match == null
        ? undefined
        : { content: match[2], indentation: match[1] };
}

function formatBlockLine(
    line: BlockTemplateLine,
    layout: BlockTemplateLayout,
): string {
    if (layout.indentPipes && line.closingDepth != null) {
        return line.text.replace(
            /^\s*(?=\}\})/u,
            "  ".repeat(line.closingDepth),
        );
    }
    if (line.templateId == null) {
        return line.text;
    }
    const parameter = parseBlockParameterLine(line.text);
    return parameter == null
        ? line.text
        : formatTemplateLine(
              parameter,
              line.templateDepth,
              layout.columns.get(line.templateId) ?? [],
              layout,
          );
}

function formatTemplateLine(
    line: BlockParameterLine,
    templateDepth: number,
    columns: BlockTemplateColumn[],
    layout: BlockTemplateLayout,
): string {
    const indentation = layout.indentPipes
        ? "  ".repeat(templateDepth)
        : line.indentation;
    const prefix = `${indentation}|`;
    const cells = parseBlockParameterCells(line.content);
    if (cells.length === 1 && layout.firstParameterLayout === "preserve") {
        return `${prefix}${line.content}`;
    }
    if (layout.subsequentParameterLayout === "preserve") {
        return formatLineWithPreservedTail(
            line.content,
            prefix,
            cells,
            columns,
            layout,
        );
    }
    return formatParameterLine(prefix, cells, columns, layout);
}

function formatLineWithPreservedTail(
    content: string,
    prefix: string,
    cells: BlockParameterCell[],
    columns: BlockTemplateColumn[],
    layout: BlockTemplateLayout,
): string {
    if (layout.firstParameterLayout === "preserve") {
        return `${prefix}${content}`;
    }
    const first = wikitext(content).splitRanges("|")[0];
    if (first == null) {
        return `${prefix}${content}`;
    }
    const segment = formatParameterSegment(
        cells[0],
        0,
        columns[0]?.equalsWidth ?? 0,
        layout,
        false,
    );
    const tail = content.slice(first.end);
    return tail === "" ? `${prefix}${segment}` : `${prefix}${segment} ${tail}`;
}

function formatParameterLine(
    prefix: string,
    cells: BlockParameterCell[],
    columns: BlockTemplateColumn[],
    layout: BlockTemplateLayout,
): string {
    const alignColumns =
        layout.subsequentParameterLayout === "align-columns" ||
        layout.subsequentParameterLayout === "align-columns-completely";
    const formatted = cells.map(function formatCell(cell, index) {
        const column = columns[index] ?? { contentWidth: 0, equalsWidth: 0 };
        const value = formatParameterSegment(
            cell,
            index,
            column.equalsWidth,
            layout,
            index < cells.length - 1,
        );
        if (index === cells.length - 1) {
            return value;
        }
        if (!alignColumns) {
            return `${value} `;
        }
        const padding = Math.max(
            1,
            Math.ceil(
                column.contentWidth - getDisplayWidth(value, layout.ratio),
            ) + 1,
        );
        return `${value}${" ".repeat(padding)}`;
    });
    return `${prefix}${formatted.join("|")}`;
}

function parseBlockParameterCells(content: string): BlockParameterCell[] {
    return wikitext(content)
        .splitRanges("|")
        .map((range) => parseBlockParameterCell(range.value));
}

function parseBlockParameterCell(content: string): BlockParameterCell {
    const trimmed = content.trim();
    const equals = wikitext(trimmed).findTopLevelEquals();
    if (equals < 0) {
        return { name: "", named: false, raw: content, value: trimmed };
    }
    return {
        name: trimmed.slice(0, equals).trim(),
        named: true,
        raw: content,
        value: trimmed.slice(equals + 1).trim(),
    };
}

function formatParameterSegment(
    cell: BlockParameterCell,
    index: number,
    equalsWidth: number,
    layout: BlockTemplateLayout,
    followedByParameter: boolean,
): string {
    if (index === 0 && layout.firstParameterLayout === "preserve") {
        return followedByParameter ? cell.raw.trimEnd() : cell.raw;
    }
    const alignSeparator = shouldAlignCellSeparator(index, layout);
    return ` ${formatParameterCell(
        cell,
        alignSeparator ? equalsWidth : 0,
        layout.ratio,
    )}`;
}

function formatParameterCell(
    cell: BlockParameterCell,
    equalsWidth: number,
    ratio: number,
): string {
    if (!cell.named) {
        return cell.value;
    }
    const padding = " ".repeat(
        Math.max(
            1,
            Math.ceil(equalsWidth - getDisplayWidth(cell.name, ratio)) + 1,
        ),
    );
    return `${cell.name}${padding}= ${cell.value}`;
}

function getDisplayWidth(value: string, ratio: number): number {
    return [...value].reduce(function addWidth(total, character) {
        if (/\p{Mark}/u.test(character)) {
            return total;
        }
        const codePoint = character.codePointAt(0) ?? 0;
        return total + (codePoint <= 0x7f ? 1 : ratio);
    }, 0);
}

function protectOpaqueSource(source: string): {
    restore(value: string): string;
    text: string;
} {
    const ranges = wikitext(source)
        .opaque.getAll()
        .sort((left, right) => right.start - left.start);
    const values: string[] = [];
    let protectedText = source;
    for (const range of ranges) {
        const placeholder = createPlaceholder(source, values.length);
        values.push(source.slice(range.start, range.end));
        protectedText =
            protectedText.slice(0, range.start) +
            placeholder +
            protectedText.slice(range.end);
    }
    return {
        restore(value) {
            return restoreProtectedValues(value, source, values);
        },
        text: protectedText,
    };
}

function createPlaceholder(source: string, index: number): string {
    let marker = `\uE000WIKED-LITE-${index}\uE001`;
    while (source.includes(marker)) {
        marker = `\uE000${marker}\uE001`;
    }
    return marker;
}

function restoreProtectedValues(
    source: string,
    original: string,
    values: string[],
): string {
    let restored = source;
    for (const [index, value] of values.entries()) {
        restored = restored.replace(createPlaceholder(original, index), value);
    }
    return restored;
}
