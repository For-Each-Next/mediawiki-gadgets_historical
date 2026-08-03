/**
 * Tests the workspace-wide userscript build with temporary packages.
 */

import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { type TestContext } from "node:test";
import { runInNewContext } from "node:vm";
import { buildAllUserscript } from "../../scripts/gadget-build/index.ts";

const BUILD_TIME = new Date("2026-08-03T05:06:07.008Z");
const OUTPUT_PARTS = [
    "dist",
    "mediawiki-gadgets",
    "mediawiki_gadgets.user.js",
];

test("an all-userscript build combines gadgets", async (context) => {
    const workspaceRoot = await createAggregateWorkspace();
    context.after(() => rm(workspaceRoot, { force: true, recursive: true }));

    await buildAllUserscript(workspaceRoot, BUILD_TIME);

    const outputPath = join(workspaceRoot, ...OUTPUT_PARTS);
    const source = await readFile(outputPath, "utf8");
    const note = await readFile(
        join(workspaceRoot, "dist/mediawiki-gadgets/note.txt"),
        "utf8",
    );
    const legacy = await readFile(
        join(workspaceRoot, "dist/mediawiki_gadgets.user.js"),
        "utf8",
    );
    assertAggregateHeader(source);
    assertDiscoveredPrograms(source);
    assert.equal(note, "keep aggregate sibling\n");
    assert.equal(legacy, "keep legacy-like output\n");
    assert.doesNotMatch(source, /stale aggregate/u);
    assertAggregateRuntime(source);
});

/** Checks the single combined metadata header. */
function assertAggregateHeader(source: string): void {
    assert.equal(countMatches(source, /^\/\/ ==UserScript==$/gmu), 1);
    assert.equal(countMatches(source, /^\/\/ ==\/UserScript==$/gmu), 1);
    assert.deepEqual(metadataValues(source, "name"), ["MediaWiki Gadgets"]);
    assert.deepEqual(metadataValues(source, "version"), [
        "2026.8.3.050607.008",
    ]);
    assert.deepEqual(metadataValues(source, "author"), ["Amy, Zoe"]);
    assert.deepEqual(metadataValues(source, "match"), [
        "*://*/*",
        "http://beta.example/*",
        "https://shared.example/wiki/*",
    ]);
    assert.deepEqual(metadataValues(source, "grant"), [
        "GM_getValue",
        "GM_setValue",
    ]);
    assert.deepEqual(metadataValues(source, "run-at"), ["document-idle"]);
    assert.deepEqual(metadataValues(source, "sandbox"), ["raw"]);
}

/** Checks package filtering, ordering, and version-specific bundles. */
function assertDiscoveredPrograms(source: string): void {
    const alpha = source.indexOf("alpha:");
    const beta = source.indexOf("beta:");
    const zeta = source.indexOf("zeta:");
    assert.ok(alpha !== -1 && alpha < beta && beta < zeta);
    assert.doesNotMatch(source, /shared:/u);
    assert.doesNotMatch(source, /support-only:/u);
}

/** Executes the build before and after MediaWiki becomes available. */
function assertAggregateRuntime(source: string): void {
    const waiting = executeUserscript(
        source,
        "https://shared.example/wiki/Fixture",
        false,
    );
    assert.deepEqual(waiting.runs, []);
    assert.equal(waiting.delay, 50);
    assert.ok(waiting.scheduled != null);
    waiting.window.mw = createMediaWikiStub();
    waiting.scheduled();
    assert.deepEqual(waiting.runs, [
        "alpha:1.2.3",
        "beta:2.3.4",
        "zeta:3.4.5",
    ]);
    assert.deepEqual(waiting.errors, [
        "Failed to start alpha-gadget. Error: alpha exploded",
    ]);
    assertUrlGating(source);
}

/** Checks that each package retains its own URL conditions. */
function assertUrlGating(source: string): void {
    const beta = executeUserscript(source, "http://beta.example/tool", true);
    assert.deepEqual(beta.runs, ["beta:2.3.4", "zeta:3.4.5"]);
    const unmatched = executeUserscript(
        source,
        "https://shared.example/not-wiki",
        true,
    );
    assert.deepEqual(unmatched.runs, ["zeta:3.4.5"]);
}

interface RuntimeResult {
    delay: number | undefined;
    errors: string[];
    runs: string[];
    scheduled: (() => void) | undefined;
    window: RuntimeWindow;
}

