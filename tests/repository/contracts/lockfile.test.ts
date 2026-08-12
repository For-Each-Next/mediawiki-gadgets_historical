/** Tests tracked lockfile consistency with workspace manifests. */

import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import test, { type TestContext } from "node:test";

import * as repositoryCheck from "../../../scripts/repository-check/index.ts";
import * as workspace from "../../../scripts/workspace/index.ts";
import { createTemporaryWorkspace } from "../support/temporary-workspace.ts";

const SHARED_NAME = "@mediawiki-gadgets/shared";

test("a lockfile mirrors workspace identity and links", async (context) => {
    const workspaceRoot = await createLockfileWorkspace(context);
    await writeLockfile(workspaceRoot, createLockfileEntries());

    const problems = await checkFixtureLockfile(workspaceRoot);

    assert.deepEqual(problems, []);
});

test("nested workspace dependency entries are not stale", async (context) => {
    const workspaceRoot = await createLockfileWorkspace(context);
    const entries = createLockfileEntries();
    entries["src/future-gadget/node_modules/external-runtime"] = {
        version: "0.9.0",
    };
    await writeLockfile(workspaceRoot, entries);

    assert.deepEqual(await checkFixtureLockfile(workspaceRoot), []);
});

test("lockfile drift is reported by responsibility", async (context) => {
    const workspaceRoot = await createLockfileWorkspace(context);
    const entries = createLockfileEntries();
    entries["src/future-gadget"] = {
        dependencies: {},
        engines: { node: ">=99" },
        license: "MIT",
        name: "renamed-gadget",
        version: "9.9.9",
    };
    entries["node_modules/future-gadget"] = {
        link: true,
        resolved: "src/wrong-gadget",
    };
    entries["src/retired-gadget"] = {
        license: "CC0-1.0",
        version: "0.1.0",
    };
    await writeLockfile(workspaceRoot, entries);

    const problems = await checkFixtureLockfile(workspaceRoot);

    assertProblem(problems, /src\/future-gadget name does not match/u);
    assertProblem(problems, /src\/future-gadget version does not match/u);
    assertProblem(problems, /src\/future-gadget license does not match/u);
    assertProblem(problems, /src\/future-gadget engines does not match/u);
    assertProblem(problems, /src\/future-gadget dependencies do not match/u);
    assertProblem(problems, /node_modules\/future-gadget must link/u);
    assertProblem(problems, /stale workspace entry src\/retired-gadget/u);
});

test("external and root dependency drift is reported", async (context) => {
    const workspaceRoot = await createLockfileWorkspace(context);
    await writeLockfile(workspaceRoot, createDependencyDriftEntries());

    const problems = await checkFixtureLockfile(workspaceRoot);

    assertProblem(problems, /root package dependencies do not match/u);
    assertProblem(problems, /root package devDependencies do not match/u);
    assertProblem(problems, /root package workspaces does not match/u);
    assertProblem(problems, /future-gadget dependencies do not match/u);
    assertProblem(problems, /future-gadget devDependencies do not match/u);
    assertProblem(
        problems,
        /future-gadget optionalDependencies do not match/u,
    );
    assertProblem(problems, /future-gadget peerDependencies do not match/u);
    assertProblem(
        problems,
        /future-gadget peerDependenciesMeta do not match/u,
    );
});

/** Creates root, gadget, and shared lockfile fixtures. */
async function createLockfileWorkspace(context: TestContext): Promise<string> {
    const workspaceRoot = await createTemporaryWorkspace(
        context,
        "lockfile-contract-",
    );
    const gadgetRoot = join(workspaceRoot, "src", "future-gadget");
    const sharedRoot = join(workspaceRoot, "src", "shared");
    await Promise.all([
        mkdir(gadgetRoot, { recursive: true }),
        mkdir(sharedRoot, { recursive: true }),
    ]);
    await writeFixtureManifests(workspaceRoot, gadgetRoot, sharedRoot);
    return workspaceRoot;
}

/** Writes manifests used to derive the expected lockfile records. */
async function writeFixtureManifests(
    workspaceRoot: string,
    gadgetRoot: string,
    sharedRoot: string,
): Promise<void> {
    await writeManifests([
        [join(workspaceRoot, "package.json"), createRootManifest()],
        [join(gadgetRoot, "package.json"), createGadgetManifest()],
        [join(sharedRoot, "package.json"), createSharedManifest()],
    ]);
}

