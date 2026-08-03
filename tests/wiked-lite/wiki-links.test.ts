import assert from "node:assert/strict";
import test from "node:test";
import { decodeNamespaceCatalog } from "@mediawiki-gadgets/shared/wikitext";
import {
    applyWikiLinkRedirects,
    collectWikiLinkTitles,
    lookupWikiLinks,
} from "../../src/wiked-lite/infra/wiki-links.ts";

const EXAMPLE_NAMESPACE_CATALOG = decodeNamespaceCatalog("examplewiki", {
    query: {
        namespacealiases: [{ alias: "Image", id: 6 }],
        namespaces: {
            0: { id: 0, name: "" },
            6: { canonical: "File", id: 6, name: "Datei" },
            10: { canonical: "Template", id: 10, name: "Vorlage" },
            14: { canonical: "Category", id: 14, name: "Kategorie" },
        },
    },
});

test("wikilink lookup input is deduplicated", () => {
    assert.deepEqual(
        collectWikiLinkTitles("[[Foo]] [[Foo|label]] [[Bar#Part]]"),
        ["Foo", "Bar"],
    );
});

test("leading-colon links are still checked for missing targets", () => {
    assert.deepEqual(
        collectWikiLinkTitles(
            "[[:Missing#Section|label]] [[:Category:Absent]]",
        ),
        ["Missing", "Category:Absent"],
    );
});

test("wikilink lookup ignores comments and literal tag contents", () => {
    assert.deepEqual(
        collectWikiLinkTitles(
            "<!-- [[Comment]] --><nowiki>[[Literal]]</nowiki> [[Visible]]",
        ),
        ["Visible"],
    );
});

test("wikilink lookup includes links nested in file captions", () => {
    assert.deepEqual(
        collectWikiLinkTitles("[[File:Old.svg|caption [[Foo]]]]"),
        ["File:Old.svg", "Foo"],
    );
});

test("redirect rewriting preserves unpiped display text", () => {
    const redirects = new Map([
        ["Foo", "Target"],
        ["Foo bar", "Other target"],
    ]);

    assert.equal(
        applyWikiLinkRedirects("[[Foo]] [[Foo#Part]] [[Foo_bar]]", redirects),
        "[[Target|Foo]] [[Target#Part|Foo#Part]] " +
            "[[Other target|Foo bar]]",
    );
});

test("redirect rewriting keeps fragments and explicit labels", () => {
    const redirects = new Map([["Foo", "Target"]]);

    assert.equal(
        applyWikiLinkRedirects(
            "[[Foo|label]] [[Foo#Part|label with <nowiki>|</nowiki> pipe]]",
            redirects,
        ),
        "[[Target|label]] " +
            "[[Target#Part|label with <nowiki>|</nowiki> pipe]]",
    );
});

test("entered fragments override redirect target fragments", () => {
    const redirects = new Map([["Foo", "Target#Default"]]);

    assert.equal(
        applyWikiLinkRedirects(
            "[[Foo]] [[Foo#Entered]] [[Foo|label]]",
            redirects,
        ),
        "[[Target#Default|Foo]] [[Target#Entered|Foo#Entered]] " +
            "[[Target#Default|label]]",
    );
});

test("redirect rewriting preserves leading-colon link escapes", () => {
    const redirects = new Map([
        ["Foo", "Target"],
        ["Category:Old", "Category:New"],
    ]);
    assert.equal(
        applyWikiLinkRedirects(
            "[[:Foo]] [[:Category:Old]]",
            redirects,
            "enwiki",
        ),
        "[[:Target|Foo]] [[:Category:New|Category:Old]]",
    );
});

test("redirect rewriting does not add labels to embedded links", () => {
    const redirects = new Map([
        ["Kategorie:Old", "Kategorie:New"],
        ["Datei:Old.svg", "Datei:New.svg"],
    ]);
    assert.equal(
        applyWikiLinkRedirects(
            "[[Kategorie:Old]] [[Datei:Old.svg]]",
            redirects,
            EXAMPLE_NAMESPACE_CATALOG,
        ),
        "[[Kategorie:New]] [[Datei:New.svg]]",
    );
});

test("redirect rewriting keeps cross-namespace embeds unchanged", () => {
    const redirects = new Map([
        ["Category:Old", "Article"],
        ["File:Old.svg", "Category:New"],
    ]);

    assert.equal(
        applyWikiLinkRedirects(
            "[[Category:Old]] [[File:Old.svg|thumb|caption]]",
            redirects,
            "enwiki",
        ),
        "[[Category:Old]] [[File:Old.svg|thumb|caption]]",
    );
});

