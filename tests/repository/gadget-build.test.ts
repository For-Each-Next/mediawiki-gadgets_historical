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
import { runInNewContext } from "node:vm";
import test, { type TestContext } from "node:test";
import { parseForESLint } from "@typescript-eslint/parser";
import { buildGadget } from "../../scripts/gadget-build/index.ts";

const EXPECTED_FIXTURE_MARKUP = [
    '<div id="fixture">',
    "{{cite web|title=First}}",
    "second line",
    "</div>",
].join("\n");

test("a build replaces only its three flat artifacts", async (context) => {
    const { packageRoot, workspaceRoot } = await createFixtureWorkspace();
    context.after(() => rm(workspaceRoot, { force: true, recursive: true }));
    await writeFixturePackage(packageRoot);

    await buildGadget(packageRoot);

    const outputDirectory = join(workspaceRoot, "dist");
    const files = (await readdir(outputDirectory)).sort();
    const formatted = await readFile(
        join(outputDirectory, "fixture.js"),
        "utf8",
    );
    const minified = await readFile(
        join(outputDirectory, "fixture.min.js"),
        "utf8",
    );
    const userscript = await readFile(
        join(outputDirectory, "fixture.user.js"),
        "utf8",
    );
    const sibling = await readFile(
        join(outputDirectory, "other_gadget.js"),
        "utf8",
    );
    const siblingDirectoryFile = await readFile(
        join(outputDirectory, "other-gadget", "note.txt"),
        "utf8",
    );

    assertFixtureArtifacts({
        files,
        formatted,
        minified,
        sibling,
        siblingDirectoryFile,
        userscript,
    });
});

interface FixtureArtifacts {
    files: string[];
    formatted: string;
    minified: string;
    sibling: string;
    siblingDirectoryFile: string;
    userscript: string;
}