/** Creates the root manifest copied into the lockfile fixture. */
function createRootManifest(): Record<string, unknown> {
    return {
        dependencies: { "root-runtime": "^1.0.0" },
        devDependencies: { "root-tool": "^1.0.0" },
        engines: { node: ">=24.14.1" },
        license: "SEE LICENSE IN LICENSE",
        name: "fixture-workspace",
        version: "0.1.0",
        workspaces: ["src/*"],
    };
}

/** Creates the gadget manifest with every copied dependency map. */
function createGadgetManifest(): Record<string, unknown> {
    return {
        dependencies: {
            [SHARED_NAME]: "*",
            "external-runtime": "^1.0.0",
        },
        devDependencies: { "external-dev": "^2.0.0" },
        engines: { node: ">=24.14.1" },
        license: "CC0-1.0",
        name: "future-gadget",
        optionalDependencies: { "external-optional": "^3.0.0" },
        peerDependencies: { "external-peer": "^4.0.0" },
        peerDependenciesMeta: {
            "external-peer": { optional: true },
        },
        version: "1.3.0-dev.1",
    };
}

/** Creates the shared package manifest fixture. */
function createSharedManifest(): Record<string, unknown> {
    return {
        license: "SEE LICENSE IN LICENSE",
        name: SHARED_NAME,
        version: "0.1.1",
    };
}

/** Writes a collection of JSON manifests concurrently. */
async function writeManifests(
    manifests: ReadonlyArray<readonly [string, Record<string, unknown>]>,
): Promise<void> {
    await Promise.all(
        manifests.map(([path, metadata]) =>
            writeFile(path, JSON.stringify(metadata)),
        ),
    );
}

/** Creates the package records expected from the fixture manifests. */
function createLockfileEntries(): Record<string, unknown> {
    return {
        "": createRootManifest(),
        "node_modules/@mediawiki-gadgets/shared": {
            link: true,
            resolved: "src/shared",
        },
        "node_modules/future-gadget": {
            link: true,
            resolved: "src/future-gadget",
        },
        "src/future-gadget": {
            dependencies: {
                [SHARED_NAME]: "*",
                "external-runtime": "^1.0.0",
            },
            devDependencies: { "external-dev": "^2.0.0" },
            engines: { node: ">=24.14.1" },
            license: "CC0-1.0",
            optionalDependencies: { "external-optional": "^3.0.0" },
            peerDependencies: { "external-peer": "^4.0.0" },
            peerDependenciesMeta: {
                "external-peer": { optional: true },
            },
            version: "1.3.0-dev.1",
        },
        "src/shared": {
            license: "SEE LICENSE IN LICENSE",
            name: SHARED_NAME,
            version: "0.1.1",
        },
    };
}

/** Creates lockfile records with dependency-only manifest drift. */
function createDependencyDriftEntries(): Record<string, unknown> {
    const entries = createLockfileEntries();
    entries[""] = {
        ...createRootManifest(),
        dependencies: { "root-runtime": "^9.0.0" },
        devDependencies: { "root-tool": "^9.0.0" },
        workspaces: ["packages/*"],
    };
    entries["src/future-gadget"] = {
        dependencies: {
            [SHARED_NAME]: "*",
            "external-runtime": "^9.0.0",
        },
        devDependencies: { "external-dev": "^9.0.0" },
        engines: { node: ">=24.14.1" },
        license: "CC0-1.0",
        optionalDependencies: { "external-optional": "^9.0.0" },
        peerDependencies: { "external-peer": "^9.0.0" },
        peerDependenciesMeta: {
            "external-peer": { optional: false },
        },
        version: "1.3.0-dev.1",
    };
    return entries;
}

/** Writes a version-three npm lockfile around package records. */
async function writeLockfile(
    workspaceRoot: string,
    packages: Record<string, unknown>,
): Promise<void> {
    await writeFile(
        join(workspaceRoot, "package-lock.json"),
        JSON.stringify({ lockfileVersion: 3, name: "fixture", packages }),
    );
}

/** Discovers source packages and runs lockfile consistency checks. */
async function checkFixtureLockfile(workspaceRoot: string): Promise<string[]> {
    const packages = await workspace.discoverWorkspacePackages(workspaceRoot);
    return repositoryCheck.checkWorkspaceLockfile(workspaceRoot, packages);
}

/** Requires at least one diagnostic to match a focused contract. */
function assertProblem(problems: string[], pattern: RegExp): void {
    assert.ok(
        problems.some((problem) => pattern.test(problem)),
        `${pattern}:\n${problems.join("\n")}`,
    );
}
