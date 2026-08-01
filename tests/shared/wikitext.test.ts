/** Tests lazy construct-focused shared wikitext operations. */

import assert from "node:assert/strict";
import test from "node:test";

import { wikitext } from "@mediawiki-gadgets/shared/wikitext";

test("template queries find nested calls outside opaque ranges", () => {
    const source = [
        "<!-- {{ignored|comment=yes}} -->",
        "<nowiki>{{hidden|literal=yes}}</nowiki>",
        "{{outer|value={{inner|url=https://example.test?a=b}}}}",
    ].join("\n");
    const templates = wikitext(source).template.getAll();

    assert.deepEqual(
        templates.map((template) => template.name),
        ["outer", "inner"],
    );
    assert.equal(templates[1].params[0].value, "https://example.test?a=b");
    assert.equal(templates[1].depth, 1);

    const variable = "{{outer|{{{value|{{fallback}}}}}|tail}}";
    assert.deepEqual(
        wikitext(variable)
            .template.getAll()
            .map((template) => template.raw),
        [variable],
    );
});

test("template getFirst filters normalized entered names", () => {
    const source = [
        "{{Other}}",
        "{{ Template : Cite__web |title=First}}",
        "{{cite web|title=Second}}",
    ].join("");
    const templates = wikitext(source).template;

    assert.equal(templates.getAll(" CITE web ").length, 2);
    assert.equal(
        templates.getFirst("Template:Cite_web")?.params[0].value,
        "First",
    );
    assert.equal(templates.getFirst("missing"), undefined);
    assert.deepEqual(templates.getAll("   "), []);
});

test("template parsing keeps raw values and absolute offsets", () => {
    const raw = "{{cite web|Page [[A|B]]|title={{lang|en|A=B}}|empty=}}";
    const parsed = wikitext.template.parse(raw, 12);
    const [positional, title, empty] = parsed.params;

    assert.equal(parsed.start, 12);
    assert.equal(parsed.end, 12 + raw.length);
    assert.equal(positional.name, "1");
    assert.equal(positional.positional, true);
    assert.equal(positional.rawValue, "Page [[A|B]]");
    assert.equal(title.name, "title");
    assert.equal(title.value, "{{lang|en|A=B}}");
    assert.equal(
        raw.slice(title.valueStart - 12, title.valueEnd - 12),
        title.rawValue,
    );
    assert.equal(empty.value, "");
});

test("template build supports inline and two block styles", () => {
    const parameters = [
        { value: "Lead" },
        { name: "title", value: "Example" },
        { name: "url", value: "https://example.test" },
    ];

    assert.equal(
        wikitext.template.build(" cite web ", parameters),
        "{{cite web|Lead|title=Example|url=https://example.test}}",
    );
    assert.equal(
        wikitext.template.build(
            "cite web",
            { title: "Example" },
            {
                style: "block",
            },
        ),
        "{{cite web\n| title = Example\n}}",
    );
    assert.equal(
        wikitext.template.build(
            "cite web",
            { title: "Example" },
            {
                style: "block-indent",
            },
        ),
        "{{cite web\n  | title = Example\n}}",
    );
});

test("reference queries preserve exact content and groups", () => {
    const source = [
        "<!-- <ref name=fake>Ignored</ref> -->",
        "<ref name='source' group=notes>",
        "{{cite web|title=<nowiki></ref></nowiki>Page}}",
        "</ref>",
        "<ref name=source group=notes/>",
    ].join("\n");
    const references = wikitext(source).reference;
    const tags = references.getAll();

    assert.equal(tags.length, 2);
    assert.equal(tags[0].attributes.name, "source");
    assert.equal(tags[0].attributes.group, "notes");
    assert.match(tags[0].content, /<nowiki><\/ref><\/nowiki>Page/u);
    assert.equal(tags[1].selfClosing, true);
    assert.deepEqual(references.getFirst("source", "notes"), tags[0]);
    assert.equal(references.getFirst("source"), undefined);
});

test("opaque, tag, and comment queries remain independent", () => {
    const source = [
        '<syntaxhighlight lang="ts" data-label="a>b">',
        '<ref name="fake">{{hidden}}</ref>',
        "</syntaxhighlight>",
        "<!-- <b>ignored</b> -->",
        '<ref name="real">Text {{visible}}</ref>',
        "<br>",
    ].join("");
    const code = wikitext(source);
    const tags = code.tag.getAll();

    assert.deepEqual(
        tags.map((tag) => tag.name),
        ["syntaxhighlight", "ref", "br"],
    );
    assert.equal(tags[0].attributes["data-label"], "a>b");
    assert.equal(code.tag.getFirst("REF")?.attributes.name, "real");
    assert.equal(code.comment.getFirst()?.content, " <b>ignored</b> ");
    assert.equal(code.opaque.getAll().length, 2);
});

test("unclosed constructs stay opaque through input end", () => {
    assert.deepEqual(wikitext("Before <!-- open").opaque.getAll(), [
        { end: 16, start: 7 },
    ]);
    assert.deepEqual(wikitext("<nowiki>open").opaque.getAll(), [
        { end: 12, start: 0 },
    ]);
    assert.deepEqual(wikitext("<nowiki />{{visible}}").opaque.getAll(), [
        { end: 10, start: 0 },
    ]);
});

test("table queries parse only table-local structure", () => {
    const source = [
        '{| class="wikitable"',
        "|+ Caption {{lang|en|Example}}",
        "|-",
        "! Game !! Year",
        "|-",
        '| style="font-weight:bold" | {{cite web|title=A}} || 2024',
        "|}",
    ].join("\n");
    const table = wikitext(source).table.getFirst();

    assert.equal(table?.attributes.class, "wikitable");
    assert.equal(table?.captions.length, 1);
    assert.equal(table?.rows.length, 2);
    assert.deepEqual(
        table?.rows.map((row) => row.cells.map((cell) => cell.header)),
        [
            [true, true],
            [false, false],
        ],
    );
    assert.equal(
        table?.rows[1].cells[0]?.attributes.style,
        "font-weight:bold",
    );
});