/** Checks the complete flat output contract of a fixture build. */
function assertFixtureArtifacts(artifacts: FixtureArtifacts): void {
    const {
        files,
        formatted,
        minified,
        sibling,
        siblingDirectoryFile,
        userscript,
    } = artifacts;
    assert.deepEqual(files, [
        "fixture.js",
        "fixture.min.js",
        "fixture.user.js",
        "other-gadget",
        "other_gadget.js",
    ]);
    assert.equal(sibling, "keep\n");
    assert.equal(siblingDirectoryFile, "keep directory\n");
    assert.match(formatted, /\/\/ @version\s+1\.2\.3/u);
    assert.match(formatted, /\/\*\*\s*\* Reports the fixture version\./u);
    assert.match(formatted, /\* @returns The fixture version\./u);
    assert.match(formatted, /function getVersion\(\) \{/u);
    assert.match(formatted, /"\/\*\* runtime text \*\/"/u);
    assert.match(formatted, /\/\*\* runtime template \*\//u);
    assert.match(formatted, /Returns the runtime template/u);
    assert.match(formatted, /\/\/<nowiki>/u);
    assert.doesNotMatch(minified, /Reports the fixture version/u);
    assert.match(minified, /\/\/ @version\s+1\.2\.3/u);
    assert.match(userscript, /\/\/ @version\s+1\.2\.3/u);
    assert.match(userscript, /window\.mw/u);
    assertUserscriptCodeHasNoComments(userscript);
    assertReadableMarkupFormatting(formatted, userscript);
    assertBuiltMarkupValue(formatted);
    assertBuiltMarkupValue(minified);
    assertBuiltMarkupValue(userscript, true);
}

/** Keeps metadata comments while removing executable-code comments. */
function assertUserscriptCodeHasNoComments(userscript: string): void {
    const headerEnd = userscript.indexOf("// ==/UserScript==");
    assert.notEqual(headerEnd, -1);
    const code = userscript.slice(headerEnd + "// ==/UserScript==".length);
    const { ast } = parseForESLint(code, {
        comment: true,
        ecmaVersion: "latest",
        range: true,
        sourceType: "script",
    });
    assert.deepEqual(ast.comments, []);
}

/** Checks readable indentation and template newline serialization. */
function assertReadableMarkupFormatting(
    formatted: string,
    userscript: string,
): void {
    const encoded = '`<div id="fixture">\\n${value}\\n</div>`';
    for (const readable of [formatted, userscript]) {
        assert.ok(readable.includes(encoded));
        assert.doesNotMatch(readable, /^\$\{value\}$/mu);
        assert.doesNotMatch(readable, /^<\/div>`/mu);
    }
    assert.match(formatted, /^ {4}function wrapFixtureMarkup\(/mu);
    assert.match(userscript, /^ {4}function start\(\)/mu);
}

/** Executes one generated form and checks the exact markup value. */
function assertBuiltMarkupValue(
    source: string,
    userscript: boolean = false,
): void {
    const context: Record<string, unknown> = {};
    if (userscript) {
        context.window = {
            mw: {
                config: {},
                loader: { using(): undefined {} },
            },
            setTimeout(): never {
                throw new Error("The fixture userscript did not start.");
            },
        };
    }
    runInNewContext(source, context);
    assert.equal(context.fixtureMarkup, EXPECTED_FIXTURE_MARKUP);
}

test("a build injects Vue templates and CSS as text", async (context) => {
    const { packageRoot, workspaceRoot } = await createFixtureWorkspace();
    context.after(() => rm(workspaceRoot, { force: true, recursive: true }));
    await writeFixturePackage(packageRoot, { textAssets: true });

    await buildGadget(packageRoot);

    const outputDirectory = join(workspaceRoot, "dist");
    const formatted = await readFile(
        join(outputDirectory, "fixture.js"),
        "utf8",
    );
    const minified = await readFile(
        join(outputDirectory, "fixture.min.js"),
        "utf8",
    );
    const userscript = await readFile(
        join(outputDirectory, "fixture.user.js"),
        "utf8",
    );

    for (const readable of [formatted, userscript]) {
        assert.doesNotMatch(readable, /<template>/u);
        assert.match(readable, /Fixture dialog/u);
        assert.match(readable, /\.fixture-dialog \{/u);
    }
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

test("a build rejects a nested output directory", async (context) => {
    const { packageRoot, workspaceRoot } = await createFixtureWorkspace();
    context.after(() => rm(workspaceRoot, { force: true, recursive: true }));
    await writeFixturePackage(packageRoot, {
        outputDirectory: "../../dist/fixture-gadget",
    });

    await assert.rejects(
        buildGadget(packageRoot),
        /shared workspace dist directory/u,
    );
});

test("a build rejects an output name that escapes", async (context) => {
    const { packageRoot, workspaceRoot } = await createFixtureWorkspace();
    context.after(() => rm(workspaceRoot, { force: true, recursive: true }));
    await writeFixturePackage(packageRoot, { outputName: "../escaped" });

    await assert.rejects(buildGadget(packageRoot), /safe file basename/u);
});

test("a build rejects collisions before cleaning outputs", async (context) => {
    const { packageRoot, workspaceRoot } = await createFixtureWorkspace();
    context.after(() => rm(workspaceRoot, { force: true, recursive: true }));
    await writeFixturePackage(packageRoot);
    await writeSiblingBuildPackage(workspaceRoot, "fixture.min");

    await assert.rejects(
        buildGadget(packageRoot),
        /fixture\.min\.js collides/u,
    );
    const preserved = await readFile(
        join(workspaceRoot, "dist", "fixture.min.js"),
        "utf8",
    );
    assert.equal(preserved, "stale\n");
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
    const outputDirectory = options.outputDirectory ?? "../../dist";
    const outputPath = join(packageRoot, outputDirectory);
    await mkdir(outputPath, { recursive: true });
    await mkdir(join(packageRoot, "../../dist/other-gadget"), {
        recursive: true,
    });
    const files = createFixtureWrites(
        packageRoot,
        outputPath,
        createFixtureMetadata(options, outputDirectory),
        options.textAssets === true,
        options.outputName ?? "fixture",
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
            outputName: options.outputName ?? "fixture",
            userscript: { match: ["https://example.test/*"] },
        },
        name: "fixture-gadget",
        type: "module",
        version: "1.2.3",
        vue: {
            assetsDir: "",
            css: { extract: false },
            filenameHashing: false,
            outputDir: outputDirectory,
        },
    };
}

function createFixtureWrites(
    packageRoot: string,
    outputPath: string,
    metadata: object,
    textAssets: boolean,
    outputName: string,
): Array<Promise<void>> {
    const artifactName = /^[A-Za-z0-9][A-Za-z0-9._-]*$/u.test(outputName)
        ? outputName
        : "fixture";
    const files = [
        writeFile(join(packageRoot, "package.json"), JSON.stringify(metadata)),
        writeFile(
            join(packageRoot, "browser.ts"),
            createFixtureBrowser(textAssets),
        ),
        writeFile(join(outputPath, `${artifactName}.js`), "stale\n"),
        writeFile(join(outputPath, `${artifactName}.min.js`), "stale\n"),
        writeFile(join(outputPath, `${artifactName}.user.js`), "stale\n"),
        writeFile(join(outputPath, "other_gadget.js"), "keep\n"),
        writeFile(
            join(packageRoot, "../../dist/other-gadget/note.txt"),
            "keep directory\n",
        ),
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

/** Writes a sibling package used by collision preflight tests. */
async function writeSiblingBuildPackage(
    workspaceRoot: string,
    outputName: string,
): Promise<void> {
    const packageRoot = join(workspaceRoot, "src", "sibling-gadget");
    await mkdir(packageRoot, { recursive: true });
    await writeFile(
        join(packageRoot, "package.json"),
        JSON.stringify({
            gadgetBuild: { outputName },
            name: "sibling-gadget",
        }),
    );
}

function createFixtureBrowser(textAssets: boolean): string {
    if (!textAssets) {
        return [
            "/**/",
            "/**",
            " * Reports the fixture version.",
            " * @returns The fixture version.",
            " */",
            "export function getVersion() {",
            "    return __GADGET_VERSION__;",
            "}",
            'export const literal = "/** runtime text */";',
            "export const templateLiteral =",
            "    `prefix ${literal} /** runtime template */`;",
            "/** Returns the runtime template. */",
            "export function getTemplateLiteral() {",
            "    return templateLiteral;",
            "}",
            "export function wrapFixtureMarkup(value) {",
            '    return `<div id="fixture">',
            "${value}",
            "</div>`;",
            "}",
            "globalThis.fixtureMarkup = wrapFixtureMarkup(",
            '    "{{cite web|title=First}}\\nsecond line",',
            ");",
            "",
        ].join("\n");
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
