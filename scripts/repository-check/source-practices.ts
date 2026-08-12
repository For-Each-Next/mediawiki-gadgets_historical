/** Enforces gadget runtime-boundary and feedback source practices. */

import { readFile } from "node:fs/promises";
import { relative } from "node:path";
import { parse } from "@vue/compiler-sfc";
import ts from "typescript";
import {
    inspectAuthoredTree,
    inspectWorkspacePackages,
    isGadgetPackage,
    toPosixPath,
    type WorkspaceDiscovery,
} from "../workspace/index.ts";

const FORBIDDEN_TOAST_IDENTIFIERS = new Set([
    "CdxToast",
    "CdxToastContainer",
    "ToastController",
    "toast",
    "useToast",
]);
const TOAST_TEMPLATE_PATTERN =
    /<(?:CdxToast(?:Container)?|cdx-toast(?:-container)?)\b/u;
const BROWSER_STORAGE_NAMES = new Set(["localStorage", "sessionStorage"]);
const GLOBAL_OBJECT_NAMES = new Set(["globalThis", "self", "window"]);
const MEDIAWIKI_API_CONSTRUCTORS = new Set(["Api", "ForeignApi"]);

export interface SourcePracticeResult {
    fileCount: number;
    problems: string[];
}

/** Checks gadget source without applying these rules to shared code. */
export async function checkSourcePractices(
    workspaceRoot: string,
    existingDiscovery?: WorkspaceDiscovery,
): Promise<SourcePracticeResult> {
    const discovery =
        existingDiscovery ?? (await inspectWorkspacePackages(workspaceRoot));
    const gadgets = discovery.packages.filter(isGadgetPackage);
    const trees = await Promise.all(
        gadgets.map((gadget) =>
            inspectAuthoredTree(gadget.directory, {
                extensions: new Set([".ts", ".vue"]),
            }),
        ),
    );
    const files = trees.flatMap((tree) => tree.files);
    const results = await Promise.all(
        files.map((file) => checkSourceFile(workspaceRoot, file)),
    );
    return {
        fileCount: files.length,
        problems: [
            ...(existingDiscovery == null ? discovery.problems : []),
            ...results.flat(),
        ],
    };
}

/** Dispatches TypeScript and Vue files to syntax-aware checks. */
async function checkSourceFile(
    workspaceRoot: string,
    file: string,
): Promise<string[]> {
    const source = await readFile(file, "utf8");
    const localPath = toPosixPath(relative(workspaceRoot, file));
    return file.endsWith(".vue")
        ? checkVueSource(localPath, file, source)
        : checkTypeScriptSource(localPath, file, source);
}

/** Checks executable TypeScript, not comments or prose strings. */
function checkTypeScriptSource(
    localPath: string,
    file: string,
    source: string,
): string[] {
    const sourceFile = ts.createSourceFile(
        file,
        source,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TS,
    );
    const problems: string[] = [];
    const allowsExternalSystems = ownsExternalSystems(localPath);
    const localBindings = collectLocalValueBindings(sourceFile);
    function visit(node: ts.Node): void {
        if (ts.isCallExpression(node)) {
            problems.push(...checkForbiddenCall(localPath, sourceFile, node));
        }
        if (!allowsExternalSystems) {
            problems.push(
                ...checkExternalSystemAccess(
                    localPath,
                    sourceFile,
                    node,
                    localBindings,
                ),
            );
        }
        problems.push(...checkToastIdentifier(localPath, sourceFile, node));
        ts.forEachChild(node, visit);
    }
    visit(sourceFile);
    return [...new Set(problems)];
}

/** Rejects identifiers belonging to retired Codex Toast APIs. */
function checkToastIdentifier(
    localPath: string,
    sourceFile: ts.SourceFile,
    node: ts.Node,
): string[] {
    if (
        !ts.isIdentifier(node) ||
        !FORBIDDEN_TOAST_IDENTIFIERS.has(node.text)
    ) {
        return [];
    }
    return [
        formatNodeProblem(
            localPath,
            sourceFile,
            node,
            `replace Codex Toast API ${node.text} with the shared action ` +
                "notifier.",
        ),
    ];
}