interface RuntimeWindow {
    URL: typeof URL;
    console: { error(message: unknown, error: unknown): void };
    fixtureRuns: string[];
    location: { href: string };
    mw?: MediaWikiStub;
    setTimeout(callback: () => void, delay: number): number;
}

interface MediaWikiStub {
    config: Record<string, never>;
    loader: { using(): void };
}

/** Runs an aggregate userscript in an isolated browser-like context. */
function executeUserscript(
    source: string,
    href: string,
    ready: boolean,
): RuntimeResult {
    const errors: string[] = [];
    const runs: string[] = [];
    let delay: number | undefined;
    let scheduled: (() => void) | undefined;
    const runtimeWindow: RuntimeWindow = {
        URL,
        console: {
            error(message, error): void {
                errors.push(`${String(message)} ${String(error)}`);
            },
        },
        fixtureRuns: runs,
        location: { href },
        ...(ready ? { mw: createMediaWikiStub() } : {}),
        setTimeout(callback, milliseconds): number {
            delay = milliseconds;
            scheduled = callback;
            return 1;
        },
    };
    runInNewContext(source, { window: runtimeWindow });
    return { delay, errors, runs, scheduled, window: runtimeWindow };
}

/** Creates the minimum MediaWiki shape required by the bootstrap. */
function createMediaWikiStub(): MediaWikiStub {
    return {
        config: {},
        loader: {
            using(): void {},
        },
    };
}

test("an all-userscript build rejects config conflicts", async (context) => {
    const cases: IncompatibilityCase[] = [
        {
            expected: /run.?at/iu,
            first: { runAt: "document-start" },
            name: "run-at",
        },
        {
            expected: /sandbox/iu,
            first: { sandbox: "JavaScript" },
            name: "sandbox",
        },
        {
            expected: /grant/iu,
            first: { grant: ["GM_getValue"] },
            name: "grant",
        },
    ];
    for (const fixture of cases) {
        await context.test(fixture.name, (childContext) =>
            rejectIncompatibleConfig(childContext, fixture),
        );
    }
});

interface IncompatibilityCase {
    expected: RegExp;
    first: UserscriptFixture;
    name: string;
}

/** Builds two packages whose effective userscript configs disagree. */
async function rejectIncompatibleConfig(
    context: TestContext,
    fixture: IncompatibilityCase,
): Promise<void> {
    const workspaceRoot = await createWorkspaceRoot("gadget-all-invalid-");
    context.after(() => rm(workspaceRoot, { force: true, recursive: true }));
    await Promise.all([
        writeGadgetPackage(workspaceRoot, {
            ...createGadgetFixture("alpha-gadget", "1.0.0"),
            userscript: fixture.first,
        }),
        writeGadgetPackage(
            workspaceRoot,
            createGadgetFixture("beta-gadget", "2.0.0"),
        ),
    ]);
    await assert.rejects(
        buildAllUserscript(workspaceRoot, BUILD_TIME),
        fixture.expected,
    );
}

interface GadgetFixture {
    author: string;
    matches?: string[];
    name: string;
    throws?: boolean;
    userscript?: UserscriptFixture;
    version: string;
}

interface UserscriptFixture {
    grant?: string[];
    runAt?: string;
    sandbox?: string;
}

/** Creates a complete workspace with buildable and skipped packages. */
async function createAggregateWorkspace(): Promise<string> {
    const workspaceRoot = await createWorkspaceRoot("gadget-all-build-");
    const grant = ["GM_setValue", "GM_getValue"];
    await writeAggregateOutputs(workspaceRoot);
    await writeGadgetPackage(workspaceRoot, {
        ...createGadgetFixture("zeta-gadget", "3.4.5", "Amy"),
        userscript: { grant, runAt: "document-idle", sandbox: "raw" },
    });
    await writeSharedPackage(workspaceRoot);
    await writeSupportPackage(workspaceRoot);
    await writeGadgetPackage(workspaceRoot, {
        ...createGadgetFixture("beta-gadget", "2.3.4", "Amy"),
        matches: ["https://shared.example/wiki/*", "http://beta.example/*"],
        userscript: { grant: [...grant].reverse() },
    });
    await writeGadgetPackage(workspaceRoot, {
        ...createGadgetFixture("alpha-gadget", "1.2.3", "Zoe"),
        matches: ["https://shared.example/wiki/*"],
        throws: true,
        userscript: {
            grant: ["GM_setValue", "GM_getValue", "GM_setValue"],
            runAt: "document-idle",
            sandbox: "raw",
        },
    });
    return workspaceRoot;
}

