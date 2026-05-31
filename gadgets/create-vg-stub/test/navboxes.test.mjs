import assert from "node:assert/strict";
import test from "node:test";

import { buildNavboxText } from "../src/fragments/navboxes.js";

test("buildNavboxText uses the first existing series navbox candidate", async () => {
  const text = await buildNavboxText("Foo", {
    fetcher: createTemplateFetcher(["Template:Foo电子游戏"]),
  });

  assert.equal(text, "{{Foo电子游戏}}");
});

test("buildNavboxText resolves converted template titles", async () => {
  const text = await buildNavboxText("电子游戏", {
    fetcher: createTemplateFetcher(
      ["Template:電子遊戲系列電子遊戲"],
      [
        {
          from: "Template:电子游戏系列电子游戏",
          to: "Template:電子遊戲系列電子遊戲",
        },
      ],
    ),
  });

  assert.equal(text, "{{電子遊戲系列電子遊戲}}");
});

test("buildNavboxText handles multiple series and omits missing navboxes", async () => {
  const text = await buildNavboxText("Foo; Bar; Baz", {
    fetcher: createTemplateFetcher([
      "Template:Foo系列电子游戏",
      "Template:Bar系列",
    ]),
  });

  assert.equal(text, "{{Foo系列电子游戏}}\n{{Bar系列}}");
});

function createTemplateFetcher(existingTitles, converted = []) {
  return async function fetcher(url, options) {
    assert.equal(options.headers.accept, "application/json");

    const titles = new URL(url, "https://example.test").searchParams
      .get("titles")
      .split("|");
    const resolvedTitles = titles.map((title) => {
      const conversion = converted.find((item) => item.from === title);

      return conversion?.to || title;
    });

    return {
      ok: true,
      async json() {
        return {
          query: {
            converted,
            pages: resolvedTitles.map((title) => ({
              missing: existingTitles.includes(title) ? undefined : true,
              title,
            })),
          },
        };
      },
    };
  };
}
