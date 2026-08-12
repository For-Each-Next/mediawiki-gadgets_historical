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
    assertProblem(result.problems, /domain must not import ui/u);
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
        writeFile(join(sourceRoot, "shared", "index.ts"), "export {};\n"),
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
            exports: { ".": "./index.ts", "./public": "./public.ts" },
        }),
        writeFile(
            join(alphaRoot, "domain", "violations.ts"),
            [
                'import "beta-gadget";',
                'import "../../beta-gadget/main.ts";',
                'import "#shared";',
                'void import("#shared/private");',
                'export * from "#gadget/ui/dialog.ts";',
                "",
            ].join("\n"),
        ),
        writeFile(join(betaRoot, "main.ts"), "export {};\n"),
        writeFile(join(sharedRoot, "index.ts"), 'import "alpha-gadget";\n'),
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
