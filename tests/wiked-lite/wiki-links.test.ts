import assert from "node:assert/strict";
import test from "node:test";
import {
    applyWikiLinkRedirects,
    collectWikiLinkTitles,
} from "../../src/wiked-lite/infra/wiki-links.ts";

test("wikilink lookup input is deduplicated", () => {
    assert.deepEqual(
        collectWikiLinkTitles("[[Foo]] [[Foo|label]] [[Bar#Part]]"),
        ["Foo", "Bar"],
    );
});

test("redirect rewriting keeps fragments and labels", () => {
    const redirects = new Map([["foo", "Target"]]);

    assert.equal(
        applyWikiLinkRedirects("[[Foo#Part|label]]", redirects),
        "[[Target#Part|label]]",
    );
});
