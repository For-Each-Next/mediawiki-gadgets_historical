/** Tests project-level package and source dependency boundaries. */

import assert from "node:assert/strict";
import { mkdir, symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

import * as repositoryCheck from "../../../scripts/repository-check/index.ts";
import { createTemporaryWorkspace } from "../support/temporary-workspace.ts";

test("source boundaries reject escapes and private APIs", async (context) => {
    const workspaceRoot = await createTemporaryWorkspace(
        context,
        "source-boundaries-",
    );
    await writeBoundaryWorkspace(workspaceRoot);

    const result = await repositoryCheck.checkSourceBoundaries(workspaceRoot);

    assert.equal(result.fileCount, 3);
    assertProblem(result.problems, /gadgets must not import another gadget/u);
    assertProblem(result.problems, /relative import .* escapes its package/u);
    assertProblem(result.problems, /replace aggregate #shared/u);
    assertProblem(result.problems, /not a published shared-package subpath/u);
    assertProblem(result.problems, /shared source must not import a gadget/u);
    assertProblem(result.problems, /domain must not import local role ui/u);
    assertProblem(result.problems, /must use #gadget instead of the self/u);
});

test("source roles use a default-deny dependency graph", async (context) => {
    const workspaceRoot = await createTemporaryWorkspace(
        context,
        "source-roles-",
    );
    await writeRoleWorkspace(workspaceRoot);

    const result = await repositoryCheck.checkSourceBoundaries(workspaceRoot);

    assertProblem(
        result.problems,
        /config must not import local role domain/u,
    );
    assertProblem(
        result.problems,
        /i18n must not import local role contracts/u,
    );
    assertProblem(
        result.problems,
        /workflows must not import local role adapters/u,
    );
    assertProblem(result.problems, /ui must not import local role workflows/u);
    assertProblem(result.problems, /browser must not import local role ui/u);
    assertProblem(result.problems, /index must not import local role ui/u);
    assertProblem(result.problems, /local role unclassified/u);
});

test("source roles allow documented inward edges", async (context) => {
    const workspaceRoot = await createTemporaryWorkspace(
        context,
        "source-role-allowlist-",
    );
    await writeAllowedRoleWorkspace(workspaceRoot);

    const result = await repositoryCheck.checkSourceBoundaries(workspaceRoot);

    assert.deepEqual(result.problems, []);
});

test("type, export, and dynamic imports all create edges", async (context) => {
    const workspaceRoot = await createTemporaryWorkspace(
        context,
        "source-import-kinds-",
    );
    await writeImportKindWorkspace(workspaceRoot);

    const result = await repositoryCheck.checkSourceBoundaries(workspaceRoot);

    assert.equal(
        result.problems.filter((problem) =>
            /domain must not import local role ui/u.test(problem),
        ).length,
        3,
    );
});

test("shared exports must be focused existing files", async (context) => {
    const workspaceRoot = await createTemporaryWorkspace(
        context,
        "shared-exports-",
    );
    await writeBoundaryWorkspace(workspaceRoot);
    await writeManifest(
        join(workspaceRoot, "src", "shared"),
        "@mediawiki-gadgets/shared",
        {
            exports: {
                ".": "./index.ts",
                "./missing": "./missing.ts",
                "./public": "./public.ts",
            },
        },
    );
    await writeFile(
        join(workspaceRoot, "src", "shared", "public.ts"),
        "export {};\n",
    );

    const result = await repositoryCheck.checkSourceBoundaries(workspaceRoot);

    assertProblem(result.problems, /invalid package export \./u);
    assertProblem(result.problems, /export \.\/missing does not exist/u);
});

test("source boundaries reject symbolic links", async (context) => {
    const workspaceRoot = await createTemporaryWorkspace(
        context,
        "source-symlinks-",
    );
    await writeBoundaryWorkspace(workspaceRoot);
    const packageRoot = join(workspaceRoot, "src", "alpha-gadget");
    await Promise.all([
        symlink(
            join(workspaceRoot, "src", "beta-gadget", "main.ts"),
            join(packageRoot, "linked.ts"),
            "file",
        ),
        symlink(
            join(workspaceRoot, "src", "beta-gadget"),
            join(packageRoot, "linked-directory"),
            "dir",
        ),
    ]);

    const result = await repositoryCheck.checkSourceBoundaries(workspaceRoot);

    assert.equal(
        result.problems.filter((problem) =>
            /authored source must not use symbolic links/u.test(problem),
        ).length,
        2,
    );
});

test("authored source must belong to a package", async (context) => {
    const workspaceRoot = await createTemporaryWorkspace(
        context,
        "source-orphan-",
    );
    await writeBoundaryWorkspace(workspaceRoot);
    const legacyRoot = join(workspaceRoot, "src", "legacy-code");
    await mkdir(legacyRoot);
    await writeFile(join(legacyRoot, "legacy.ts"), "export {};\n");

    const result = await repositoryCheck.checkSourceBoundaries(workspaceRoot);

    assertProblem(
        result.problems,
        /source must belong to a workspace package/u,
    );
});

test("import-shaped comments and strings create no edges", async (context) => {
    const workspaceRoot = await createTemporaryWorkspace(
        context,
        "source-prose-",
    );
    await writeBoundaryWorkspace(workspaceRoot);
    const sourceRoot = join(workspaceRoot, "src");
    await Promise.all([
        writeFile(
            join(sourceRoot, "alpha-gadget", "domain", "violations.ts"),
            [
                "const staticExample = 'import \"beta-gadget\";';",
                "const dynamicExample = " + "'import(\"#shared/private\")';",
                '/* export * from "../../beta-gadget/main.ts"; */',
                "export { dynamicExample, staticExample };",
                "",
            ].join("\n"),
        ),
        writeFile(join(sourceRoot, "shared", "public.ts"), "export {};\n"),
    ]);

    const result = await repositoryCheck.checkSourceBoundaries(workspaceRoot);

    assert.equal(result.fileCount, 3);
    assert.deepEqual(result.problems, []);
});

/** Writes three packages with deliberate boundary violations. */
async function writeBoundaryWorkspace(workspaceRoot: string): Promise<void> {
    const alphaRoot = join(workspaceRoot, "src", "alpha-gadget");
    const betaRoot = join(workspaceRoot, "src", "beta-gadget");
    const sharedRoot = join(workspaceRoot, "src", "shared");
    await Promise.all([
        mkdir(join(alphaRoot, "domain"), { recursive: true }),
        mkdir(betaRoot, { recursive: true }),
        mkdir(sharedRoot, { recursive: true }),
    ]);
    await Promise.all([
        writeManifest(alphaRoot, "alpha-gadget", { gadgetBuild: {} }),
        writeManifest(betaRoot, "beta-gadget", { gadgetBuild: {} }),
        writeManifest(sharedRoot, "@mediawiki-gadgets/shared", {
            exports: { "./public": "./public.ts" },
        }),
        writeFile(
            join(alphaRoot, "domain", "violations.ts"),
            [
                'import "beta-gadget";',
                'import "../../beta-gadget/main.ts";',
                'import "#shared";',
                'void import("#shared/private");',
                'export * from "#gadget/ui/dialog.ts";',
                'export * from "alpha-gadget/ui/dialog.ts";',
                "",
            ].join("\n"),
        ),
        writeFile(join(betaRoot, "main.ts"), "export {};\n"),
        writeFile(join(sharedRoot, "public.ts"), 'import "alpha-gadget";\n'),
    ]);
}

/** Writes every forbidden edge in the universal source graph. */
async function writeRoleWorkspace(workspaceRoot: string): Promise<void> {
    const packageRoot = join(workspaceRoot, "src", "alpha-gadget");
    const sharedRoot = join(workspaceRoot, "src", "shared");
    await Promise.all([
        ...[
            "adapters",
            "config",
            "contracts",
            "domain",
            "i18n",
            "ui",
            "workflows",
        ].map((name) => mkdir(join(packageRoot, name), { recursive: true })),
        mkdir(sharedRoot, { recursive: true }),
    ]);
    await writeRoleFiles(packageRoot, sharedRoot);
}

/** Writes every allowed edge in the universal source graph. */
async function writeAllowedRoleWorkspace(
    workspaceRoot: string,
): Promise<void> {
    const packageRoot = join(workspaceRoot, "src", "alpha-gadget");
    const sharedRoot = join(workspaceRoot, "src", "shared");
    await Promise.all([
        mkdir(packageRoot, { recursive: true }),
        mkdir(sharedRoot, { recursive: true }),
    ]);
    const edges: Record<string, string[]> = {
        adapters: ["adapters", "config", "contracts", "domain"],
        config: ["config"],
        contracts: ["config", "contracts", "domain"],
        domain: ["config", "domain"],
        i18n: ["i18n"],
        ui: ["config", "contracts", "domain", "i18n", "ui"],
        workflows: ["config", "contracts", "domain", "workflows"],
    };
    await writeAllowedRoleFiles(packageRoot, sharedRoot, edges);
}

/** Writes the manifests, roots, and allowed edge fixtures. */
async function writeAllowedRoleFiles(
    packageRoot: string,
    sharedRoot: string,
    edges: Record<string, string[]>,
): Promise<void> {
    await Promise.all([
        writeManifest(packageRoot, "alpha-gadget", { gadgetBuild: {} }),
        writeManifest(sharedRoot, "@mediawiki-gadgets/shared", {
            exports: { "./public": "./public.ts" },
        }),
        writeFile(join(sharedRoot, "public.ts"), "export {};\n"),
        ...Object.entries(edges).map(([source, targets]) =>
            writeAllowedRoleFile(packageRoot, source, targets),
        ),
        writeFile(
            join(packageRoot, "browser.ts"),
            'import "#gadget/main.ts";\n',
        ),
        writeFile(
            join(packageRoot, "index.ts"),
            ["contracts", "domain"]
                .map((target) => `export * from "#gadget/${target}/x.ts";`)
                .join("\n"),
        ),
        writeFile(
            join(packageRoot, "main.ts"),
            [...Object.keys(edges), "#shared/public"]
                .map((target) =>
                    target.startsWith("#")
                        ? `import "${target}";`
                        : `import "#gadget/${target}/x.ts";`,
                )
                .join("\n"),
        ),
    ]);
}

/** Writes one source role and all of its allowed imports. */
async function writeAllowedRoleFile(
    packageRoot: string,
    source: string,
    targets: string[],
): Promise<void> {
    const directory = join(packageRoot, source);
    await mkdir(directory, { recursive: true });
    const imports = targets
        .map((target) => `import "#gadget/${target}/x.ts";`)
        .join("\n");
    await writeFile(join(directory, "x.ts"), `${imports}\n`);
}

/** Writes violations after the fixture directories exist. */
async function writeRoleFiles(
    packageRoot: string,
    sharedRoot: string,
): Promise<void> {
    await Promise.all([
        writeManifest(packageRoot, "alpha-gadget", { gadgetBuild: {} }),
        writeManifest(sharedRoot, "@mediawiki-gadgets/shared", {
            exports: { "./public": "./public.ts" },
        }),
        writeFile(join(sharedRoot, "public.ts"), "export {};\n"),
        writeFile(
            join(packageRoot, "config", "invalid.ts"),
            'import "#gadget/domain/value.ts";\n',
        ),
        writeFile(
            join(packageRoot, "i18n", "invalid.ts"),
            'import "#gadget/contracts/value.ts";\n',
        ),
        writeFile(
            join(packageRoot, "workflows", "invalid.ts"),
            'import "#gadget/adapters/value.ts";\n',
        ),
        writeFile(
            join(packageRoot, "ui", "invalid.ts"),
            'import "#gadget/workflows/value.ts";\n',
        ),
        writeFile(
            join(packageRoot, "browser.ts"),
            'import "#gadget/ui/value.ts";\n',
        ),
        writeFile(
            join(packageRoot, "index.ts"),
            'export * from "#gadget/ui/value.ts";\n',
        ),
        writeFile(
            join(packageRoot, "domain", "unknown.ts"),
            'import "#gadget/mystery/value.ts";\n',
        ),
    ]);
}

/** Writes equivalent forbidden imports in three syntax forms. */
async function writeImportKindWorkspace(workspaceRoot: string): Promise<void> {
    const packageRoot = join(workspaceRoot, "src", "alpha-gadget");
    const sharedRoot = join(workspaceRoot, "src", "shared");
    await Promise.all([
        mkdir(join(packageRoot, "domain"), { recursive: true }),
        mkdir(sharedRoot, { recursive: true }),
    ]);
    await Promise.all([
        writeManifest(packageRoot, "alpha-gadget", { gadgetBuild: {} }),
        writeManifest(sharedRoot, "@mediawiki-gadgets/shared", {
            exports: { "./public": "./public.ts" },
        }),
        writeFile(join(sharedRoot, "public.ts"), "export {};\n"),
        writeFile(
            join(packageRoot, "domain", "invalid.ts"),
            [
                'type Invalid = import("#gadget/ui/types.ts").Invalid;',
                'export * from "#gadget/ui/exported.ts";',
                'void import("#gadget/ui/dynamic.ts");',
                "export type { Invalid };",
                "",
            ].join("\n"),
        ),
    ]);
}

/** Writes one package manifest with optional contract metadata. */
async function writeManifest(
    packageRoot: string,
    name: string,
    metadata: Record<string, unknown>,
): Promise<void> {
    await writeFile(
        join(packageRoot, "package.json"),
        JSON.stringify({ name, type: "module", ...metadata }),
    );
}

/** Requires at least one diagnostic to match a focused contract. */
function assertProblem(problems: string[], pattern: RegExp): void {
    assert.ok(
        problems.some((problem) => pattern.test(problem)),
        `${pattern}:\n${problems.join("\n")}`,
    );
}
