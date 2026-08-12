/** Tests rejection of compiler output in authored tooling trees. */

import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

import * as checks from "../../../scripts/repository-check/index.ts";
import { createTemporaryWorkspace } from "../support/temporary-workspace.ts";

test("tooling checks reject emitted JavaScript", async (context) => {
    const workspaceRoot = await createTemporaryWorkspace(
        context,
        "tooling-output-",
    );
    await Promise.all(
        ["config", "scripts", "tests"].map((directory) =>
            mkdir(join(workspaceRoot, directory)),
        ),
    );
    await writeFile(join(workspaceRoot, "scripts", "check.js"), "");

    const problems = await checks.checkToolingOutputs(workspaceRoot);

    assert.deepEqual(problems, [
        "scripts/check.js: remove emitted JavaScript from the authored " +
            "TypeScript tree.",
    ]);
});
