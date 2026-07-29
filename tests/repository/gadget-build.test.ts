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
import test, { type TestContext } from "node:test";
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

test("a build injects Vue templates and CSS as text", async (context) => {
    const { packageRoot, workspaceRoot } = await createFixtureWorkspace();
    context.after(() => rm(workspaceRoot, { force: true, recursive: true }));
    await writeFixturePackage(packageRoot, { textAssets: true });

    await buildGadget(packageRoot);

    const outputDirectory = join(workspaceRoot, "dist", "fixture-gadget");
    const minified = await readFile(
        join(outputDirectory, "fixture.min.js"),
        "utf8",
    );
    const userscript = await readFile(
        join(outputDirectory, "fixture.user.js"),
        "utf8",
    );

    assert.doesNotMatch(userscript, /<template>/u);
    assert.match(userscript, /Fixture dialog/u);
    assert.match(userscript, /\.fixture-dialog \{/u);
    assert.ok(
        minified.includes(
            '<cdx-dialog><p class="fixture-dialog">' +
                "Fixture dialog</p></cdx-dialog>",
        ),
    );
    assert.ok(minified.includes(".fixture-dialog{color:red;margin:0 1rem}"));
});

test(
    "a build rejects Vue definitions with non-template blocks",
    rejectNonTemplateVueBlocks,
);

async function rejectNonTemplateVueBlocks(
    context: TestContext,
): Promise<void> {
    const { packageRoot, workspaceRoot } = await createFixtureWorkspace();
    context.after(() => rm(workspaceRoot, { force: true, recursive: true }));
    await writeFixturePackage(packageRoot, { textAssets: true });
    const invalidSfc = [
        "<template><p>Invalid</p></template>",
        "<script>export default {}</script>",
    ].join("");
    await writeFile(join(packageRoot, "dialog.vue"), invalidSfc);

    await assert.rejects(
        buildGadget(packageRoot),
        /must contain one template and no other SFC blocks/u,
    );
}

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
    options: FixturePackageOptions = {},
): Promise<void> {
    const outputDirectory =
        options.outputDirectory ?? "../../dist/fixture-gadget";
    const outputPath = join(packageRoot, outputDirectory);
    await mkdir(outputPath, { recursive: true });
    const files = createFixtureWrites(
        packageRoot,
        outputPath,
        createFixtureMetadata(options, outputDirectory),
        options.textAssets === true,
    );
    await Promise.all(files);
}

interface FixturePackageOptions {
    outputDirectory?: string;
    outputName?: string;
    textAssets?: boolean;
}

function createFixtureMetadata(
    options: FixturePackageOptions,
    outputDirectory: string,
): object {
    return {
        author: "Test",
        browser: "browser.ts",
        description: "Temporary build fixture.",
        gadgetBuild: {
            ...(options.textAssets
                ? {
                      defines: {
                          __FIXTURE_STYLES__: {
                              textFile: "dialog.css",
                          },
                          __FIXTURE_TEMPLATE__: {
                              textFile: "dialog.vue",
                          },
                      },
                  }
                : {}),
            globalName: "fixtureGadget",
            outputDirectory,
            outputName: options.outputName ?? "fixture",
            userscript: { match: ["https://example.test/*"] },
        },
        name: "fixture-gadget",
        type: "module",
        version: "1.2.3",
    };
}

function createFixtureWrites(
    packageRoot: string,
    outputPath: string,
    metadata: object,
    textAssets: boolean,
): Array<Promise<void>> {
    const files = [
        writeFile(join(packageRoot, "package.json"), JSON.stringify(metadata)),
        writeFile(
            join(packageRoot, "browser.ts"),
            createFixtureBrowser(textAssets),
        ),
        writeFile(join(outputPath, "stale.js"), "stale\n"),
    ];
    if (textAssets) {
        files.push(
            writeFile(
                join(packageRoot, "dialog.vue"),
                createFixtureTemplate(),
            ),
            writeFile(join(packageRoot, "dialog.css"), createFixtureStyles()),
        );
    }
    return files;
}

function createFixtureBrowser(textAssets: boolean): string {
    if (!textAssets) {
        return "export const version = __GADGET_VERSION__;\n";
    }
    return [
        "const template = __FIXTURE_TEMPLATE__;",
        "const styles = __FIXTURE_STYLES__;",
        "export const assets = `${template}\\n${styles}`;",
        "export const version = __GADGET_VERSION__;",
        "",
    ].join("\n");
}

function createFixtureTemplate(): string {
    return [
        "<template>",
        "    <cdx-dialog>",
        '        <p class="fixture-dialog">Fixture dialog</p>',
        "    </cdx-dialog>",
        "</template>",
        "",
    ].join("\n");
}

function createFixtureStyles(): string {
    return [
        ".fixture-dialog {",
        "    color: red;",
        "    margin: 0 1rem;",
        "}",
        "",
    ].join("\n");
}
