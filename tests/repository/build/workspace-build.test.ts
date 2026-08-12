/** Tests deterministic, isolated workspace builds. */

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
    mkdir,
    readFile,
    readdir,
    rm,
    symlink,
    writeFile,
} from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import test from "node:test";

import {
    AGGREGATE_OUTPUT_FILENAME,
    buildWorkspaceArtifacts,
    createGadgetArtifactFilenames,
    verifyWorkspaceBuild,
} from "../../../scripts/gadget-build/index.ts";
import { discoverGadgetPackages } from "../../../scripts/workspace/index.ts";
import { createTemporaryWorkspace } from "../support/temporary-workspace.ts";

test("a fixed build is redirected away from dist", async (context) => {
    const repositoryRoot = process.cwd();
    const temporaryRoot = await createTemporaryWorkspace(
        context,
        "workspace-build-",
    );
    const outputRoot = join(temporaryRoot, "output");
    const before = await describeTree(join(repositoryRoot, "dist"));

    const result = await buildWorkspaceArtifacts(repositoryRoot, {
        now: new Date("2001-02-03T04:05:06.007Z"),
        outputRoot,
    });

    const artifactNames = result.artifactPaths
        .map((path) => relative(outputRoot, path))
        .toSorted();
    const expected = await getExpectedArtifacts(repositoryRoot);
    assert.deepEqual(artifactNames, expected);
    assert.deepEqual(await listFiles(outputRoot), expected);
    const after = await describeTree(join(repositoryRoot, "dist"));
    assert.deepEqual(after, before);
    const aggregate = await readFile(
        join(outputRoot, "00-mediawiki-gadgets.user.js"),
        "utf8",
    );
    assert.match(aggregate, /^\/\/ @version\s+2001\.2\.3\.040506\.007$/mu);
});

test("workspace build verification compares repeat output bytes", async () => {
    const result = await verifyWorkspaceBuild(process.cwd());

    assert.deepEqual(
        result.artifactNames,
        await getExpectedArtifacts(process.cwd()),
    );
});

test("generation failures preserve existing outputs", async (context) => {
    const workspaceRoot = await createTemporaryWorkspace(
        context,
        "workspace-generation-failure-",
    );
    await writeBuildFixture(
        workspaceRoot,
        "alpha-gadget",
        "alpha",
        "export const ready = true;\n",
    );
    await writeBuildFixture(
        workspaceRoot,
        "beta-gadget",
        "beta",
        "const = ;\n",
    );
    const outputRoot = join(workspaceRoot, "dist");
    const existing = createExistingArtifacts();
    await mkdir(outputRoot);
    await writeArtifacts(outputRoot, existing);

    await assert.rejects(buildWorkspaceArtifacts(workspaceRoot));

    await assertArtifactsEqual(outputRoot, existing);
});

test("later cleanup failures preserve existing outputs", async (context) => {
    const workspaceRoot = await createTemporaryWorkspace(
        context,
        "workspace-cleanup-failure-",
    );
    await Promise.all([
        writeBuildFixture(
            workspaceRoot,
            "alpha-gadget",
            "alpha",
            "export const alpha = true;\n",
        ),
        writeBuildFixture(
            workspaceRoot,
            "beta-gadget",
            "beta",
            "export const beta = true;\n",
        ),
    ]);
    const outputRoot = join(workspaceRoot, "dist");
    const externalRoot = join(workspaceRoot, "external");
    const existing = createExistingArtifacts();
    await Promise.all([mkdir(outputRoot), mkdir(externalRoot)]);
    await writeArtifacts(outputRoot, existing);
    await symlink(externalRoot, join(outputRoot, "beta-gadget"), "dir");

    await assert.rejects(
        buildWorkspaceArtifacts(workspaceRoot),
        /directory must be a real directory/u,
    );

    await assertArtifactsEqual(outputRoot, existing);
});

test("workspace builds reject invalid contexts", async () => {
    await assert.rejects(
        buildWorkspaceArtifacts(process.cwd(), {
            now: new Date(Number.NaN),
        }),
        /valid Date/u,
    );
    await assert.rejects(
        buildWorkspaceArtifacts(process.cwd(), {
            outputRoot: process.cwd(),
        }),
        /isolated directory/u,
    );
    await assert.rejects(
        buildWorkspaceArtifacts(process.cwd(), {
            outputRoot: join(process.cwd(), "src"),
        }),
        /isolated directory/u,
    );
    await assert.rejects(
        buildWorkspaceArtifacts(process.cwd(), {
            outputRoot: resolve(process.cwd(), ".."),
        }),
        /isolated directory/u,
    );
});

test("workspace builds reject unsafe output paths", async (context) => {
    const existingRoot = await createTemporaryWorkspace(
        context,
        "existing-output-",
    );
    await assert.rejects(
        buildWorkspaceArtifacts(process.cwd(), {
            outputRoot: existingRoot,
        }),
        /must not already exist/u,
    );
    const linkRoot = join(existingRoot, "source-link");
    await symlink(join(process.cwd(), "src"), linkRoot, "dir");
    await assert.rejects(
        buildWorkspaceArtifacts(process.cwd(), {
            outputRoot: join(linkRoot, "nested-output"),
        }),
        /isolated directory/u,
    );
    const distLink = join(process.cwd(), "dist", "source-link");
    await mkdir(join(process.cwd(), "dist"), { recursive: true });
    await symlink(join(process.cwd(), "src"), distLink, "dir");
    context.after(() => rm(distLink, { force: true }));
    await assert.rejects(
        buildWorkspaceArtifacts(process.cwd(), {
            outputRoot: join(distLink, "nested-output"),
        }),
        /isolated directory/u,
    );
});

