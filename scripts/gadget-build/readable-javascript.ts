/**
 * Formats readable JavaScript with the repository-wide conventions.
 */

import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseForESLint } from "@typescript-eslint/parser";
import { format, resolveConfig } from "prettier";
import ts from "typescript";

const REPOSITORY_PACKAGE_PATH = resolve(
    dirname(fileURLToPath(import.meta.url)),
    "../../package.json",
);
const prettierOptions = resolveConfig(REPOSITORY_PACKAGE_PATH);

interface SourceReplacement {
    end: number;
    start: number;
    text: string;
}

/**
 * Formats readable JavaScript using the root Prettier settings.
 *
 * @param source - JavaScript source to format.
 * @returns Consistently formatted JavaScript.
 */
export async function formatReadableJavaScript(
    source: string,
): Promise<string> {
    const options = await prettierOptions;
    if (options == null) {
        throw new Error("Unable to load the repository Prettier settings.");
    }
    return format(escapeOrdinaryTemplateLineBreaks(source), {
        ...options,
        parser: "babel",
    });
}

/**
 * Escapes physical line breaks in ordinary template literal text.
 *
 * JavaScript formatters cannot indent those lines without changing the
 * resulting string. Escapes keep generated code normally indented and
 * preserve its cooked value.
 *
 * Tagged templates remain unchanged because raw strings are observable.
 *
 * @param source - Bundled JavaScript source.
 * @returns Source with semantics-preserving template line escapes.
 */
export function escapeOrdinaryTemplateLineBreaks(source: string): string {
    const sourceFile = ts.createSourceFile(
        "gadget-bundle.js",
        source,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.JS,
    );
    const replacements: SourceReplacement[] = [];
    collectOrdinaryTemplateTokens(
        sourceFile,
        sourceFile,
        source,
        replacements,
    );
    return applySourceReplacements(source, replacements);
}

/**
 * Removes code comments without touching comment-like strings.
 *
 * Line breaks inside comments remain in place because they can affect
 * automatic semicolon insertion and restricted JavaScript productions.
 *
 * @param source - Bundled JavaScript source.
 * @returns JavaScript with comment tokens replaced by safe whitespace.
 */
export function stripJavaScriptComments(source: string): string {
    const { ast } = parseForESLint(source, {
        comment: true,
        ecmaVersion: "latest",
        range: true,
        sourceType: "script",
    });
    const replacements = (ast.comments ?? []).map(
        function replaceComment(comment): SourceReplacement {
            const [start, end] = comment.range;
            const text = source.slice(start, end);
            return {
                end,
                start,
                text: preserveCommentLineBreaks(text),
            };
        },
    );
    return applySourceReplacements(source, replacements);
}

/**
 * Collects literal tokens without traversing tagged-template text.
 *
 * @param node - Syntax or DOM node.
 * @param sourceFile - Source file value.
 * @param source - Source text.
 * @param replacements - Source replacements.
 */
function collectOrdinaryTemplateTokens(
    node: ts.Node,
    sourceFile: ts.SourceFile,
    source: string,
    replacements: SourceReplacement[],
): void {
    if (ts.isTaggedTemplateExpression(node)) {
        collectTaggedTemplateExpressions(
            node,
            sourceFile,
            source,
            replacements,
        );
        return;
    }
    if (ts.isNoSubstitutionTemplateLiteral(node)) {
        collectTemplateToken(node, sourceFile, source, replacements);
        return;
    }
    if (ts.isTemplateExpression(node)) {
        collectTemplateExpression(node, sourceFile, source, replacements);
        return;
    }
    ts.forEachChild(node, function collectChild(child) {
        collectOrdinaryTemplateTokens(child, sourceFile, source, replacements);
    });
}

/**
 * Traverses only expressions inside one tagged template.
 *
 * @param node - Syntax or DOM node.
 * @param sourceFile - Source file value.
 * @param source - Source text.
 * @param replacements - Source replacements.
 */
