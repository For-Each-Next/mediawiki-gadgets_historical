/**
 * Tests the reusable gadget package and dependency contracts.
 */

import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import test, { type TestContext } from "node:test";
import * as packageCheck from "../../../scripts/check-gadget-packages.ts";
import {
    createFutureLicense,
    writeFutureGadget,
    writeWorkspaceLicenseMaps,
} from "../support/gadget-package-fixture.ts";
import { createTemporaryWorkspace } from "../support/temporary-workspace.ts";

test("a future gadget is discovered automatically", async (context) => {
    const workspaceRoot = await createTemporaryWorkspace(
        context,
        "gadget-contract-",
    );
    await writeFutureGadget(workspaceRoot);
    await writeWorkspaceLicenseMaps(workspaceRoot, [
        "future-gadget@1.3.0-dev.1",
    ]);

    const result = await packageCheck.checkGadgetPackages(workspaceRoot);

    assert.equal(result.gadgetCount, 1);
    assert.deepEqual(result.problems, []);
});

test("an old package notice cannot cover a later version", async (context) => {
    const workspaceRoot = await createTemporaryWorkspace(
        context,
        "gadget-license-",
    );
    await writeFutureGadget(workspaceRoot);
    await writeWorkspaceLicenseMaps(workspaceRoot, [
        "future-gadget@1.3.0-dev.1",
    ]);
    await writeFile(
        join(workspaceRoot, "src", "future-gadget", "LICENSE"),
        createFutureLicense("future-gadget", "1.2.9", "CC0-1.0"),
    );

    const result = await packageCheck.checkGadgetPackages(workspaceRoot);

    assert.ok(
        result.problems.some((problem) => /release scope/iu.test(problem)),
    );
});

test("a package notice must match its metadata license", async (context) => {
    const workspaceRoot = await createTemporaryWorkspace(
        context,
        "gadget-spdx-",
    );
    await writeFutureGadget(workspaceRoot);
    await writeWorkspaceLicenseMaps(workspaceRoot, [
        "future-gadget@1.3.0-dev.1",
    ]);
    await writeFile(
        join(workspaceRoot, "src", "future-gadget", "LICENSE"),
        createFutureLicense("future-gadget", "1.3.0-dev.1", "MIT"),
    );

    const result = await packageCheck.checkGadgetPackages(workspaceRoot);

    assert.ok(
        result.problems.some((problem) =>
            /package\.json license/iu.test(problem),
        ),
    );
});

test("a package must use a supported SPDX identifier", async (context) => {
    const workspaceRoot = await createTemporaryWorkspace(
        context,
        "gadget-invalid-spdx-",
    );
    await writeFutureGadget(workspaceRoot);
    await writeWorkspaceLicenseMaps(workspaceRoot, [
        "future-gadget@1.3.0-dev.1",
    ]);
    const packageRoot = join(workspaceRoot, "src", "future-gadget");
    const manifestPath = join(packageRoot, "package.json");
    const metadata = JSON.parse(await readFile(manifestPath, "utf8")) as {
        license: string;
    };
    metadata.license = "NOT A VALID SPDX EXPRESSION";
    await Promise.all([
        writeFile(manifestPath, JSON.stringify(metadata)),
        writeFile(
            join(packageRoot, "LICENSE"),
            createFutureLicense(
                "future-gadget",
                "1.3.0-dev.1",
                metadata.license,
            ),
        ),
    ]);

    const result = await packageCheck.checkGadgetPackages(workspaceRoot);

    assert.ok(
        result.problems.some((problem) =>
            /supported SPDX identifier/iu.test(problem),
        ),
    );
});

test("workspace maps include each current CC0 scope", async (context) => {
    const workspaceRoot = await createTemporaryWorkspace(
        context,
        "gadget-map-",
    );
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

    const result = await packageCheck.checkGadgetPackages(workspaceRoot);

    assert.equal(
        result.problems.filter((problem) =>
            /missing current CC0 scope/iu.test(problem),
        ).length,
        1,
    );
});