/** Allows browser integrations in adapters and the composition root. */
function ownsExternalSystems(localPath: string): boolean {
    const parts = localPath.split("/");
    return (
        parts[0] === "src" &&
        parts.length >= 3 &&
        (parts[2] === "adapters" ||
            (parts.length === 3 && parts[2] === "main.ts"))
    );
}

/** Rejects ambient browser and MediaWiki use in inward layers. */
function checkExternalSystemAccess(
    localPath: string,
    sourceFile: ts.SourceFile,
    node: ts.Node,
    localBindings: ReadonlySet<string>,
): string[] {
    if (
        ts.isNewExpression(node) &&
        isMediaWikiApiConstructor(node.expression, localBindings)
    ) {
        return [
            formatNodeProblem(
                localPath,
                sourceFile,
                node,
                "construct MediaWiki API clients in an adapter or main.ts " +
                    "and inject the capability.",
            ),
        ];
    }
    if (!isGlobalCapabilityReference(node, localBindings)) {
        return [];
    }
    const name = readGlobalCapabilityName(node);
    const message =
        name === "fetch"
            ? "perform direct network access in an adapter or main.ts and " +
              "inject the capability."
            : "access browser storage in an adapter or main.ts and inject " +
              "the capability.";
    return [formatNodeProblem(localPath, sourceFile, node, message)];
}

/** Identifies construction through the ambient MediaWiki namespace. */
function isMediaWikiApiConstructor(
    expression: ts.Expression,
    localBindings: ReadonlySet<string>,
): boolean {
    const access = readAccessPath(expression);
    const constructor = access.at(-1);
    if (constructor == null || !MEDIAWIKI_API_CONSTRUCTORS.has(constructor)) {
        return false;
    }
    if (access.length === 2 && access[0] === "mw") {
        const root = readAccessRoot(expression);
        return root != null && !localBindings.has(root.text);
    }
    if (
        access.length === 3 &&
        GLOBAL_OBJECT_NAMES.has(access[0]!) &&
        access[1] === "mw"
    ) {
        const root = readAccessRoot(expression);
        return root != null && !localBindings.has(root.text);
    }
    return false;
}

/** Matches bare and explicitly global fetch or storage references. */
function isGlobalCapabilityReference(
    node: ts.Node,
    localBindings: ReadonlySet<string>,
): node is ts.Expression {
    if (ts.isIdentifier(node)) {
        return (
            isValueReference(node) &&
            isExternalCapabilityName(node.text) &&
            !localBindings.has(node.text)
        );
    }
    if (
        !ts.isPropertyAccessExpression(node) &&
        !ts.isElementAccessExpression(node)
    ) {
        return false;
    }
    const access = readAccessPath(node);
    if (
        access.length !== 2 ||
        !GLOBAL_OBJECT_NAMES.has(access[0]!) ||
        !isExternalCapabilityName(access[1]!)
    ) {
        return false;
    }
    const root = readAccessRoot(node);
    return root != null && !localBindings.has(root.text);
}

/** Collects value names so injected capabilities stay valid. */
function collectLocalValueBindings(
    sourceFile: ts.SourceFile,
): ReadonlySet<string> {
    const bindings = new Set<string>();
    function visit(node: ts.Node): void {
        if (ts.isImportDeclaration(node)) {
            collectImportBindings(node, bindings);
            return;
        }
        if (ts.isImportEqualsDeclaration(node) && !node.isTypeOnly) {
            bindings.add(node.name.text);
        } else if (ts.isVariableDeclaration(node) || ts.isParameter(node)) {
            collectBindingNames(node.name, bindings);
        } else if (
            (ts.isFunctionDeclaration(node) ||
                ts.isFunctionExpression(node) ||
                ts.isClassDeclaration(node) ||
                ts.isClassExpression(node) ||
                ts.isEnumDeclaration(node) ||
                ts.isModuleDeclaration(node)) &&
            node.name != null
        ) {
            bindings.add(node.name.text);
        }
        ts.forEachChild(node, visit);
    }
    visit(sourceFile);
    return bindings;
}

