/** Tests cumulative CC0 ledger and notice contracts. */

import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import test, { type TestContext } from "node:test";
import { promisify } from "node:util";

import { checkLicensing } from "../../../scripts/repository-check/index.ts";
import { discoverGadgetPackages } from "../../../scripts/workspace/index.ts";
import {
    writeFutureGadget,
    writeWorkspaceLicenseMaps,
} from "../support/gadget-package-fixture.ts";
import { createTemporaryWorkspace } from "../support/temporary-workspace.ts";

const CURRENT_SCOPE = "future-gadget@1.3.0-dev.1";
const LEDGER_PATH = join("config", "licensing", "cc0-release-scopes.json");
const execFileAsync = promisify(execFile);

test("the licensing ledger matches both notices", async (context) => {
    const workspaceRoot = await createLicensingWorkspace(context);

    const problems = await checkFixtureLicensing(workspaceRoot);

    assert.deepEqual(problems, []);
});

test("licensing rejects malformed and duplicate records", async (context) => {
    const malformedRoot = await createLicensingWorkspace(context);
    await writeFile(join(malformedRoot, LEDGER_PATH), JSON.stringify({}));
    const malformed = await checkFixtureLicensing(malformedRoot);
    assertProblem(malformed, /must contain a JSON array/u);

    const duplicateRoot = await createLicensingWorkspace(context);
    const ledger = JSON.parse(
        await readFile(join(duplicateRoot, LEDGER_PATH), "utf8"),
    ) as unknown[];
    await writeFile(
        join(duplicateRoot, LEDGER_PATH),
        JSON.stringify([...ledger, ...ledger]),
    );
    const duplicate = await checkFixtureLicensing(duplicateRoot);
    assertProblem(duplicate, /duplicate scope future-gadget@1\.3\.0-dev\.1/u);
});

test("licensing reports notice scope drift", async (context) => {
    const workspaceRoot = await createLicensingWorkspace(context);
    await writeFile(
        join(workspaceRoot, "LICENSE"),
        "- Future Gadget (`future-gadget@9.9.9`)\n",
    );

    const problems = await checkFixtureLicensing(workspaceRoot);

    assertProblem(problems, /LICENSE: missing ledger scope future-gadget/u);
    assertProblem(
        problems,
        /LICENSE: unregistered scope future-gadget@9\.9\.9/u,
    );
});

test("licensing requires each notice's SPDX identity", async (context) => {
    const workspaceRoot = await createLicensingWorkspace(context);
    const rootPath = join(workspaceRoot, "LICENSE");
    const sharedPath = join(workspaceRoot, "src", "shared", "LICENSE");
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

    const problems = await checkFixtureLicensing(workspaceRoot);

    assertProblem(problems, /LICENSE: missing required SPDX.*BY-SA/u);
    assertProblem(problems, /shared\/LICENSE: missing required SPDX.*CC0/u);
});

test("licensing reports duplicate and mislabeled rows", async (context) => {
    const workspaceRoot = await createLicensingWorkspace(context);
    const row = `- Future Gadget (\`${CURRENT_SCOPE}\`)`;
    await writeFile(join(workspaceRoot, "LICENSE"), `${row}\n${row}\n`);

    const problems = await checkFixtureLicensing(workspaceRoot);

    assertProblem(problems, /duplicate scope future-gadget/u);
    assertProblem(problems, /incorrect display row for future-gadget/u);
});

test("a shared release must name the shared notice", async (context) => {
    const workspaceRoot = await createLicensingWorkspace(context);
    const ledgerPath = join(workspaceRoot, LEDGER_PATH);
    const ledger = JSON.parse(await readFile(ledgerPath, "utf8")) as Array<{
        notices: string[];
    }>;
    ledger[0]!.notices = ["root"];
    await Promise.all([
        writeFile(ledgerPath, JSON.stringify(ledger)),
        writeFile(join(workspaceRoot, "src", "shared", "LICENSE"), ""),
    ]);

    const problems = await checkFixtureLicensing(workspaceRoot);

    assertProblem(problems, /current scope .* must include shared/u);
});

test("licensing retains scopes recorded in Git history", async (context) => {
    const workspaceRoot = await createLicensingWorkspace(context);
    await initializeHistory(workspaceRoot);
    await Promise.all([
        writeFile(join(workspaceRoot, LEDGER_PATH), "[]\n"),
        writeFile(join(workspaceRoot, "LICENSE"), ""),
        writeFile(join(workspaceRoot, "src", "shared", "LICENSE"), ""),
    ]);

    const problems = await checkFixtureLicensing(workspaceRoot);

    assertProblem(problems, /historical scope .* must retain root/u);
    assertProblem(problems, /historical scope .* must retain shared/u);
});

/** Creates one valid CC0 gadget and its cumulative notice records. */
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

/** Runs the coordinated licensing check for the fixture gadget. */
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

/** Records valid notices so later fixture edits have legal history. */
async function initializeHistory(workspaceRoot: string): Promise<void> {
    await execFileAsync("git", ["init", "--quiet"], { cwd: workspaceRoot });
    await execFileAsync("git", ["add", "."], { cwd: workspaceRoot });
    await execFileAsync(
        "git",
        [
            "-c",
            "user.name=Repository Contract",
            "-c",
            "user.email=contract@example.invalid",
            "commit",
            "--quiet",
            "--message=Record licensing scope",
        ],
        { cwd: workspaceRoot },
    );
}
