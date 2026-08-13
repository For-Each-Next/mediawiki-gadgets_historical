/** Enforces the roles of a gadget's root TypeScript modules. */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import ts from "typescript";
import { hasErrorCode } from "#workspace/metadata";
import type { GadgetPackage } from "#workspace/types";

/** Checks the composition-root export and package API purity. */
export async function checkEntryModules(
    gadget: GadgetPackage,
): Promise<string[]> {
    const [mainSource, indexSource] = await Promise.all([
        readOptionalFile(join(gadget.directory, "main.ts")),
        readOptionalFile(join(gadget.directory, "index.ts")),
    ]);
    return [
        ...(mainSource == null
            ? []
            : checkMainModule(gadget.directoryName, mainSource)),
        ...(indexSource == null
            ? []
            : checkIndexModule(gadget.directoryName, indexSource)),
    ];
}

/** Reads a module that the structure check may report missing. */
async function readOptionalFile(path: string): Promise<string | null> {
    try {
        return await readFile(path, "utf8");
    } catch (error) {
        if (hasErrorCode(error, "ENOENT")) {
            return null;
        }
        throw error;
    }
}

/** Requires one exported, zero-argument start composition function. */
function checkMainModule(name: string, source: string): string[] {
    const sourceFile = createSourceFile("main.ts", source);
    const starts = sourceFile.statements.filter(isExportedStart);
    const problems =
        starts.length === 1
            ? []
            : [
                  `${name}: main.ts must export exactly one zero-argument ` +
                      "start function.",
              ];
    if (sourceFile.statements.some(isUnexpectedMainExport)) {
        problems.push(
            `${name}: main.ts must keep package operations private and ` +
                "export only start.",
        );
    }
    return problems;
}

/** Recognizes function and variable exports named start. */
function isExportedStart(statement: ts.Statement): boolean {
    if (
        ts.isFunctionDeclaration(statement) &&
        statement.name?.text === "start"
    ) {
        return (
            hasModifier(statement, ts.SyntaxKind.ExportKeyword) &&
            !hasModifier(statement, ts.SyntaxKind.DefaultKeyword) &&
            statement.parameters.length === 0
        );
    }
    if (!ts.isVariableStatement(statement) || !hasExportModifier(statement)) {
        return false;
    }
    return statement.declarationList.declarations.some((declaration) => {
        const initializer = declaration.initializer;
        return (
            ts.isIdentifier(declaration.name) &&
            declaration.name.text === "start" &&
            initializer != null &&
            (ts.isArrowFunction(initializer) ||
                ts.isFunctionExpression(initializer)) &&
            initializer.parameters.length === 0
        );
    });
}

/** Recognizes an export other than the named start function. */
function isUnexpectedMainExport(statement: ts.Statement): boolean {
    if (ts.isVariableStatement(statement) && isExportedStart(statement)) {
        return statement.declarationList.declarations.length !== 1;
    }
    if (isExportedStart(statement)) {
        return false;
    }
    return (
        ts.isExportDeclaration(statement) ||
        ts.isExportAssignment(statement) ||
        hasExportModifier(statement)
    );
}

/** Rejects executable package-entry statements and value imports. */
function checkIndexModule(name: string, source: string): string[] {
    const sourceFile = createSourceFile("index.ts", source);
    return sourceFile.statements.flatMap((statement) => {
        if (isSafeIndexStatement(statement)) {
            return [];
        }
        const line = sourceFile.getLineAndCharacterOfPosition(
            statement.getStart(),
        ).line;
        return [
            `${name}: index.ts:${line + 1} must remain a side-effect-free ` +
                "facade over package contracts and domain exports.",
        ];
    });
}

/** Allows erased types, exported functions, and focused re-exports. */
function isSafeIndexStatement(statement: ts.Statement): boolean {
    if (ts.isExportDeclaration(statement)) {
        return isFocusedExport(statement);
    }
    if (ts.isImportDeclaration(statement)) {
        return isTypeOnlyImport(statement);
    }
    if (
        ts.isInterfaceDeclaration(statement) ||
        ts.isTypeAliasDeclaration(statement) ||
        ts.isFunctionDeclaration(statement)
    ) {
        return hasExportModifier(statement);
    }
    return ts.isEmptyStatement(statement);
}

/** Limits re-exports to package contracts and domain code. */
function isFocusedExport(statement: ts.ExportDeclaration): boolean {
    const module = statement.moduleSpecifier;
    if (module == null) {
        return true;
    }
    if (!ts.isStringLiteralLike(module)) {
        return false;
    }
    return ["#gadget/contracts/", "#gadget/domain/"].some((prefix) =>
        module.text.startsWith(prefix),
    );
}

/** Recognizes imports erased completely by TypeScript. */
function isTypeOnlyImport(statement: ts.ImportDeclaration): boolean {
    const clause = statement.importClause;
    if (clause == null) {
        return false;
    }
    if (ts.isTypeOnlyImportDeclaration(clause)) {
        return true;
    }
    const bindings = clause.namedBindings;
    return (
        clause.name == null &&
        bindings != null &&
        ts.isNamedImports(bindings) &&
        bindings.elements.length > 0 &&
        bindings.elements.every(ts.isTypeOnlyImportDeclaration)
    );
}

/** Checks one declaration for an export modifier. */
function hasExportModifier(node: ts.Node): boolean {
    return hasModifier(node, ts.SyntaxKind.ExportKeyword);
}

/** Checks modifiers without assuming every node can own them. */
function hasModifier(node: ts.Node, kind: ts.SyntaxKind): boolean {
    return (
        ts.canHaveModifiers(node) &&
        ts.getModifiers(node)?.some((modifier) => modifier.kind === kind) ===
            true
    );
}

/** Parses one root module with parent pointers. */
function createSourceFile(filename: string, source: string): ts.SourceFile {
    return ts.createSourceFile(
        filename,
        source,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TS,
    );
}
