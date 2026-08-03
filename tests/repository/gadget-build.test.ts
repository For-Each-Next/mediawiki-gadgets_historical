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
    symlink,
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

test("a build replaces only its package artifacts", async (context) => {
    const { packageRoot, workspaceRoot } = await createFixtureWorkspace();
    context.after(() => rm(workspaceRoot, { force: true, recursive: true }));
    await writeFixturePackage(packageRoot);

    await buildGadget(packageRoot);

    const outputRoot = join(workspaceRoot, "dist");
    const outputDirectory = join(outputRoot, "fixture-gadget");
    const rootFiles = (await readdir(outputRoot)).sort();
    const files = (await readdir(outputDirectory)).sort();
    const minified = await readFile(
        join(outputDirectory, "fixture.min.js"),
        "utf8",
    );
    const userscript = await readFile(
        join(outputDirectory, "fixture.user.js"),
        "utf8",
    );
    const sibling = await readFile(
        join(outputRoot, "other_gadget.js"),
        "utf8",
    );
    const siblingDirectoryFile = await readFile(
        join(outputRoot, "other-gadget", "note.txt"),
        "utf8",
    );
    const packageDirectoryFile = await readFile(
        join(outputDirectory, "note.txt"),
        "utf8",
    );

    assertFixtureArtifacts({
        files,
        minified,
        packageDirectoryFile,
        rootFiles,
        sibling,
        siblingDirectoryFile,
        userscript,
    });
});

interface FixtureArtifacts {
    files: string[];
    minified: string;
    packageDirectoryFile: string;
    rootFiles: string[];
    sibling: string;
    siblingDirectoryFile: string;
    userscript: string;
}

/**
 * Checks the complete package output contract of a fixture build.
 *
 * @param artifacts - Artifacts value.
 */
function assertFixtureArtifacts(artifacts: FixtureArtifacts): void {
    const {
        files,
        minified,
        packageDirectoryFile,
        rootFiles,
        sibling,
        siblingDirectoryFile,
        userscript,
    } = artifacts;
    assert.deepEqual(rootFiles, [
        "fixture-gadget",
        "other-gadget",
        "other_gadget.js",
    ]);
    assert.deepEqual(files, ["fixture.min.js", "fixture.user.js", "note.txt"]);
    assert.equal(packageDirectoryFile, "keep package directory\n");
    assert.equal(sibling, "keep\n");
    assert.equal(siblingDirectoryFile, "keep directory\n");
    assert.doesNotMatch(minified, /Reports the fixture version/u);
    assert.match(minified, /\/\/ @version\s+1\.2\.3/u);
    assert.match(userscript, /\/\/ @version\s+1\.2\.3/u);
    assert.match(userscript, /window\.mw/u);
    assertUserscriptCodeHasNoComments(userscript);
    assertUserscriptMarkupFormatting(userscript);
    assertBuiltMarkupValue(minified);
    assertBuiltMarkupValue(userscript, true);
}

/**
 * Keeps metadata comments while removing executable-code comments.
 *
 * @param userscript - Userscript value.
 */
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

/**
 * Checks readable indentation and template newline serialization.
 *
 * @param userscript - Userscript value.
 */
