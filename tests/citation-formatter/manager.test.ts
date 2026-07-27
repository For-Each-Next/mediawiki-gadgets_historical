/** Tests citation-management transformations. */

import assert from "node:assert/strict";
import test from "node:test";

import {
    applyNameOverrides,
    compactReferenceCalls,
    detectCitationLayout,
    expandCompactReferenceCalls,
    findNameOverrideFields,
} from "citation-formatter/domain/manager.ts";
import {
    manageCitations,
    manageCitationsWithResult,
} from "citation-formatter/app/format.ts";

const testNonLatinNameOverrides = () => {
    const source = [
        "{{Cite web",
        "  | author = 早坂将昭",
        "  | title = {{lang|ja|インタビュー}}",
        "  | publisher = スクウェア・エニックス<!-- # Square Enix -->",
        "  | website = [[未来出版社|Future]]",
        "}}",
    ].join("\n");
    const fields = findNameOverrideFields(source);
    const enteredOverrides = fields.map((field) => [
        field.displayValue,
        field.override,
    ]);

    assert.deepEqual(enteredOverrides, [
        ["早坂将昭", ""],
        ["スクウェア・エニックス", "Square Enix"],
    ]);
    const result = applyNameOverrides(source, [
        { ids: fields[0].ids, override: "Hayasaka, Masaaki" },
        { ids: fields[1].ids, override: "" },
    ]);
    assert.match(result, /\| author = 早坂将昭 <!-- # Hayasaka, Masaaki -->/u);
    assert.match(result, /\| publisher = スクウェア・エニックス\n/u);
    assert.match(result, /\| title = \{\{lang\|ja\|インタビュー\}\}/u);
};
test(
    "finds and applies non-Latin reference-name overrides",
    testNonLatinNameOverrides,
);

const testNoAuthorOverrideEdits = () => {
    const source = [
        "{{Cite web|website=游民星空",
        "<!-- !no-author # Youmin Xingkong -->|title=X}}",
    ].join("");
    const [field] = findNameOverrideFields(source);
    assert.equal(field.override, "Youmin Xingkong");

    const updated = applyNameOverrides(source, [
        { ids: field.ids, override: "Gamersky" },
    ]);
    assert.match(updated, /website=游民星空<!-- !no-author # Gamersky -->/u);

    const removed = applyNameOverrides(source, [
        { ids: field.ids, override: "" },
    ]);
    assert.match(removed, /website=游民星空<!-- !no-author -->/u);
};
test(
    "edits overrides sharing a no-author directive",
    testNoAuthorOverrideEdits,
);

const testNativeReuseRoundTrip = () => {
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
    const expanded = expandCompactReferenceCalls(compact);
    assert.equal(expanded, source);
};
test(
    "round trips native reuse tags through temporary R calls",
    testNativeReuseRoundTrip,
);

const testAttributedReusePreservation = () => {
    const source = [
        '<ref name="note" group="note" />',
        '<ref name="plain" dir="ltr" />',
    ].join("\n");
    const compact = compactReferenceCalls(source);
    assert.equal(compact, source);
};
test(
    "leaves grouped and attributed reuse tags native",
    testAttributedReusePreservation,
);

const testProtectedManagementExamples = () => {
    const source = [
        '<!-- <ref name="comment" /> {{Cite web|author=作者}} -->',
        '<nowiki><ref name="code" /> {{r|old}} ' +
            "{{Cite web|author=作者}}</nowiki>",
    ].join("\n");
    const fields = findNameOverrideFields(source);
    const compact = compactReferenceCalls(source);
    const expanded = expandCompactReferenceCalls(source);
    assert.deepEqual(fields, []);
    assert.equal(compact, source);
    assert.equal(expanded, source);
};
test(
    "leaves management examples in protected wikitext unchanged",
    testProtectedManagementExamples,
);

const testReferenceNameRegeneration = () => {
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
};
test(
    "regenerates reference names after override edits",
    testReferenceNameRegeneration,
);

const testCitationManagementStyles = () => {
    const source = [
        "Text.<ref>{{cite web|author=Ma|date=2020|title=Example}}</ref>",
        "<references />",
    ].join("\n");

    const compactInline = manageCitations(source, [], true, "inline");
    assert.match(compactInline, /Text\.\{\{r\|Ma, 2020\}\}/u);
    const inlineDefinition =
        '<ref name="Ma, 2020">{{Cite web | author = Ma | ' +
        "date = 2020 | title = Example}}</ref>";
    assert.ok(compactInline.includes(inlineDefinition));

    const nativeInline = manageCitations(source, [], false, "inline");
    assert.match(nativeInline, /Text\.<ref name="Ma, 2020" \/>/u);
    assert.doesNotMatch(nativeInline, /\{\{r\|/u);
    assert.doesNotMatch(nativeInline, /\{\{Cite web\n/u);
};
test(
    "applies reference-call and citation-layout styles independently",
    testCitationManagementStyles,
);

test("retains formatting counts while applying manager styles", () => {
    const source = ["Text.<ref>Plain note</ref>", "<references />"].join("\n");
    const result = manageCitationsWithResult(source, [], true, "inline");

    assert.equal(result.referencesNotFormatted, 1);
    assert.match(result.text, /<ref name=":1">Plain note<\/ref>/u);
});

const testDetectCitationLayout = () => {
    const blockCitation = ["{{Cite web", "  | title = Block", "}}"].join("\n");
    const block = `<ref>${blockCitation}</ref>`;
    const inlineCitation = "{{Cite web | title = Inline}}";
    const inline = `<ref>${inlineCitation}</ref>`;
    const alternateBlock = [
        "<ref>{{Cite web | title = Block",
        " | url = https://example.test",
        "}}</ref>",
    ].join("\n");
    const nestedInline = [
        "<ref>{{Cite web | title = {{lang",
        "| en",
        "| Inline}}}}</ref>",
    ].join("\n");

    assert.equal(detectCitationLayout(block), "block");
    assert.equal(detectCitationLayout(alternateBlock), "block");
    assert.equal(detectCitationLayout(inline), "inline");
    assert.equal(detectCitationLayout(nestedInline), "inline");
    assert.equal(detectCitationLayout(`${inline}\n${block}`), "block");
    assert.equal(detectCitationLayout("Plain text"), "block");
    assert.equal(
        detectCitationLayout(`<!-- ${block} -->\n${inline}`),
        "inline",
    );
    assert.equal(
        detectCitationLayout(`${blockCitation}\n${inline}`),
        "inline",
    );
};
test(
    "detects the current citation layout for manager defaults",
    testDetectCitationLayout,
);

const testGroupedOverrideEditing = () => {
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
    const matches = result.match(/<!-- # Hayasaka -->/gu);
    assert.equal(matches?.length, 2);
};
test(
    "groups repeated names for bulk override editing",
    testGroupedOverrideEditing,
);

const testGroupedNameUsageSummary = () => {
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
};
test(
    "summarizes grouped name usage by parameter and template",
    testGroupedNameUsageSummary,
);

const testSingleNameUsageDescription = () => {
    const [field] = findNameOverrideFields(
        "{{Cite web|website=游民星空|title=Example}}",
    );
    assert.equal(field.usage, "Used once as |website= in a web citation.");
};
test(
    "describes a single name usage naturally",
    testSingleNameUsageDescription,
);
