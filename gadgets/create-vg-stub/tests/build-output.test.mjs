/**
 * Tests generated gadget output formatting.
 */

/* eslint-disable */

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import { format } from "prettier";
import { minifiedOutput } from "../../../build.config.js";

test("minified output is wrapped in MediaWiki nowiki comments", async () => {
    const source = await readFile("dist/create_vg_stub.min.js", "utf8");

    assert.equal(source.startsWith(minifiedOutput.prefix), true);
    assert.equal(source.endsWith(minifiedOutput.suffix), true);
});

test("userscript output includes Tampermonkey metadata and bundled code", async () => {
    const source = await readFile("dist/create_vg_stub.user.js", "utf8");

    assert.equal(source.startsWith("// ==UserScript==\n"), true);
    assert.match(source, /^\/\/ @name {9}create-vg-stub$/mu);
    assert.match(source, /^\/\/ @version {6}0\.4\.5$/mu);
    assert.match(
        source,
        /^\/\/ @match {8}https:\/\/en\.wikipedia\.org\/\*$/mu,
    );
    assert.match(
        source,
        /^\/\/ @match {8}https:\/\/zh\.wikipedia\.org\/\*$/mu,
    );
    assert.match(source, /^\/\/ @run-at {7}document-idle$/mu);
    assert.match(source, /^\/\/ @sandbox {6}raw$/mu);
    assert.match(source, /^\/\/ @grant {8}none$/mu);
    assert.match(
        source,
        /\n\/\/ ==\/UserScript==\n\n\(\(\) => \{\n {2}function start\(\)/u,
    );
    assert.match(
        source,
        /typeof window\.mw\?\.loader\?\.using !== "function"/u,
    );
    assert.match(source, /const mw = window\.mw;/u);
    assert.match(source, /\n {4}var createVgStub =/u);
    assert.match(
        source,
        /\n {6}return __toCommonJS\(index_exports\);\n {4}\}\)\(\);/u,
    );
});

test("userscript output is beautified", async () => {
    const source = await readFile("dist/create_vg_stub.user.js", "utf8");

    assert.equal(await format(source, { parser: "babel" }), source);
});

test("stylesheet output includes dialog styles", async () => {
    const source = await readFile("dist/create_vg_stub.css", "utf8");

    assert.match(source, /\.create-vg-stub-dialog\.cdx-dialog/u);
    assert.match(source, /\.create-vg-stub-preview-layout/u);
});

test("gadget initializes the zhwiki dialog only for edit actions and missing pages", async () => {
    assert.equal(await getLoaderCallCount("view", 1, "zhwiki"), 0);
    assert.equal(await getLoaderCallCount("view", 0, "zhwiki"), 1);
    assert.equal(await getLoaderCallCount("edit", 1, "zhwiki"), 1);
    assert.equal(await getLoaderCallCount("submit", 1, "zhwiki"), 1);
    assert.equal(await getLoaderCallCount("edit", 1, "enwiki"), 0);
});

test("gadget initializes the enwiki launcher on article views", async () => {
    assert.equal(await getLoaderCallCount("view", 1, "enwiki"), 1);
    assert.equal(await getLoaderCallCount("view", 0, "enwiki"), 0);
    assert.equal(await getLoaderCallCount("submit", 1, "enwiki"), 0);
});

async function getLoaderCallCount(action, articleId = 1, dbName = "") {
    const source = await readFile("dist/create_vg_stub.js", "utf8");
    let calls = 0;
    const sandbox = {
        window: {
            location: {
                search: "",
            },
        },
        mw: {
            config: {
                get(key) {
                    if (key === "wgDBname") {
                        return dbName;
                    }

                    if (key === "wgAction") {
                        return action;
                    }

                    if (key === "wgArticleId") {
                        return articleId;
                    }

                    if (key === "wgNamespaceNumber") {
                        return 0;
                    }

                    return "";
                },
            },
            loader: {
                using() {
                    calls += 1;
                    return new Promise(() => {});
                },
            },
        },
        sessionStorage: {
            getItem() {
                return null;
            },
        },
    };

    vm.createContext(sandbox);
    vm.runInContext(source, sandbox);

    return calls;
}
