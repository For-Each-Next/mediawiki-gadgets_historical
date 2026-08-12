/** Tests common gadget diagnostics and notification practices. */

import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

import * as repositoryCheck from "../../../scripts/repository-check/index.ts";
import { createTemporaryWorkspace } from "../support/temporary-workspace.ts";

test("rejects direct diagnostics and Toast APIs", async (context) => {
    const workspaceRoot = await createTemporaryWorkspace(
        context,
        "source-practices-",
    );
    const gadgetRoot = join(workspaceRoot, "src", "future-gadget");
    await mkdir(join(gadgetRoot, "ui"), { recursive: true });
    await writePracticeViolations(gadgetRoot);

    const result = await repositoryCheck.checkSourcePractices(workspaceRoot);

    assertProblem(result.problems, /injected logger/u);
    assertProblem(result.problems, /injected action notifier/u);
    assertProblem(result.problems, /Vue files must be template-only/u);
    assert.equal(
        result.problems.filter((problem) => /Codex Toast/u.test(problem))
            .length,
        3,
    );
});

test("rejects external systems outside adapters and main", async (context) => {
    const workspaceRoot = await createTemporaryWorkspace(
        context,
        "source-practices-external-",
    );
    const gadgetRoot = join(workspaceRoot, "src", "future-gadget");
    await mkdir(join(gadgetRoot, "ui"), { recursive: true });
    await Promise.all([
        writeManifest(gadgetRoot, true),
        writeFile(
            join(gadgetRoot, "ui", "external-systems.ts"),
            [
                "const localApi = new mw.Api();",
                'const foreignApi = new globalThis.mw["ForeignApi"]();',
                'void fetch("/rest.php");',
                'void window["fetch"]("/api.php");',
                'void localStorage.getItem("draft");',
                'void self.sessionStorage.removeItem("draft");',
                "export { foreignApi, localApi };",
                "",
            ].join("\n"),
        ),
    ]);

    const result = await repositoryCheck.checkSourcePractices(workspaceRoot);

    assert.equal(countProblems(result.problems, /MediaWiki API clients/u), 2);
    assert.equal(countProblems(result.problems, /direct network access/u), 2);
    assert.equal(countProblems(result.problems, /browser storage/u), 2);
});

test("allows owned and injected external capabilities", async (context) => {
    const workspaceRoot = await createTemporaryWorkspace(
        context,
        "source-practices-external-allowlist-",
    );
    const gadgetRoot = join(workspaceRoot, "src", "future-gadget");
    await Promise.all([
        mkdir(join(gadgetRoot, "adapters", "network"), { recursive: true }),
        mkdir(join(gadgetRoot, "ui"), { recursive: true }),
    ]);
    await writeAllowedExternalSources(gadgetRoot);

    const result = await repositoryCheck.checkSourcePractices(workspaceRoot);

    assert.deepEqual(result.problems, []);
});

/** Writes owned, injected, and shadowed external capabilities. */
async function writeAllowedExternalSources(gadgetRoot: string): Promise<void> {
    await Promise.all([
        writeManifest(gadgetRoot, true),
        writeOwnedExternalSources(gadgetRoot),
        writeInjectedExternalSources(gadgetRoot),
    ]);
}

/** Writes external integrations in their allowed owners. */
async function writeOwnedExternalSources(gadgetRoot: string): Promise<void> {
    await Promise.all([
        writeFile(
            join(gadgetRoot, "main.ts"),
            [
                "const api = new mw.ForeignApi('/api.php');",
                'void sessionStorage.getItem("draft");',
                "export function start(): void { void api; }",
                "",
            ].join("\n"),
        ),
        writeFile(
            join(gadgetRoot, "adapters", "network", "client.ts"),
            [
                "const api = new mw.Api();",
                'export const request = fetch("/rest.php");',
                'export const draft = localStorage.getItem("draft");',
                "void api;",
                "",
            ].join("\n"),
        ),
    ]);
}