test("workspace builds reject a linked dist root", async (context) => {
    const workspaceRoot = await createTemporaryWorkspace(
        context,
        "linked-dist-root-",
    );
    await writeBuildFixture(
        workspaceRoot,
        "alpha-gadget",
        "alpha",
        "export const ready = true;\n",
    );
    await symlink(join(workspaceRoot, "src"), join(workspaceRoot, "dist"));

    await assert.rejects(
        buildWorkspaceArtifacts(workspaceRoot),
        /isolated directory/u,
    );
});

/** Describes a directory tree without requiring it to exist. */
async function describeTree(root: string): Promise<string[]> {
    try {
        const names = await listFiles(root);
        return Promise.all(
            names.map(async function describeFile(name) {
                const bytes = await readFile(join(root, name));
                const digest = createHash("sha256")
                    .update(bytes)
                    .digest("hex");
                return `${name}:${digest}`;
            }),
        );
    } catch (error) {
        if (hasErrorCode(error, "ENOENT")) {
            return [];
        }
        throw error;
    }
}

/** Lists regular files in stable order. */
async function listFiles(
    root: string,
    directory: string = root,
): Promise<string[]> {
    const entries = await readdir(directory, { withFileTypes: true });
    const files: string[] = [];
    for (const entry of entries.toSorted(compareEntries)) {
        const path = join(directory, entry.name);
        if (entry.isDirectory()) {
            files.push(...(await listFiles(root, path)));
            continue;
        }
        files.push(relative(root, path));
    }
    return files;
}

/** Checks an unknown exception for a Node error code. */
function hasErrorCode(error: unknown, code: string): boolean {
    return (
        typeof error === "object" &&
        error != null &&
        "code" in error &&
        error.code === code
    );
}

/** Orders directory entries by code-unit name order. */
function compareEntries(
    left: { name: string },
    right: { name: string },
): number {
    return left.name < right.name ? -1 : left.name > right.name ? 1 : 0;
}

/** Derives the artifact inventory from workspace metadata. */
async function getExpectedArtifacts(workspaceRoot: string): Promise<string[]> {
    const gadgets = await discoverGadgetPackages(workspaceRoot);
    return [
        AGGREGATE_OUTPUT_FILENAME,
        ...gadgets.map((gadget) => {
            const outputName = gadget.metadata.gadgetBuild.outputName;
            if (typeof outputName !== "string") {
                throw new TypeError("Gadget output name must be a string.");
            }
            return createGadgetArtifactFilenames(outputName).minified;
        }),
    ].toSorted();
}

/** Writes one minimal deployable package for workspace build tests. */
async function writeBuildFixture(
    workspaceRoot: string,
    packageName: string,
    outputName: string,
    source: string,
): Promise<void> {
    const packageRoot = join(workspaceRoot, "src", packageName);
    const version = "1.0.0";
    const metadata = createBuildFixtureMetadata(
        packageName,
        outputName,
        version,
    );
    const notice = [
        `${packageName} test notice.`,
        `Release-Scope: ${packageName}@${version}`,
        "SPDX-License-Identifier: CC0-1.0",
        "",
    ].join("\n");
    await mkdir(packageRoot, { recursive: true });
    await Promise.all([
        writeFile(join(packageRoot, "browser.ts"), source),
        writeFile(join(packageRoot, "LICENSE"), notice),
        writeFile(join(packageRoot, "package.json"), JSON.stringify(metadata)),
    ]);
}

/** Creates the metadata contract needed by the shared builder. */
function createBuildFixtureMetadata(
    packageName: string,
    outputName: string,
    version: string,
): object {
    return {
        author: "Test",
        browser: "browser.ts",
        description: `${packageName} build fixture.`,
        gadgetBuild: {
            globalName: `${outputName}Build`,
            headerDescription: ["Exercises workspace build transactions."],
            noticeFiles: ["LICENSE"],
            outputName,
            userscript: { match: ["https://example.test/*"] },
        },
        license: "CC0-1.0",
        name: packageName,
        type: "module",
        version,
        vue: {
            assetsDir: "",
            css: { extract: false },
            filenameHashing: false,
            outputDir: "../../dist",
        },
    };
}

/** Creates stale outputs for both fixture gadgets. */
function createExistingArtifacts(): Map<string, string> {
    const filenames = [
        AGGREGATE_OUTPUT_FILENAME,
        ...Object.values(createGadgetArtifactFilenames("alpha")),
        ...Object.values(createGadgetArtifactFilenames("beta")),
    ];
    return new Map(
        filenames.map((filename) => [filename, `preserve ${filename}\n`]),
    );
}

/** Writes a flat collection of existing build artifacts. */
async function writeArtifacts(
    outputRoot: string,
    artifacts: ReadonlyMap<string, string>,
): Promise<void> {
    await Promise.all(
        [...artifacts].map(([filename, source]) =>
            writeFile(join(outputRoot, filename), source),
        ),
    );
}

/** Requires every existing artifact to retain its exact contents. */
async function assertArtifactsEqual(
    outputRoot: string,
    artifacts: ReadonlyMap<string, string>,
): Promise<void> {
    for (const [filename, expected] of artifacts) {
        const actual = await readFile(join(outputRoot, filename), "utf8");
        assert.equal(actual, expected);
    }
}
