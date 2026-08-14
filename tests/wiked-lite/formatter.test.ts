import assert from "node:assert/strict";
import test from "node:test";
import { formatWikitext } from "wiked-lite/domain/formatter.ts";

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
            "",
            "== Heading ==",
            "",
            "<!-- ==  keep  ==   -->",
            "<nowiki>==  keep  ==   </nowiki>",
            "* item",
        ].join("\n"),
    );
});

test("basic formatting separates headings but not DEFAULTSORT", () => {
    const source = [
        "==Heading==",
        "Paragraph.",
        "{{DEFAULTSORT:Example}}",
        "[[Category:Example]]",
    ].join("\n");

    assert.equal(
        formatWikitext(source).text,
        [
            "",
            "== Heading ==",
            "",
            "Paragraph.",
            "{{DEFAULTSORT:Example}}",
            "[[Category:Example]]",
        ].join("\n"),
    );
});

test("basic formatting preserves whitespace-only category sort keys", () => {
    const source = "[[Category:电子游戏专题| ]]";

    assert.deepEqual(formatWikitext(source), {
        changed: false,
        text: source,
    });
});

test("basic formatting separates every MediaWiki heading level", () => {
    for (let level = 1; level <= 6; level += 1) {
        const marks = "=".repeat(level);
        const source = `${marks}Heading${marks}\nParagraph.`;
        const expected = `\n${marks} Heading ${marks}\n\nParagraph.`;

        assert.equal(formatWikitext(source).text, expected);
        assert.deepEqual(formatWikitext(expected), {
            changed: false,
            text: expected,
        });
    }
});

test("basic formatting separates headings from preceding content", () => {
    const source = "Lead paragraph.\n==Heading==\nParagraph.";
    const expected = "Lead paragraph.\n\n== Heading ==\n\nParagraph.";

    assert.equal(formatWikitext(source).text, expected);
    assert.deepEqual(formatWikitext(expected), {
        changed: false,
        text: expected,
    });
});

test("adjacent headings share one separating blank line", () => {
    const source = "==First==\n===Second===";
    const expected = "\n== First ==\n\n=== Second ===\n\n";

    assert.equal(formatWikitext(source).text, expected);
    assert.deepEqual(formatWikitext(expected), {
        changed: false,
        text: expected,
    });
});

test("heading normalization does not cross line boundaries", () => {
    const source = "==\nHeading\n==\nParagraph.";

    assert.deepEqual(formatWikitext(source), {
        changed: false,
        text: source,
    });
});

test("heading normalization does not reinterpret delimiter runs", () => {
    for (let level = 1; level <= 6; level += 1) {
        const source = "=".repeat(level * 2);
        assert.deepEqual(formatWikitext(source), {
            changed: false,
            text: source,
        });
    }

    const levelSeven = "=======Heading=======";
    assert.deepEqual(formatWikitext(levelSeven), {
        changed: false,
        text: levelSeven,
    });
});

test("heading separation stays idempotent at end of input", () => {
    const expected = "\n== Heading ==\n\n";
    for (const source of ["==Heading==", "==Heading==\n", expected]) {
        const once = formatWikitext(source).text;

        assert.equal(once, expected);
        assert.equal(formatWikitext(once).text, expected);
    }
});

test("explicit formatter options align templates", () => {
    const source = [
        "{{Cite web",
        "|url=https://example.test",
        "|long-name = Value",
        "}}",
    ].join("\n");

    const result = formatWikitext(source, {
        firstParameterLayout: "align-separator",
        indentPipes: true,
    });

    assert.match(result.text, / {2}\| url\s+= https:\/\/example\.test/u);
});

test("Chinese conversion normalization is opt in", () => {
    const source = "-{zh-hans:简体 ; zh-hant:繁體;}-";

    assert.equal(formatWikitext(source).text, source);
    assert.equal(
        formatWikitext(source, { normalizeConversion: true }).text,
        "-{zh-hans:简体; zh-hant:繁體}-",
    );
});

