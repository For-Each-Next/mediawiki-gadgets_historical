/** Enforces package and architecture boundaries in authored source. */

import { lstat, readFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import ts from "typescript";
import {
    formatWorkspacePath,
    hasErrorCode,
    hasText,
    inspectWorkspacePackages,
    isGadgetPackage,
    isOutsideRoot,
    inspectAuthoredTree,
    toPosixPath,
    type GadgetPackage,
    type WorkspaceDiscovery,
    type WorkspacePackage,
} from "../workspace/index.ts";
import { SHARED_PACKAGE_NAME } from "./package-metadata.ts";

const GADGET_LAYERS = new Set([
    "adapters",
    "config",
    "contracts",
    "domain",
    "i18n",
    "ui",
    "workflows",
]);
const GADGET_ROLES = new Set([...GADGET_LAYERS, "browser", "index", "main"]);
const ALLOWED_LOCAL_IMPORTS: Record<string, ReadonlySet<string>> = {
    adapters: new Set(["adapters", "config", "contracts", "domain"]),
    browser: new Set(["main"]),
    config: new Set(["config"]),
    contracts: new Set(["config", "contracts", "domain"]),
    domain: new Set(["config", "domain"]),
    i18n: new Set(["i18n"]),
    index: new Set(["contracts", "domain"]),
    main: new Set(GADGET_LAYERS),
    ui: new Set(["config", "contracts", "domain", "i18n", "ui"]),
    workflows: new Set(["config", "contracts", "domain", "workflows"]),
};
export interface SourceBoundaryResult {
    fileCount: number;
    problems: string[];
}

interface BoundaryContext {
    gadgetNames: string[];
    packages: WorkspacePackage[];
    shared: WorkspacePackage | null;
    sharedExports: Set<string>;
    sourceRoot: string;
}

/** Checks package isolation, shared exports, and layer imports. */
export async function checkSourceBoundaries(
    workspaceRoot: string,
    existingDiscovery?: WorkspaceDiscovery,
): Promise<SourceBoundaryResult> {
    const discovery =
        existingDiscovery ?? (await inspectWorkspacePackages(workspaceRoot));
    const sourceRoot = resolve(workspaceRoot, "src");
    const tree = await inspectAuthoredTree(sourceRoot, {
        extensions: new Set([".ts"]),
    });
    const context = createBoundaryContext(sourceRoot, discovery.packages);
    const results = await Promise.all(
        tree.files.map((file) => checkSourceFile(context, file)),
    );
    return {
        fileCount: tree.files.length,
        problems: [
            ...(existingDiscovery == null ? discovery.problems : []),
            ...(await checkSharedExportMetadata(context.shared)),
            ...tree.symbolicLinks.map(
                (path) =>
                    `${formatWorkspacePath(workspaceRoot, path)}: authored ` +
                    "source must not use symbolic links.",
            ),
            ...results.flat(),
        ],
    };
}

/** Builds immutable package and shared-export lookup data. */
function createBoundaryContext(
    sourceRoot: string,
    packages: WorkspacePackage[],
): BoundaryContext {
    const shared =
        packages.find(
            (candidate) => candidate.metadata.name === SHARED_PACKAGE_NAME,
        ) ?? null;
    return {
        gadgetNames: packages
            .filter(isGadgetPackage)
            .flatMap((gadget) =>
                hasText(gadget.metadata.name) ? [gadget.metadata.name] : [],
            ),
        packages,
        shared,
        sharedExports: getSharedExports(shared),
        sourceRoot,
    };
}

/** Checks all static and dynamic string-literal imports in one file. */
async function checkSourceFile(
    context: BoundaryContext,
    file: string,
): Promise<string[]> {
    const localPath = toPosixPath(relative(context.sourceRoot, file));
    const packageDirectory = localPath.split("/")[0]!;
    const sourcePackage = context.packages.find(
        (candidate) => candidate.directoryName === packageDirectory,
    );
    if (sourcePackage == null) {
        return [
            `${localPath}: authored source must belong to a workspace ` +
                "package.",
        ];
    }
    const source = await readFile(file, "utf8");
    const specifiers = collectModuleSpecifiers(file, source);
    return specifiers.flatMap((specifier) =>
        checkImport(context, sourcePackage, file, localPath, specifier),
    );
}

/** Parses module references, ignoring comments and string prose. */
function collectModuleSpecifiers(file: string, source: string): string[] {
    const sourceFile = ts.createSourceFile(
        file,
        source,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TS,
    );
    const specifiers: string[] = [];
    function visit(node: ts.Node): void {
        const specifier = getModuleSpecifier(node);
        if (specifier != null) {
            specifiers.push(specifier);
        }
        ts.forEachChild(node, visit);
    }
    visit(sourceFile);
    return specifiers;
}

/** Reads a module specifier from supported TypeScript import syntax. */
function getModuleSpecifier(node: ts.Node): string | null {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
        return readStringLiteral(node.moduleSpecifier);
    }
    if (ts.isImportEqualsDeclaration(node)) {
        const reference = node.moduleReference;
        return ts.isExternalModuleReference(reference)
            ? readStringLiteral(reference.expression)
            : null;
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

/** Narrows a quoted module reference to its unescaped text. */
function readStringLiteral(node: ts.Node | undefined): string | null {
    return node != null && ts.isStringLiteralLike(node) ? node.text : null;
}

/** Checks one import against conventions, packages, and layers. */
function checkImport(
    context: BoundaryContext,
    sourcePackage: WorkspacePackage,
    file: string,
    localPath: string,
    specifier: string,
): string[] {
    const problems = [
        ...checkAliasConventions(context, sourcePackage, localPath, specifier),
        ...checkPackageBoundary(
            context,
            sourcePackage,
            file,
            localPath,
            specifier,
        ),
    ];
    if (isGadgetPackage(sourcePackage)) {
        problems.push(
            ...checkLayerBoundary(sourcePackage, file, localPath, specifier),
        );
    }
    return problems;
}

/** Checks retired, aggregate, and unpublished shared aliases. */
function checkAliasConventions(
    context: BoundaryContext,
    sourcePackage: WorkspacePackage,
    localPath: string,
    specifier: string,
): string[] {
    if (specifier === "#me" || specifier.startsWith("#me/")) {
        return [
            `${localPath}: replace legacy import "${specifier}" with ` +
                "#gadget.",
        ];
    }
    if (!isGadgetPackage(sourcePackage)) {
        return [];
    }
    if (specifier === "#shared" || specifier === SHARED_PACKAGE_NAME) {
        return [
            `${localPath}: replace aggregate ${specifier} with an explicit ` +
                "shared subpath.",
        ];
    }
    const problems = checkSharedSubpath(context, localPath, specifier);
    if (specifier.startsWith(`${SHARED_PACKAGE_NAME}/`)) {
        const suffix = specifier.slice(SHARED_PACKAGE_NAME.length + 1);
        problems.unshift(
            `${localPath}: import shared capabilities through ` +
                `"#shared/${suffix}" instead of "${specifier}".`,
        );
    }
    return problems;
}

/** Requires shared imports to name an exported subpath. */
function checkSharedSubpath(
    context: BoundaryContext,
    localPath: string,
    specifier: string,
): string[] {
    const aliasPrefix = "#shared/";
    const packagePrefix = `${SHARED_PACKAGE_NAME}/`;
    const suffix = specifier.startsWith(aliasPrefix)
        ? specifier.slice(aliasPrefix.length)
        : specifier.startsWith(packagePrefix)
          ? specifier.slice(packagePrefix.length)
          : null;
    if (suffix == null) {
        return [];
    }
    const exportName = `./${suffix}`;
    if (context.sharedExports.has(exportName) && !hasTraversal(suffix)) {
        return [];
    }
    return [
        `${localPath}: shared import "${specifier}" is not a published ` +
            "shared-package subpath.",
    ];
}

/** Checks lexical package escapes and cross-package imports. */
function checkPackageBoundary(
    context: BoundaryContext,
    sourcePackage: WorkspacePackage,
    file: string,
    localPath: string,
    specifier: string,
): string[] {
    if (specifier.startsWith(".")) {
        const target = resolve(dirname(file), specifier);
        const localTarget = relative(sourcePackage.directory, target);
        return isOutsideRoot(localTarget)
            ? [
                  `${localPath}: relative import "${specifier}" escapes ` +
                      "its package.",
              ]
            : [];
    }
    if (hasAliasTraversal(specifier)) {
        return [
            `${localPath}: import "${specifier}" escapes its package alias.`,
        ];
    }
    return checkNamedPackageImport(
        context,
        sourcePackage,
        localPath,
        specifier,
    );
}

/** Rejects gadget-to-gadget and shared-to-gadget package imports. */
function checkNamedPackageImport(
    context: BoundaryContext,
    sourcePackage: WorkspacePackage,
    localPath: string,
    specifier: string,
): string[] {
    const target = context.gadgetNames.find((name) =>
        isPackageSpecifier(specifier, name),
    );
    if (target == null) {
        return [];
    }
    if (target === sourcePackage.metadata.name) {
        return [
            `${localPath}: gadget-local imports must use #gadget instead ` +
                `of the self-package specifier "${specifier}".`,
        ];
    }
    const sourceKind = isGadgetPackage(sourcePackage)
        ? "gadgets must not import another gadget"
        : "shared source must not import a gadget";
    return [`${localPath}: ${sourceKind} through "${specifier}".`];
}

/** Enforces the complete allowlist between local source roles. */
function checkLayerBoundary(
    gadget: GadgetPackage,
    file: string,
    localPath: string,
    specifier: string,
): string[] {
    const packagePath = toPosixPath(relative(gadget.directory, file));
    const sourceRole = classifyGadgetRole(packagePath);
    if (sourceRole == null) {
        return [];
    }
    const targetRole = resolveTargetRole(gadget, file, specifier);
    if (
        targetRole == null ||
        ALLOWED_LOCAL_IMPORTS[sourceRole]!.has(targetRole)
    ) {
        return [];
    }
    return [
        `${localPath}: ${sourceRole} must not import local role ` +
            `${targetRole} through "${specifier}".`,
    ];
}

/** Resolves a local import to a layer or entry module. */
function resolveTargetRole(
    gadget: GadgetPackage,
    file: string,
    specifier: string,
): string | null {
    if (specifier === "#gadget") {
        return "index";
    }
    if (specifier.startsWith("#gadget/")) {
        return (
            classifyGadgetRole(specifier.slice("#gadget/".length)) ??
            "unclassified"
        );
    }
    if (!specifier.startsWith(".")) {
        return null;
    }
    const target = resolve(dirname(file), specifier);
    const localTarget = toPosixPath(relative(gadget.directory, target));
    if (isOutsideRoot(relative(gadget.directory, target))) {
        return null;
    }
    return classifyGadgetRole(localTarget) ?? "unclassified";
}

/** Classifies a path under the universal source tree. */
function classifyGadgetRole(packagePath: string): string | null {
    const first = packagePath.split("/")[0]!;
    if (GADGET_LAYERS.has(first)) {
        return first;
    }
    const rootName = first.replace(/\.ts$/u, "");
    return GADGET_ROLES.has(rootName) ? rootName : null;
}

/** Reads the subpath keys published by the shared package manifest. */
function getSharedExports(shared: WorkspacePackage | null): Set<string> {
    if (shared == null || shared.metadata.exports == null) {
        return new Set();
    }
    return new Set(Object.keys(shared.metadata.exports));
}

/** Validates shared export keys and local target values. */
async function checkSharedExportMetadata(
    shared: WorkspacePackage | null,
): Promise<string[]> {
    if (shared == null) {
        return ["workspace: missing the shared source package."];
    }
    const exports = shared.metadata.exports;
    if (exports == null) {
        return ["shared: package.json must define public exports."];
    }
    const results = await Promise.all(
        Object.entries(exports).map(([key, target]) =>
            checkSharedExport(shared, key, target),
        ),
    );
    return results.flat();
}

/** Checks one focused shared export and its target file. */
async function checkSharedExport(
    shared: WorkspacePackage,
    key: string,
    target: unknown,
): Promise<string[]> {
    const validKey = key.startsWith("./") && key !== "./";
    const validTarget =
        hasText(target) &&
        target.startsWith("./") &&
        !hasTraversal(target.slice(2));
    if (!validKey || !validTarget) {
        return [`shared: invalid package export ${key}.`];
    }
    const targetPath = resolve(shared.directory, target);
    try {
        const status = await lstat(targetPath);
        return status.isFile() && !status.isSymbolicLink()
            ? []
            : [
                  `shared: package export ${key} must target a real ` +
                      `file: ${target}.`,
              ];
    } catch (error) {
        if (!hasErrorCode(error, "ENOENT")) {
            throw error;
        }
        return [`shared: package export ${key} does not exist: ${target}.`];
    }
}

/** Checks a bare or subpath package specifier. */
function isPackageSpecifier(specifier: string, name: string): boolean {
    return specifier === name || specifier.startsWith(`${name}/`);
}

/** Checks path segments for parent-directory traversal. */
function hasTraversal(path: string): boolean {
    return path.split("/").includes("..");
}

/** Checks internal aliases for parent-directory traversal. */
function hasAliasTraversal(specifier: string): boolean {
    return (
        (specifier.startsWith("#gadget/") ||
            specifier.startsWith("#shared/")) &&
        hasTraversal(specifier)
    );
}