/** Creates an empty source workspace. */
async function createWorkspaceRoot(prefix: string): Promise<string> {
    const workspaceRoot = await mkdtemp(join(tmpdir(), prefix));
    await mkdir(join(workspaceRoot, "src"));
    return workspaceRoot;
}

/** Writes stale output and unrelated files that must survive. */
async function writeAggregateOutputs(workspaceRoot: string): Promise<void> {
    const outputDirectory = join(workspaceRoot, "dist/mediawiki-gadgets");
    await mkdir(outputDirectory, { recursive: true });
    await Promise.all([
        writeFile(join(workspaceRoot, ...OUTPUT_PARTS), "stale aggregate\n"),
        writeFile(
            join(outputDirectory, "note.txt"),
            "keep aggregate sibling\n",
        ),
        writeFile(
            join(workspaceRoot, "dist/mediawiki_gadgets.user.js"),
            "keep legacy-like output\n",
        ),
    ]);
}

/** Writes one complete gadget package and its entry point. */
async function writeGadgetPackage(
    workspaceRoot: string,
    fixture: GadgetFixture,
): Promise<void> {
    const packageRoot = join(workspaceRoot, "src", fixture.name);
    await mkdir(packageRoot);
    const userscript = {
        ...fixture.userscript,
        ...(fixture.matches == null ? {} : { match: fixture.matches }),
    };
    const metadata = createPackageMetadata(fixture, userscript);
    await Promise.all([
        writeFile(join(packageRoot, "package.json"), JSON.stringify(metadata)),
        writeFile(join(packageRoot, "browser.ts"), createEntryPoint(fixture)),
    ]);
}

/** Creates one package's validated build metadata. */
function createPackageMetadata(
    fixture: GadgetFixture,
    userscript: UserscriptFixture & { match?: string[] },
): object {
    return {
        author: fixture.author,
        browser: "browser.ts",
        description: `${fixture.name} fixture.`,
        gadgetBuild: {
            globalName: `${fixture.name.replaceAll("-", "_")}Build`,
            outputName: fixture.name,
            userscript,
        },
        name: fixture.name,
        type: "module",
        version: fixture.version,
        vue: {
            assetsDir: "",
            css: { extract: false },
            filenameHashing: false,
            outputDir: "../../dist",
        },
    };
}

/** Creates a package fixture with the ordinary effective config. */
function createGadgetFixture(
    name: string,
    version: string,
    author: string = "Amy",
): GadgetFixture {
    return { author, name, version };
}

/** Creates source that reports its injected version. */
function createEntryPoint(fixture: GadgetFixture): string {
    const prefix = JSON.stringify(`${fixture.name.split("-")[0]}:`);
    const lines = [
        "const fixtureVersion = __GADGET_VERSION__;",
        `window.fixtureRuns.push(${prefix} + fixtureVersion);`,
    ];
    if (fixture.throws === true) {
        lines.push('throw new Error("alpha exploded");');
    }
    lines.push("export { fixtureVersion };", "");
    return lines.join("\n");
}

/** Writes the non-deployable shared workspace package. */
async function writeSharedPackage(workspaceRoot: string): Promise<void> {
    const packageRoot = join(workspaceRoot, "src/shared");
    await mkdir(packageRoot);
    await writeFile(
        join(packageRoot, "package.json"),
        JSON.stringify({ name: "@mediawiki-gadgets/shared", private: true }),
    );
}

/** Writes a workspace package without gadget build configuration. */
async function writeSupportPackage(workspaceRoot: string): Promise<void> {
    const packageRoot = join(workspaceRoot, "src/support-only");
    await mkdir(packageRoot);
    await writeFile(
        join(packageRoot, "package.json"),
        JSON.stringify({ name: "support-only", private: true }),
    );
}

/** Reads all values for one padded userscript metadata key. */
function metadataValues(source: string, key: string): string[] {
    const prefix = `// @${key.padEnd(13)}`;
    return source
        .split("\n")
        .filter((line) => line.startsWith(prefix))
        .map((line) => line.slice(prefix.length));
}

/** Counts non-overlapping regular-expression matches. */
function countMatches(source: string, pattern: RegExp): number {
    return [...source.matchAll(pattern)].length;
}
