/** Tests citation-management transformations. */

import assert from "node:assert/strict";
import test from "node:test";

import {
    applyNameOverrides,
    compactReferenceCalls,
    expandCompactReferenceCalls,
    findNameOverrideFields,
    hasCompactReferenceCalls,
} from "citation-formatter/domain/manager.ts";
import { manageCitations } from "citation-formatter/app/format.ts";

test("finds and applies non-Latin reference-name overrides", () => {
    const source = [
        "{{Cite web",
        "  | author = 早坂将昭",
        "  | title = {{lang|ja|インタビュー}}",
        "  | publisher = スクウェア・エニックス<!-- # Square Enix -->",
        "  | website = [[未来出版社|Future]]",
        "}}",
    ].join("\n");
    const fields = findNameOverrideFields(source);

    assert.deepEqual(
        fields.map((field) => [field.displayValue, field.override]),
        [
            ["早坂将昭", ""],
            ["スクウェア・エニックス", "Square Enix"],
        ],
    );
    const result = applyNameOverrides(source, [
        { ids: fields[0].ids, override: "Hayasaka, Masaaki" },
        { ids: fields[1].ids, override: "" },
    ]);
    assert.match(
        result,
        /\| author = 早坂将昭 <!-- # Hayasaka, Masaaki -->/u,
    );
    assert.match(result, /\| publisher = スクウェア・エニックス\n/u);
    assert.match(result, /\| title = \{\{lang\|ja\|インタビュー\}\}/u);
});

test("round trips native reuse tags through temporary R calls", () => {
    const source = [
        'Text.<ref name="First, 2020" /><ref name="Second, 2021" />',
        'More.<ref name="First, 2020" />',
        "<references responsive>",
        '<ref name="First, 2020">First</ref>',
        '<ref name="Second, 2021">Second</ref>',
        "</references>",
    ].join("\n");
    const compact = compactReferenceCalls(source);

    assert.match(compact, /Text\.\{\{r\|First, 2020\|Second, 2021\}\}/u);
    assert.match(compact, /More\.\{\{r\|First, 2020\}\}/u);
    assert.equal(hasCompactReferenceCalls(compact), true);
    assert.equal(expandCompactReferenceCalls(compact), source);
});

test("leaves grouped and attributed reuse tags native", () => {
    const source = [
        '<ref name="note" group="note" />',
        '<ref name="plain" dir="ltr" />',
    ].join("\n");
    assert.equal(compactReferenceCalls(source), source);
});

test("leaves management examples in protected wikitext unchanged", () => {
    const source = [
        '<!-- <ref name="comment" /> {{Cite web|author=作者}} -->',
        '<nowiki><ref name="code" /> {{r|old}} {{Cite web|author=作者}}</nowiki>',
    ].join("\n");
    assert.deepEqual(findNameOverrideFields(source), []);
    assert.equal(compactReferenceCalls(source), source);
    assert.equal(expandCompactReferenceCalls(source), source);
});

test("regenerates reference names after override edits", () => {
    const source = [
        'Text.<ref name="早坂将昭, 2025" />',
        "<references responsive>",
        '<ref name="早坂将昭, 2025">{{Cite web',
        "|author=早坂将昭|date=2025|title=Interview}}</ref>",
        "</references>",
    ].join("\n");
    const field = findNameOverrideFields(source)[0];
    const result = manageCitations(
        source,
        [{ ids: field.ids, override: "Hayasaka" }],
        false,
    );
    assert.match(result, /<ref name="Hayasaka, 2025" \/>/u);
    assert.match(result, /author = 早坂将昭 <!-- # Hayasaka -->/u);
});

test("groups repeated names for bulk override editing", () => {
    const source = [
        "{{Cite web|author=早坂将昭|title=First}}",
        "{{Cite interview|author=早坂将昭|title=Second}}",
    ].join("\n");
    const fields = findNameOverrideFields(source);
    assert.equal(fields.length, 1);
    assert.equal(fields[0].ids.length, 2);

    const result = applyNameOverrides(source, [
        { ids: fields[0].ids, override: "Hayasaka" },
    ]);
    assert.equal(result.match(/<!-- # Hayasaka -->/gu)?.length, 2);
});

test("summarizes grouped name usage by parameter and template", () => {
    const source = [
        "{{Cite web|author1=游民星空|title=First}}",
        "{{Cite web|author2=游民星空|title=Second}}",
        "{{Cite book|author3=游民星空|title=Third}}",
        "{{Cite web|publisher=游民星空|title=Fourth}}",
    ].join("\n");
    const [field] = findNameOverrideFields(source);

    assert.equal(
        field.usage,
        "Used 4 times across |author#= (3) and |publisher= (1).",
    );
    assert.equal(field.occurrences.length, 4);
    assert.deepEqual(field.usageItems, [
        { count: 3, label: "author#" },
        { count: 1, label: "publisher" },
    ]);
});

test("describes a single name usage naturally", () => {
    const [field] = findNameOverrideFields(
        "{{Cite web|website=游民星空|title=Example}}",
    );
    assert.equal(
        field.usage,
        "Used once as |website= in a web citation.",
    );
});
