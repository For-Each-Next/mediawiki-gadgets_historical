/**
 * Tests NoteTA-lite conversion wikitext generation.
 */

import assert from "node:assert/strict";
import test from "node:test";

import { buildNoteTaText } from "../../src/vg-stub-creator/src/wikitext/note-ta.js";

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
            "| 1 = zh-cn:简体名; zh-tw:繁體名;\n" +
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
            "| 1 = zh-cn:简体名; zh-hk:繁體名;\n" +
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
            "| 1 = zh-cn:简体名; zh-hk:香港名; zh-tw:台灣名;\n" +
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

test("buildNoteTaText renders editable rows in source order", () => {
    assert.equal(
        buildNoteTaText({
            entries: [
                {
                    key: "2",
                    value: "zh-cn:后项; zh-tw:後項;",
                },
                {
                    key: "G2",
                    value: "Software",
                },
                {
                    key: "G1",
                    value: "Games",
                },
                {
                    key: "T",
                    value: "zh-cn:标题; zh-tw:標題;",
                },
                {
                    key: "1",
                    value: "zh-cn:前项; zh-tw:前項;",
                },
            ],
        }),
        "{{NoteTA-lite\n" +
            "| T = zh-cn:标题; zh-tw:標題;\n" +
            "| G1 = Games\n" +
            "| G2 = Software\n" +
            "| 1 = zh-cn:前项; zh-tw:前項;\n" +
            "| 2 = zh-cn:后项; zh-tw:後項;\n" +
            "}}",
    );
});

test("buildNoteTaText sorts numeric params before blank anonymous params", () => {
    assert.equal(
        buildNoteTaText({
            entries: [
                {
                    key: "",
                    value: "zh-cn:无名; zh-tw:無名;",
                },
                {
                    key: "4",
                    value: "zh-cn:数字; zh-tw:數字;",
                },
                {
                    key: "G1",
                    value: "Games",
                },
            ],
        }),
        "{{NoteTA-lite\n" +
            "| G1 = Games\n" +
            "| 4 = zh-cn:数字; zh-tw:數字;\n" +
            "| zh-cn:无名; zh-tw:無名;\n" +
            "}}",
    );
});

test("buildNoteTaText sorts generated conversions as numeric params", () => {
    assert.equal(
        buildNoteTaText({
            entries: [
                {
                    key: "G1",
                    value: "Games",
                },
            ],
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
            "| 1 = zh-cn:简体名; zh-tw:繁體名;\n" +
            "}}",
    );
});

test("buildNoteTaText omits generated conversions after removal", () => {
    assert.equal(
        buildNoteTaText({
            entries: [
                {
                    key: "G1",
                    value: "Games",
                },
            ],
            namesRemoved: true,
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
        "{{NoteTA-lite\n" + "| G1 = Games\n" + "}}",
    );
});

test("buildNoteTaText escapes equals signs in anonymous params", () => {
    assert.equal(
        buildNoteTaText({
            entries: [
                {
                    key: "G1",
                    value: "Games",
                },
                {
                    key: "",
                    value: "aa=>zh-tw:111;",
                },
            ],
        }),
        "{{NoteTA-lite\n" + "| G1 = Games\n" + "| aa{{=}}>zh-tw:111;\n" + "}}",
    );
});
