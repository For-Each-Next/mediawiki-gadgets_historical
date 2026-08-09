/**
 * Tests the reusable gadget package and dependency contracts.
 */

import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { checkGadgetPackages } from "../../scripts/check-gadget-packages.ts";
import * as layerCheck from "../../scripts/check-layer-dependencies.ts";
import { checkMarkdownLines } from "../../scripts/check-markdown-lines.ts";

test("every gadget follows the reusable package contract", async () => {
    const result = await checkGadgetPackages(process.cwd());

    assert.ok(result.gadgetCount >= 3);
    assert.deepEqual(result.problems, []);
});

test("a future gadget is discovered automatically", async (context) => {
    const workspaceRoot = await mkdtemp(join(tmpdir(), "gadget-contract-"));
    context.after(() => rm(workspaceRoot, { force: true, recursive: true }));
    await writeFutureGadget(workspaceRoot);
    await writeWorkspaceLicenseMaps(workspaceRoot, [
        "future-gadget@1.3.0-dev.1",
    ]);

    const result = await checkGadgetPackages(workspaceRoot);

    assert.equal(result.gadgetCount, 1);
    assert.deepEqual(result.problems, []);
});

test("an old package notice cannot cover a later version", async (context) => {
    const workspaceRoot = await mkdtemp(join(tmpdir(), "gadget-license-"));
    context.after(() => rm(workspaceRoot, { force: true, recursive: true }));
    await writeFutureGadget(workspaceRoot);
    await writeWorkspaceLicenseMaps(workspaceRoot, [
        "future-gadget@1.3.0-dev.1",
    ]);
    await writeFile(
        join(workspaceRoot, "src", "future-gadget", "LICENSE"),
        createFutureLicense("future-gadget", "1.2.9", "CC0-1.0"),
    );

    const result = await checkGadgetPackages(workspaceRoot);

    assert.ok(
        result.problems.some((problem) => /release scope/iu.test(problem)),
    );
});

test("a package notice must match its metadata license", async (context) => {
    const workspaceRoot = await mkdtemp(join(tmpdir(), "gadget-spdx-"));
    context.after(() => rm(workspaceRoot, { force: true, recursive: true }));
    await writeFutureGadget(workspaceRoot);
    await writeWorkspaceLicenseMaps(workspaceRoot, [
        "future-gadget@1.3.0-dev.1",
    ]);
    await writeFile(
        join(workspaceRoot, "src", "future-gadget", "LICENSE"),
        createFutureLicense("future-gadget", "1.3.0-dev.1", "MIT"),
    );

    const result = await checkGadgetPackages(workspaceRoot);

    assert.ok(
        result.problems.some((problem) =>
            /package\.json license/iu.test(problem),
        ),
    );
});

test("workspace maps include each current CC0 scope", async (context) => {
    const workspaceRoot = await mkdtemp(join(tmpdir(), "gadget-map-"));
    context.after(() => rm(workspaceRoot, { force: true, recursive: true }));
    await writeFutureGadget(
        workspaceRoot,
        "future-gadget",
        "future_gadget",
        true,
    );
    await writeWorkspaceLicenseMaps(
        workspaceRoot,
        ["future-gadget@1.3.0-dev.10"],
        ["future-gadget@1.3.0-dev.10"],
    );

    const result = await checkGadgetPackages(workspaceRoot);

    assert.equal(
        result.problems.filter((problem) =>
            /must include CC0 scope/iu.test(problem),
        ).length,
        2,
    );
});

test("workspace licensing maps are required", async (context) => {
    const workspaceRoot = await mkdtemp(join(tmpdir(), "gadget-map-missing-"));
    context.after(() => rm(workspaceRoot, { force: true, recursive: true }));
    await writeFutureGadget(workspaceRoot);

    const result = await checkGadgetPackages(workspaceRoot);

    assert.equal(
        result.problems.filter((problem) =>
            /missing licensing map/iu.test(problem),
        ).length,
        2,
    );
});