function collectTaggedTemplateExpressions(
    node: ts.TaggedTemplateExpression,
    sourceFile: ts.SourceFile,
    source: string,
    replacements: SourceReplacement[],
): void {
    collectOrdinaryTemplateTokens(node.tag, sourceFile, source, replacements);
    if (!ts.isTemplateExpression(node.template)) {
        return;
    }
    for (const span of node.template.templateSpans) {
        collectOrdinaryTemplateTokens(
            span.expression,
            sourceFile,
            source,
            replacements,
        );
    }
}

/**
 * Collects the literal and nested-expression parts of one template.
 *
 * @param node - Syntax or DOM node.
 * @param sourceFile - Source file value.
 * @param source - Source text.
 * @param replacements - Source replacements.
 */
function collectTemplateExpression(
    node: ts.TemplateExpression,
    sourceFile: ts.SourceFile,
    source: string,
    replacements: SourceReplacement[],
): void {
    collectTemplateToken(node.head, sourceFile, source, replacements);
    for (const span of node.templateSpans) {
        collectOrdinaryTemplateTokens(
            span.expression,
            sourceFile,
            source,
            replacements,
        );
        collectTemplateToken(span.literal, sourceFile, source, replacements);
    }
}

/**
 * Records one changed template token.
 *
 * @param node - Syntax or DOM node.
 * @param sourceFile - Source file value.
 * @param source - Source text.
 * @param replacements - Source replacements.
 */
function collectTemplateToken(
    node: ts.Node,
    sourceFile: ts.SourceFile,
    source: string,
    replacements: SourceReplacement[],
): void {
    const start = node.getStart(sourceFile);
    const text = source.slice(start, node.end);
    const escaped = escapeTemplateTokenLineBreaks(text);
    if (escaped !== text) {
        replacements.push({ end: node.end, start, text: escaped });
    }
}

/**
 * Escapes line breaks while preserving template line continuations.
 *
 * @param text - Text to process.
 * @returns Escaped breaks that preserve template line continuations.
 */
function escapeTemplateTokenLineBreaks(text: string): string {
    const result: string[] = [];
    for (let index = 0; index < text.length; index += 1) {
        const code = text.charCodeAt(index);
        const isLineBreak =
            code === 0x0a ||
            code === 0x0d ||
            code === 0x2028 ||
            code === 0x2029;
        if (!isLineBreak) {
            result.push(text[index] ?? "");
            continue;
        }

        const escapedContinuation =
            countPrecedingBackslashes(text, index) % 2 === 1;
        if (escapedContinuation) {
            result.pop();
        } else if (code === 0x2028) {
            result.push("\\u2028");
        } else if (code === 0x2029) {
            result.push("\\u2029");
        } else {
            result.push("\\n");
        }
        if (code === 0x0d && text.charCodeAt(index + 1) === 0x0a) {
            index += 1;
        }
    }
    return result.join("");
}

/**
 * Counts the raw backslashes immediately before one line break.
 *
 * @param text - Text to process.
 * @param index - Source index.
 * @returns Computed number.
 */
function countPrecedingBackslashes(text: string, index: number): number {
    let count = 0;
    for (
        let position = index - 1;
        position >= 0 && text[position] === "\\";
        position -= 1
    ) {
        count += 1;
    }
    return count;
}

/**
 * Retains only line terminators, or one token-separating space.
 *
 * @param comment - Comment value.
 * @returns Resulting text.
 */
function preserveCommentLineBreaks(comment: string): string {
    const lineBreaks = comment.match(/\r\n|[\n\r\u2028\u2029]/gu);
    return lineBreaks == null ? " " : lineBreaks.join("");
}

/**
 * Applies non-overlapping source replacements from the end.
 *
 * @param source - Source text.
 * @param replacements - Source replacements.
 * @returns Resulting text.
 */
function applySourceReplacements(
    source: string,
    replacements: SourceReplacement[],
): string {
    const descending = replacements.sort(
        (left, right) => right.start - left.start,
    );
    let result = source;
    for (const replacement of descending) {
        result =
            result.slice(0, replacement.start) +
            replacement.text +
            result.slice(replacement.end);
    }
    return result;
}
