/**
 * Tests generated prose length estimation.
 */

import assert from "node:assert/strict";
import test from "node:test";

import {
    countGeneratedProseSinographs,
    countProseSinographs,
} from "../../src/vg-stub-creator/wikitext/prose-count.ts";

test("countProseSinographs counts generated prose with weighted Latin and numbers", () => {
    assert.equal(
        countProseSinographs(
            "是2026年冒险类电子游戏，由DigixArt开发、THQ Nordic发行。" +
                "作品对应PlayStation 5、Microsoft Windows、Xbox Series X/S、S平台。" +
                "游戏的Metacritic汇总得分为71/100（PlayStation 5版），OpenCritic评测推荐率为69%。",
        ),
        59,
    );
});

test("countGeneratedProseSinographs excludes title, infobox, references, and categories", () => {
    assert.equal(
        countGeneratedProseSinographs({
            aggScoresText: "",
            companyMetadata: {
                text: "，由[[DigixArt]]开发",
            },
            platformSeriesMetadata: {
                text: "作品对应[[PlayStation 5]]平台。",
            },
            yearGenreMetadata: {
                text: "2026年冒险类[[电子游戏]]",
            },
        }),
        24,
    );
});

test("countGeneratedProseSinographs includes additional prose", () => {
    assert.equal(
        countGeneratedProseSinographs({
            additionalProseText:
                '遊戲採用手繪美術風格。<ref name="additional" />',
            aggScoresText: "",
            companyMetadata: {
                text: "",
            },
            platformSeriesMetadata: {
                text: "",
            },
            yearGenreMetadata: {
                text: "冒险类[[电子游戏]]",
            },
        }),
        18,
    );
});