test("current and retired artifact names cannot collide", async (context) => {
    const workspaceRoot = await mkdtemp(join(tmpdir(), "gadget-collision-"));
    context.after(() => rm(workspaceRoot, { force: true, recursive: true }));
    await Promise.all([
        writeFutureGadget(workspaceRoot, "first-gadget", "shared"),
        writeFutureGadget(workspaceRoot, "second-gadget", "shared.min"),
    ]);
    await writeWorkspaceLicenseMaps(workspaceRoot, [
        "first-gadget@1.3.0-dev.1",
        "second-gadget@1.3.0-dev.1",
    ]);

    const result = await checkGadgetPackages(workspaceRoot);

    assert.equal(result.gadgetCount, 2);
    assert.ok(
        result.problems.some((problem) =>
            /shared\.min\.js collides/iu.test(problem),
        ),
    );
});

test("flat artifact names cannot collide by case", async (context) => {
    const workspaceRoot = await mkdtemp(join(tmpdir(), "gadget-case-"));
    context.after(() => rm(workspaceRoot, { force: true, recursive: true }));
    await Promise.all([
        writeFutureGadget(workspaceRoot, "first-gadget", "shared"),
        writeFutureGadget(workspaceRoot, "second-gadget", "SHARED"),
    ]);
    await writeWorkspaceLicenseMaps(workspaceRoot, [
        "first-gadget@1.3.0-dev.1",
        "second-gadget@1.3.0-dev.1",
    ]);

    const result = await checkGadgetPackages(workspaceRoot);

    assert.ok(
        result.problems.some((problem) =>
            /shared\.js collides/iu.test(problem),
        ),
    );
});

test("the aggregate output name is reserved by case", async (context) => {
    const workspaceRoot = await mkdtemp(join(tmpdir(), "gadget-reserved-"));
    context.after(() => rm(workspaceRoot, { force: true, recursive: true }));
    await writeFutureGadget(
        workspaceRoot,
        "future-gadget",
        "00-MediaWiki-Gadgets",
    );
    await writeWorkspaceLicenseMaps(workspaceRoot, [
        "future-gadget@1.3.0-dev.1",
    ]);

    const result = await checkGadgetPackages(workspaceRoot);

    assert.ok(
        result.problems.some((problem) =>
            problem.includes(
                "must not reserve the aggregate " +
                    "00-mediawiki-gadgets.user.js path",
            ),
        ),
    );
});

test("architecture layer imports point downward", async () => {
    const result = await layerCheck.checkLayerDependencies(process.cwd());

    assert.ok(result.fileCount > 0);
    assert.deepEqual(result.problems, []);
});

test("authored Markdown lines fit the repository width", async () => {
    const result = await checkMarkdownLines(process.cwd());

    assert.ok(result.fileCount > 0);
    assert.deepEqual(result.problems, []);
});

/**
 * Writes the smallest complete future gadget package contract.
 *
 * @param workspaceRoot - Workspace root value.
 * @param packageName - Package name value.
 * @param outputName - Output name value.
 * @param usesShared - Whether the fixture opts into shared imports.
 */
async function writeFutureGadget(
    workspaceRoot: string,
    packageName: string = "future-gadget",
    outputName: string = "future_gadget",
    usesShared: boolean = false,
): Promise<void> {
    const packageRoot = join(workspaceRoot, "src", packageName);
    await mkdir(packageRoot, { recursive: true });
    const files = {
        "AGENTS.md": "# Fixture rules\n",
        "CHANGELOG.md": createFutureChangelog(),
        LICENSE: createFutureLicense(packageName, "1.3.0-dev.1", "CC0-1.0"),
        "README.md": createFutureReadme(packageName),
        "browser.ts": 'import { start } from "#gadget/main.ts";\nstart();\n',
        "index.ts": "export {};\n",
        "main.ts": "export function start(): void {}\n",
        "package.json": JSON.stringify(
            createFutureMetadata(packageName, outputName, usesShared),
        ),
    };
    await Promise.all(
        Object.entries(files).map(([path, content]) =>
            writeFile(join(packageRoot, path), content),
        ),
    );
}

