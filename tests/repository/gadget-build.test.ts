/**
 * Tests the shared gadget build workflow with a temporary package.
 */

import assert from "node:assert/strict";
import {
    mkdir,
    mkdtemp,
    readFile,
    readdir,
    rm,
    writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { buildGadget } from "../../scripts/gadget-build/build.ts";

test("a build replaces stale gadget output", async (context) => {
    const { packageRoot, workspaceRoot } = await createFixtureWorkspace();
    context.after(() => rm(workspaceRoot, { force: true, recursive: true }));
    await writeFixturePackage(packageRoot);

    await buildGadget(packageRoot);

    const outputDirectory = join(workspaceRoot, "dist", "fixture-gadget");
    const files = (await readdir(outputDirectory)).sort();
    const minified = await readFile(
        join(outputDirectory, "fixture.min.js"),
        "utf8",
    );
    const userscript = await readFile(
        join(outputDirectory, "fixture.user.js"),
        "utf8",
    );

    assert.deepEqual(files, ["fixture.min.js", "fixture.user.js"]);
    assert.match(minified, /\/\/ @version\s+1\.2\.3/u);
    assert.match(userscript, /\/\/ @version\s+1\.2\.3/u);
    assert.match(userscript, /window\.mw/u);
});

test("a build rejects a broad output directory", async (context) => {
    const { packageRoot, workspaceRoot } = await createFixtureWorkspace();
    context.after(() => rm(workspaceRoot, { force: true, recursive: true }));
    await writeFixturePackage(packageRoot, {
        outputDirectory: "../../dist",
    });

    await assert.rejects(
        buildGadget(packageRoot),
        /dedicated workspace dist directory/u,
    );
});

test("a build rejects an output name that escapes", async (context) => {
    const { packageRoot, workspaceRoot } = await createFixtureWorkspace();
    context.after(() => rm(workspaceRoot, { force: true, recursive: true }));
    await writeFixturePackage(packageRoot, { outputName: "../escaped" });

    await assert.rejects(buildGadget(packageRoot), /safe file basename/u);
});

/** Creates the workspace layout expected by the shared builder. */
async function createFixtureWorkspace(): Promise<{
    packageRoot: string;
    workspaceRoot: string;
}> {
    const workspaceRoot = await mkdtemp(join(tmpdir(), "gadget-build-"));
    const packageRoot = join(workspaceRoot, "src", "fixture-gadget");
    await mkdir(packageRoot, { recursive: true });
    return { packageRoot, workspaceRoot };
}

/**
 * Writes a minimal package and one stale output file.
 *
 * @param packageRoot - Temporary package directory.
 * @param options - Optional unsafe values used by negative tests.
 */
async function writeFixturePackage(
    packageRoot: string,
    options: {
        outputDirectory?: string;
        outputName?: string;
    } = {},
): Promise<void> {
    const outputDirectory =
        options.outputDirectory ?? "../../dist/fixture-gadget";
    const metadata = {
        author: "Test",
        browser: "browser.ts",
        description: "Temporary build fixture.",
        gadgetBuild: {
            globalName: "fixtureGadget",
            outputDirectory,
            outputName: options.outputName ?? "fixture",
            userscript: { match: ["https://example.test/*"] },
        },
        name: "fixture-gadget",
        type: "module",
        version: "1.2.3",
    };
    const outputPath = join(packageRoot, outputDirectory);
    await mkdir(outputPath, {
        recursive: true,
    });
    await Promise.all([
        writeFile(join(packageRoot, "package.json"), JSON.stringify(metadata)),
        writeFile(
            join(packageRoot, "browser.ts"),
            "export const version = __GADGET_VERSION__;\n",
        ),
        writeFile(join(outputPath, "stale.js"), "stale\n"),
    ]);
}
