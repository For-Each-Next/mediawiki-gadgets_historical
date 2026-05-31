import assert from "node:assert/strict";
import test from "node:test";

import { buildEditSummary } from "../src/edit-summary.js";

test("buildEditSummary renders year and enwiki title metadata", () => {
  assert.equal(
    buildEditSummary({
      displayName: "サンプル",
      enwikiTitle: "Example Game",
      proseSinographs: 59,
      year: "2026",
    }),
    "🎮 [[en:Example Game|サンプル]] ([[2026年電子遊戲界|2026]]) <59 sinographs> 🎮",
  );
});

test("buildEditSummary renders plain title without enwiki metadata", () => {
  assert.equal(
    buildEditSummary({
      displayName: "サンプル",
      enwikiTitle: "",
      proseSinographs: 59,
      year: "2026",
    }),
    "🎮 サンプル ([[2026年電子遊戲界|2026]]) <59 sinographs> 🎮",
  );
});

test("buildEditSummary omits unavailable metadata", () => {
  assert.equal(
    buildEditSummary({
      displayName: "",
      enwikiTitle: "",
      proseSinographs: 0,
      year: "",
    }),
    "🎮 🎮",
  );
});