/** Creates a version- and license-specific package notice fixture. */
function createFutureLicense(
    packageName: string,
    version: string,
    license: string,
): string {
    return [
        `Future Gadget ${version} Licensing Notice`,
        "",
        `Release-Scope: ${packageName}@${version}`,
        `SPDX-License-Identifier: ${license}`,
        "",
    ].join("\n");
}

/**
 * Creates the future gadget's package metadata.
 *
 * @param packageName - Package name value.
 * @param outputName - Output name value.
 * @param usesShared - Whether the fixture opts into shared imports.
 * @returns Created the future gadget's package metadata.
 */
function createFutureMetadata(
    packageName: string,
    outputName: string,
    usesShared: boolean = false,
): Record<string, unknown> {
    return {
        author: "Test",
        browser: "./browser.ts",
        description: "Future package fixture.",
        gadgetBuild: {
            globalName: "futureGadget",
            headerDescription: [
                "Exercises discovery through the shared package contract.",
            ],
            noticeFiles: ["LICENSE"],
            outputName,
        },
        imports: createFutureImports(usesShared),
        main: "./index.ts",
        name: packageName,
        license: "CC0-1.0",
        private: true,
        scripts: {
            build: "node ../../scripts/gadget-build/cli.ts",
            check: "tsc --noEmit",
            test: "node --test",
        },
        type: "module",
        version: "1.3.0-dev.1",
        vue: {
            assetsDir: "",
            css: { extract: false },
            filenameHashing: false,
            outputDir: "../../dist",
        },
    };
}

/** Creates local and optional shared package import aliases. */
function createFutureImports(usesShared: boolean): Record<string, string> {
    return {
        "#gadget": "./index.ts",
        "#gadget/*": "./*",
        ...(usesShared
            ? {
                  "#shared": "@mediawiki-gadgets/shared",
                  "#shared/*": "@mediawiki-gadgets/shared/*",
              }
            : {}),
    };
}

/** Writes the workspace maps that retain exact CC0 release scopes. */
async function writeWorkspaceLicenseMaps(
    workspaceRoot: string,
    rootScopes: string[],
    sharedScopes: string[] = [],
): Promise<void> {
    const sharedRoot = join(workspaceRoot, "src", "shared");
    await mkdir(sharedRoot, { recursive: true });
    await Promise.all([
        writeFile(
            join(workspaceRoot, "LICENSE"),
            formatLicenseScopes(rootScopes),
        ),
        writeFile(
            join(sharedRoot, "LICENSE"),
            formatLicenseScopes(sharedScopes),
        ),
    ]);
}

/** Formats exact release-scope tokens for a fixture licensing map. */
function formatLicenseScopes(scopes: string[]): string {
    return scopes.map((scope) => `- \`${scope}\``).join("\n") + "\n";
}

/**
 * Creates the future gadget's README contract.
 *
 * @param packageName - Package name value.
 * @returns Created the future gadget's README contract.
 */
function createFutureReadme(packageName: string): string {
    return [
        "# Future Gadget",
        "",
        "## Run",
        "",
        `\`npm run build -w ${packageName}\``,
        "",
        "## Features",
        "",
        "Fixture.",
        "",
        "## Development",
        "",
        "Fixture.",
        "",
        "## Architecture",
        "",
        "```text",
        "browser.ts",
        "└── main.ts",
        "```",
        "",
        "See [changelog](CHANGELOG.md), [rules](AGENTS.md),",
        "[repository rules](../../AGENTS.md), and the",
        "[license](../../LICENSE).",
        "",
        "## License",
        "",
        "See the [package license](LICENSE) and",
        "[repository license](../../LICENSE).",
        "",
    ].join("\n");
}

/**
 * Creates the future gadget's active changelog entry.
 *
 * @returns Created the future gadget's active changelog entry.
 */
function createFutureChangelog(): string {
    return [
        "# Changelog",
        "",
        "## Until 1.4",
        "",
        "### 1.3.0-dev.1 (2026-07-29 00:00 UTC)",
        "",
        "Overview: Added the future gadget fixture.",
        "",
        "- Added the fixture.",
        "",
    ].join("\n");
}