test("workspace licensing maps are required", async (context) => {
    const workspaceRoot = await createTemporaryWorkspace(
        context,
        "gadget-map-missing-",
    );
    await writeFutureGadget(workspaceRoot);

    const result = await packageCheck.checkGadgetPackages(workspaceRoot);

    assert.equal(
        result.problems.filter((problem) =>
            /missing licensing map/iu.test(problem),
        ).length,
        2,
    );
});

test("current and retired artifact names cannot collide", async (context) => {
    const workspaceRoot = await createTemporaryWorkspace(
        context,
        "gadget-collision-",
    );
    await Promise.all([
        writeFutureGadget(workspaceRoot, "first-gadget", "shared"),
        writeFutureGadget(workspaceRoot, "second-gadget", "shared.min"),
    ]);
    await writeWorkspaceLicenseMaps(workspaceRoot, [
        "first-gadget@1.3.0-dev.1",
        "second-gadget@1.3.0-dev.1",
    ]);

    const result = await packageCheck.checkGadgetPackages(workspaceRoot);

    assert.equal(result.gadgetCount, 2);
    assert.ok(
        result.problems.some((problem) =>
            /shared\.min\.js collides/iu.test(problem),
        ),
    );
});

test("flat artifact names cannot collide by case", async (context) => {
    const workspaceRoot = await createTemporaryWorkspace(
        context,
        "gadget-case-",
    );
    await Promise.all([
        writeFutureGadget(workspaceRoot, "first-gadget", "shared"),
        writeFutureGadget(workspaceRoot, "second-gadget", "SHARED"),
    ]);
    await writeWorkspaceLicenseMaps(workspaceRoot, [
        "first-gadget@1.3.0-dev.1",
        "second-gadget@1.3.0-dev.1",
    ]);

    const result = await packageCheck.checkGadgetPackages(workspaceRoot);

    assert.ok(
        result.problems.some((problem) =>
            /shared\.js collides/iu.test(problem),
        ),
    );
});

test("the aggregate output name is reserved by case", async (context) => {
    const workspaceRoot = await createTemporaryWorkspace(
        context,
        "gadget-reserved-",
    );
    await writeFutureGadget(
        workspaceRoot,
        "future-gadget",
        "00-MediaWiki-Gadgets",
    );
    await writeWorkspaceLicenseMaps(workspaceRoot, [
        "future-gadget@1.3.0-dev.1",
    ]);

    const result = await packageCheck.checkGadgetPackages(workspaceRoot);

    assert.ok(
        result.problems.some((problem) =>
            problem.includes(
                "must not reserve the aggregate " +
                    "00-mediawiki-gadgets.user.js path",
            ),
        ),
    );
});

test("a retired gadget name cannot claim the aggregate", async (context) => {
    const workspaceRoot = await createTemporaryWorkspace(
        context,
        "gadget-reserved-retired-",
    );
    await writeFutureGadget(
        workspaceRoot,
        "future-gadget",
        "00-mediawiki-gadgets.user",
    );
    await writeWorkspaceLicenseMaps(workspaceRoot, [
        "future-gadget@1.3.0-dev.1",
    ]);

    const result = await packageCheck.checkGadgetPackages(workspaceRoot);

    assert.ok(
        result.problems.some((problem) =>
            problem.includes("00-mediawiki-gadgets.user.js path"),
        ),
    );
});

test("near aggregate names remain available", async (context) => {
    const workspaceRoot = await createTemporaryWorkspace(
        context,
        "gadget-near-aggregate-",
    );
    await writeFutureGadget(
        workspaceRoot,
        "future-gadget",
        "00-mediawiki-gadgets.min",
    );
    await writeWorkspaceLicenseMaps(workspaceRoot, [
        "future-gadget@1.3.0-dev.1",
    ]);

    const result = await packageCheck.checkGadgetPackages(workspaceRoot);

    assert.equal(
        result.problems.filter((problem) =>
            /aggregate|collides/iu.test(problem),
        ).length,
        0,
    );
});

