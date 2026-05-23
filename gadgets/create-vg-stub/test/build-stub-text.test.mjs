import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { readFile } from "node:fs/promises";

test("RPG genre alias generates linked genre, category, and stub tag", async () => {
  const source = await readFile("dist/create_vg_stub.js", "utf8");
  const sandbox = {
    $() {
      return {
        trigger() {
          return this;
        },
      };
    },
    document: {
      body: {
        append() {},
      },
      createElement() {
        return {};
      },
      getElementById() {
        return {};
      },
    },
    mw: {
      config: {
        get() {
          return null;
        },
      },
      loader: {
        using() {
          return Promise.resolve();
        },
      },
    },
    window: {},
  };

  vm.createContext(sandbox);
  vm.runInContext(source, sandbox);

  const text = vm.runInContext(
    `buildStubText(createArticleParams({
      developers: "Foo Studio",
      genres: "RPG",
      name: "Example",
      platforms: "PC",
      publishers: "Bar Games",
      year: "2024"
    }))`,
    sandbox,
  );

  assert.equal(
    text,
    "《'''Example'''》是2024年[[電子角色扮演遊戲|角色扮演]]类" +
      "[[电子游戏]]，由Foo Studio开发、Bar Games发行。游戏对应PC平台。" +
      "\n\n[[Category:電子角色扮演遊戲]]\n\n{{Rpg-videogame-stub}}",
  );
});