function assertUserscriptMarkupFormatting(userscript: string): void {
    const encoded = '`<div id="fixture">\\n${value}\\n</div>`';
    assert.ok(userscript.includes(encoded));
    assert.doesNotMatch(userscript, /^\$\{value\}$/mu);
    assert.doesNotMatch(userscript, /^<\/div>`/mu);
    assert.match(userscript, /^ {4}function start\(\)/mu);
}

/**
 * Executes one generated form and checks the exact markup value.
 *
 * @param source - Source text.
 * @param userscript - Userscript value.
 */
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

test("a build rejects a mismatched package name", async (context) => {
    const { packageRoot, workspaceRoot } = await createFixtureWorkspace();
    context.after(() => rm(workspaceRoot, { force: true, recursive: true }));
    await writeFixturePackage(packageRoot, { packageName: "other-gadget" });

    await assert.rejects(
        buildGadget(packageRoot),
        /name must match its package directory/u,
    );
});

test("a build rejects a linked package output directory", async (context) => {
    const { packageRoot, workspaceRoot } = await createFixtureWorkspace();
    context.after(() => rm(workspaceRoot, { force: true, recursive: true }));
    await writeFixturePackage(packageRoot);
    const outputDirectory = join(workspaceRoot, "dist", "fixture-gadget");
    const externalDirectory = join(workspaceRoot, "external");
    await mkdir(externalDirectory);
    await writeFile(join(externalDirectory, "fixture.min.js"), "outside\n");
    await rm(outputDirectory, { recursive: true });
    await symlink(externalDirectory, outputDirectory, "dir");

    await assert.rejects(
        buildGadget(packageRoot),
        /output directory must be a real directory/u,
    );
    const preserved = await readFile(
        join(externalDirectory, "fixture.min.js"),
        "utf8",
    );
    assert.equal(preserved, "outside\n");
});

/**
 * Creates the workspace layout expected by the shared builder.
 *
 * @returns Created the workspace layout expected by the shared builder.
 */
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
 * Writes a minimal package with current and legacy stale outputs.
 *
 * @param packageRoot - Temporary package directory.
 * @param options - Optional unsafe values used by negative tests.
 */
async function writeFixturePackage(
    packageRoot: string,
    options: FixturePackageOptions = {},
): Promise<void> {
    const outputDirectory = options.outputDirectory ?? "../../dist";
    const outputRoot = join(packageRoot, "../../dist");
    const packageOutputPath = join(outputRoot, "fixture-gadget");
    await Promise.all([
        mkdir(packageOutputPath, { recursive: true }),
        mkdir(join(outputRoot, "other-gadget"), { recursive: true }),
    ]);
    const files = createFixtureWrites(
        { outputRoot, packageOutputPath, packageRoot },
        createFixtureMetadata(options, outputDirectory),
        options.textAssets === true,
        options.outputName ?? "fixture",
    );
    await Promise.all(files);
}

interface FixturePackageOptions {
    outputDirectory?: string;
    outputName?: string;
    packageName?: string;
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
        name: options.packageName ?? "fixture-gadget",
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

interface FixturePaths {
    outputRoot: string;
    packageOutputPath: string;
    packageRoot: string;
}

function createFixtureWrites(
    paths: FixturePaths,
    metadata: object,
    textAssets: boolean,
    outputName: string,
): Array<Promise<void>> {
    const { outputRoot, packageOutputPath, packageRoot } = paths;
    const artifactName = /^[A-Za-z0-9][A-Za-z0-9._-]*$/u.test(outputName)
        ? outputName
        : "fixture";
    const files = [
        writeFile(join(packageRoot, "package.json"), JSON.stringify(metadata)),
        writeFile(
            join(packageRoot, "browser.ts"),
            createFixtureBrowser(textAssets),
        ),
        ...createStaleArtifactWrites(
            outputRoot,
            packageOutputPath,
            artifactName,
        ),
        writeFile(
            join(packageOutputPath, "note.txt"),
            "keep package directory\n",
        ),
        writeFile(join(outputRoot, "other_gadget.js"), "keep\n"),
        writeFile(
            join(outputRoot, "other-gadget/note.txt"),
            "keep directory\n",
        ),
    ];
    if (textAssets) {
        files.push(...createTextAssetWrites(packageRoot));
    }
    return files;
}

function createTextAssetWrites(packageRoot: string): Array<Promise<void>> {
    return [
        writeFile(join(packageRoot, "dialog.vue"), createFixtureTemplate()),
        writeFile(join(packageRoot, "dialog.css"), createFixtureStyles()),
    ];
}

function createStaleArtifactWrites(
    outputRoot: string,
    packageOutputPath: string,
    artifactName: string,
): Array<Promise<void>> {
    return [
        writeFile(join(outputRoot, `${artifactName}.js`), "legacy\n"),
        writeFile(join(outputRoot, `${artifactName}.min.js`), "legacy\n"),
        writeFile(join(outputRoot, `${artifactName}.user.js`), "legacy\n"),
        writeFile(join(packageOutputPath, `${artifactName}.js`), "stale\n"),
        writeFile(
            join(packageOutputPath, `${artifactName}.min.js`),
            "stale\n",
        ),
        writeFile(
            join(packageOutputPath, `${artifactName}.user.js`),
            "stale\n",
        ),
    ];
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