test("package structure uses the authored inventory", async (context) => {
    const workspaceRoot = await createTemporaryWorkspace(
        context,
        "gadget-authored-tree-",
    );
    await writeFutureGadget(workspaceRoot);
    await writeWorkspaceLicenseMaps(workspaceRoot, [
        "future-gadget@1.3.0-dev.1",
    ]);
    const packageRoot = join(workspaceRoot, "src", "future-gadget");
    await writeAuthoredTreeFixture(packageRoot);

    const result = await packageCheck.checkGadgetPackages(workspaceRoot);
    const genericProblems = result.problems.filter((problem) =>
        /replace generic path/u.test(problem),
    );

    assert.deepEqual(genericProblems, [
        "future-gadget: replace generic path domain/helpers with a " +
            "responsibility name.",
        "future-gadget: replace generic path domain/utils.ts with a " +
            "responsibility name.",
    ]);
});

test("package structure rejects emitted JavaScript", async (context) => {
    const workspaceRoot = await createTemporaryWorkspace(
        context,
        "gadget-emitted-javascript-",
    );
    await writeFutureGadget(workspaceRoot);
    await writeWorkspaceLicenseMaps(workspaceRoot, [
        "future-gadget@1.3.0-dev.1",
    ]);
    await writeFile(
        join(workspaceRoot, "src", "future-gadget", "main.js"),
        "export {};\n",
    );

    const result = await packageCheck.checkGadgetPackages(workspaceRoot);

    assert.ok(result.problems.some((problem) => /main\.js/iu.test(problem)));
});

test("package checks reject reserved build bindings", async (context) => {
    await assertInvalidBuildMetadata(
        context,
        (build) => {
            build.globalName = "class";
        },
        /binding identifier/u,
    );
});

test("package checks reject malformed injected text", async (context) => {
    await assertInvalidBuildMetadata(
        context,
        (build) => {
            build.defines = { TEMPLATE: { textFile: "x", extra: true } };
        },
        /gadgetBuild\.defines/u,
    );
});

test("package checks reject unsupported userscript data", async (context) => {
    await assertInvalidBuildMetadata(
        context,
        (build) => {
            build.userscript = { name: "Unused name" };
        },
        /gadgetBuild\.userscript/u,
    );
});

test("package checks reject invalid userscript matches", async (context) => {
    await assertInvalidBuildMetadata(
        context,
        (build) => {
            build.userscript = { match: ["file://*/*"] };
        },
        /supported HTTP patterns/u,
    );
});

/** Runs invalid build metadata through package contracts. */
async function assertInvalidBuildMetadata(
    context: TestContext,
    mutate: (build: Record<string, unknown>) => void,
    expected: RegExp,
): Promise<void> {
    const workspaceRoot = await createTemporaryWorkspace(
        context,
        "gadget-build-metadata-",
    );
    await writeFutureGadget(workspaceRoot);
    await writeWorkspaceLicenseMaps(workspaceRoot, [
        "future-gadget@1.3.0-dev.1",
    ]);
    const manifestPath = join(
        workspaceRoot,
        "src",
        "future-gadget",
        "package.json",
    );
    const metadata = JSON.parse(await readFile(manifestPath, "utf8")) as {
        gadgetBuild: Record<string, unknown>;
    };
    mutate(metadata.gadgetBuild);
    await writeFile(manifestPath, JSON.stringify(metadata));

    const result = await packageCheck.checkGadgetPackages(workspaceRoot);

    assert.ok(result.problems.some((problem) => expected.test(problem)));
}

/** Writes generic paths inside and outside the authored inventory. */
async function writeAuthoredTreeFixture(packageRoot: string): Promise<void> {
    await Promise.all([
        mkdir(join(packageRoot, "domain", "helpers"), { recursive: true }),
        mkdir(join(packageRoot, ".cache", "common"), { recursive: true }),
        mkdir(join(packageRoot, "dist", "helpers"), { recursive: true }),
        mkdir(join(packageRoot, "node_modules", "utils"), {
            recursive: true,
        }),
    ]);
    await Promise.all([
        writeFile(join(packageRoot, "domain", "utils.ts"), "export {};\n"),
        writeFile(
            join(packageRoot, ".cache", "common", "helpers.ts"),
            "export {};\n",
        ),
        writeFile(
            join(packageRoot, "dist", "helpers", "common.ts"),
            "export {};\n",
        ),
        writeFile(
            join(packageRoot, "node_modules", "utils", "helpers.ts"),
            "export {};\n",
        ),
    ]);
}
