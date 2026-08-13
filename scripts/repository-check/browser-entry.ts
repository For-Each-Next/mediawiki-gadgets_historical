/** Validates browser composition entry points. */

import { lstat, readFile, realpath } from "node:fs/promises";
import { resolve } from "node:path";
import ts from "typescript";
import { hasErrorCode, hasText } from "#workspace/metadata";
import { requireContainedPath } from "#workspace/paths";
import type { GadgetPackage } from "#workspace/types";

/** Checks that the browser entry invokes the composition root. */
export async function checkBrowserEntry(
    gadget: GadgetPackage,
): Promise<string[]> {
    const problems: string[] = [];
    const entryPoint = resolveEntryPoint(gadget);
    if (entryPoint == null) {
        return problems;
    }
    const source = await readBrowserEntry(gadget, entryPoint, problems);
    if (source != null) {
        problems.push(...checkBrowserSource(gadget.directoryName, source));
    }
    return problems;
}

/** Resolves the configured entry point when it is textual. */
function resolveEntryPoint(gadget: GadgetPackage): string | null {
    const { metadata } = gadget;
    const value =
        metadata.gadgetBuild.entryPoint ?? metadata.browser ?? metadata.main;
    return hasText(value) ? value : null;
}

/** Reads a real package-contained browser entry file. */
async function readBrowserEntry(
    gadget: GadgetPackage,
    entryPoint: string,
    problems: string[],
): Promise<string | null> {
    const path = resolveEntryPath(gadget, entryPoint, problems);
    if (path == null) {
        return null;
    }
    try {
        const entry = await lstat(path);
        const realRoot = await realpath(gadget.directory);
        const realEntry = await realpath(path);
        requireContainedPath(realRoot, realEntry, "Browser entry");
        if (!entry.isFile() || entry.isSymbolicLink()) {
            return recordEntryProblem(
                gadget,
                "browser entry must be a real file inside the package.",
                problems,
            );
        }
        return await readFile(path, "utf8");
    } catch (error) {
        return handleEntryError(gadget, entryPoint, error, problems);
    }
}

/** Resolves an entry path and records lexical traversal. */
function resolveEntryPath(
    gadget: GadgetPackage,
    entryPoint: string,
    problems: string[],
): string | null {
    try {
        return requireContainedPath(
            gadget.directory,
            resolve(gadget.directory, entryPoint),
            "Browser entry",
        );
    } catch {
        problems.push(
            `${gadget.directoryName}: browser entry must remain inside the ` +
                "package.",
        );
        return null;
    }
}

/** Converts file and containment failures to package diagnostics. */
function handleEntryError(
    gadget: GadgetPackage,
    entryPoint: string,
    error: unknown,
    problems: string[],
): null {
    const message = hasErrorCode(error, "ENOENT")
        ? `browser entry does not exist: ${entryPoint}.`
        : "browser entry must be a real file inside the package.";
    return recordEntryProblem(gadget, message, problems);
}

/** Records one browser-entry diagnostic. */
function recordEntryProblem(
    gadget: GadgetPackage,
    message: string,
    problems: string[],
): null {
    problems.push(`${gadget.directoryName}: ${message}`);
    return null;
}

/** Validates startup and encapsulation in browser source. */
function checkBrowserSource(name: string, source: string): string[] {
    const sourceFile = ts.createSourceFile(
        "browser.ts",
        source,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TS,
    );
    const problems: string[] = [];
    if (sourceFile.statements.some(isExportedStatement)) {
        problems.push(
            `${name}: browser entry must not expose private operations on ` +
                "the gadget global.",
        );
    }
    if (!hasStartImport(sourceFile)) {
        problems.push(
            `${name}: browser entry must import { start } from ` +
                '"#gadget/main.ts".',
        );
    }
    if (!hasStartInvocation(sourceFile)) {
        problems.push(
            `${name}: browser entry must invoke the imported start function.`,
        );
    }
    for (const specifier of collectUnexpectedImports(sourceFile)) {
        problems.push(
            `${name}: browser entry must not import "${specifier}"; ` +
                'import only { start } from "#gadget/main.ts".',
        );
    }
    return problems;
}

