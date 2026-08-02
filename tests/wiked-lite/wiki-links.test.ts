import assert from "node:assert/strict";
import test from "node:test";
import {
    applyWikiLinkRedirects,
    collectWikiLinkTitles,
    lookupWikiLinks,
} from "../../src/wiked-lite/infra/wiki-links.ts";

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

test("redirect rewriting keeps fragments and labels", () => {
    const redirects = new Map([["foo", "Target"]]);

    assert.equal(
        applyWikiLinkRedirects("[[Foo#Part|label]]", redirects),
        "[[Target#Part|label]]",
    );
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
