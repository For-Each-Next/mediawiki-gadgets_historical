import assert from "node:assert/strict";
import test from "node:test";

import { buildAggScoresText } from "../src/fragments/agg-scores.js";

test("buildAggScoresText renders Metacritic and OpenCritic scores", () => {
  assert.equal(
    buildAggScoresText({
      metacriticPlatform: "Xbox Series X/S",
      metacriticScore: "77",
      openCriticRecommend: "68",
    }),
    "游戏的[[Metacritic]]汇总得分为77/100（Xbox Series X/S版），[[OpenCritic]]评测推荐率为68%。",
  );
});

test("buildAggScoresText omits Metacritic platform edition when blank", () => {
  assert.equal(
    buildAggScoresText({
      metacriticScore: "77",
    }),
    "游戏的[[Metacritic]]汇总得分为77/100。",
  );
});

test("buildAggScoresText swaps Metacritic score and platform when score is first", () => {
  assert.equal(
    buildAggScoresText({
      metacriticPlatform: "77",
      metacriticScore: "Xbox Series X/S",
    }),
    "游戏的[[Metacritic]]汇总得分为77/100（Xbox Series X/S版）。",
  );
});

test("buildAggScoresText omits empty scores", () => {
  assert.equal(
    buildAggScoresText({
      metacriticPlatform: "Xbox Series X/S",
      openCriticRecommend: "%",
    }),
    "",
  );
});