/** Finds imports outside the composition-root startup import. */
function collectUnexpectedImports(sourceFile: ts.SourceFile): string[] {
    const imports: string[] = [];
    function visit(node: ts.Node): void {
        const specifier = readModuleSpecifier(node);
        if (specifier != null && specifier !== "#gadget/main.ts") {
            imports.push(specifier);
        }
        ts.forEachChild(node, visit);
    }
    visit(sourceFile);
    return imports;
}

/** Reads static, type-only, exported, and dynamic module references. */
function readModuleSpecifier(node: ts.Node): string | null {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
        return readStringLiteral(node.moduleSpecifier);
    }
    if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)) {
        return readStringLiteral(node.argument.literal);
    }
    if (
        ts.isCallExpression(node) &&
        node.expression.kind === ts.SyntaxKind.ImportKeyword
    ) {
        return readStringLiteral(node.arguments[0]);
    }
    return null;
}

/** Narrows one quoted module reference. */
function readStringLiteral(node: ts.Node | undefined): string | null {
    return node != null && ts.isStringLiteralLike(node) ? node.text : null;
}

/** Finds an actual named start import from the composition root. */
function hasStartImport(sourceFile: ts.SourceFile): boolean {
    return sourceFile.statements.some(isStartImport);
}

/** Checks one statement for the required composition-root import. */
function isStartImport(statement: ts.Statement): boolean {
    if (!ts.isImportDeclaration(statement)) {
        return false;
    }
    if (!ts.isStringLiteral(statement.moduleSpecifier)) {
        return false;
    }
    if (statement.moduleSpecifier.text === "#gadget/main.ts") {
        return hasNamedStartBinding(statement);
    }
    return false;
}

/** Checks one import declaration for an unaliased start binding. */
function hasNamedStartBinding(statement: ts.ImportDeclaration): boolean {
    const bindings = statement.importClause?.namedBindings;
    return (
        bindings != null &&
        ts.isNamedImports(bindings) &&
        bindings.elements.some(isStartImportSpecifier)
    );
}

/** Checks one import specifier for the required local name. */
function isStartImportSpecifier(element: ts.ImportSpecifier): boolean {
    const importedName = element.propertyName?.text ?? element.name.text;
    return importedName === "start" && element.name.text === "start";
}

/** Finds a direct call or Promise callback in executable syntax. */
function hasStartInvocation(sourceFile: ts.SourceFile): boolean {
    let found = false;
    function visit(node: ts.Node): void {
        if (isDirectStartCall(node) || isThenStartCallback(node)) {
            found = true;
            return;
        }
        ts.forEachChild(node, visit);
    }
    visit(sourceFile);
    return found;
}

/** Checks for an unqualified zero-argument start call. */
function isDirectStartCall(node: ts.Node): boolean {
    return (
        ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === "start" &&
        node.arguments.length === 0
    );
}

/** Checks for `.then(start)` callback syntax. */
function isThenStartCallback(node: ts.Node): boolean {
    return (
        ts.isCallExpression(node) &&
        ts.isPropertyAccessExpression(node.expression) &&
        node.expression.name.text === "then" &&
        node.arguments.length === 1 &&
        ts.isIdentifier(node.arguments[0]) &&
        node.arguments[0].text === "start"
    );
}

/** Checks whether a top-level statement exports a binding. */
function isExportedStatement(statement: ts.Statement): boolean {
    if (
        ts.isExportDeclaration(statement) ||
        ts.isExportAssignment(statement)
    ) {
        return true;
    }
    return (
        ts.canHaveModifiers(statement) &&
        ts
            .getModifiers(statement)
            ?.some(
                (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
            ) === true
    );
}
