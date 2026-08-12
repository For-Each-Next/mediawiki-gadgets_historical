/** Tests deployable-package README content contracts. */

import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import test, { type TestContext } from "node:test";
import * as repositoryChecks from "../../../scripts/repository-check/index.ts";
import { discoverGadgetPackages } from "../../../scripts/workspace/index.ts";
import { writeFutureGadget } from "../support/gadget-package-fixture.ts";
import { createTemporaryWorkspace } from "../support/temporary-workspace.ts";

interface DocumentationCase {
    expected: string;
    mutate(readme: string): string;
    name: string;
}

const documentationCases: DocumentationCase[] = [
    {
        expected: 'README.md Run must show "npm run build -w future-gadget"',
        mutate(readme): string {
            return replaceInSection(
                readme,
                "Run",
                "npm run build -w future-gadget",
                "npm run build",
            );
        },
        name: "Run build command",
    },
    {
        expected: "must name the exact individual artifact",
        mutate: replaceText("future_gadget.min.js", "future-gadget.min.js"),
        name: "individual artifact",
    },
    {
        expected: "must name the exact aggregate artifact",
        mutate: replaceText(
            "00-mediawiki-gadgets.user.js",
            "all-gadgets.user.js",
        ),
        name: "aggregate artifact",
    },
    {
        expected: "must document MediaWiki personal JavaScript",
        mutate: replaceText("Special:MyPage/common.js", "a wiki script page"),
        name: "MediaWiki installation",
    },
    {
        expected: "must document a userscript-manager installation",
        mutate(readme): string {
            return readme
                .replaceAll("Userscript manager", "Browser extension")
                .replaceAll("userscript manager", "browser extension");
        },
        name: "userscript installation",
    },
    {
        expected: "must explain how to launch the installed gadget",
        mutate: replaceText(
            "After either installation, open a supported MediaWiki page.",
            "Installation is then complete.",
        ),
        name: "launch guidance",
    },
    {
        expected: "must require review before save confirmation",
        mutate: replaceText(
            "Review\nall proposed changes before saving.",
            "The dialog shows proposed changes.",
        ),
        name: "review guidance",
    },
    {
        expected: "must state supported interface languages: English",
        mutate: replaceText(
            "The interface supports English.",
            "The gadget has localized controls.",
        ),
        name: "interface languages",
    },
    {
        expected: "must state the engines.node baseline",
        mutate: replaceText("Node.js 24.14.1", "Node.js 22.18"),
        name: "Node baseline",
    },
    createCommandCase("npm ci", "npm install", "clean install"),
    createCommandCase(
        "npm run check -w future-gadget",
        "npm run check",
        "package check",
    ),
    createCommandCase("npm test -w future-gadget", "npm test", "package test"),
    createCommandCase(
        "npm run build -w future-gadget",
        "npm run build",
        "package build",
    ),
    {
        expected: "must link to the development workflow",
        mutate: replaceText(
            "../../docs/development-workflow.md",
            "../../README.md",
        ),
        name: "development workflow",
    },
    {
        expected: "must state fixture or live-service limits",
        mutate: replaceText(
            "Tests use local fixtures and do not require live services.",
            "Tests cover package behavior.",
        ),
        name: "service constraints",
    },
];

test("reports focused README contract violations", async (context) => {
    for (const fixture of documentationCases) {
        await context.test(fixture.name, (childContext) =>
            assertDocumentationProblem(childContext, fixture),
        );
    }
});

test("derives the documented Node baseline from engines", async (context) => {
    const workspaceRoot = await createDocumentationWorkspace(context);
    const packageRoot = join(workspaceRoot, "src", "future-gadget");
    const manifestPath = join(packageRoot, "package.json");
    const readmePath = join(packageRoot, "README.md");
    const metadata = JSON.parse(await readFile(manifestPath, "utf8")) as {
        engines: { node: string };
    };
    metadata.engines.node = ">=25.2.3";
    const readme = (await readFile(readmePath, "utf8")).replace(
        "24.14.1",
        "25.2.3",
    );
    await Promise.all([
        writeFile(manifestPath, JSON.stringify(metadata)),
        writeFile(readmePath, readme),
    ]);

    const [gadget] = await discoverGadgetPackages(workspaceRoot);
    assert.deepEqual(
        await repositoryChecks.checkPackageDocumentation(gadget!),
        [],
    );
});

test("derives interface languages from locale catalogs", async (context) => {
    const workspaceRoot = await createDocumentationWorkspace(context);
    const packageRoot = join(workspaceRoot, "src", "future-gadget");
    const localeRoot = join(packageRoot, "i18n");
    await mkdir(localeRoot);
    await Promise.all(
        ["en", "zh-Hans", "zh-Hant"].map((locale) =>
            writeFile(join(localeRoot, `${locale}.json`), "{}\n"),
        ),
    );
    const [gadget] = await discoverGadgetPackages(workspaceRoot);

    const problems = await repositoryChecks.checkPackageDocumentation(gadget!);

    assert.deepEqual(problems, [
        "future-gadget: README.md Features must state supported interface " +
            "languages: English, Simplified Chinese, Traditional Chinese.",
    ]);
});

/** Runs one README mutation and requires one matching diagnostic. */
async function assertDocumentationProblem(
    context: TestContext,
    fixture: DocumentationCase,
): Promise<void> {
    const workspaceRoot = await createDocumentationWorkspace(context);
    const readmePath = join(
        workspaceRoot,
        "src",
        "future-gadget",
        "README.md",
    );
    const readme = await readFile(readmePath, "utf8");
    await writeFile(readmePath, fixture.mutate(readme));
    const [gadget] = await discoverGadgetPackages(workspaceRoot);

    const problems = await repositoryChecks.checkPackageDocumentation(gadget!);

    assert.equal(problems.length, 1, problems.join("\n"));
    assert.match(problems[0]!, new RegExp(fixture.expected, "u"));
}

/** Creates one complete fixture workspace for documentation checks. */
async function createDocumentationWorkspace(
    context: TestContext,
): Promise<string> {
    const workspaceRoot = await createTemporaryWorkspace(
        context,
        "gadget-documentation-",
    );
    await writeFutureGadget(workspaceRoot);
    return workspaceRoot;
}

/** Creates a development-command mutation case. */
function createCommandCase(
    command: string,
    replacement: string,
    name: string,
): DocumentationCase {
    return {
        expected: `must show "${command}" exactly`,
        mutate(readme): string {
            return replaceInSection(
                readme,
                "Development",
                command,
                replacement,
            );
        },
        name,
    };
}

/** Creates a mutation replacing the first exact text occurrence. */
function replaceText(
    expected: string,
    replacement: string,
): (readme: string) => string {
    return function replaceExpectedText(readme) {
        assert.ok(readme.includes(expected), expected);
        return readme.replace(expected, replacement);
    };
}

/** Replaces text only within one second-level Markdown section. */
function replaceInSection(
    readme: string,
    sectionName: string,
    expected: string,
    replacement: string,
): string {
    const heading = `## ${sectionName}\n`;
    const start = readme.indexOf(heading);
    const end = readme.indexOf("\n## ", start + heading.length);
    assert.ok(start >= 0 && end >= 0, sectionName);
    const section = readme.slice(start, end);
    assert.ok(section.includes(expected), expected);
    return (
        readme.slice(0, start) +
        section.replace(expected, replacement) +
        readme.slice(end)
    );
}
