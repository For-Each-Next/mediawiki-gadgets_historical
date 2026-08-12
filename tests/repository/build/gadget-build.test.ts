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
import { buildGadget } from "../../../scripts/gadget-build/index.ts";

const EXPECTED_FIXTURE_MARKUP = [
    '<div id="fixture">',
    "{{cite web|title=First}}",
    "second line",
    "</div>",
].join("\n");
const FIXTURE_PACKAGE_NOTICE = [
    "Fixture package legal notice.",
    "Release-Scope: fixture-gadget@1.2.3",
    "SPDX-License-Identifier: CC0-1.0",
    "",
].join("\n");
const FIXTURE_HEADER_DESCRIPTION =
    "Builds a temporary artifact through the shared gadget workflow.";

test("a build writes only its flat minified artifact", async (context) => {
    const { packageRoot, workspaceRoot } = await createFixtureWorkspace();
    context.after(() => rm(workspaceRoot, { force: true, recursive: true }));
    await writeFixturePackage(packageRoot);

    await buildGadget(packageRoot);

    const outputRoot = join(workspaceRoot, "dist");
    const outputDirectory = join(outputRoot, "fixture-gadget");
    const rootFiles = (await readdir(outputRoot)).sort();
    const files = (await readdir(outputDirectory)).sort();
    const minified = await readFile(
        join(outputRoot, "fixture.min.js"),
        "utf8",
    );
    const aggregate = await readFile(
        join(outputRoot, "00-mediawiki-gadgets.user.js"),
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
        aggregate,
        files,
        minified,
        packageDirectoryFile,
        rootFiles,
        sibling,
        siblingDirectoryFile,
    });
});

interface FixtureArtifacts {
    aggregate: string;
    files: string[];
    minified: string;
    packageDirectoryFile: string;
    rootFiles: string[];
    sibling: string;
    siblingDirectoryFile: string;
}

/**
 * Checks the complete package output contract of a fixture build.
 *
 * @param artifacts - Artifacts value.
 */
function assertFixtureArtifacts(artifacts: FixtureArtifacts): void {
    const {
        aggregate,
        files,
        minified,
        packageDirectoryFile,
        rootFiles,
        sibling,
        siblingDirectoryFile,
    } = artifacts;
    assert.deepEqual(rootFiles, [
        "00-mediawiki-gadgets.user.js",
        "fixture-gadget",
        "fixture.min.js",
        "other-gadget",
        "other_gadget.js",
    ]);
    assert.deepEqual(files, ["note.txt"]);
    assert.equal(aggregate, "keep aggregate\n");
    assert.equal(packageDirectoryFile, "keep package directory\n");
    assert.equal(sibling, "keep\n");
    assert.equal(siblingDirectoryFile, "keep directory\n");
    assertFixtureHeader(minified);
    assertBuiltMarkupValue(minified);
}

/** Checks the file header and executable wrapper in a built fixture. */
function assertFixtureHeader(minified: string): void {
    assert.doesNotMatch(minified, /Reports the fixture version/u);
    assert.doesNotMatch(minified, /^\/\/ ==UserScript==$/gmu);
    assert.equal(minified.match(/^\/\*\*$/gmu)?.length, 1);
    assert.match(minified, /^ \* Temporary build fixture\.$/mu);
    assert.ok(minified.includes(` * ${FIXTURE_HEADER_DESCRIPTION}\n`));
    assert.doesNotMatch(minified, /^ \* @description /mu);
    assert.match(minified, /^ \* @name fixture-gadget$/mu);
    assert.match(minified, /^ \* @version 1\.2\.3$/mu);
    assert.doesNotMatch(minified, /^ \* @author /mu);
    assert.match(minified, /^ \* @license CC0-1\.0$/mu);
    assert.doesNotMatch(minified, /Fixture package legal notice\./u);
    const modernWrapper = [
        "//<nowiki>",
        '(async function(){"use strict";const fixtureGadget=',
    ].join("\n");
    assert.ok(minified.includes(modernWrapper));
    assert.doesNotMatch(minified, /\bvar fixtureGadget\b/u);
}

/**
 * Executes one generated form and checks the exact markup value.
 *
 * @param source - Source text.
 */