/** Collects runtime bindings from one import declaration. */
function collectImportBindings(
    declaration: ts.ImportDeclaration,
    bindings: Set<string>,
): void {
    const clause = declaration.importClause;
    if (clause == null || clause.isTypeOnly) {
        return;
    }
    if (clause.name != null) {
        bindings.add(clause.name.text);
    }
    const named = clause.namedBindings;
    if (named == null) {
        return;
    }
    if (ts.isNamespaceImport(named)) {
        bindings.add(named.name.text);
        return;
    }
    for (const element of named.elements) {
        if (!element.isTypeOnly) {
            bindings.add(element.name.text);
        }
    }
}

/** Collects identifiers from a plain or destructured binding. */
function collectBindingNames(
    binding: ts.BindingName,
    bindings: Set<string>,
): void {
    if (ts.isIdentifier(binding)) {
        bindings.add(binding.text);
        return;
    }
    for (const element of binding.elements) {
        if (!ts.isOmittedExpression(element)) {
            collectBindingNames(element.name, bindings);
        }
    }
}

/** Reads the matched capability name. */
function readGlobalCapabilityName(node: ts.Expression): string | undefined {
    return readAccessPath(node).at(-1);
}

/** Checks the ambient capabilities owned by adapter ports. */
function isExternalCapabilityName(name: string): boolean {
    return name === "fetch" || BROWSER_STORAGE_NAMES.has(name);
}

/** Finds the left-most identifier in a dotted or indexed access. */
function readAccessRoot(node: ts.Expression): ts.Identifier | null {
    const expression = unwrapExpression(node);
    if (ts.isIdentifier(expression)) {
        return expression;
    }
    if (
        ts.isPropertyAccessExpression(expression) ||
        ts.isElementAccessExpression(expression)
    ) {
        return readAccessRoot(expression.expression);
    }
    return null;
}

/** Distinguishes identifier expressions from names and type names. */
function isValueReference(identifier: ts.Identifier): boolean {
    const parent = identifier.parent;
    if (
        (ts.isPropertyAccessExpression(parent) &&
            parent.name === identifier) ||
        isNamedDeclarationIdentifier(identifier) ||
        (ts.isLabeledStatement(parent) && parent.label === identifier) ||
        (ts.isBreakOrContinueStatement(parent) && parent.label === identifier)
    ) {
        return false;
    }
    for (let current: ts.Node | undefined = parent; current != null;) {
        if (ts.isTypeNode(current)) {
            return false;
        }
        if (ts.isExpression(current) || ts.isStatement(current)) {
            break;
        }
        current = current.parent;
    }
    return true;
}

/** Checks identifiers used as declaration or property names. */
function isNamedDeclarationIdentifier(identifier: ts.Identifier): boolean {
    const parent = identifier.parent;
    if (
        (ts.isPropertyAssignment(parent) ||
            ts.isMethodDeclaration(parent) ||
            ts.isPropertyDeclaration(parent) ||
            ts.isPropertySignature(parent) ||
            ts.isMethodSignature(parent) ||
            ts.isGetAccessorDeclaration(parent) ||
            ts.isSetAccessorDeclaration(parent)) &&
        parent.name === identifier
    ) {
        return true;
    }
    if (ts.isBindingElement(parent)) {
        return (
            parent.name === identifier || parent.propertyName === identifier
        );
    }
    if (ts.isVariableDeclaration(parent) || ts.isParameter(parent)) {
        return parent.name === identifier;
    }
    if (
        ts.isFunctionDeclaration(parent) ||
        ts.isFunctionExpression(parent) ||
        ts.isClassDeclaration(parent) ||
        ts.isClassExpression(parent)
    ) {
        return parent.name === identifier;
    }
    return (
        ts.isImportClause(parent) ||
        ts.isImportSpecifier(parent) ||
        ts.isNamespaceImport(parent) ||
        ts.isImportEqualsDeclaration(parent) ||
        ts.isExportSpecifier(parent)
    );
}

