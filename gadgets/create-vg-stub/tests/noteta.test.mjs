/**
 * Tests NoteTA-lite conversion wikitext generation.
 */

import assert from "node:assert/strict";
import test from "node:test";

import { buildNoteTaText } from "../src/wikitext/note-ta.js";

test("buildNoteTaText renders the Games conversion group", () => {
    assert.equal(
        buildNoteTaText(),
        "{{NoteTA-lite\n" + "| G1 = Games\n" + "}}",
    );
});

test("buildNoteTaText renders official name conversion when both variants exist", () => {
    assert.equal(
        buildNoteTaText({
            officialNames: [
                {
                    cn: true,
                    name: "简体名",
                },
                {
                    name: "繁體名",
                    tw: true,
                },
            ],
        }),
        "{{NoteTA-lite\n" +
            "| G1 = Games\n" +
            "| zh-cn:简体名; zh-tw:繁體名;\n" +
            "}}",
    );
});

test("buildNoteTaText maps Hans and HK official names to CN and HK rules", () => {
    assert.equal(
        buildNoteTaText({
            officialNames: [
                {
                    markets: ["hans"],
                    name: "简体名",
                },
                {
                    hk: true,
                    name: "繁體名",
                },
            ],
        }),
        "{{NoteTA-lite\n" +
            "| G1 = Games\n" +
            "| zh-cn:简体名; zh-hk:繁體名;\n" +
            "}}",
    );
});

test("buildNoteTaText renders Hong Kong and Taiwan rules when both exist", () => {
    assert.equal(
        buildNoteTaText({
            officialNames: [
                {
                    cn: true,
                    name: "简体名",
                },
                {
                    hk: true,
                    name: "香港名",
                },
                {
                    name: "台灣名",
                    tw: true,
                },
            ],
        }),
        "{{NoteTA-lite\n" +
            "| G1 = Games\n" +
            "| zh-cn:简体名; zh-hk:香港名; zh-tw:台灣名;\n" +
            "}}",
    );
});

test("buildNoteTaText omits one-sided official name conversion", () => {
    assert.equal(
        buildNoteTaText({
            officialNames: [
                {
                    name: "简体名",
                    cn: true,
                },
            ],
        }),
        "{{NoteTA-lite\n" + "| G1 = Games\n" + "}}",
    );
});
