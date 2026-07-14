/**
 * Checks TypeScript source rules that depend on physical layout.
 */

import { readdir, readFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { parse } from "@typescript-eslint/parser";
import type { TSESTree } from "@typescript-eslint/types";

const SOURCE_ROOT = resolve("src");
const MAX_LINE_LENGTH = 79;

const paths = await listFiles(SOURCE_ROOT);
const errors: string[] = [];

for (const path of paths) {
    if (extname(path) === ".js") {
        errors.push(`${path}: JavaScript source must use the .ts extension.`);
        continue;
    }

    if (extname(path) !== ".ts" || path.endsWith(".d.ts")) {
        continue;
    }

    checkTypeScriptFile(path, await readFile(path, "utf8"), errors);
}

if (errors.length > 0) {
    console.error(errors.join("\n"));
    process.exitCode = 1;
}

/**
 * Lists files below a directory recursively.
 *
 * @param directory - Directory to inspect.
 * @returns Descendant file paths.
 */
async function listFiles(directory: string): Promise<string[]> {
    const entries = await readdir(directory, { withFileTypes: true });
    const descendants = await Promise.all(
        entries.map(async function readEntry(entry) {
            const path = resolve(directory, entry.name);

            if (entry.name === "node_modules") {
                return [];
            }

            if (entry.isDirectory()) {
                return listFiles(path);
            }

            return [path];
        }),
    );

    return descendants.flat();
}

/**
 * Checks one TypeScript module.
 *
 * @param path - Module path.
 * @param source - Module source.
 * @param errors - Mutable error list.
 */
function checkTypeScriptFile(
    path: string,
    source: string,
    errors: string[],
): void {
    const lines = source.split("\n");

    lines.forEach(function checkLine(line, index) {
        if (line.length > MAX_LINE_LENGTH) {
            errors.push(`${path}:${index + 1}: line exceeds 79 characters.`);
        }
    });

    const syntax = parse(source, {
        ecmaVersion: "latest",
        loc: true,
        range: true,
        sourceType: "module",
    });

    checkTopLevelDocumentation(path, source, syntax, errors);
    checkJSDocSummaries(path, source, errors);
    walkSyntax(syntax, function checkNode(node, parent) {
        checkFunctionLayout(path, node, parent, errors);
        checkConditionalLayout(path, node, errors);
    });
}

/**
 * Checks documentation on multiline top-level declarations.
 *
 * @param path - Module path.
 * @param source - Module source.
 * @param syntax - Parsed module syntax.
 * @param errors - Mutable error list.
 */
function checkTopLevelDocumentation(
    path: string,
    source: string,
    syntax: TSESTree.Program,
    errors: string[],
): void {
    syntax.body.forEach(function checkStatement(statement) {
        const declaration =
            statement.type === "ExportNamedDeclaration"
                ? statement.declaration
                : statement;

        if (
            declaration == null ||
            statement.loc.start.line === statement.loc.end.line
        ) {
            return;
        }

        const documentedTypes = new Set([
            "ClassDeclaration",
            "FunctionDeclaration",
        ]);

        if (!documentedTypes.has(declaration.type)) {
            return;
        }

        const prefix = source.slice(0, statement.range[0]);

        if (!/\/\*\*[\s\S]*?\*\/\s*$/u.test(prefix)) {
            errors.push(
                `${path}:${statement.loc.start.line}: missing top-level JSDoc.`,
            );
        }
    });
}

/**
 * Checks that every JSDoc summary is one complete line.
 *
 * @param path - Module path.
 * @param source - Module source.
 * @param errors - Mutable error list.
 */
function checkJSDocSummaries(
    path: string,
    source: string,
    errors: string[],
): void {
    const blocks = source.matchAll(/\/\*\*\n([\s\S]*?)\n\s*\*\//gu);

    for (const block of blocks) {
        const lines = block[1].split("\n").map(function cleanLine(line) {
            return line.replace(/^\s*\* ?/u, "");
        });
        const summaryLines = [];

        for (const line of lines) {
            if (line === "" || line.startsWith("@")) {
                break;
            }

            summaryLines.push(line);
        }

        if (summaryLines.length !== 1 || !/[.!?]$/u.test(summaryLines[0])) {
            const line = source.slice(0, block.index).split("\n").length;
            errors.push(
                `${path}:${line}: JSDoc summary must be one sentence.`,
            );
        }
    }
}

/**
 * Checks anonymous function layout.
 *
 * @param path - Module path.
 * @param node - Syntax node.
 * @param parent - Parent syntax node.
 * @param errors - Mutable error list.
 */
function checkFunctionLayout(
    path: string,
    node: TSESTree.Node,
    parent: TSESTree.Node | null,
    errors: string[],
): void {
    const objectMethod =
        parent?.type === "Property" &&
        (parent.method === true || parent.kind !== "init");
    const classMethod = parent?.type === "MethodDefinition";

    if (
        node.type === "FunctionExpression" &&
        node.id == null &&
        !objectMethod &&
        !classMethod
    ) {
        errors.push(`${path}:${node.loc.start.line}: unnamed function.`);
        return;
    }

    if (node.type !== "ArrowFunctionExpression") {
        return;
    }

    if (
        node.body.type === "BlockStatement" ||
        node.loc.start.line !== node.loc.end.line
    ) {
        errors.push(
            `${path}:${node.loc.start.line}: arrow must be one-line expression.`,
        );
    }
}

/**
 * Checks conditional expression layout.
 *
 * @param path - Module path.
 * @param node - Syntax node.
 * @param errors - Mutable error list.
 */
function checkConditionalLayout(
    path: string,
    node: TSESTree.Node,
    errors: string[],
): void {
    if (
        node.type === "ConditionalExpression" &&
        node.loc.start.line !== node.loc.end.line
    ) {
        errors.push(
            `${path}:${node.loc.start.line}: ternary must remain on one line.`,
        );
    }
}

/**
 * Walks an ESTree syntax tree.
 *
 * @param node - Root syntax node.
 * @param visit - Node visitor.
 * @param parent - Parent syntax node.
 */
function walkSyntax(
    node: unknown,
    visit: (node: TSESTree.Node, parent: TSESTree.Node | null) => void,
    parent: TSESTree.Node | null = null,
): void {
    if (!isSyntaxNode(node)) {
        return;
    }

    visit(node, parent);

    Object.values(node).forEach(function walkValue(value) {
        if (Array.isArray(value)) {
            value.forEach(function walkItem(item) {
                walkSyntax(item, visit, node);
            });
            return;
        }

        if (isSyntaxNode(value)) {
            walkSyntax(value, visit, node);
        }
    });
}

/**
 * Checks whether a value is an ESTree syntax node.
 *
 * @param value - Candidate value.
 * @returns Whether the value has an ESTree node type.
 */
function isSyntaxNode(value: unknown): value is TSESTree.Node {
    if (value == null || typeof value !== "object") {
        return false;
    }

    return (
        "type" in value &&
        typeof (value as { type?: unknown }).type === "string"
    );
}
