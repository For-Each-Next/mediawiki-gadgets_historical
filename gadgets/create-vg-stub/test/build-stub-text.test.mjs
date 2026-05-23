import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { readFile } from "node:fs/promises";

test("RPG genre alias generates linked genre, category, and stub tag", async () => {
  const text = await buildStubText({
    developers: "Foo Studio",
    genres: "RPG",
    name: "Example",
    platforms: "PC",
    publishers: "Bar Games",
    year: "2024",
  });

  assert.equal(
    text,
    "《'''Example'''》是2024年[[電子角色扮演遊戲|角色扮演]]类" +
      "[[电子游戏]]，由Foo Studio开发、Bar Games发行。作品对应PC平台。" +
      "\n\n[[Category:電子角色扮演遊戲]]" +
      "\n[[Category:2024年電子遊戲]]\n\n{{Rpg-videogame-stub}}",
  );
});

test("genre alias ignores letter case", async () => {
  const text = await buildStubText({
    developers: "Foo Studio",
    genres: "rpg",
    name: "Example",
    platforms: "PC",
    publishers: "Bar Games",
    year: "2024",
  });

  assert.equal(text.includes("[[電子角色扮演遊戲|角色扮演]]"), true);
  assert.equal(text.includes("[[Category:電子角色扮演遊戲]]"), true);
  assert.equal(text.includes("{{Rpg-videogame-stub}}"), true);
});

test("empty year omits the year phrase", async () => {
  const text = await buildStubText({
    developers: "Foo Studio",
    genres: "RPG",
    name: "Example",
    platforms: "PC",
    publishers: "Bar Games",
    year: "",
  });

  assert.ok(
    text.startsWith("《'''Example'''》是[[電子角色扮演遊戲|角色扮演]]类"),
  );
  assert.equal(text.includes("[[Category:2024年電子遊戲]]"), false);
});

test("unknown future year generates the future category", async () => {
  const text = await buildStubText({
    developers: "Foo Studio",
    genres: "RPG",
    name: "Example",
    platforms: "PC",
    publishers: "Bar Games",
    year: "~",
  });

  assert.ok(
    text.startsWith(
      "《'''Example'''》是尚未推出的[[電子角色扮演遊戲|角色扮演]]类",
    ),
  );
  assert.equal(text.includes("[[Category:未来电子游戏]]"), true);
});

test("planned year generates future and year categories", async () => {
  const text = await buildStubText({
    developers: "Foo Studio",
    genres: "RPG",
    name: "Example",
    platforms: "PC",
    publishers: "Bar Games",
    year: "~2025",
  });

  assert.ok(
    text.startsWith(
      "《'''Example'''》是预定于2025年推出的[[電子角色扮演遊戲|角色扮演]]类",
    ),
  );
  assert.equal(text.includes("[[Category:未来电子游戏]]"), true);
  assert.equal(text.includes("[[Category:2025年电子游戏]]"), true);
});

test("year alias uses two digits", async () => {
  const text = await buildStubText({
    developers: "Foo Studio",
    genres: "RPG",
    name: "Example",
    platforms: "PC",
    publishers: "Bar Games",
    year: "24",
  });

  assert.equal(text.includes("[[Category:2024年電子遊戲]]"), true);
  assert.ok(text.startsWith("《'''Example'''》是2024年"));
});

test("company alias generates linked attribution, category, and stub tag", async () => {
  const text = await buildStubText({
    developers: "Square Enix",
    genres: "RPG",
    name: "Example",
    platforms: "PC",
    publishers: "=",
    year: "2024",
  });

  assert.equal(text.includes("由[[史克威尔艾尼克斯]]开发及发行。"), true);
  assert.equal(text.includes("[[Category:史克威爾艾尼克斯遊戲]]"), true);
  assert.equal(text.includes("{{SquareEnix-stub}}"), true);
});

test("empty developers and publishers omit attribution", async () => {
  const text = await buildStubText({
    developers: "",
    genres: "RPG",
    name: "Example",
    platforms: "PC",
    publishers: "",
    year: "2024",
  });

  assert.equal(text.includes("，由"), false);
  assert.equal(text.includes("[[电子游戏]]。作品对应PC平台。"), true);
});

test("empty genre omits genre class suffix", async () => {
  const text = await buildStubText({
    developers: "Foo Studio",
    genres: "",
    name: "Example",
    platforms: "PC",
    publishers: "Bar Games",
    year: "2024",
  });

  assert.ok(text.startsWith("《'''Example'''》是2024年[[电子游戏]]"));
  assert.equal(text.includes("类[[电子游戏]]"), false);
});

test("empty year and genre use the fallback article phrase", async () => {
  const text = await buildStubText({
    developers: "Foo Studio",
    genres: "",
    name: "Example",
    platforms: "PC",
    publishers: "Bar Games",
    year: "",
  });

  assert.ok(
    text.startsWith(
      "《'''Example'''》是一款[[电子游戏]]，由Foo Studio开发、Bar Games发行",
    ),
  );
});

test("separated genre, company, and platform values render as lists", async () => {
  const text = await buildStubText({
    developers: "Square Enix, Company B",
    genres: "RPG, Action",
    name: "Example",
    platforms: "PS5\nSwitch",
    publishers: "Bar Games\nCompany C",
    year: "2024",
  });

  assert.equal(
    text.includes("2024年[[電子角色扮演遊戲|角色扮演]]、Action类[[电子游戏]]"),
    true,
  );
  assert.equal(text.includes("由[[史克威尔艾尼克斯]]、Company B开发"), true);
  assert.equal(text.includes("Bar Games、Company C发行"), true);
  assert.equal(text.includes("作品对应[[PlayStation 5]]、Switch平台。"), true);
  assert.equal(text.includes("[[Category:史克威爾艾尼克斯遊戲]]"), true);
  assert.equal(text.includes("[[Category:電子角色扮演遊戲]]"), true);
  assert.equal(text.includes("[[Category:PlayStation 5游戏]]"), true);
  assert.equal(text.includes("{{SquareEnix-stub}}"), true);
  assert.equal(text.includes("{{Rpg-videogame-stub}}"), true);
});

test("empty platform omits the platform sentence", async () => {
  const text = await buildStubText({
    developers: "Foo Studio",
    genres: "RPG",
    name: "Example",
    platforms: "",
    publishers: "Bar Games",
    year: "2024",
  });

  assert.equal(text.includes("作品对应"), false);
  assert.equal(text.includes("平台。"), false);
  assert.equal(
    text.includes(
      "《'''Example'''》是2024年[[電子角色扮演遊戲|角色扮演]]类[[电子游戏]]",
    ),
    true,
  );
});

async function buildStubText(values) {
  const sandbox = await createSandbox();

  return vm.runInContext(
    `createVgStub.buildStubText(
      createVgStub.createArticleParams(${JSON.stringify(values)})
    )`,
    sandbox,
  );
}

async function createSandbox() {
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

  return sandbox;
}