function assertBuiltMarkupValue(source: string): void {
    const context: Record<string, unknown> = {};
    runInNewContext(source, context);
    assert.equal(context.fixtureMarkup, EXPECTED_FIXTURE_MARKUP);
}

test("a build injects Vue templates and CSS as text", async (context) => {
    const { packageRoot, workspaceRoot } = await createFixtureWorkspace();
    context.after(() => rm(workspaceRoot, { force: true, recursive: true }));
    await writeFixturePackage(packageRoot, { textAssets: true });

    await buildGadget(packageRoot);

    const minified = await readFile(
        join(workspaceRoot, "dist", "fixture.min.js"),
        "utf8",
    );

    assert.doesNotMatch(minified, /<template>/u);
    assert.match(minified, /Fixture dialog/u);
    assert.ok(
        minified.includes(
            '<cdx-dialog><p class="fixture-dialog">' +
                "Fixture dialog</p></cdx-dialog>",
        ),
    );
    assert.ok(minified.includes(".fixture-dialog{color:red;margin:0 1rem}"));
});

test("a build includes an opted-in author in its header", async (context) => {
    const { packageRoot, workspaceRoot } = await createFixtureWorkspace();
    context.after(() => rm(workspaceRoot, { force: true, recursive: true }));
    await writeFixturePackage(packageRoot, { headerAuthor: true });

    await buildGadget(packageRoot);

    const minified = await readFile(
        join(workspaceRoot, "dist", "fixture.min.js"),
        "utf8",
    );
    assert.match(minified, /^ \* @author Test$/mu);
});

test("a build preserves wikilinks while wrapping prose", async (context) => {
    const { packageRoot, workspaceRoot } = await createFixtureWorkspace();
    context.after(() => rm(workspaceRoot, { force: true, recursive: true }));
    const wikilink =
        "[[mw:User:Remember_the_dot/Syntax_highlighter|" +
        "Remember the dot's gadget]]";
    const paragraph = `Special thanks to ${wikilink}, which inspired this.`;
    await writeFixturePackage(packageRoot, {
        headerDescription: [paragraph],
    });

    await buildGadget(packageRoot);

    const minified = await readFile(
        join(workspaceRoot, "dist", "fixture.min.js"),
        "utf8",
    );
    const wrapped = [
        " * Special thanks to",
        ` * ${wikilink},`,
        " * which inspired this.",
    ].join("\n");
    assert.ok(minified.includes(wrapped));
});

test("a build removes an empty retired package directory", async (context) => {
    const { packageRoot, workspaceRoot } = await createFixtureWorkspace();
    context.after(() => rm(workspaceRoot, { force: true, recursive: true }));
    await writeFixturePackage(packageRoot);
    await rm(join(workspaceRoot, "dist", "fixture-gadget", "note.txt"));

    await buildGadget(packageRoot);

    const outputFiles = (await readdir(join(workspaceRoot, "dist"))).sort();
    assert.deepEqual(outputFiles, [
        "00-mediawiki-gadgets.user.js",
        "fixture.min.js",
        "other-gadget",
        "other_gadget.js",
    ]);
});