test("complete reference tags remain positional in efn notes", () => {
    const source =
        '{{efn|見以下文獻：<ref name="Gould, 2026" />' +
        '<ref name="Hon, 2026" /><ref name="Meghan G, 2026" />' +
        '<ref name="Seigh, 2026" />}}';

    assert.deepEqual(formatWikitext(source), {
        changed: false,
        text: source,
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

test("numbers efn notes containing unclosed reference tags", () => {
    const source = '{{efn|Text<ref name="source">}}';
    const expected = source.replace("{{efn|", "{{efn|1=");

    assert.equal(formatWikitext(source).text, expected);
    assert.deepEqual(formatWikitext(expected), {
        changed: false,
        text: expected,
    });
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
        firstParameterLayout: "align-separator",
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
            firstParameterLayout: "align-separator",
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
            firstParameterLayout: "align-separator",
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
        formatWikitext(alignedOnlySource, {
            firstParameterLayout: "align-separator",
        }).text.split("\n")[3],
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

test("matrix alignment is independent for each nested template call", () => {
    const source = [
        "{{xx",
        "| p1 = a | p2 = {{embedded x",
        "| pp1 = ... | pp2=..",
        "| pp21_loooong = ... | pp22 = ..",
        "| longxx+",
        "}}",
        "| longer = value | q = {{embedded x",
        "| pp1 = ... | pp2=..",
        "| longxx+",
        "}}",
        "}}",
    ].join("\n");
    const expected = [
        "{{xx",
        "  | p1     = a     | p2 = {{embedded x",
        "    | pp1          = ... | pp2  = ..",
        "    | pp21_loooong = ... | pp22 = ..",
        "    | longxx+",
        "  }}",
        "  | longer = value | q  = {{embedded x",
        "    | pp1 = ... | pp2 = ..",
        "    | longxx+",
        "  }}",
        "}}",
    ].join("\n");
    const options = {
        firstParameterLayout: "align-separator" as const,
        fullWidthRatio: 5 / 3,
        indentPipes: true,
        subsequentParameterLayout: "align-columns-completely" as const,
    };

    assert.equal(formatWikitext(source, options).text, expected);
    assert.deepEqual(formatWikitext(expected, options), {
        changed: false,
        text: expected,
    });
});

test("parameter-column modes have distinct alignment", () => {
    const source = [
        "{{matrix",
        "| a=one | bb=two | positional",
        "| longer=three | cccc=four | last=five",
        "}}",
    ].join("\n");

    assert.equal(
        formatWikitext(source, {
            firstParameterLayout: "compact",
            indentPipes: true,
            subsequentParameterLayout: "align-columns",
        }).text,
        [
            "{{matrix",
            "  | a = one        | bb = two    | positional",
            "  | longer = three | cccc = four | last = five",
            "}}",
        ].join("\n"),
    );
    assert.equal(
        formatWikitext(source, {
            firstParameterLayout: "compact",
            indentPipes: true,
            subsequentParameterLayout: "align-columns-completely",
        }).text,
        [
            "{{matrix",
            "  | a = one        | bb   = two  | positional",
            "  | longer = three | cccc = four | last = five",
            "}}",
        ].join("\n"),
    );
});

test("compact later parameters remove review-table matrix padding", () => {
    const source = [
        "{{VG Reviews",
        "| na = true | X360       = yes        | PS3 = yes",
        "| rev1 = Example | rev1_X360  = 29/30",
        "| rev10 = Example | rev10_X360 = B",
        "}}",
    ].join("\n");
    const options = {
        firstParameterLayout: "align-separator" as const,
        indentPipes: true,
        subsequentParameterLayout: "compact" as const,
    };
    const expected = [
        "{{VG Reviews",
        "  | na    = true | X360 = yes | PS3 = yes",
        "  | rev1  = Example | rev1_X360 = 29/30",
        "  | rev10 = Example | rev10_X360 = B",
        "}}",
    ].join("\n");

    assert.equal(formatWikitext(source, options).text, expected);
    assert.deepEqual(formatWikitext(expected, options), {
        changed: false,
        text: expected,
    });
});

test("preserved layouts keep entered spacing while indenting", () => {
    const source = [
        "{{matrix",
        "     |   first=one     | second   =two",
        "}}",
    ].join("\n");

    assert.equal(
        formatWikitext(source, {
            firstParameterLayout: "preserve",
            indentPipes: true,
            subsequentParameterLayout: "preserve",
        }).text,
        ["{{matrix", "  |   first=one     | second   =two", "}}"].join("\n"),
    );
});

test("first-parameter alignment preserves later parameters", () => {
    const source = [
        "{{matrix",
        "| short=a | second=entered",
        "| much_longer = value | very_long_second=unchanged",
        "}}",
    ].join("\n");

    assert.equal(
        formatWikitext(source, {
            firstParameterLayout: "align-separator",
            indentPipes: true,
            subsequentParameterLayout: "preserve",
        }).text,
        [
            "{{matrix",
            "  | short       = a | second=entered",
            "  | much_longer = value | very_long_second=unchanged",
            "}}",
        ].join("\n"),
    );
});

test("matrix alignment keeps positional cells free of equals signs", () => {
    const source = [
        "{{matrix",
        "| a=x | second=y",
        "| positional | longer_second=z",
        "}}",
    ].join("\n");

    assert.equal(
        formatWikitext(source, {
            firstParameterLayout: "align-separator",
            indentPipes: true,
            subsequentParameterLayout: "align-columns-completely",
        }).text,
        [
            "{{matrix",
            "  | a = x      | second        = y",
            "  | positional | longer_second = z",
            "}}",
        ].join("\n"),
    );
});

test("matrix alignment ignores separators in nested wikitext", () => {
    const source = [
        "{{matrix",
        "| a = [[A|label]] | b = {{inner|x=y}}",
        "| longer = {{{value|x=y}}} | c = <nowiki>a|b=c</nowiki>",
        "}}",
    ].join("\n");
    const result = formatWikitext(source, {
        firstParameterLayout: "align-separator",
        indentPipes: true,
        subsequentParameterLayout: "align-columns-completely",
    }).text;

    assert.match(result, /\[\[A\|label\]\]/u);
    assert.match(result, /\{\{inner\|x=y\}\}/u);
    assert.match(result, /\{\{\{value\|x=y\}\}\}/u);
    assert.match(result, /<nowiki>a\|b=c<\/nowiki>/u);
    assert.deepEqual(
        formatWikitext(result, {
            firstParameterLayout: "align-separator",
            indentPipes: true,
            subsequentParameterLayout: "align-columns-completely",
        }),
        { changed: false, text: result },
    );
});
