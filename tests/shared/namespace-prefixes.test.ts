/** Tests database-scoped MediaWiki namespace prefixes. */

import assert from "node:assert/strict";
import test from "node:test";

import {
    WIKI_NAMESPACE_PREFIXES,
    decodeNamespaceCatalog,
    formatNamespaceTitle,
    getNamespaceId,
    getNamespaceIds,
    getNamespacePrefixes,
    getTitleNamespaceId,
    hasNamespacePrefix,
    normalizeNamespacePrefix,
    normalizeWikitextTitleKey,
    stripNamespacePrefix,
} from "@mediawiki-gadgets/shared/wikitext";

test("siteinfo decoding builds a scoped namespace catalog", () => {
    const catalog = decodeNamespaceCatalog("examplewiki", {
        query: {
            namespacealiases: [
                { alias: "P", id: 4 },
                { alias: "Project_space", id: 4 },
                { alias: "Image", id: 6 },
            ],
            namespaces: {
                "-1": {
                    canonical: "Special",
                    id: -1,
                    name: "Utility",
                },
                0: { id: 0, name: "" },
                4: {
                    canonical: "Project",
                    id: 4,
                    name: "Project space",
                },
                6: { canonical: "File", id: 6, name: "Asset" },
            },
        },
    });

    assert.equal(catalog.databaseName, "examplewiki");
    assert.deepEqual(catalog.namespacePrefixes[4], [
        "Project space",
        "Project",
        "P",
    ]);
    assert.equal(getNamespaceId(catalog, "project_space"), 4);
    assert.equal(getNamespaceId(catalog, "Image"), 6);
    assert.equal(
        formatNamespaceTitle("Image:Example.svg", catalog, 6),
        "Asset:Example.svg",
    );
    assert.equal(Object.isFrozen(catalog), true);
    assert.equal(Object.isFrozen(catalog.namespacePrefixes), true);
    assert.equal(Object.isFrozen(catalog.namespacePrefixes[4]), true);
});

test("siteinfo decoding accepts legacy star fields", () => {
    const catalog = decodeNamespaceCatalog("legacywiki", {
        query: {
            namespacealiases: [{ id: 10, "*": "T" }],
            namespaces: {
                0: { id: 0, "*": "" },
                10: { canonical: "Template", id: 10, "*": "Pattern" },
            },
        },
    });

    assert.deepEqual(catalog.namespacePrefixes[0], [""]);
    assert.deepEqual(catalog.namespacePrefixes[10], [
        "Pattern",
        "Template",
        "T",
    ]);
    assert.equal(stripNamespacePrefix("T:Example", catalog, 10), "Example");
});

test("siteinfo decoding rejects incomplete responses", () => {
    assert.throws(
        () => decodeNamespaceCatalog("brokenwiki", { query: {} }),
        /Invalid MediaWiki namespace siteinfo response/u,
    );
    assert.throws(
        () =>
            decodeNamespaceCatalog("brokenwiki", {
                query: {
                    namespacealiases: [{ id: 10 }],
                    namespaces: { 10: { id: 10, name: "Template" } },
                },
            }),
        /Invalid MediaWiki namespace siteinfo response/u,
    );
});

test("namespace data keeps site names, canonical names, and aliases", () => {
    assert.equal(Object.keys(WIKI_NAMESPACE_PREFIXES.enwiki).length, 30);
    assert.equal(Object.keys(getNamespaceIds("enwiki")).length, 37);
    assert.equal(Object.keys(WIKI_NAMESPACE_PREFIXES.zhwiki).length, 33);
    assert.equal(Object.keys(getNamespaceIds("zhwiki")).length, 174);
    assert.deepEqual(WIKI_NAMESPACE_PREFIXES.enwiki[4], [
        "Wikipedia",
        "Project",
        "WP",
    ]);
    assert.deepEqual(WIKI_NAMESPACE_PREFIXES.zhwiki[10], [
        "Template",
        "T",
        "样板",
        "模板",
        "樣板",
    ]);
    assert.deepEqual(WIKI_NAMESPACE_PREFIXES.zhwiki[-2], [
        "Media",
        "媒体",
        "媒体文件",
        "媒体档案",
        "媒體",
        "媒體文件",
        "媒體檔案",
    ]);
    assert.equal(Object.isFrozen(WIKI_NAMESPACE_PREFIXES), true);
    assert.equal(Object.isFrozen(WIKI_NAMESPACE_PREFIXES.enwiki), true);
    assert.equal(Object.isFrozen(WIKI_NAMESPACE_PREFIXES.zhwiki[10]), true);
});

