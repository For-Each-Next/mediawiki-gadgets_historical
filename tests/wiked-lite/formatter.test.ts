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

test("numbers efn notes containing named reference tags", () => {
    const source =
        '{{efn|見以下文獻：<ref name="Gould, 2026" />' +
        '<ref name="Hon, 2026" /><ref name="Meghan G, 2026" />' +
        '<ref name="Seigh, 2026" />}}';
    const expected = source.replace("{{efn|", "{{efn|1=");

    assert.equal(formatWikitext(source).text, expected);
    assert.deepEqual(formatWikitext(expected), {
        changed: false,
        text: expected,
    });
    assert.equal(
        formatWikitext('{{other|Text<ref name="source" />}}').text,
        '{{other|Text<ref name="source" />}}',
    );
    assert.equal(
        formatWikitext('{{efn|name=context|1=Text<ref name="source" />}}')
            .text,
        '{{efn|name=context|1=Text<ref name="source" />}}',
    );
});

test("nested template pipes and closers follow structural depth", () => {
    const source = [
        "{{Infobox country",
        "  | other_symbol = {{columns",
        "  | col1 = [[File:Gyomei_kokuji.svg|75px]] <br /> " +
            "[[大日本國璽]]",
        "  | col2 = [[File:Emblem of the Government of Japan " +
            "(yellow).svg|75px]] <br />[[桐紋|五七桐花紋]]",
        "}}",
        "  | image_map = Japan.svg",
        "}}",
    ].join("\n");

    const result = formatWikitext(source, { indentPipes: true });

    assert.equal(
        result.text,
        [
            "{{Infobox country",
            "  | other_symbol = {{columns",
            "    | col1 = [[File:Gyomei_kokuji.svg|75px]] <br /> " +
                "[[大日本國璽]]",
            "    | col2 = [[File:Emblem of the Government of Japan " +
                "(yellow).svg|75px]] <br />[[桐紋|五七桐花紋]]",
            "  }}",
            "  | image_map = Japan.svg",
            "}}",
        ].join("\n"),
    );
});

test("deeper block templates indent pipes and closers by depth", () => {
    const source = [
        "{{outer",
        "| middle = {{middle",
        "| inner = {{inner",
        "| leaf = value",
        "   }}",
        "| middle_after = value",
        "\t}}",
        "| outer_after = value",
        "}}",
    ].join("\n");

    assert.equal(
        formatWikitext(source, { indentPipes: true }).text,
        [
            "{{outer",
            "  | middle = {{middle",
            "    | inner = {{inner",
            "      | leaf = value",
            "    }}",
            "    | middle_after = value",
            "  }}",
            "  | outer_after = value",
            "}}",
        ].join("\n"),
    );
});

test("equals alignment is independent for each nested template", () => {
    const source = [
        "{{outer",
        "| a = one",
        "| nested = {{inner",
        "| x = two",
        "| longer = three",
        "}}",
        "| outer_longest_name = four",
        "}}",
    ].join("\n");
    const lines = formatWikitext(source, {
        alignEquals: true,
        indentPipes: true,
    }).text.split("\n");

    assert.equal(lines[1].indexOf("="), lines[2].indexOf("="));
    assert.equal(lines[1].indexOf("="), lines[6].indexOf("="));
    assert.equal(lines[3].indexOf("="), lines[4].indexOf("="));
    assert.ok(lines[3].indexOf("=") < lines[1].indexOf("="));
});

test("equals alignment ignores marks and counts non-ASCII width", () => {
    const combiningName = "e\u0301";
    const source = [
        "{{outer",
        `| ${combiningName} = one`,
        "| aa = two",
        "| Ａ = three",
        "}}",
    ].join("\n");

    assert.equal(
        formatWikitext(source, {
            alignEquals: true,
            fullWidthRatio: 5 / 3,
            indentPipes: true,
        }).text,
        [
            "{{outer",
            `  | ${combiningName}  = one`,
            "  | aa = two",
            "  | Ａ  = three",
            "}}",
        ].join("\n"),
    );
});

test("block formatting leaves table pipes unchanged", () => {
    const source = [
        "{{Infobox",
        "| data = table follows",
        '{| class="wikitable"',
        "|-",
        "| name = cell",
        "|}",
        "| after = value",
        "}}",
    ].join("\n");

    assert.equal(
        formatWikitext(source, { indentPipes: true }).text,
        [
            "{{Infobox",
            "  | data = table follows",
            '{| class="wikitable"',
            "|-",
            "| name = cell",
            "|}",
            "  | after = value",
            "}}",
        ].join("\n"),
    );
});

test("block formatting leaves templates inside tables unchanged", () => {
    const source = [
        '{| class="wikitable"',
        "| {{cell template",
        "| short = one",
        "| longer_name = two",
        "}}",
        "|}",
    ].join("\n");

    assert.equal(
        formatWikitext(source, {
            alignEquals: true,
            indentPipes: true,
        }).text,
        source,
    );
});

