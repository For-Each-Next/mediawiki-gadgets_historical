/** Tests package-contained browser composition entry points. */

import assert from "node:assert/strict";
import { readFile, rm, symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

import { checkBrowserEntry } from "../../../scripts/repository-check/index.ts";
import { discoverGadgetPackages } from "../../../scripts/workspace/index.ts";
import { writeFutureGadget } from "../support/gadget-package-fixture.ts";
import { createTemporaryWorkspace } from "../support/temporary-workspace.ts";

test("browser metadata cannot escape its package", async (context) => {
    const workspaceRoot = await createTemporaryWorkspace(
        context,
        "browser-traversal-",
    );
    await writeFutureGadget(workspaceRoot);
    const manifestPath = join(
        workspaceRoot,
        "src",
        "future-gadget",
        "package.json",
    );
    const metadata = JSON.parse(await readFile(manifestPath, "utf8")) as {
        browser: string;
    };
    metadata.browser = "../outside.ts";
    await writeFile(manifestPath, JSON.stringify(metadata));

    const problems = await checkFixtureBrowserEntry(workspaceRoot);

    assertProblem(problems, /browser entry must remain inside the package/u);
});

test("browser symlinks cannot bypass containment", async (context) => {
    const workspaceRoot = await createTemporaryWorkspace(
        context,
        "browser-symlink-",
    );
    await writeFutureGadget(workspaceRoot);
    const packageRoot = join(workspaceRoot, "src", "future-gadget");
    const browserPath = join(packageRoot, "browser.ts");
    const outsidePath = join(workspaceRoot, "outside.ts");
    await Promise.all([
        rm(browserPath),
        writeFile(
            outsidePath,
            'import { start } from "#gadget/main.ts";\nstart();\n',
        ),
    ]);
    await symlink(outsidePath, browserPath, "file");

    const problems = await checkFixtureBrowserEntry(workspaceRoot);

    assertProblem(problems, /browser entry must be a real file inside/u);
});

test("comments and references do not count as startup", async (context) => {
    const workspaceRoot = await createTemporaryWorkspace(
        context,
        "browser-startup-",
    );
    await writeFutureGadget(workspaceRoot);
    const browserPath = join(
        workspaceRoot,
        "src",
        "future-gadget",
        "browser.ts",
    );
    await writeFile(
        browserPath,
        [
            '// import { start } from "#gadget/main.ts";',
            'import { start } from "#gadget/main.ts";',
            "consume(start);",
            "// start();",
            "",
        ].join("\n"),
    );

    const problems = await checkFixtureBrowserEntry(workspaceRoot);

    assertProblem(problems, /must invoke the imported start function/u);
});

test("a Promise chain may invoke start as its callback", async (context) => {
    const workspaceRoot = await createTemporaryWorkspace(
        context,
        "browser-promise-start-",
    );
    await writeFutureGadget(workspaceRoot);
    const browserPath = join(
        workspaceRoot,
        "src",
        "future-gadget",
        "browser.ts",
    );
    await writeFile(
        browserPath,
        [
            'import { start } from "#gadget/main.ts";',
            "void Promise.resolve().then(start);",
            "",
        ].join("\n"),
    );

    assert.deepEqual(await checkFixtureBrowserEntry(workspaceRoot), []);
});

test("template text does not count as browser startup", async (context) => {
    const workspaceRoot = await createTemporaryWorkspace(
        context,
        "browser-template-startup-",
    );
    await writeFutureGadget(workspaceRoot);
    const browserPath = join(
        workspaceRoot,
        "src",
        "future-gadget",
        "browser.ts",
    );
    await writeFile(
        browserPath,
        [
            "const example = `",
            'import { start } from "#gadget/main.ts";',
            "start();",
            "`;",
            "void example;",
            "",
        ].join("\n"),
    );

    const problems = await checkFixtureBrowserEntry(workspaceRoot);

    assertProblem(problems, /must import \{ start \}/u);
    assertProblem(problems, /must invoke the imported start function/u);
});

/** Discovers a single gadget and checks its browser entry. */
async function checkFixtureBrowserEntry(
    workspaceRoot: string,
): Promise<string[]> {
    const gadgets = await discoverGadgetPackages(workspaceRoot);
    assert.equal(gadgets.length, 1);
    return checkBrowserEntry(gadgets[0]!);
}

/** Requires at least one diagnostic to match a focused contract. */
function assertProblem(problems: string[], pattern: RegExp): void {
    assert.ok(
        problems.some((problem) => pattern.test(problem)),
        `${pattern}:\n${problems.join("\n")}`,
    );
}
