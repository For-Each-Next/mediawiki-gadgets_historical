/** Tests current-only CC0 workspace notice contracts. */

import assert from "node:assert/strict";
import { readFile, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import test, { type TestContext } from "node:test";

// noinspection ES6PreferShortImport -- Node ESM requires index.ts.
import { checkLicensing } from "../../../scripts/repository-check/index.ts";
// noinspection ES6PreferShortImport -- Node ESM requires index.ts.
import { discoverGadgetPackages } from "../../../scripts/workspace/index.ts";
import {
    writeFutureGadget,
    writeWorkspaceLicenseMaps,
} from "../support/gadget-package-fixture.ts";
import { createTemporaryWorkspace } from "../support/temporary-workspace.ts";

const CURRENT_SCOPE = "future-gadget@1.3.0-dev.1";
const ROOT_NOTICE_PATH = "LICENSE";
const SHARED_NOTICE_PATH = join("src", "shared", "LICENSE");

test("current-only licensing maps match package metadata", async (context) => {
    const workspaceRoot = await createLicensingWorkspace(context);

    const problems = await checkFixtureLicensing(workspaceRoot);

    assert.deepEqual(problems, []);
});

test("licensing reports a missing current scope", async (context) => {
    const workspaceRoot = await createLicensingWorkspace(context);
    await writeWorkspaceLicenseMaps(workspaceRoot, [], [CURRENT_SCOPE]);

    const problems = await checkFixtureLicensing(workspaceRoot);

    assertProblem(
        problems,
        /LICENSE: missing current CC0 scope future-gadget@1\.3\.0-dev\.1/u,
    );
});

test("licensing rejects stale historical scopes", async (context) => {
    const workspaceRoot = await createLicensingWorkspace(context);
    const rootPath = join(workspaceRoot, ROOT_NOTICE_PATH);
    const rootNotice = await readFile(rootPath, "utf8");
    await writeFile(
        rootPath,
        rootNotice + "- Future Gadget 1.2.9 (`future-gadget@1.2.9`)\n",
    );

    const problems = await checkFixtureLicensing(workspaceRoot);

    assertProblem(
        problems,
        /LICENSE: stale or non-current CC0 scope future-gadget@1\.2\.9/u,
    );
});

test("licensing rejects duplicate scopes", async (context) => {
    const workspaceRoot = await createLicensingWorkspace(context);
    const rootPath = join(workspaceRoot, ROOT_NOTICE_PATH);
    const rootNotice = await readFile(rootPath, "utf8");
    const row = `- Future Gadget 1.3.0-dev.1 (\`${CURRENT_SCOPE}\`)`;
    await writeFile(rootPath, rootNotice.replace(row, `${row}\n${row}`));

    const problems = await checkFixtureLicensing(workspaceRoot);

    assertProblem(
        problems,
        /LICENSE: duplicate scope future-gadget@1\.3\.0-dev\.1/u,
    );
});

test("licensing requires the displayed current version", async (context) => {
    const workspaceRoot = await createLicensingWorkspace(context);
    const rootPath = join(workspaceRoot, ROOT_NOTICE_PATH);
    const rootNotice = await readFile(rootPath, "utf8");
    await writeFile(
        rootPath,
        rootNotice.replace("Future Gadget 1.3.0-dev.1", "Future Gadget 9.9.9"),
    );

    const problems = await checkFixtureLicensing(workspaceRoot);

    assertProblem(problems, /must display version 1\.3\.0-dev\.1/u);
});

test("licensing requires maps and SPDX identities", async (context) => {
    const missingRoot = await createLicensingWorkspace(context);
    await Promise.all([
        unlink(join(missingRoot, ROOT_NOTICE_PATH)),
        unlink(join(missingRoot, SHARED_NOTICE_PATH)),
    ]);

    const missing = await checkFixtureLicensing(missingRoot);

    assertProblem(missing, /workspace: missing licensing map LICENSE/u);
    assertProblem(
        missing,
        /workspace: missing licensing map src\/shared\/LICENSE/u,
    );

    const missingSpdxRoot = await createLicensingWorkspace(context);
    const rootPath = join(missingSpdxRoot, ROOT_NOTICE_PATH);
    const sharedPath = join(missingSpdxRoot, SHARED_NOTICE_PATH);
    const [rootNotice, sharedNotice] = await Promise.all([
        readFile(rootPath, "utf8"),
        readFile(sharedPath, "utf8"),
    ]);
    await Promise.all([
        writeFile(
            rootPath,
            rootNotice.replace("SPDX-License-Identifier: CC-BY-SA-4.0", ""),
        ),
        writeFile(
            sharedPath,
            sharedNotice.replace("SPDX-License-Identifier: CC0-1.0", ""),
        ),
    ]);

    const missingSpdx = await checkFixtureLicensing(missingSpdxRoot);

    assertProblem(missingSpdx, /LICENSE: missing required SPDX.*BY-SA/u);
    assertProblem(
        missingSpdx,
        /src\/shared\/LICENSE: missing required SPDX.*CC0/u,
    );
});

test("shared maps include only shared-runtime gadgets", async (context) => {
    const workspaceRoot = await createTemporaryWorkspace(
        context,
        "licensing-shared-filter-",
    );
    const sharedScope = "shared-gadget@1.3.0-dev.1";
    const standaloneScope = "standalone-gadget@1.3.0-dev.1";
    await Promise.all([
        writeFutureGadget(
            workspaceRoot,
            "shared-gadget",
            "shared_gadget",
            true,
        ),
        writeFutureGadget(
            workspaceRoot,
            "standalone-gadget",
            "standalone_gadget",
        ),
    ]);
    await writeWorkspaceLicenseMaps(
        workspaceRoot,
        [sharedScope, standaloneScope],
        [sharedScope],
    );

    const valid = await checkFixtureLicensing(workspaceRoot);

    assert.deepEqual(valid, []);

    await writeWorkspaceLicenseMaps(
        workspaceRoot,
        [sharedScope, standaloneScope],
        [sharedScope, standaloneScope],
    );
    const staleShared = await checkFixtureLicensing(workspaceRoot);

    assertProblem(
        staleShared,
        /stale or non-current CC0 scope standalone-gadget/u,
    );
});

/** Creates one valid CC0 gadget and its current licensing maps. */
async function createLicensingWorkspace(
    context: TestContext,
): Promise<string> {
    const workspaceRoot = await createTemporaryWorkspace(
        context,
        "licensing-contract-",
    );
    await writeFutureGadget(
        workspaceRoot,
        "future-gadget",
        "future_gadget",
        true,
    );
    await writeWorkspaceLicenseMaps(
        workspaceRoot,
        [CURRENT_SCOPE],
        [CURRENT_SCOPE],
    );
    return workspaceRoot;
}

/** Runs the coordinated licensing check for the fixture gadgets. */
async function checkFixtureLicensing(
    workspaceRoot: string,
): Promise<string[]> {
    const gadgets = await discoverGadgetPackages(workspaceRoot);
    return checkLicensing(workspaceRoot, gadgets);
}

/** Requires at least one diagnostic to match a focused contract. */
function assertProblem(problems: string[], pattern: RegExp): void {
    assert.ok(
        problems.some((problem) => pattern.test(problem)),
        `${pattern}:\n${problems.join("\n")}`,
    );
}
