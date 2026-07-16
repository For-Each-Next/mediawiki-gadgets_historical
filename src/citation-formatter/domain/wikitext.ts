/**
 * Scans balanced wikitext templates and ref tags.
 */

import type { TextReplacement } from "./types.ts";

export interface ParsedTemplateCall {
    end: number;
    name: string;
    params: Array<{ name: string; positional: boolean; value: string }>;
    raw: string;
    start: number;
}

export interface RefTag {
    attributes: Record<string, string>;
    content: string;
    end: number;
    raw: string;
    selfClosing: boolean;
    start: number;
}

/**
 * Applies non-overlapping replacements from the end of a string.
 *
 * @param text - Source string.
 * @param replacements - Source replacements.
 * @returns Updated source string.
 */
export function applyReplacements(
    text: string,
    replacements: TextReplacement[],
): string {
    const result = [...replacements]
        .sort((left, right) => right.start - left.start)
        .reduce(function replaceText(result, replacement) {
            const before = result.slice(0, replacement.start);
            const after = result.slice(replacement.end);
            return `${before}${replacement.text}${after}`;
        }, text);
    return result;
}

/**
 * Finds balanced template calls, including nested calls.
 *
 * @param text - Source wikitext.
 * @returns Parsed template calls.
 */
export function findTemplateCalls(text: string): ParsedTemplateCall[] {
    const calls: ParsedTemplateCall[] = [];
    const stack: number[] = [];
    let comment = false;

    for (let index = 0; index < text.length - 1; index += 1) {
        if (!comment && text.startsWith("<!--", index)) {
            comment = true;
            index += 3;
            continue;
        }
        if (comment && text.startsWith("-->", index)) {
            comment = false;
            index += 2;
            continue;
        }
        if (comment) {
            continue;
        }
        if (text.startsWith("{{", index)) {
            stack.push(index);
            index += 1;
            continue;
        }
        if (!text.startsWith("}}", index) || stack.length === 0) {
            continue;
        }
        const start = stack.pop() as number;
        const end = index + 2;
        const raw = text.slice(start, end);
        calls.push(parseTemplateCall(raw, start));
        index += 1;
    }

    return calls.sort((left, right) => left.start - right.start);
}

/**
 * Parses a complete template call.
 *
 * @param raw - Complete template text.
 * @param start - Start offset in the source.
 * @returns Parsed template call.
 */
export function parseTemplateCall(
    raw: string,
    start: number = 0,
): ParsedTemplateCall {
    const inner = raw.startsWith("{{") ? raw.slice(2, -2) : raw;
    const parts = splitTopLevel(inner, "|");
    const name = parts.shift()?.trim() || "";
    let positionalIndex = 0;
    const params = parts.map(function parsePart(part) {
        const separator = findTopLevelCharacter(part, "=");
        if (separator < 0) {
            positionalIndex += 1;
            const result = {
                name: String(positionalIndex),
                positional: true,
                value: part.trim(),
            };
            return result;
        }
        const result = {
            name: part.slice(0, separator).trim(),
            positional: false,
            value: part.slice(separator + 1).trim(),
        };
        return result;
    });
    return { end: start + raw.length, name, params, raw, start };
}

/**
 * Finds native ref tags without interpreting their contents.
 *
 * @param text - Source wikitext.
 * @returns Native ref tags.
 */
export function findRefTags(text: string): RefTag[] {
    const tags: RefTag[] = [];
    const openingPattern = /<ref\b([^>]*?)(\/?)>/giu;
    let match: RegExpExecArray | null;

    while ((match = openingPattern.exec(text)) != null) {
        const start = match.index;
        const openingEnd = openingPattern.lastIndex;
        const selfClosing = match[2] === "/";
        if (selfClosing) {
            tags.push(
                buildRefTag(text, match, {
                    content: "",
                    end: openingEnd,
                    selfClosing: true,
                    start,
                }),
            );
            continue;
        }
        const closing = /<\/ref\s*>/giu;
        closing.lastIndex = openingEnd;
        const closingMatch = closing.exec(text);
        if (closingMatch == null) {
            continue;
        }
        const end = closing.lastIndex;
        const content = text.slice(openingEnd, closingMatch.index);
        tags.push(
            buildRefTag(text, match, {
                content,
                end,
                selfClosing: false,
                start,
            }),
        );
        openingPattern.lastIndex = end;
    }
    return tags;
}

/**
 * Builds a parsed ref tag.
 *
 * @param text - Source wikitext.
 * @param match - Opening-tag match.
 * @param range - Tag content and range.
 * @returns Parsed ref tag.
 */
function buildRefTag(
    text: string,
    match: RegExpExecArray,
    range: Pick<RefTag, "content" | "end" | "selfClosing" | "start">,
): RefTag {
    const result = {
        attributes: parseTagAttributes(match[1]),
        ...range,
        raw: text.slice(range.start, range.end),
    };
    return result;
}

/**
 * Parses quoted or unquoted HTML tag attributes.
 *
 * @param value - Raw attribute string.
 * @returns Attributes keyed by lowercase name.
 */
export function parseTagAttributes(value: string): Record<string, string> {
    const attributes: Record<string, string> = {};
    const pattern =
        /([^\s=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/gu;
    for (const match of value.matchAll(pattern)) {
        attributes[match[1].toLocaleLowerCase()] =
            match[2] ?? match[3] ?? match[4] ?? "";
    }
    return attributes;
}

interface SplitState {
    comment: boolean;
    linkDepth: number;
    templateDepth: number;
}

/**
 * Splits text at top-level separators.
 *
 * @param text - Wikitext fragment.
 * @param separator - Character at which to split.
 * @returns Top-level text parts.
 */
export function splitTopLevel(text: string, separator: string): string[] {
    const parts: string[] = [];
    let start = 0;
    const state: SplitState = {
        comment: false,
        linkDepth: 0,
        templateDepth: 0,
    };

    for (let index = 0; index < text.length; index += 1) {
        const skip = updateSplitState(text, index, state);
        if (skip != null) {
            index += skip;
            continue;
        }
        if (
            text[index] === separator &&
            state.templateDepth === 0 &&
            state.linkDepth === 0
        ) {
            parts.push(text.slice(start, index));
            start = index + 1;
        }
    }
    parts.push(text.slice(start));
    return parts;
}

function updateSplitState(
    text: string,
    index: number,
    state: SplitState,
): number | null {
    if (state.comment) {
        return updateCommentState(text, index, state);
    }
    if (text.startsWith("<!--", index)) {
        state.comment = true;
        return 3;
    }
    const token = text.slice(index, index + 2);
    return updateNestedDepth(token, state);
}

function updateCommentState(
    text: string,
    index: number,
    state: SplitState,
): number {
    if (text.startsWith("-->", index)) {
        state.comment = false;
        return 2;
    }
    return 0;
}

function updateNestedDepth(token: string, state: SplitState): number | null {
    if (token === "{{") {
        state.templateDepth += 1;
        return 1;
    }
    if (token === "}}" && state.templateDepth > 0) {
        state.templateDepth -= 1;
        return 1;
    }
    if (token === "[[") {
        state.linkDepth += 1;
        return 1;
    }
    if (token === "]]" && state.linkDepth > 0) {
        state.linkDepth -= 1;
        return 1;
    }
    return null;
}

/**
 * Finds a character outside nested wikitext.
 *
 * @param text - Wikitext fragment.
 * @param character - Character to find.
 * @returns Character offset or -1.
 */
function findTopLevelCharacter(text: string, character: string): number {
    const parts = splitTopLevel(text, character);
    return parts.length === 1 ? -1 : parts[0].length;
}
