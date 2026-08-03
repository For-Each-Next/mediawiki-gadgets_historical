/** Deterministic wikEd-style safe formatting operations. */

import {
    wikitext,
    type ParsedTemplateCall,
    type SourceRange,
} from "#shared/wikitext";

export interface FormatterOptions {
    alignEquals?: boolean;
    fullWidthRatio?: number;
    indentPipes?: boolean;
    normalizeConversion?: boolean;
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

interface BlockTemplateLayout {
    equalsColumns: Map<number, number>;
    options: FormatterOptions;
    ratio: number;
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
const NORMALIZED_HEADING_PATTERN = /^(={1,6}) .* \1$/u;

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
    if (options.indentPipes === true || options.alignEquals === true) {
        text = formatBlockTemplates(text, options);
    }
    text = protectedSource.restore(text);
    return { changed: text !== source, text };
}

function normalizeBasicLayout(source: string): string {
    const normalized = source
        .replaceAll("\r\n", "\n")
        .replaceAll("\r", "\n")
        .replace(/[ \t]+$/gmu, "")
        .replace(/^(={1,6})\s*(.*?)\s*\1\s*$/gmu, "$1 $2 $1")
        .replace(/^([#*:;]+)[ \t]+/gmu, "$1 ")
        .replace(/^----+\s*$/gmu, "----")
        .replace(/\[\[\s*([^\]|]+?)\s*\|\s*([^\]]+?)\s*\]\]/gu, "[[$1|$2]]")
        .replace(/\[\[\s*([^\]]+?)\s*\]\]/gu, "[[$1]]");
    return ensureBlankLineAfterHeadings(normalized);
}

/**
 * Separates every normalized heading from following content.
 *
 * Only headings trigger insertion, so DEFAULTSORT and other magic words
 * keep their following line. Existing empty lines retain idempotence.
 *
 * @param source - Normalized wikitext.
 * @returns Wikitext with headings separated from following content.
 */
function ensureBlankLineAfterHeadings(source: string): string {
    const lines = source.split("\n");
    const separated: string[] = [];
    for (const [index, line] of lines.entries()) {
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
 * Numbers an efn note with an equals sign inside a nested ref tag.
 *
 * MediaWiki otherwise reads the preceding text as a parameter name. An
 * explicit number preserves the intended note value.
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
    const ratio = options.fullWidthRatio ?? 2;
    const layout = {
        equalsColumns: getEqualsColumns(lines, ratio, options),
        options,
        ratio,
    };
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

function getEqualsColumns(
    lines: BlockTemplateLine[],
    ratio: number,
    options: FormatterOptions,
): Map<number, number> {
    const columns = new Map<number, number>();
    if (options.alignEquals !== true) {
        return columns;
    }
    for (const line of lines) {
        if (line.templateId == null) {
            continue;
        }
        const parameter = parseBlockParameterLine(line.text);
        if (parameter == null) {
            continue;
        }
        const equals = wikitext(parameter.content).findTopLevelEquals();
        const name =
            equals < 0 ? "" : parameter.content.slice(0, equals).trim();
        const width = getDisplayWidth(name, ratio);
        columns.set(
            line.templateId,
            Math.max(columns.get(line.templateId) ?? 0, width),
        );
    }
    return columns;
}

function parseBlockParameterLine(
    text: string,
): BlockParameterLine | undefined {
    const match = text.match(/^(\s*)\|\s*(.*)$/u);
    return match == null
        ? undefined
        : { content: match[2], indentation: match[1] };
}

function formatBlockLine(
    line: BlockTemplateLine,
    layout: BlockTemplateLayout,
): string {
    if (layout.options.indentPipes && line.closingDepth != null) {
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
              layout.equalsColumns.get(line.templateId) ?? 0,
              layout,
          );
}

function formatTemplateLine(
    line: BlockParameterLine,
    templateDepth: number,
    equalsColumn: number,
    layout: BlockTemplateLayout,
): string {
    const content = line.content;
    const equals = wikitext(content).findTopLevelEquals();
    const indentation = layout.options.indentPipes
        ? "  ".repeat(templateDepth)
        : line.indentation;
    const prefix = `${indentation}|`;
    if (equals < 0) {
        return `${prefix} ${content.trim()}`;
    }
    const name = content.slice(0, equals).trim();
    const value = content.slice(equals + 1).trim();
    const padding = layout.options.alignEquals
        ? " ".repeat(
              Math.max(
                  1,
                  Math.ceil(
                      equalsColumn - getDisplayWidth(name, layout.ratio),
                  ) + 1,
              ),
          )
        : " ";
    return `${prefix} ${name}${padding}= ${value}`;
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
