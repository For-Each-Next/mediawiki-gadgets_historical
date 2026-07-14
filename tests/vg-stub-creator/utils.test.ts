/**
 * Tests shared formatting and lookup utilities.
 */

import assert from "node:assert/strict";
import test from "node:test";

import {
    buildLinkText,
    buildTemplateText,
    getReferenceEntry,
    getWikilinkValue,
    splitFieldValues,
    splitLookupFieldValues,
} from "../../src/vg-stub-creator/shared/utils.ts";

test("buildLinkText omits a label differing only by first-letter case", () => {
    assert.equal(buildLinkText("Roguelike", "roguelike"), "[[roguelike]]");
    assert.equal(buildLinkText("roguelike", "Roguelike"), "[[Roguelike]]");
    assert.equal(buildLinkText("Foo_bar", "foo bar"), "[[foo bar]]");
    assert.equal(buildLinkText("Foo bar", "foo_bar"), "[[foo_bar]]");
    assert.equal(buildLinkText("FooBar", "Foobar"), "[[FooBar|Foobar]]");
});

test("buildTemplateText builds inline positional parameters by default", () => {
    assert.equal(
        buildTemplateText("langx", [
            [1, "ja"],
            [2, "タイトル"],
            ["italic", "yes"],
        ]),
        "{{langx|ja|タイトル|italic=yes}}",
    );
});

test("buildTemplateText builds named numeric parameters", () => {
    assert.equal(
        buildTemplateText("langx", [
            ["1", "ja"],
            ["2", "タイトル"],
            ["italic", "yes"],
        ]),
        "{{langx|1=ja|2=タイトル|italic=yes}}",
    );
});

test("buildTemplateText omits nullish parameters but keeps empty strings", () => {
    assert.equal(
        buildTemplateText("langx", [
            ["1", "ja"],
            ["2", "タイトル"],
            ["missing", null],
            ["empty", ""],
        ]),
        "{{langx|1=ja|2=タイトル|empty=}}",
    );
});

test("buildTemplateText builds block templates", () => {
    assert.equal(
        buildTemplateText(
            "langx",
            [
                ["1", "ja"],
                ["2", "タイトル"],
                ["italic", "yes"],
            ],
            "block",
        ),
        "{{langx\n| 1 = ja\n| 2 = タイトル\n| italic = yes\n}}",
    );
});

test("buildTemplateText builds raw block parameters", () => {
    assert.equal(
        buildTemplateText(
            "NoteTA-lite",
            [
                ["G1", "Games"],
                [null, "zh-cn:简体名; zh-tw:繁體名;"],
            ],
            "block",
        ),
        "{{NoteTA-lite\n| G1 = Games\n| zh-cn:简体名; zh-tw:繁體名;\n}}",
    );
});

test("getReferenceEntry matches array entries by alias", () => {
    assert.deepEqual(
        getReferenceEntry(
            [
                {
                    aliases: ["ps5", "PS5", "PlayStation 5"],
                    page: {
                        title: "PlayStation 5",
                    },
                },
            ],
            "playstation 5",
        ),
        {
            key: "ps5",
            reference: {
                aliases: ["ps5", "PS5", "PlayStation 5"],
                page: {
                    title: "PlayStation 5",
                },
            },
        },
    );
});

test("getReferenceEntry treats standalone and as normal alias text", () => {
    assert.deepEqual(
        getReferenceEntry(
            [
                {
                    aliases: ["hack-and-slash", "Hack and slash"],
                    page: {
                        title: "砍殺遊戲",
                    },
                },
            ],
            "Hack slash",
        ),
        {},
    );
});

test("getWikilinkValue uses piped display text", () => {
    assert.equal(getWikilinkValue("[[target|text]]"), "text");
    assert.equal(getWikilinkValue("[[article]]"), "article");
});

test("splitFieldValues preserves wikilinks and does not split their commas", () => {
    assert.deepEqual(splitFieldValues("[[aaa|comma, example]], [[ccc]]"), [
        "[[aaa|comma, example]]",
        "[[ccc]]",
    ]);
});

test("splitFieldValues uses semicolon as a first-level separator", () => {
    assert.deepEqual(splitFieldValues("Tom, Jerry and Mary; Spike Studio"), [
        "Tom, Jerry and Mary",
        "Spike Studio",
    ]);
});

test("splitFieldValues uses newlines as first-level separators", () => {
    assert.deepEqual(splitFieldValues("Tom, Jerry and Mary\nSpike Studio"), [
        "Tom, Jerry and Mary",
        "Spike Studio",
    ]);
});

test("splitFieldValues preserves unspaced slashes inside names", () => {
    assert.deepEqual(
        splitFieldValues("PlayStation 5, Windows, Xbox Series X/S"),
        ["PlayStation 5", "Windows", "Xbox Series X/S"],
    );
});

test("splitFieldValues splits spaced slash separators", () => {
    assert.deepEqual(splitFieldValues("PC / Switch"), ["PC", "Switch"]);
});

test("splitLookupFieldValues uses wikilink display values", () => {
    assert.deepEqual(
        splitLookupFieldValues("[[aaa|comma, example]], [[ccc]]"),
        ["comma, example", "ccc"],
    );
});