test("nested template closers inside tables keep entered indentation", () => {
    const source = [
        "{{outer",
        "| data = table",
        '{| class="wikitable"',
        "| {{inner",
        "| value = cell",
        "     }}",
        "|}",
        "| after = value",
        "}}",
    ].join("\n");

    assert.equal(
        formatWikitext(source, { indentPipes: true }).text,
        [
            "{{outer",
            "  | data = table",
            '{| class="wikitable"',
            "| {{inner",
            "| value = cell",
            "     }}",
            "|}",
            "  | after = value",
            "}}",
        ].join("\n"),
    );
});

test("block formatting preserves continuations and aligns closers", () => {
    const source = [
        "{{outer",
        "| nested = {{inner",
        "| text = first line",
        "  second line with [[A|B]]",
        "     }}",
        "| after = value",
        "}}",
    ].join("\n");

    assert.equal(
        formatWikitext(source, { indentPipes: true }).text,
        [
            "{{outer",
            "  | nested = {{inner",
            "    | text = first line",
            "  second line with [[A|B]]",
            "  }}",
            "  | after = value",
            "}}",
        ].join("\n"),
    );
});

test("closer indentation is limited to standalone template lines", () => {
    const annotatedSource = [
        "{{outer",
        "| nested = {{inner",
        "| value = one",
        "   }}<!-- keep entered indentation -->",
        "| after = two",
        "}}",
    ].join("\n");
    const alignedOnlySource = [
        "{{outer",
        "| nested = {{inner",
        "| value = one",
        "\t}}",
        "}}",
    ].join("\n");

    assert.equal(
        formatWikitext(annotatedSource, { indentPipes: true }).text,
        [
            "{{outer",
            "  | nested = {{inner",
            "    | value = one",
            "   }}<!-- keep entered indentation -->",
            "  | after = two",
            "}}",
        ].join("\n"),
    );
    assert.equal(
        formatWikitext(alignedOnlySource, { alignEquals: true }).text.split(
            "\n",
        )[3],
        "\t}}",
    );
});

test("block indentation treats opaque fake syntax as byte-identical", () => {
    const nowiki = ["<nowiki>{{fake", "| fake = nowiki", "}}</nowiki>"].join(
        "\n",
    );
    const syntaxHighlight = [
        '<syntaxhighlight lang="wikitext">',
        "{{fake",
        "| fake = code",
        "}}",
        "</syntaxhighlight>",
    ].join("\n");
    const comment = ["<!-- {{fake", "| fake = comment", "}} -->"].join("\n");
    const source = [
        "{{outer",
        `| literal = ${nowiki}`,
        `| code = ${syntaxHighlight}`,
        `| note = ${comment}`,
        "| after = value",
        "}}",
    ].join("\n");
    const result = formatWikitext(source, { indentPipes: true }).text;

    assert.equal(
        result,
        [
            "{{outer",
            `  | literal = ${nowiki}`,
            `  | code = ${syntaxHighlight}`,
            `  | note = ${comment}`,
            "  | after = value",
            "}}",
        ].join("\n"),
    );
    for (const opaque of [nowiki, syntaxHighlight, comment]) {
        assert.ok(result.includes(opaque));
    }
});

test("templates inside variables do not close the owning template", () => {
    const source = [
        "{{outer",
        "| value = {{{parameter|{{fake|x=y}}}}}",
        "| after = value",
        "}}",
    ].join("\n");

    assert.equal(
        formatWikitext(source, { indentPipes: true }).text,
        [
            "{{outer",
            "  | value = {{{parameter|{{fake|x=y}}}}}",
            "  | after = value",
            "}}",
        ].join("\n"),
    );
});

test("variable defaults stay unchanged inside block templates", () => {
    const source = [
        "{{outer",
        "| value = {{{parameter|",
        "{{fake",
        "| default = entered",
        "     }}",
        "}}}",
        "| after = value",
        "}}",
    ].join("\n");

    assert.equal(
        formatWikitext(source, { indentPipes: true }).text,
        [
            "{{outer",
            "  | value = {{{parameter|",
            "{{fake",
            "| default = entered",
            "     }}",
            "}}}",
            "  | after = value",
            "}}",
        ].join("\n"),
    );
});

test("unfinished block templates retain live nesting depth", () => {
    const source = [
        "{{outer",
        "| first = one",
        "| nested = {{inner",
        "| child = two",
        "}}",
        "| after = three",
    ].join("\n");

    assert.equal(
        formatWikitext(source, { indentPipes: true }).text,
        [
            "{{outer",
            "  | first = one",
            "  | nested = {{inner",
            "    | child = two",
            "  }}",
            "  | after = three",
        ].join("\n"),
    );
});
