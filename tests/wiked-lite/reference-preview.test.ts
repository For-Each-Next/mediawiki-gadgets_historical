import assert from "node:assert/strict";
import test from "node:test";
import { buildReferencePreview } from "../../src/wiked-lite/index.ts";

const ORIGINAL_URL = "https://example.test/article";
const ARCHIVE_URL = `https://web.archive.org/web/202401/${ORIGINAL_URL}`;
const PAIRED_PREVIEW_ROWS = [
    {
        fields: [
            { name: "editor-last2", value: "Jones" },
            { name: "editor-first2", value: "Bea" },
        ],
    },
    { fields: [{ name: "title", value: "Page" }] },
    {
        fields: [
            { name: "last", value: "Doe" },
            { name: "first", value: "Jane" },
        ],
    },
    {
        fields: [
            {
                displayValue: "https://web.archive.org/web/202401/...",
                href: ARCHIVE_URL,
                name: "archive-url",
                value: ARCHIVE_URL,
            },
        ],
    },
    { fields: [{ name: "url", value: ORIGINAL_URL }] },
    { fields: [{ name: "custom-field", value: "kept" }] },
    { fields: [{ name: "translator-first", value: "Only" }] },
];

test("a short footnote resolves its bibliography citation", () => {
    const source = [
        "Dragonstomper was published.{{sfn|Weiss|2014|p=77}}",
        "==Bibliography==",
        "* {{cite book|last=Weiss|year=2014|title=Classic Home Video Games}}",
    ].join("\n");

    const preview = buildReferencePreview(source, "{{sfn|Weiss|2014|p=77}}");

    assert.equal(preview?.templateName, "cite book");
    assert.equal(preview?.referenceLabel, "Weiss, 2014");
    assert.deepEqual(preview?.rows, [
        { fields: [{ name: "last", value: "Weiss" }] },
        { fields: [{ name: "year", value: "2014" }] },
        {
            fields: [{ name: "title", value: "Classic Home Video Games" }],
        },
    ]);
});

test("a named ref reuse resolves its full citation", () => {
    const source = [
        '<ref name="source">' +
            "{{Cite web|URL=https://example.test|title=Page}}</ref>",
        '<ref name="source"/>',
    ].join("\n");

    const preview = buildReferencePreview(source, '<ref name="source"/>');

    assert.equal(preview?.templateName, "cite web");
    assert.equal(preview?.referenceLabel, "source");
    assert.deepEqual(preview?.rows, [
        { fields: [{ name: "URL", value: "https://example.test" }] },
        { fields: [{ name: "title", value: "Page" }] },
    ]);
});

test("a full ref preview parses only its inner content", () => {
    const reference = [
        '<ref name="source">Intro ',
        "{{Cite web|URL=https://example.test|title=Page}}",
        " after.</ref>",
    ].join("");

    const preview = buildReferencePreview(reference, reference);

    assert.equal(preview?.templateName, "cite web");
    assert.equal(preview?.referenceLabel, "source");
    assert.deepEqual(preview?.rows, [
        { fields: [{ name: "URL", value: "https://example.test" }] },
        { fields: [{ name: "title", value: "Page" }] },
    ]);
});

test("a plain reference previews its explanatory note text", () => {
    const reference = '<ref name="note">  Plain explanatory note.  </ref>';

    const preview = buildReferencePreview(reference, reference);

    assert.equal(preview?.templateName, "reference");
    assert.equal(preview?.referenceLabel, "note");
    assert.equal(preview?.noteText, "Plain explanatory note.");
    assert.deepEqual(preview?.rows, []);
});

test("an explanatory-footnote template previews its note", () => {
    const reference =
        "{{efn|An explanatory note with https://example.test|name=context}}";

    const preview = buildReferencePreview(reference, reference);

    assert.equal(preview?.templateName, "reference");
    assert.equal(preview?.referenceLabel, "context");
    assert.equal(
        preview?.noteText,
        "An explanatory note with https://example.test",
    );
});

test("pairs person fields and retains original and archive URLs", () => {
    const reference = [
        "{{cite web",
        "|editor-first2=Bea",
        "|title=Page",
        "|last=Doe",
        `|archive-url=${ARCHIVE_URL}`,
        "|first=Jane",
        "|editor-last2=Jones",
        `|url=${ORIGINAL_URL}`,
        "|custom-field=kept",
        "|translator-first=Only",
        "}}",
    ].join("");

    const preview = buildReferencePreview(reference, reference);

    assert.deepEqual(preview?.rows, PAIRED_PREVIEW_ROWS);
});

test("a grouped reuse resolves the definition in the same group", () => {
    const source = [
        '<ref name="source" group="other">{{cite book|title=Wrong}}</ref>',
        '<ref name="source" group="notes">' +
            "{{cite web|title=Right|url=https://example.test}}</ref>",
    ].join("\n");

    const preview = buildReferencePreview(
        source,
        '<ref name="source" group="notes"/>',
    );

    assert.equal(preview?.templateName, "cite web");
});