test("a build preserves a file at its retired path", async (context) => {
    const { packageRoot, workspaceRoot } = await createFixtureWorkspace();
    context.after(() => rm(workspaceRoot, { force: true, recursive: true }));
    await writeFixturePackage(packageRoot);
    const retiredPath = join(workspaceRoot, "dist", "fixture-gadget");
    await rm(retiredPath, { recursive: true });
    await writeFile(retiredPath, "keep unrelated flat output\n");

    await buildGadget(packageRoot);

    assert.equal(
        await readFile(retiredPath, "utf8"),
        "keep unrelated flat output\n",
    );
    await readFile(join(workspaceRoot, "dist", "fixture.min.js"), "utf8");
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

test("a failed bundle preserves the last good artifact", async (context) => {
    const { packageRoot, workspaceRoot } = await createFixtureWorkspace();
    context.after(() => rm(workspaceRoot, { force: true, recursive: true }));
    await writeFixturePackage(packageRoot);
    const outputPath = join(workspaceRoot, "dist", "fixture.min.js");
    await writeFile(outputPath, "last good artifact\n");
    await writeFile(join(packageRoot, "browser.ts"), "const = ;\n");

    await assert.rejects(buildGadget(packageRoot));

    assert.equal(await readFile(outputPath, "utf8"), "last good artifact\n");
});

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

test("a build rejects a legal notice outside its package", async (context) => {
    const { packageRoot, workspaceRoot } = await createFixtureWorkspace();
    context.after(() => rm(workspaceRoot, { force: true, recursive: true }));
    await writeFixturePackage(packageRoot, { noticeFiles: ["../LICENSE"] });

    await assert.rejects(
        buildGadget(packageRoot),
        /remain inside the package/u,
    );
});

test("a build rejects a linked package legal notice", async (context) => {
    const { packageRoot, workspaceRoot } = await createFixtureWorkspace();
    context.after(() => rm(workspaceRoot, { force: true, recursive: true }));
    await writeFixturePackage(packageRoot);
    const externalNotice = join(workspaceRoot, "outside-license");
    await writeFile(externalNotice, "External notice.\n");
    await rm(join(packageRoot, "LICENSE"));
    await symlink(externalNotice, join(packageRoot, "LICENSE"), "file");

    await assert.rejects(buildGadget(packageRoot), /must be real files/u);
});

test("a build rejects an entry outside its package", async (context) => {
    const { packageRoot, workspaceRoot } = await createFixtureWorkspace();
    context.after(() => rm(workspaceRoot, { force: true, recursive: true }));
    await writeFixturePackage(packageRoot, { browser: "../outside.ts" });
    await writeFile(join(workspaceRoot, "src", "outside.ts"), "export {};\n");

    await assert.rejects(buildGadget(packageRoot), /entry point must remain/u);
});

test("a build rejects injected text outside its package", async (context) => {
    const { packageRoot, workspaceRoot } = await createFixtureWorkspace();
    context.after(() => rm(workspaceRoot, { force: true, recursive: true }));
    await writeFixturePackage(packageRoot, {
        defineTextFile: "../outside.css",
        textAssets: true,
    });
    await writeFile(join(workspaceRoot, "src", "outside.css"), "body {}\n");

    await assert.rejects(buildGadget(packageRoot), /text file must remain/u);
});

test("a build rejects linked injected text", async (context) => {
    const { packageRoot, workspaceRoot } = await createFixtureWorkspace();
    context.after(() => rm(workspaceRoot, { force: true, recursive: true }));
    await writeFixturePackage(packageRoot, { textAssets: true });
    const externalPath = join(workspaceRoot, "external.css");
    await Promise.all([
        writeFile(externalPath, "body {}\n"),
        rm(join(packageRoot, "dialog.css")),
    ]);
    await symlink(externalPath, join(packageRoot, "dialog.css"), "file");

    await assert.rejects(
        buildGadget(packageRoot),
        /must remain inside|real package file/u,
    );
});

test("a build rejects multiline package metadata", async (context) => {
    const { packageRoot, workspaceRoot } = await createFixtureWorkspace();
    context.after(() => rm(workspaceRoot, { force: true, recursive: true }));
    await writeFixturePackage(packageRoot, {
        author: "Test\nunsafe();",
    });

    await assert.rejects(buildGadget(packageRoot), /fit on one line/u);
});

test("a build rejects an unsupported SPDX identifier", async (context) => {
    const { packageRoot, workspaceRoot } = await createFixtureWorkspace();
    context.after(() => rm(workspaceRoot, { force: true, recursive: true }));
    await writeFixturePackage(packageRoot, {
        license: "NOT A VALID SPDX EXPRESSION",
    });

    await assert.rejects(
        buildGadget(packageRoot),
        /supported SPDX identifier/u,
    );
});

test("a build rejects block terminators in metadata", async (context) => {
    const { packageRoot, workspaceRoot } = await createFixtureWorkspace();
    context.after(() => rm(workspaceRoot, { force: true, recursive: true }));
    await writeFixturePackage(packageRoot, { author: "Test */ unsafe();" });

    await assert.rejects(buildGadget(packageRoot), /JavaScript-comment-safe/u);
});

test("rejects a header summary longer than 75 chars", async (context) => {
    const { packageRoot, workspaceRoot } = await createFixtureWorkspace();
    context.after(() => rm(workspaceRoot, { force: true, recursive: true }));
    await writeFixturePackage(packageRoot, { description: "x".repeat(76) });

    await assert.rejects(buildGadget(packageRoot), /must not exceed 75/u);
});

test("a build rejects unsafe header paragraphs", async (context) => {
    const { packageRoot, workspaceRoot } = await createFixtureWorkspace();
    context.after(() => rm(workspaceRoot, { force: true, recursive: true }));
    await writeFixturePackage(packageRoot, {
        headerDescription: ["Unsafe */ paragraph."],
    });

    await assert.rejects(buildGadget(packageRoot), /1 to 3 safe paragraphs/u);
});

test("a build rejects a non-boolean header-author flag", async (context) => {
    const { packageRoot, workspaceRoot } = await createFixtureWorkspace();
    context.after(() => rm(workspaceRoot, { force: true, recursive: true }));
    await writeFixturePackage(packageRoot, { headerAuthor: "yes" });

    await assert.rejects(buildGadget(packageRoot), /must be a boolean/u);
});

test("a build rejects reserved global binding names", async (context) => {
    const { packageRoot, workspaceRoot } = await createFixtureWorkspace();
    context.after(() => rm(workspaceRoot, { force: true, recursive: true }));
    await writeFixturePackage(packageRoot, { globalName: "class" });

    await assert.rejects(buildGadget(packageRoot), /binding identifier/u);
});

test("a build rejects multiline userscript scalars", async (context) => {
    const { packageRoot, workspaceRoot } = await createFixtureWorkspace();
    context.after(() => rm(workspaceRoot, { force: true, recursive: true }));
    await writeFixturePackage(packageRoot, {
        userscript: { runAt: "document-idle\nunsafe" },
    });

    await assert.rejects(buildGadget(packageRoot), /runAt.*single-line/u);
});

test("a build rejects multiline userscript list metadata", async (context) => {
    const { packageRoot, workspaceRoot } = await createFixtureWorkspace();
    context.after(() => rm(workspaceRoot, { force: true, recursive: true }));
    await writeFixturePackage(packageRoot, {
        userscript: { grant: ["none\nunsafe"] },
    });

    await assert.rejects(buildGadget(packageRoot), /grant.*single-line/u);
});

test("a build rejects unused userscript metadata", async (context) => {
    const { packageRoot, workspaceRoot } = await createFixtureWorkspace();
    context.after(() => rm(workspaceRoot, { force: true, recursive: true }));
    await writeFixturePackage(packageRoot, {
        userscript: { name: "Unused gadget name" },
    });

    await assert.rejects(
        buildGadget(packageRoot),
        /userscript.name.*supported/u,
    );
});

test("a build requires the package LICENSE notice", async (context) => {
    const { packageRoot, workspaceRoot } = await createFixtureWorkspace();
    context.after(() => rm(workspaceRoot, { force: true, recursive: true }));
    await writeFixturePackage(packageRoot, { noticeFiles: [] });

    await assert.rejects(buildGadget(packageRoot), /must include LICENSE/u);
});

test("a build rejects current and retired flat output collisions", (context) =>
    rejectFlatOutputCollision(
        context,
        "fixture.min",
        /fixture\.min\.js collides/iu,
    ));

test("a build rejects case-insensitive flat output collisions", (context) =>
    rejectFlatOutputCollision(context, "FIXTURE", /fixture\.js collides/iu));

/** Builds a workspace whose second package claims a collision. */
async function rejectFlatOutputCollision(
    context: TestContext,
    outputName: string,
    expected: RegExp,
): Promise<void> {
    const { packageRoot, workspaceRoot } = await createFixtureWorkspace();
    context.after(() => rm(workspaceRoot, { force: true, recursive: true }));
    await writeFixturePackage(packageRoot);
    await writeCollisionPackage(workspaceRoot, outputName);

    await assert.rejects(buildGadget(packageRoot), expected);
}

test("a build rejects the reserved aggregate output name", async (context) => {
    const { packageRoot, workspaceRoot } = await createFixtureWorkspace();
    context.after(() => rm(workspaceRoot, { force: true, recursive: true }));
    await writeFixturePackage(packageRoot, {
        outputName: "00-MediaWiki-Gadgets",
    });

    await assert.rejects(
        buildGadget(packageRoot),
        /reserve.*00-mediawiki-gadgets\.user\.js/iu,
    );
});

test("a retired gadget name cannot claim the aggregate", async (context) => {
    const { packageRoot, workspaceRoot } = await createFixtureWorkspace();
    context.after(() => rm(workspaceRoot, { force: true, recursive: true }));
    await writeFixturePackage(packageRoot, {
        outputName: "00-mediawiki-gadgets.user",
    });

    await assert.rejects(
        buildGadget(packageRoot),
        /reserve.*00-mediawiki-gadgets\.user\.js/iu,
    );
});

test("a near aggregate output name remains available", async (context) => {
    const { packageRoot, workspaceRoot } = await createFixtureWorkspace();
    context.after(() => rm(workspaceRoot, { force: true, recursive: true }));
    await writeFixturePackage(packageRoot, {
        outputName: "00-mediawiki-gadgets.min",
    });

    await buildGadget(packageRoot);

    await readFile(
        join(workspaceRoot, "dist", "00-mediawiki-gadgets.min.min.js"),
        "utf8",
    );
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

test("a build rejects a linked retired package directory", async (context) => {
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
        /directory must be a real directory/u,
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

/** Writes a sibling package whose flat output differs only by case. */
async function writeCollisionPackage(
    workspaceRoot: string,
    outputName: string,
): Promise<void> {
    const packageRoot = join(workspaceRoot, "src", "second-gadget");
    await mkdir(packageRoot);
    const metadata = createFixtureMetadata(
        { outputName, packageName: "second-gadget" },
        "../../dist",
    );
    await Promise.all([
        writeFile(join(packageRoot, "package.json"), JSON.stringify(metadata)),
        writeFile(
            join(packageRoot, "browser.ts"),
            createFixtureBrowser(false),
        ),
    ]);
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
    author?: string;
    browser?: string;
    defineTextFile?: string;
    description?: string;
    globalName?: unknown;
    headerAuthor?: unknown;
    headerDescription?: unknown;
    license?: string;
    noticeFiles?: string[];
    outputDirectory?: string;
    outputName?: string;
    packageName?: string;
    textAssets?: boolean;
    userscript?: unknown;
}

function createFixtureMetadata(
    options: FixturePackageOptions,
    outputDirectory: string,
): object {
    return {
        author: options.author ?? "Test",
        browser: options.browser ?? "browser.ts",
        description: options.description ?? "Temporary build fixture.",
        gadgetBuild: createFixtureBuildMetadata(options),
        license: options.license ?? "CC0-1.0",
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

/** Creates build metadata for one fixture package. */
function createFixtureBuildMetadata(options: FixturePackageOptions): object {
    return {
        ...(options.textAssets
            ? {
                  defines: {
                      __FIXTURE_STYLES__: {
                          textFile: options.defineTextFile ?? "dialog.css",
                      },
                      __FIXTURE_TEMPLATE__: { textFile: "dialog.vue" },
                  },
              }
            : {}),
        globalName: options.globalName ?? "fixtureGadget",
        headerAuthor: options.headerAuthor,
        headerDescription: options.headerDescription ?? [
            FIXTURE_HEADER_DESCRIPTION,
        ],
        noticeFiles: options.noticeFiles ?? ["LICENSE"],
        outputName: options.outputName ?? "fixture",
        userscript: options.userscript ?? {
            match: ["https://example.test/*"],
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
        writeFile(join(packageRoot, "LICENSE"), FIXTURE_PACKAGE_NOTICE),
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
            join(outputRoot, "00-mediawiki-gadgets.user.js"),
            "keep aggregate\n",
        ),
        writeFile(
            join(outputRoot, "other-gadget/note.txt"),
            "keep directory\n",
        ),
    ];
    return textAssets
        ? [...files, ...createTextAssetWrites(packageRoot)]
        : files;
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
