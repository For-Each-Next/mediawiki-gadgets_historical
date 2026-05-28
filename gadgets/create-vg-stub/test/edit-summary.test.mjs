import assert from "node:assert/strict";
import test from "node:test";

import { buildEditSummary } from "../src/edit-summary.js";

test("buildEditSummary renders year and Wikidata metadata", () => {
  assert.equal(
    buildEditSummary({
      displayName: "サンプル",
      proseSinographs: 59,
      wikidataId: "Q123",
      year: "2026",
    }),
    "🎮 [[d:Q123|サンプル]] ([[2026年電子遊戲界|2026]]) <59 sinographs> 🎮",
  );
});

test("buildEditSummary omits unavailable metadata", () => {
  assert.equal(
    buildEditSummary({
      displayName: "",
      proseSinographs: 0,
      wikidataId: "",
      year: "",
    }),
    "🎮 🎮",
  );
});
