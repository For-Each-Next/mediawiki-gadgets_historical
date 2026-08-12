/** Tests the reusable manifest-driven workspace model. */

import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

import {
    discoverWorkspacePackages,
    inspectWorkspacePackages,
} from "../../../scripts/workspace/index.ts";
import { createTemporaryWorkspace } from "../support/temporary-workspace.ts";

test("workspace discovery uses stable directory order", async (context) => {
    const workspaceRoot = await createTemporaryWorkspace(
        context,
        "workspace-model-",
    );
    await Promise.all([
        writePackage(workspaceRoot, "zeta", "zeta-package"),
        writePackage(workspaceRoot, "alpha", "alpha-package"),
        mkdir(join(workspaceRoot, "src", "not-a-package"), {
            recursive: true,
        }),
    ]);

    const packages = await discoverWorkspacePackages(workspaceRoot);

    assert.deepEqual(
        packages.map((workspacePackage) => workspacePackage.directoryName),
        ["alpha", "zeta"],
    );
    assert.deepEqual(
        packages.map((workspacePackage) => workspacePackage.metadata.name),
        ["alpha-package", "zeta-package"],
    );
});

test("malformed metadata has a relative diagnostic", async (context) => {
    const workspaceRoot = await createTemporaryWorkspace(
        context,
        "workspace-malformed-",
    );
    await Promise.all([
        writePackage(workspaceRoot, "valid", "valid-package"),
        writeMalformedPackage(workspaceRoot, "broken"),
    ]);

    const result = await inspectWorkspacePackages(workspaceRoot);

    assert.deepEqual(
        result.packages.map(
            (workspacePackage) => workspacePackage.metadata.name,
        ),
        ["valid-package"],
    );
    assert.deepEqual(result.problems, [
        "src/broken/package.json: package manifest is not valid JSON.",
    ]);
    await assert.rejects(
        discoverWorkspacePackages(workspaceRoot),
        /src\/broken\/package\.json/u,
    );
});

/** Writes one minimal source package manifest. */
async function writePackage(
    workspaceRoot: string,
    directoryName: string,
    packageName: string,
): Promise<void> {
    const packageRoot = join(workspaceRoot, "src", directoryName);
    await mkdir(packageRoot, { recursive: true });
    await writeFile(
        join(packageRoot, "package.json"),
        JSON.stringify({ name: packageName, type: "module" }),
    );
}

/** Writes one source package with invalid JSON metadata. */
async function writeMalformedPackage(
    workspaceRoot: string,
    directoryName: string,
): Promise<void> {
    const packageRoot = join(workspaceRoot, "src", directoryName);
    await mkdir(packageRoot, { recursive: true });
    await writeFile(join(packageRoot, "package.json"), "{\n");
}
