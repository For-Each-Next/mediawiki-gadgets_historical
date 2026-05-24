import assert from "node:assert/strict";
import test from "node:test";

import { buildTemplateText } from "../src/utils.js";

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
