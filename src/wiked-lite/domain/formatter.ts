/** Deterministic wikEd-style safe formatting operations. */

import { wikitext } from "#shared/wikitext";

export interface FormatterOptions {
    alignEquals?: boolean;
    fullWidthRatio?: number;
    indentPipes?: boolean;
    normalizeConversion?: boolean;
    sortCategories?: boolean;
}

export interface FormatterResult {
    changed: boolean;
    text: string;
}

const CATEGORY_LINE_PATTERN =
    /^(\s*\[\[(?:category|分类|分類)\s*:[^\n]+\]\]\s*)$/gimu;

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
    if (options.normalizeConversion === true) {
        text = normalizeChineseConversion(text);
    }
    if (options.indentPipes === true || options.alignEquals === true) {
        text = formatBlockTemplates(text, options);
    }
    if (options.sortCategories === true) {
        text = sortCategoryRuns(text);
    }
    text = protectedSource.restore(text);
    return { changed: text !== source, text };
}

function normalizeBasicLayout(source: string): string {
    return source
        .replaceAll("\r\n", "\n")
        .replaceAll("\r", "\n")
        .replace(/[ \t]+$/gmu, "")
        .replace(/^(={1,6})\s*(.*?)\s*\1\s*$/gmu, "$1 $2 $1")
        .replace(/^([#*:;]+)[ \t]+/gmu, "$1 ")
        .replace(/^----+\s*$/gmu, "----")
        .replace(/\[\[\s*([^\]|]+?)\s*\|\s*([^\]]+?)\s*\]\]/gu, "[[$1|$2]]")
        .replace(/\[\[\s*([^\]]+?)\s*\]\]/gu, "[[$1]]");
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
    const templates = wikitext(source)
        .template.getAll()
        .filter((template) => template.depth === 0)
        .sort((left, right) => right.start - left.start);
    let formatted = source;
    for (const template of templates) {
        const original = formatted.slice(template.start, template.end);
        if (!original.includes("\n")) {
            continue;
        }
        const replacement = formatOneBlockTemplate(original, options);
        formatted =
            formatted.slice(0, template.start) +
            replacement +
            formatted.slice(template.end);
    }
    return formatted;
}

function formatOneBlockTemplate(
    source: string,
    options: FormatterOptions,
): string {
    const lines = source.split("\n");
    const parameterLines = lines.filter((line) => /^\s*\|/u.test(line));
    const ratio = options.fullWidthRatio ?? 2;
    const equalsColumn = options.alignEquals
        ? getEqualsColumn(parameterLines, ratio)
        : 0;
    return lines
        .map((line) => formatTemplateLine(line, equalsColumn, ratio, options))
        .join("\n");
}

function getEqualsColumn(lines: string[], ratio: number): number {
    return lines.reduce(function getLongest(current, line) {
        const content = line.replace(/^\s*\|\s*/u, "");
        const equals = wikitext(content).findTopLevelEquals();
        const name = equals < 0 ? "" : content.slice(0, equals).trim();
        return Math.max(current, getDisplayWidth(name, ratio));
    }, 0);
}

function formatTemplateLine(
    line: string,
    equalsColumn: number,
    ratio: number,
    options: FormatterOptions,
): string {
    const match = line.match(/^(\s*)\|\s*(.*)$/u);
    if (match == null) {
        return line;
    }
    const content = match[2];
    const equals = wikitext(content).findTopLevelEquals();
    const prefix = options.indentPipes ? "  |" : `${match[1]}|`;
    if (equals < 0) {
        return `${prefix} ${content.trim()}`;
    }
    const name = content.slice(0, equals).trim();
    const value = content.slice(equals + 1).trim();
    const padding = options.alignEquals
        ? " ".repeat(
              Math.max(1, equalsColumn - getDisplayWidth(name, ratio) + 1),
          )
        : " ";
    return `${prefix} ${name}${padding}= ${value}`;
}

function getDisplayWidth(value: string, ratio: number): number {
    return [...value].reduce(function addWidth(total, character) {
        const fullWidth =
            /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(
                character,
            );
        return total + (fullWidth ? ratio : 1);
    }, 0);
}

function sortCategoryRuns(source: string): string {
    const lines = source.split("\n");
    let start = 0;
    while (start < lines.length) {
        if (!isCategoryLine(lines[start])) {
            start += 1;
            continue;
        }
        let end = start + 1;
        while (end < lines.length && isCategoryLine(lines[end])) {
            end += 1;
        }
        const sorted = lines.slice(start, end).sort(categoryComparator);
        lines.splice(start, sorted.length, ...sorted);
        start = end;
    }
    return lines.join("\n");
}

function isCategoryLine(line: string): boolean {
    CATEGORY_LINE_PATTERN.lastIndex = 0;
    return CATEGORY_LINE_PATTERN.test(line);
}

function categoryComparator(left: string, right: string): number {
    return left.localeCompare(right, undefined, { sensitivity: "base" });
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