/** Writes injected ports and local names that resemble globals. */
async function writeInjectedExternalSources(
    gadgetRoot: string,
): Promise<void> {
    await writeFile(
        join(gadgetRoot, "ui", "injected.ts"),
        [
            "interface Ports {",
            "    createApi(): unknown;",
            "    fetch(url: string): Promise<unknown>;",
            "    localStorage: Storage;",
            "}",
            "export function run(ports: Ports): void {",
            '    void ports.fetch("/fixture");',
            '    void ports.localStorage.getItem("draft");',
            "    void ports.createApi();",
            "}",
            "export function runShadowed(",
            '    fetch: Ports["fetch"],',
            "    localStorage: Storage,",
            "    mw: { Api: new () => unknown },",
            "    window: { sessionStorage: Storage },",
            "): void {",
            '    void fetch("/fixture");',
            '    void localStorage.getItem("draft");',
            "    void new mw.Api();",
            '    void window.sessionStorage.getItem("draft");',
            "}",
            "type FetchContract = typeof fetch;",
            "export type { FetchContract };",
            "",
        ].join("\n"),
    );
}

/** Writes one violation of every forbidden source practice. */
async function writePracticeViolations(gadgetRoot: string): Promise<void> {
    const actions = [
        'console["debug"]("details");',
        'void globalThis.mw["notify"]("saved");',
        "const controller = useToast();",
        "void controller;",
        "const toast = 1;",
        "",
    ].join("\n");
    const template = [
        "<template>",
        "    <div>",
        "        <cdx-message>Keep this inline.</cdx-message>",
        "        <cdx-toast-container />",
        "    </div>",
        "</template>",
        "",
    ].join("\n");
    const executableVue = [
        '<script setup lang="ts">',
        'import "#gadget/adapters/private.ts";',
        'console.error("bypass");',
        "</script>",
        "<template><div /></template>",
        "",
    ].join("\n");
    await Promise.all([
        writeManifest(gadgetRoot, true),
        writeFile(join(gadgetRoot, "ui", "actions.ts"), actions),
        writeFile(join(gadgetRoot, "ui", "dialog.vue"), template),
        writeFile(join(gadgetRoot, "ui", "executable.vue"), executableVue),
    ]);
}

test("ignores prose and shared adapter internals", async (context) => {
    const workspaceRoot = await createTemporaryWorkspace(
        context,
        "source-practices-prose-",
    );
    const gadgetRoot = join(workspaceRoot, "src", "future-gadget");
    const sharedRoot = join(workspaceRoot, "src", "shared");
    await Promise.all([
        mkdir(join(gadgetRoot, "ui"), { recursive: true }),
        mkdir(join(sharedRoot, "mediawiki", "notifications"), {
            recursive: true,
        }),
    ]);
    await Promise.all([
        writeManifest(gadgetRoot, true),
        writeManifest(sharedRoot, false),
        writeFile(
            join(gadgetRoot, "ui", "prose.ts"),
            [
                '// console.error("example");',
                'const example = "mw.notify and CdxToast";',
                "export { example };",
                "",
            ].join("\n"),
        ),
        writeFile(
            join(sharedRoot, "mediawiki", "notifications", "index.ts"),
            "export const notify = mw.notify;\n",
        ),
    ]);

    const result = await repositoryCheck.checkSourcePractices(workspaceRoot);

    assert.deepEqual(result.problems, []);
});

/** Writes enough metadata for gadget discovery. */
async function writeManifest(root: string, gadget: boolean): Promise<void> {
    await writeFile(
        join(root, "package.json"),
        JSON.stringify({
            name: gadget ? "future-gadget" : "@mediawiki-gadgets/shared",
            ...(gadget ? { gadgetBuild: {} } : {}),
        }),
    );
}

/** Requires one diagnostic to match a focused source contract. */
function assertProblem(problems: string[], pattern: RegExp): void {
    assert.ok(
        problems.some((problem) => pattern.test(problem)),
        `${pattern}:\n${problems.join("\n")}`,
    );
}

/** Counts diagnostics matching one focused source contract. */
function countProblems(problems: string[], pattern: RegExp): number {
    return problems.filter((problem) => pattern.test(problem)).length;
}