/** Rejects direct console and MediaWiki notification calls. */
function checkForbiddenCall(
    localPath: string,
    sourceFile: ts.SourceFile,
    call: ts.CallExpression,
): string[] {
    const access = readAccessPath(call.expression);
    if (access.includes("console")) {
        return [
            formatNodeProblem(
                localPath,
                sourceFile,
                call,
                "use an injected logger instead of calling console.*.",
            ),
        ];
    }
    if (endsWithAccess(access, "mw", "notify")) {
        return [
            formatNodeProblem(
                localPath,
                sourceFile,
                call,
                "use an injected action notifier instead of calling " +
                    "mw.notify.",
            ),
        ];
    }
    return [];
}

/** Reads dotted and string-indexed property paths. */
function readAccessPath(node: ts.Expression): string[] {
    const expression = unwrapExpression(node);
    if (ts.isIdentifier(expression)) {
        return [expression.text];
    }
    if (ts.isPropertyAccessExpression(expression)) {
        return [
            ...readAccessPath(expression.expression),
            expression.name.text,
        ];
    }
    if (ts.isElementAccessExpression(expression)) {
        const argument = expression.argumentExpression;
        return argument != null && ts.isStringLiteralLike(argument)
            ? [...readAccessPath(expression.expression), argument.text]
            : [];
    }
    return [];
}

/** Removes transparent TypeScript expression wrappers. */
function unwrapExpression(node: ts.Expression): ts.Expression {
    if (
        ts.isParenthesizedExpression(node) ||
        ts.isNonNullExpression(node) ||
        ts.isAsExpression(node) ||
        ts.isTypeAssertionExpression(node) ||
        ts.isSatisfiesExpression(node)
    ) {
        return unwrapExpression(node.expression);
    }
    return node;
}

/** Checks the tail of a property path. */
function endsWithAccess(access: string[], ...suffix: string[]): boolean {
    if (access.length < suffix.length) {
        return false;
    }
    return suffix.every(
        (part, index) =>
            access[access.length - suffix.length + index] === part,
    );
}

/** Checks declarative Vue files and retired Toast components. */
function checkVueSource(
    localPath: string,
    file: string,
    source: string,
): string[] {
    const { descriptor, errors } = parse(source, { filename: file });
    const problems = errors.map(
        () => `${localPath}: Vue source must parse without errors.`,
    );
    if (
        descriptor.script != null ||
        descriptor.scriptSetup != null ||
        descriptor.styles.length > 0 ||
        descriptor.customBlocks.length > 0
    ) {
        problems.push(
            `${localPath}: authored Vue files must be template-only; keep ` +
                "behavior and styles in co-located TypeScript and CSS.",
        );
    }
    if (
        descriptor.template != null &&
        TOAST_TEMPLATE_PATTERN.test(descriptor.template.content)
    ) {
        problems.push(
            `${localPath}: replace Codex Toast components with the shared ` +
                "action notifier.",
        );
    }
    return [...new Set(problems)];
}

/** Adds a one-based source line to an AST diagnostic. */
function formatNodeProblem(
    localPath: string,
    sourceFile: ts.SourceFile,
    node: ts.Node,
    message: string,
): string {
    const line = sourceFile.getLineAndCharacterOfPosition(
        node.getStart(),
    ).line;
    return `${localPath}:${line + 1}: ${message}`;
}
