/** Tests single-source workspace configuration contracts. */

import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

import {
    discoverGadgetPackages,
    readPackageMetadata,
} from "../../../scripts/workspace/index.ts";

const repositoryRoot = process.cwd();
const SHARED_NAME = "@mediawiki-gadgets/shared";

test("the shared manifest is the only public shared API map", async () => {
    const rootMetadata = await readPackageMetadata(
        join(repositoryRoot, "package.json"),
    );
    const tsconfig = await readJson(join(repositoryRoot, "tsconfig.json"));
    const compilerOptions = getRecord(tsconfig.compilerOptions);

    assert.equal(rootMetadata.imports, undefined);
    assert.equal(compilerOptions.paths, undefined);

    const sharedRoot = join(repositoryRoot, "src", "shared");
    const sharedMetadata = await readPackageMetadata(
        join(sharedRoot, "package.json"),
    );
    assert.ok(sharedMetadata.exports);
    for (const [subpath, target] of Object.entries(sharedMetadata.exports)) {
        assert.match(subpath, /^\.\/.+/u);
        assert.equal(typeof target, "string", subpath);
        await access(join(sharedRoot, String(target)));
        const specifier = `${SHARED_NAME}/${subpath.slice(2)}`;
        await import(specifier);
    }
});

test("shared aliases and dependencies are declared together", async () => {
    const gadgets = await discoverGadgetPackages(repositoryRoot);

    assert.ok(gadgets.length > 0);
    for (const gadget of gadgets) {
        assert.equal(gadget.metadata.imports?.["#shared"], undefined);
        const alias = gadget.metadata.imports?.["#shared/*"];
        const dependency = gadget.metadata.dependencies?.[SHARED_NAME];
        assert.ok(alias == null || alias === `${SHARED_NAME}/*`);
        assert.equal(alias == null, dependency == null, gadget.directoryName);
        assert.ok(dependency == null || dependency === "*");
    }
});

test("workspace packages share the root Node baseline", async () => {
    const rootMetadata = await readPackageMetadata(
        join(repositoryRoot, "package.json"),
    );
    const packages = await discoverGadgetPackages(repositoryRoot);
    const sharedMetadata = await readPackageMetadata(
        join(repositoryRoot, "src", "shared", "package.json"),
    );
    const nodeRequirement = rootMetadata.engines?.node;

    assert.equal(typeof nodeRequirement, "string");
    assert.equal(sharedMetadata.engines?.node, nodeRequirement);
    for (const gadget of packages) {
        assert.equal(
            gadget.metadata.engines?.node,
            nodeRequirement,
            gadget.directoryName,
        );
    }
});

test("Vue projects inherit one common compiler configuration", async () => {
    const basePath = join(
        repositoryRoot,
        "config",
        "vue",
        "tsconfig.base.json",
    );
    const base = await readJson(basePath);
    assert.equal(base.extends, "../../tsconfig.json");
    const baseOptions = getRecord(base.compilerOptions);
    assert.deepEqual(baseOptions, {
        composite: true,
        declaration: true,
        emitDeclarationOnly: true,
        noEmit: false,
        rootDir: "../../",
    });

    const gadgets = await discoverGadgetPackages(repositoryRoot);
    const expectedReferences: Array<{ path: string }> = [];
    for (const gadget of gadgets) {
        const localConfig = `config/vue/tsconfig.${gadget.directoryName}.json`;
        expectedReferences.push({ path: `./${localConfig}` });
        const project = await readJson(join(repositoryRoot, localConfig));
        assert.equal(project.extends, "./tsconfig.base.json");
        assertVueCompilerOptions(gadget.directoryName, project);
        assertVueIncludes(gadget.directoryName, project);
    }
    const rootProject = await readJson(join(repositoryRoot, "tsconfig.json"));
    assert.deepEqual(rootProject.references, expectedReferences);
});

test("Node type stripping is isolated from browser projects", async () => {
    const rootProject = await readJson(join(repositoryRoot, "tsconfig.json"));
    const rootOptions = getRecord(rootProject.compilerOptions);
    assert.equal(rootOptions.erasableSyntaxOnly, undefined);
    assert.deepEqual(rootOptions.types, ["types-mediawiki"]);
    assert.deepEqual(rootProject.include, ["src/**/*.ts"]);

    const nodeProject = await readJson(
        join(repositoryRoot, "config", "tsconfig.node.json"),
    );
    assert.equal(nodeProject.extends, "../tsconfig.json");
    assert.deepEqual(nodeProject.compilerOptions, {
        erasableSyntaxOnly: true,
        types: ["node", "types-mediawiki"],
    });
    assert.deepEqual(nodeProject.include, [
        "../*.config.ts",
        "../scripts/**/*.ts",
        "../src/*/globals.d.ts",
        "../tests/**/*.ts",
    ]);
});

test("typechecking builds project references before Node source", async () => {
    const rootManifest = await readJson(join(repositoryRoot, "package.json"));
    const scripts = getRecord(rootManifest.scripts);
    assert.equal(
        scripts.typecheck,
        "npm run typecheck:browser && npm run typecheck:node",
    );
    assert.equal(
        scripts["typecheck:browser"],
        "vue-tsc --build tsconfig.json",
    );
    assert.equal(
        scripts["typecheck:node"],
        "tsc --noEmit -p config/tsconfig.node.json",
    );
    assert.doesNotMatch(String(scripts.lint), /vue-tsc/u);

    const gadgets = await discoverGadgetPackages(repositoryRoot);
    for (const gadget of gadgets) {
        const manifest = await readJson(gadget.manifestPath);
        const packageScripts = getRecord(manifest.scripts);
        assert.equal(
            packageScripts.check,
            "npm run lint && vue-tsc --build " +
                `../../config/vue/tsconfig.${gadget.directoryName}.json`,
        );
    }
});

/** Checks package-specific output locations below the Vue base. */
function assertVueCompilerOptions(
    packageName: string,
    project: Record<string, unknown>,
): void {
    const cacheRoot = "../../node_modules/.cache/vue-tsc";
    assert.deepEqual(project.compilerOptions, {
        outDir: `${cacheRoot}/${packageName}`,
        tsBuildInfoFile: `${cacheRoot}/${packageName}.tsbuildinfo`,
    });
}

/** Requires coverage of package and shared TypeScript. */
function assertVueIncludes(
    packageName: string,
    project: Record<string, unknown>,
): void {
    assert.ok(Array.isArray(project.include));
    assert.ok(project.include.includes(`../../src/${packageName}/**/*`));
    assert.ok(project.include.includes("../../src/shared/**/*.ts"));
}

/** Reads one JSON object fixture or configuration file. */
async function readJson(path: string): Promise<Record<string, unknown>> {
    return getRecord(JSON.parse(await readFile(path, "utf8")) as unknown);
}

/** Narrows a parsed JSON value to an object. */
function getRecord(value: unknown): Record<string, unknown> {
    assert.ok(
        typeof value === "object" && value != null && !Array.isArray(value),
    );
    return value as Record<string, unknown>;
}
