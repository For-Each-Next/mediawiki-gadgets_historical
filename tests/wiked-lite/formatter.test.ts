import assert from "node:assert/strict";
import test from "node:test";
import { formatWikitext } from "../../src/wiked-lite/domain/formatter.ts";

test("basic formatting protects comments and literal extension tags", () => {
    const source = [
        "==Heading==   ",
        "<!-- ==  keep  ==   -->",
        "<nowiki>==  keep  ==   </nowiki>",
        "*   item   ",
    ].join("\n");

    const result = formatWikitext(source);

    assert.equal(
        result.text,
        [
            "== Heading ==",
            "<!-- ==  keep  ==   -->",
            "<nowiki>==  keep  ==   </nowiki>",
            "* item",
        ].join("\n"),
    );
});

test("explicit formatter options align templates and sort categories", () => {
    const source = [
        "{{Cite web",
        "|url=https://example.test",
        "|long-name = Value",
        "}}",
        "[[Category:Zulu]]",
        "[[Category:alpha]]",
    ].join("\n");

    const result = formatWikitext(source, {
        alignEquals: true,
        indentPipes: true,
        sortCategories: true,
    });

    assert.match(result.text, /  \| url\s+= https:\/\/example\.test/u);
    assert.ok(
        result.text.indexOf("[[Category:alpha]]") <
            result.text.indexOf("[[Category:Zulu]]"),
    );
});

test("Chinese conversion normalization is opt in", () => {
    const source = "-{zh-hans:简体 ; zh-hant:繁體;}-";

    assert.equal(formatWikitext(source).text, source);
    assert.equal(
        formatWikitext(source, { normalizeConversion: true }).text,
        "-{zh-hans:简体; zh-hant:繁體}-",
    );
});
