/** Tests tag-driven GitHub release planning and workflow output. */

import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

import {
    createGitHubReleasePlan,
    writeGitHubReleasePayload,
} from "../../../scripts/github-release/index.ts";
import { createTemporaryWorkspace } from "../support/temporary-workspace.ts";

interface GadgetFixtureOptions {
    changelogBody?: string;
    changelogVersion?: string | null;
    manifestVersion?: string;
    outputDirectory?: string;
    outputName?: string;
}

test("discovers and prepares a future gadget", async (context) => {
    const workspaceRoot = await createTemporaryWorkspace(
        context,
        "github-release-valid-",
    );
    await writeGadget(workspaceRoot, "future-gadget", {
        outputName: "future_gadget",
    });

    const plan = await createGitHubReleasePlan(
        workspaceRoot,
        "future-gadget@1.2.3",
    );

    assert.deepEqual(plan, {
        artifactFilename: "future_gadget.min.js",
        artifactPath: "dist/future_gadget.min.js",
        packageName: "future-gadget",
        releaseNotes:
            "Overview: Future Gadget is ready.\n\n- Added the release.",
        releaseTag: "future-gadget@1.2.3",
        version: "1.2.3",
    });
    await assertWorkflowPayload(workspaceRoot, plan);
});

test("rejects malformed and candidate release tags", async (context) => {
    const workspaceRoot = await createTemporaryWorkspace(
        context,
        "github-release-tags-",
    );
    await writeGadget(workspaceRoot, "future-gadget");
    const invalidTags = [
        "future-gadget",
        "future-gadget@1.2",
        "future-gadget@01.2.3",
        "future-gadget@1.2.3-dev.1",
        "future-gadget@1.2.3-post.1",
    ];
    for (const releaseTag of invalidTags) {
        await assert.rejects(
            createGitHubReleasePlan(workspaceRoot, releaseTag),
            /<package>@<major>\.<minor>\.<patch>/u,
        );
    }
});

test("rejects unknown packages and version mismatches", async (context) => {
    const workspaceRoot = await createTemporaryWorkspace(
        context,
        "github-release-identity-",
    );
    await writeGadget(workspaceRoot, "future-gadget", {
        manifestVersion: "1.2.4",
    });

    await assert.rejects(
        createGitHubReleasePlan(workspaceRoot, "unknown-gadget@1.2.3"),
        /not a discovered gadgetBuild package/u,
    );
    await assert.rejects(
        createGitHubReleasePlan(workspaceRoot, "future-gadget@1.2.3"),
        /must match future-gadget package\.json version 1\.2\.4/u,
    );
});

test("requires the matching active changelog entry", async (context) => {
    const missingRoot = await createTemporaryWorkspace(
        context,
        "github-release-missing-changelog-",
    );
    const mismatchRoot = await createTemporaryWorkspace(
        context,
        "github-release-mismatch-changelog-",
    );
    const emptyRoot = await createTemporaryWorkspace(
        context,
        "github-release-empty-changelog-",
    );
    await Promise.all([
        writeGadget(missingRoot, "future-gadget", {
            changelogVersion: null,
        }),
        writeGadget(mismatchRoot, "future-gadget", {
            changelogVersion: "1.2.2",
        }),
        writeGadget(emptyRoot, "future-gadget", { changelogBody: "" }),
    ]);

    await assertChangelogRejection(missingRoot, /contain CHANGELOG\.md/u);
    await assertChangelogRejection(
        mismatchRoot,
        /must match the release tag/u,
    );
    await assertChangelogRejection(emptyRoot, /must not be empty/u);
});

test("release planning validates artifact build metadata", async (context) => {
    const unsafeRoot = await createTemporaryWorkspace(
        context,
        "github-release-unsafe-output-",
    );
    const misplacedRoot = await createTemporaryWorkspace(
        context,
        "github-release-misplaced-output-",
    );
    await Promise.all([
        writeGadget(unsafeRoot, "future-gadget", {
            outputName: "../escaped",
        }),
        writeGadget(misplacedRoot, "future-gadget", {
            outputDirectory: "../../other-dist",
        }),
    ]);

    await assertReleaseRejection(unsafeRoot, /safe file basename/u);
    await assertReleaseRejection(misplacedRoot, /shared dist directory/u);
});

/** Writes one complete deployable package fixture. */
async function writeGadget(
    workspaceRoot: string,
    packageName: string,
    options: GadgetFixtureOptions = {},
): Promise<void> {
    const packageRoot = join(workspaceRoot, "src", packageName);
    await mkdir(packageRoot, { recursive: true });
    await writeFile(
        join(packageRoot, "package.json"),
        JSON.stringify(createMetadata(packageName, options)),
    );
    if (options.changelogVersion !== null) {
        await writeFile(
            join(packageRoot, "CHANGELOG.md"),
            createChangelog(options),
        );
    }
}

/** Creates validated build metadata for one fixture gadget. */
function createMetadata(
    packageName: string,
    options: GadgetFixtureOptions,
): Record<string, unknown> {
    return {
        author: "Test",
        browser: "./browser.ts",
        description: "Future package fixture.",
        gadgetBuild: {
            globalName: "futureGadget",
            headerDescription: ["Exercises future package discovery."],
            outputName: options.outputName ?? "future_gadget",
        },
        license: "CC0-1.0",
        name: packageName,
        version: options.manifestVersion ?? "1.2.3",
        vue: {
            assetsDir: "",
            css: { extract: false },
            filenameHashing: false,
            outputDir: options.outputDirectory ?? "../../dist",
        },
    };
}

/** Creates an active changelog entry followed by an older entry. */
function createChangelog(options: GadgetFixtureOptions): string {
    const version = options.changelogVersion ?? "1.2.3";
    const body =
        options.changelogBody ??
        "Overview: Future Gadget is ready.\n\n- Added the release.";
    return [
        "# Changelog",
        "",
        "## Until 1.3",
        "",
        `### ${version} (2026-08-21 00:00 UTC)`,
        "",
        body,
        "",
        "### 1.2.2 (2026-08-20 00:00 UTC)",
        "",
        "Overview: Previous release.",
        "",
    ].join("\n");
}

/** Checks the workflow's release-notes file and scalar outputs. */
async function assertWorkflowPayload(
    workspaceRoot: string,
    plan: Awaited<ReturnType<typeof createGitHubReleasePlan>>,
): Promise<void> {
    const releaseNotesPath = join(workspaceRoot, "release-notes.md");
    const githubOutputPath = join(workspaceRoot, "github-output.txt");
    await writeGitHubReleasePayload(plan, releaseNotesPath, githubOutputPath);
    assert.equal(
        await readFile(releaseNotesPath, "utf8"),
        "Overview: Future Gadget is ready.\n\n- Added the release.\n",
    );
    assert.equal(
        await readFile(githubOutputPath, "utf8"),
        "package-name=future-gadget\n" +
            "artifact-filename=future_gadget.min.js\n" +
            "artifact-path=dist/future_gadget.min.js\n",
    );
}

/** Requires one changelog fixture to fail release planning. */
async function assertChangelogRejection(
    workspaceRoot: string,
    expected: RegExp,
): Promise<void> {
    await assertReleaseRejection(workspaceRoot, expected);
}

/** Requires a fixture to fail with the expected diagnostic. */
async function assertReleaseRejection(
    workspaceRoot: string,
    expected: RegExp,
): Promise<void> {
    await assert.rejects(
        createGitHubReleasePlan(workspaceRoot, "future-gadget@1.2.3"),
        expected,
    );
}