test("redirect targets in embedded namespaces stay ordinary links", () => {
    const redirects = new Map([
        ["Foo", "Category:New"],
        ["Bar", "File:New.svg"],
    ]);

    assert.equal(
        applyWikiLinkRedirects("[[Foo]] [[Bar|label]]", redirects, "enwiki"),
        "[[:Category:New|Foo]] [[:File:New.svg|label]]",
    );
});

test("redirect rewriting handles links nested in file captions", () => {
    const redirects = new Map([
        ["File:Old.svg", "File:New.svg"],
        ["Foo", "Target"],
    ]);

    assert.equal(
        applyWikiLinkRedirects(
            "[[File:Old.svg|caption [[Foo]]]]",
            redirects,
            "enwiki",
        ),
        "[[File:New.svg|caption [[Target|Foo]]]]",
    );
});

test("redirect rewriting ignores comments and literal tag contents", () => {
    const redirects = new Map([["Foo", "Target"]]);
    const source =
        "<!-- [[Foo]] --><nowiki>[[Foo]]</nowiki>" +
        "<pre>[[Foo]]</pre> [[Foo]]";

    assert.equal(
        applyWikiLinkRedirects(source, redirects),
        "<!-- [[Foo]] --><nowiki>[[Foo]]</nowiki>" +
            "<pre>[[Foo]]</pre> [[Target|Foo]]",
    );
});

test("redirect lookup retains target fragments", async () => {
    const api = {
        async get() {
            return {
                query: {
                    pages: [{ title: "Target" }],
                    redirects: [
                        {
                            from: "Foo",
                            to: "Target",
                            tofragment: "Default",
                        },
                    ],
                },
            };
        },
    };

    const lookup = await lookupWikiLinks(api, ["Foo"]);

    assert.deepEqual([...lookup.redirects], [["Foo", "Target#Default"]]);
    assert.deepEqual([...lookup.missing], []);
});

test("API title mappings do not conflate case-distinct pages", async () => {
    const api = {
        async get() {
            return {
                query: {
                    normalized: [{ from: "foo", to: "Foo" }],
                    pages: [{ title: "Target" }, { title: "FOO" }],
                    redirects: [{ from: "Foo", to: "Target" }],
                },
            };
        },
    };

    const lookup = await lookupWikiLinks(api, ["foo", "FOO"]);

    assert.deepEqual([...lookup.redirects], [["foo", "Target"]]);
    assert.deepEqual([...lookup.missing], []);
    assert.equal(
        applyWikiLinkRedirects("[[foo]] [[FOO]]", lookup.redirects),
        "[[Target|foo]] [[FOO]]",
    );
});

test("missing title lookup preserves case-distinct page keys", async () => {
    const api = {
        async get() {
            return {
                query: {
                    pages: [{ missing: true, title: "Foo" }, { title: "FOO" }],
                },
            };
        },
    };

    const lookup = await lookupWikiLinks(api, ["Foo", "FOO"]);

    assert.deepEqual([...lookup.missing], ["Foo"]);
});

test("Chinese conversion recognizes an existing local page", async () => {
    let request: Record<string, unknown> | undefined;
    const api = {
        async get(parameters: Record<string, unknown>) {
            request = parameters;
            return {
                query: {
                    converted: [{ from: "软件包维护者", to: "軟體包維護者" }],
                    pages: [{ title: "軟體包維護者" }],
                },
            };
        },
    };

    const lookup = await lookupWikiLinks(api, ["软件包维护者"]);

    assert.equal(request?.converttitles, 1);
    assert.equal(request?.inprop, "linkclasses");
    assert.equal(request?.iwurl, 1);
    assert.equal(request?.prop, "info");
    assert.deepEqual([...lookup.missing], []);
    assert.deepEqual([...lookup.redirects], []);
});

test("missing converted titles map back to the entered link", async () => {
    const api = {
        async get() {
            return {
                query: {
                    converted: [{ from: "不存在页面", to: "不存在頁面" }],
                    pages: [
                        {
                            linkclasses: ["new"],
                            missing: true,
                            title: "不存在頁面",
                        },
                    ],
                },
            };
        },
    };

    const lookup = await lookupWikiLinks(api, ["不存在页面"]);

    assert.deepEqual([...lookup.missing], ["不存在页面"]);
    assert.deepEqual(lookup.missingLinkClasses, ["new"]);
});
