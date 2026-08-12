/** Enforces package and architecture boundaries in authored source. */

import { readFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import ts from "typescript";
import {
    formatWorkspacePath,
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

const LAYER_NAMES = new Set([
    "contracts",
    "domain",
    "infra",
    "jobs",
    "publishing",
    "services",
    "sources",
    "support",
    "ui",
    "workflows",
]);
const FORBIDDEN_IMPORTS: Record<string, ReadonlySet<string>> = {
    contracts: new Set([
        "infra",
        "jobs",
        "publishing",
        "services",
        "sources",
        "ui",
        "workflows",
    ]),
    domain: new Set([
        "infra",
        "jobs",
        "publishing",
        "services",
        "sources",
        "ui",
        "workflows",
    ]),
    infra: new Set(["jobs", "services", "ui", "workflows"]),
    jobs: new Set(["ui"]),
    publishing: new Set(["jobs", "services", "ui", "workflows"]),
    services: new Set(["jobs", "ui", "workflows"]),
    sources: new Set(["jobs", "services", "ui", "workflows"]),
    support: new Set(["jobs", "services", "ui", "workflows"]),
    ui: new Set([
        "infra",
        "jobs",
        "publishing",
        "services",
        "sources",
        "workflows",
    ]),
    workflows: new Set(["ui"]),
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
            ...checkSharedExportMetadata(context.shared),
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
    return checkSharedSubpath(context, localPath, specifier);
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
    if (target == null || target === sourcePackage.metadata.name) {
        return [];
    }
    const sourceKind = isGadgetPackage(sourcePackage)
        ? "gadgets must not import another gadget"
        : "shared source must not import a gadget";
    return [`${localPath}: ${sourceKind} through "${specifier}".`];
}

/** Checks downward dependencies between architecture layers. */
function checkLayerBoundary(
    gadget: GadgetPackage,
    file: string,
    localPath: string,
    specifier: string,
): string[] {
    const packagePath = toPosixPath(relative(gadget.directory, file));
    const sourceLayer = packagePath.split("/")[0]!;
    if (!LAYER_NAMES.has(sourceLayer)) {
        return [];
    }
    const targetLayer = resolveTargetLayer(gadget, file, specifier);
    if (
        targetLayer == null ||
        !FORBIDDEN_IMPORTS[sourceLayer]!.has(targetLayer)
    ) {
        return [];
    }
    return [
        `${localPath}: ${sourceLayer} must not import ${targetLayer} ` +
            `through "${specifier}".`,
    ];
}

/** Resolves a local import to a top-level layer. */
function resolveTargetLayer(
    gadget: GadgetPackage,
    file: string,
    specifier: string,
): string | null {
    if (specifier.startsWith("#gadget/")) {
        const layer = specifier.slice("#gadget/".length).split("/")[0]!;
        return LAYER_NAMES.has(layer) ? layer : null;
    }
    if (!specifier.startsWith(".")) {
        return null;
    }
    const target = resolve(dirname(file), specifier);
    const localTarget = toPosixPath(relative(gadget.directory, target));
    if (isOutsideRoot(relative(gadget.directory, target))) {
        return null;
    }
    const layer = localTarget.split("/")[0]!;
    return LAYER_NAMES.has(layer) ? layer : null;
}

/** Reads the subpath keys published by the shared package manifest. */
function getSharedExports(shared: WorkspacePackage | null): Set<string> {
    if (shared == null || shared.metadata.exports == null) {
        return new Set();
    }
    return new Set(Object.keys(shared.metadata.exports));
}

/** Validates shared export keys and local target values. */
function checkSharedExportMetadata(shared: WorkspacePackage | null): string[] {
    if (shared == null) {
        return ["workspace: missing the shared source package."];
    }
    const exports = shared.metadata.exports;
    if (exports == null) {
        return ["shared: package.json must define public exports."];
    }
    return Object.entries(exports).flatMap(([key, target]) => {
        const validKey = key === "." || key.startsWith("./");
        const validTarget =
            hasText(target) &&
            target.startsWith("./") &&
            !hasTraversal(target.slice(2));
        return validKey && validTarget
            ? []
            : [`shared: invalid package export ${key}.`];
    });
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