test("namespace prefix normalization matches MediaWiki lookup keys", () => {
    assert.equal(normalizeNamespacePrefix(" User__Talk "), "user_talk");
    assert.equal(normalizeNamespacePrefix("維基 專題"), "維基_專題");
    assert.equal(normalizeNamespacePrefix("  "), "");
});

test("wikitext title keys preserve case while normalizing structure", () => {
    assert.equal(normalizeWikitextTitleKey(" Foo_bar "), "Foo bar");
    assert.notEqual(
        normalizeWikitextTitleKey("Foo"),
        normalizeWikitextTitleKey("FOO"),
    );
});

test("namespace lookup remains scoped to one database", () => {
    assert.equal(getNamespaceId("zhwiki", " t "), 10);
    assert.equal(getNamespaceId("enwiki", "TM"), 10);
    assert.equal(getNamespaceId("enwiki", "T"), undefined);
    assert.equal(getNamespaceId("zhwiki", "TM"), undefined);
    assert.equal(getNamespaceId("zhwiki", "分類"), 14);
    assert.equal(getNamespaceId("enwiki", ""), 0);
    assert.equal(getNamespaceId("enwiki", "constructor"), undefined);
});

test("namespace prefix and reverse maps cover aliases", () => {
    assert.deepEqual(getNamespacePrefixes("zhwiki", 14), [
        "Category",
        "CAT",
        "分类",
        "分類",
    ]);
    assert.deepEqual(getNamespacePrefixes("enwiki", 102), []);

    const namespaceIds = getNamespaceIds("zhwiki");
    assert.equal(namespaceIds.image, 6);
    assert.equal(namespaceIds.file_talk, 7);
    assert.equal(namespaceIds.維基專題, 102);
    assert.equal(namespaceIds[""], 0);
});

test("title namespace lookup distinguishes explicit prefixes", () => {
    assert.equal(getTitleNamespaceId("分類:游戏", "zhwiki"), 14);
    assert.equal(getTitleNamespaceId("[unknown]:game", "enwiki"), 0);
    assert.equal(getTitleNamespaceId("Article", "enwiki"), 0);
    assert.equal(getTitleNamespaceId(": Image:Example.svg", "enwiki"), 6);

    assert.equal(hasNamespacePrefix("T:Cite web", "zhwiki", 10), true);
    assert.equal(hasNamespacePrefix("T:Cite web", "enwiki", 10), false);
    assert.equal(hasNamespacePrefix("Article", "enwiki", 0), false);
    assert.equal(hasNamespacePrefix(":分類:游戏", "zhwiki", 14), true);
});

test("matching aliases are stripped without crossing namespaces", () => {
    assert.equal(
        stripNamespacePrefix(" 分類 : 电子游戏 ", "zhwiki", 14),
        "电子游戏",
    );
    assert.equal(stripNamespacePrefix("T:Cite web", "zhwiki", 10), "Cite web");
    assert.equal(
        stripNamespacePrefix("T:Cite web", "enwiki", 10),
        "T:Cite web",
    );
    assert.equal(
        stripNamespacePrefix("User:Example", "zhwiki", 10),
        "User:Example",
    );
    assert.equal(
        stripNamespacePrefix(": 分類:电子游戏", "zhwiki", 14),
        "电子游戏",
    );
    assert.equal(stripNamespacePrefix(" Example ", "enwiki", 0), "Example");
});

test("namespace title formatting uses the site's current name", () => {
    assert.equal(
        formatNamespaceTitle("分類:电子游戏", "zhwiki", 14),
        "Category:电子游戏",
    );
    assert.equal(
        formatNamespaceTitle("Project:Sandbox", "enwiki", 4),
        "Wikipedia:Sandbox",
    );
    assert.equal(formatNamespaceTitle(" Article ", "enwiki", 0), "Article");
    assert.throws(
        () => formatNamespaceTitle("Example", "enwiki", 102),
        /Unknown enwiki namespace ID: 102/u,
    );
});
