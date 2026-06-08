/**
 * Tests video game infobox wikitext generation.
 */

import assert from "node:assert/strict";
import test from "node:test";

import { buildInfoboxText } from "../src/fragments/infobox.js";

test("buildInfoboxText renders Japanese original names as Japanese", () => {
  assert.equal(
    buildInfoboxText({
      englishName: "Example Game",
      name: "Example",
      originalLanguage: "ja",
      originalName: "サンプル",
    }),
    "{{Infobox VG\n" +
      "| onlysourced = no\n" +
      "| title = Example\n" +
      "| japanese = サンプル\n" +
      "| english = Example Game\n" +
      "}}",
  );
});

test("buildInfoboxText renders non-Japanese original names with language code", () => {
  assert.equal(
    buildInfoboxText({
      englishName: "Example Game",
      name: "Example",
      originalLanguage: "ko",
      originalName: "샘플",
    }),
    "{{Infobox VG\n" +
      "| onlysourced = no\n" +
      "| title = Example\n" +
      "| original = ko:샘플\n" +
      "| english = Example Game\n" +
      "}}",
  );
});

test("buildInfoboxText omits title params matching base page title", () => {
  assert.equal(
    buildInfoboxText({
      englishName: "Example Game",
      name: "Example Game (video game)",
      originalLanguage: "en",
      originalName: "Example Game",
    }),
    "{{Infobox VG\n" +
      "| onlysourced = no\n" +
      "| title = Example Game (video game)\n" +
      "}}",
  );
});

test("buildInfoboxText omits Japanese title matching base page title", () => {
  assert.equal(
    buildInfoboxText({
      name: "Example Game (video game)",
      originalLanguage: "ja",
      originalName: "Example Game",
    }),
    "{{Infobox VG\n" +
      "| onlysourced = no\n" +
      "| title = Example Game (video game)\n" +
      "}}",
  );
});

test("buildInfoboxText renders official and common vgn names", () => {
  assert.equal(
    buildInfoboxText({
      commonNames: [
        {
          cn: true,
          hk: true,
          name: "通用名",
          tw: true,
        },
      ],
      name: "Example",
      officialNames: [
        {
          markets: ["ww", "hans", "hant"],
          name: "Official",
          ref: '<ref name=":1" />',
        },
      ],
    }),
    "{{Infobox VG\n" +
      "| onlysourced = no\n" +
      "| title = Example\n" +
      '| official = {{vgn|ww:Official<ref name=":1" />|hans:Official<ref name=":1" />|hant:Official<ref name=":1" />}}\n' +
      "| common = {{vgn|cn:通用名|tw:通用名|hk:通用名}}\n" +
      "}}",
  );
});

test("buildInfoboxText renders unchecked vgn names without regions", () => {
  assert.equal(
    buildInfoboxText({
      commonNames: [
        {
          name: "Common",
        },
      ],
      name: "Example",
    }),
    "{{Infobox VG\n" +
      "| onlysourced = no\n" +
      "| title = Example\n" +
      "| common = {{vgn|Common}}\n" +
      "}}",
  );
});
