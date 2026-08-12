/** Characterizes Stub Creator's package-local wikitext helpers. */

import assert from "node:assert/strict";
import test from "node:test";

import * as wikitext from "vg-stub-creator/domain/wikitext/index.ts";
import type {
    ReferenceDefinition,
    ReferenceEntry,
    WikilinkParts,
} from "vg-stub-creator/domain/wikitext/index.ts";

interface TestReferenceDefinition extends ReferenceDefinition {
    categories?: string[];
}

const definitions: Record<string, TestReferenceDefinition> = {
    action: {
        aliases: ["action game", /^action (?:video )?game$/iu],
        categories: ["Action games"],
        label: "Action",
        page: "Action game",
    },
};

test("keeps the wikitext facade runtime exports exact", () => {
    assert.deepEqual(Object.keys(wikitext).sort(), [
        "buildLinkText",
        "buildTemplateCall",
        "buildTemplateText",
        "formatPrefixedValue",
        "getReferenceDefinition",
        "getReferenceEntry",
        "getReferenceValues",
        "getWikilinkParts",
        "getWikilinkValue",
        "hasFirstLevelFieldSeparator",
        "isWikilinkValue",
        "parsePrefixedValue",
        "splitFieldValues",
        "splitLookupFieldValues",
        "splitSourceUrls",
        "trimValue",
        "uniqueValues",
    ]);
});

test("builds inline and block templates without nullish values", () => {
    const params: wikitext.TemplateParam[] = [
        [1, "positional"],
        ["empty", ""],
        ["enabled", false],
        ["missing", null],
    ];

    assert.equal(wikitext.buildTemplateCall("Example"), "{{Example}}");
    assert.equal(
        wikitext.buildTemplateText("Example", params),
        "{{Example|positional|empty=|enabled=false}}",
    );
    assert.equal(
        wikitext.buildTemplateText("Example", params, "block"),
        [
            "{{Example",
            "| 1 = positional",
            "| empty = ",
            "| enabled = false",
            "}}",
        ].join("\n"),
    );
});

test("pipes links only when normalized label text differs", () => {
    assert.equal(
        wikitext.buildLinkText("example_page", "Example page"),
        "[[Example page]]",
    );
    assert.equal(
        wikitext.buildLinkText("Example Page", "example page"),
        "[[Example Page|example page]]",
    );
});

test("parses and formats compact prefixed values", () => {
    assert.deepEqual(
        wikitext.parsePrefixedValue(" ja : タイトル:副題 ", "en"),
        {
            prefix: "ja",
            value: "タイトル:副題",
        },
    );
    assert.deepEqual(wikitext.parsePrefixedValue(" Title ", " en "), {
        prefix: "en",
        value: "Title",
    });
    assert.equal(
        wikitext.formatPrefixedValue(" JA : タイトル ", {
            normalizePrefix: (prefix) => prefix.toLocaleLowerCase(),
        }),
        "ja:タイトル",
    );
});

test("splits lookup fields without breaking whole wikilinks", () => {
    const value = "Action, [[Role-playing game|Role, playing]] / Puzzle";

    assert.deepEqual(wikitext.splitFieldValues(value), [
        "Action",
        "[[Role-playing game|Role, playing]]",
        "Puzzle",
    ]);
    assert.deepEqual(wikitext.splitLookupFieldValues(value), [
        "Action",
        "Role, playing",
        "Puzzle",
    ]);
    assert.deepEqual(wikitext.splitFieldValues("Action, Puzzle; Strategy"), [
        "Action, Puzzle",
        "Strategy",
    ]);
    assert.equal(wikitext.hasFirstLevelFieldSeparator(value), false);
    assert.equal(
        wikitext.hasFirstLevelFieldSeparator("[[Target|label; text]]\nNext"),
        true,
    );
});

test("parses only complete whole-field wikilinks", () => {
    const parts: WikilinkParts | null = wikitext.getWikilinkParts(
        " [[ Target | Label | suffix ]] ",
    );

    assert.deepEqual(parts, {
        label: "Label | suffix",
        target: "Target",
    });
    assert.equal(wikitext.getWikilinkValue("[[Target]]"), "Target");
    assert.equal(wikitext.getWikilinkValue("[[Target|Label]]"), "Label");
    assert.equal(wikitext.isWikilinkValue("before [[Target]]"), false);
    assert.equal(wikitext.getWikilinkParts("[[broken"), null);
});

test("normalizes source lists and stable unique values", () => {
    assert.deepEqual(
        wikitext.splitSourceUrls(
            " https://one.example \r\n\nhttps://two.example ",
        ),
        ["https://one.example", "https://two.example"],
    );
    assert.equal(wikitext.trimValue(null), "");
    assert.equal(wikitext.trimValue(42), "42");
    assert.deepEqual(wikitext.uniqueValues(["A", "B", "A"]), ["A", "B"]);
});

test("resolves typed reference keys, names, and whole aliases", () => {
    const byKey: ReferenceEntry<TestReferenceDefinition> =
        wikitext.getReferenceEntry(definitions, "ACTION");
    const byLabel = wikitext.getReferenceDefinition(
        definitions,
        "[[Other|Action]]",
    );
    const byPattern = wikitext.getReferenceDefinition(
        Object.values(definitions),
        "Action video game",
    );

    assert.equal(byKey.key, "action");
    assert.equal(byKey.reference, definitions.action);
    assert.equal(byLabel, definitions.action);
    assert.equal(byPattern, definitions.action);
    assert.deepEqual(
        wikitext.getReferenceEntry(definitions, "Action games"),
        {},
    );
    assert.equal(
        wikitext.getReferenceDefinition(definitions, "Action games"),
        undefined,
    );
});

test("flattens reference data in input order", () => {
    const references: TestReferenceDefinition[] = [
        definitions.action,
        { categories: ["Games", "Action games"], label: "Other" },
        { label: "No category" },
    ];

    assert.deepEqual(wikitext.getReferenceValues(references, "categories"), [
        "Action games",
        "Games",
        "Action games",
    ]);
});
