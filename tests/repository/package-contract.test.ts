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

    const result = await checkGadgetPackages(workspaceRoot);

    assert.equal(result.gadgetCount, 1);
    assert.deepEqual(result.problems, []);
});

test("flat gadget artifact names cannot collide", async (context) => {
    const workspaceRoot = await mkdtemp(join(tmpdir(), "gadget-collision-"));
    context.after(() => rm(workspaceRoot, { force: true, recursive: true }));
    await Promise.all([
        writeFutureGadget(workspaceRoot, "first-gadget", "shared"),
        writeFutureGadget(workspaceRoot, "second-gadget", "shared.min"),
    ]);

    const result = await checkGadgetPackages(workspaceRoot);

    assert.equal(result.gadgetCount, 2);
    assert.ok(
        result.problems.some((problem) =>
            problem.includes("shared.min.js collides"),
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
 */
async function writeFutureGadget(
    workspaceRoot: string,
    packageName: string = "future-gadget",
    outputName: string = "future_gadget",
): Promise<void> {
    const packageRoot = join(workspaceRoot, "src", packageName);
    await mkdir(packageRoot, { recursive: true });
    const files = {
        "AGENTS.md": "# Fixture rules\n",
        "CHANGELOG.md": createFutureChangelog(),
        "README.md": createFutureReadme(packageName),
        "browser.ts": 'import { start } from "#gadget/main.ts";\nstart();\n',
        "index.ts": "export {};\n",
        "main.ts": "export function start(): void {}\n",
        "package.json": JSON.stringify(
            createFutureMetadata(packageName, outputName),
        ),
    };
    await Promise.all(
        Object.entries(files).map(([path, content]) =>
            writeFile(join(packageRoot, path), content),
        ),
    );
}

/**
 * Creates the future gadget's package metadata.
 *
 * @param packageName - Package name value.
 * @param outputName - Output name value.
 * @returns Created the future gadget's package metadata.
 */
function createFutureMetadata(
    packageName: string,
    outputName: string,
): Record<string, unknown> {
    return {
        author: "Test",
        browser: "./browser.ts",
        description: "Future package fixture.",
        gadgetBuild: {
            globalName: "futureGadget",
            outputName,
        },
        imports: {
            "#gadget": "./index.ts",
            "#gadget/*": "./*",
        },
        main: "./index.ts",
        name: packageName,
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
        "Fixture.",
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
