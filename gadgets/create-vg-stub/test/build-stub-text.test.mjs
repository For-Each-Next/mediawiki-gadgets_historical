import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { readFile } from "node:fs/promises";

const EXAMPLE_HEADER =
  "{{NoteTA-lite\n| G1 = Games\n}}\n\n{{Infobox VG\n| title = Example\n}}";

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
    `${EXAMPLE_HEADER}\n\n` +
      "《'''Example'''》是2024年[[電子角色扮演遊戲|角色扮演]]类" +
      "[[电子游戏]]，由Foo Studio开发、Bar Games发行。作品对应PC平台。" +
      "\n\n{{DEFAULTSORT:Example}}\n[[Category:電子角色扮演遊戲]]" +
      "\n[[Category:2024年電子遊戲]]\n\n{{rpg-videogame-stub}}",
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
  assert.equal(text.includes("{{rpg-videogame-stub}}"), true);
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
    text.startsWith(
      `${EXAMPLE_HEADER}\n\n` +
        "《'''Example'''》是[[電子角色扮演遊戲|角色扮演]]类",
    ),
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
      `${EXAMPLE_HEADER}\n\n` +
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
      `${EXAMPLE_HEADER}\n\n` +
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
  assert.ok(text.startsWith(`${EXAMPLE_HEADER}\n\n《'''Example'''》是2024年`));
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

  assert.ok(
    text.startsWith(
      `${EXAMPLE_HEADER}\n\n《'''Example'''》是2024年[[电子游戏]]`,
    ),
  );
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
      `${EXAMPLE_HEADER}\n\n` +
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
    text.includes(
      "2024年[[電子角色扮演遊戲|角色扮演]]、[[动作游戏|动作]]类[[电子游戏]]",
    ),
    true,
  );
  assert.equal(text.includes("由[[史克威尔艾尼克斯]]和Company B开发"), true);
  assert.equal(text.includes("Bar Games和Company C发行"), true);
  assert.equal(
    text.includes("作品对应[[PlayStation 5]]、[[任天堂Switch]]平台。"),
    true,
  );
  assert.equal(text.includes("[[Category:史克威爾艾尼克斯遊戲]]"), true);
  assert.equal(text.includes("[[Category:電子角色扮演遊戲]]"), true);
  assert.equal(text.includes("[[Category:动作游戏]]"), true);
  assert.equal(text.includes("[[Category:PlayStation 5游戏]]"), true);
  assert.equal(text.includes("[[Category:任天堂Switch游戏]]"), true);
  assert.equal(text.includes("{{SquareEnix-stub}}"), true);
  assert.equal(text.includes("{{PlayStation-stub}}"), true);
  assert.equal(text.includes("{{Nintendo-stub}}"), true);
  assert.equal(text.includes("{{rpg-videogame-stub}}"), true);
  assert.equal(text.includes("{{action-videogame-stub}}"), true);
});

test("three or more companies render with enumeration separators", async () => {
  const text = await buildStubText({
    developers: "Company A, Company B, Company C",
    genres: "RPG",
    name: "Example",
    platforms: "PC",
    publishers: "",
    year: "2024",
  });

  assert.equal(text.includes("由Company A、Company B、Company C开发"), true);
});

test("entered wikilinks are preserved in generated prose", async () => {
  const text = await buildStubText({
    developers: "[[Foo, Inc.|Foo Studio]]",
    genres: "[[Action game|Action]]",
    name: "Example",
    platforms: "[[PC game|PC]]",
    publishers: "",
    year: "2024",
  });

  assert.equal(
    text.includes(
      "《'''Example'''》是2024年[[Action game|Action]]类[[电子游戏]]，由[[Foo, Inc.|Foo Studio]]开发。作品对应[[PC game|PC]]平台。",
    ),
    true,
  );
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

test("series renders after platform text", async () => {
  const text = await buildStubText({
    developers: "Foo Studio",
    genres: "RPG",
    name: "Example",
    platforms: "PC",
    publishers: "Bar Games",
    series: "Example",
    year: "2024",
  });

  assert.equal(text.includes("作品对应PC平台，属于「《Example》系列」。"), true);
});

test("series source reference renders after series text", async () => {
  const text = await buildStubText({
    developers: "Foo Studio",
    genres: "RPG",
    name: "Example",
    platforms: "PC",
    publishers: "Bar Games",
    series: "Example",
    sourceReferences: [
      {
        citation: "{{cite web|title=Series source}}",
        key: "series",
      },
    ],
    year: "2024",
  });

  assert.equal(
    text.includes('作品对应PC平台，属于「《Example》系列」<ref name=":1" />。'),
    true,
  );
  assert.equal(
    text.includes('<ref name=":1">{{cite web|title=Series source}}</ref>'),
    true,
  );
});

test("aggregate scores render after platform text", async () => {
  const text = await buildStubText({
    developers: "Foo Studio",
    genres: "",
    metacriticPlatform: "PS5",
    metacriticScore: "77",
    name: "Example",
    openCriticRecommend: "68",
    platforms: "PS5",
    publishers: "Bar Games",
    sourceReferences: [
      {
        citation: "{{cite web|title=Metacritic source}}",
        key: "metacriticScore",
      },
      {
        citation: "{{cite web|title=OpenCritic source}}",
        key: "openCriticRecommend",
      },
    ],
    year: "",
  });

  assert.equal(
    text.includes(
      "作品对应[[PlayStation 5]]平台。游戏的[[Metacritic]]汇总得分为77/100" +
        '（PlayStation 5版）<ref name=":1" />，' +
        '[[OpenCritic]]评测推荐率为68%<ref name=":2" />。',
    ),
    true,
  );
  assert.equal(
    text.includes(
      '<ref name=":1">{{cite web|title=Metacritic source}}</ref>\n' +
        '<ref name=":2">{{cite web|title=OpenCritic source}}</ref>',
    ),
    true,
  );
});

test("original name renders as a langx title variant", async () => {
  const text = await buildStubText({
    developers: "Foo Studio",
    genres: "",
    name: "Example",
    originalLanguage: "ja",
    originalName: "サンプル",
    platforms: "",
    publishers: "Bar Games",
    year: "",
  });

  assert.ok(
    text.startsWith(
      "{{NoteTA-lite\n| G1 = Games\n}}\n\n" +
        "{{Infobox VG\n| title = Example\n| japanese = サンプル\n}}\n\n" +
        "《'''Example'''》（{{langx|ja|サンプル|label=none}}）是一款",
    ),
  );
});

test("English name renders as italic langx title variant", async () => {
  const text = await buildStubText({
    developers: "Foo Studio",
    englishName: "Example Game",
    genres: "",
    name: "Example",
    platforms: "",
    publishers: "Bar Games",
    year: "",
  });

  assert.ok(
    text.startsWith(
      "{{NoteTA-lite\n| G1 = Games\n}}\n\n" +
        "{{Infobox VG\n| title = Example\n| english = Example Game\n}}\n\n" +
        "《'''Example'''》（{{langx|en|Example Game|italic=yes|label=none}}）是一款",
    ),
  );
});

test("French original name renders as italic langx title variant", async () => {
  const text = await buildStubText({
    developers: "Foo Studio",
    genres: "",
    name: "Example",
    originalLanguage: "fr",
    originalName: "Exemple",
    platforms: "",
    publishers: "Bar Games",
    year: "",
  });

  assert.ok(
    text.startsWith(
      "{{NoteTA-lite\n| G1 = Games\n}}\n\n" +
        "{{Infobox VG\n| title = Example\n| original = fr:Exemple\n}}\n\n" +
        "《'''Example'''》（{{langx|fr|Exemple|italic=yes|label=none}}）是一款",
    ),
  );
});

test("source references render named refs and a references block", async () => {
  const text = await buildStubText({
    developers: "Foo Studio",
    genres: "",
    name: "Example",
    platforms: "PC",
    publishers: "Bar Games",
    sourceReferences: [
      {
        citation: "{{cite web|title=Original source}}",
        key: "originalName",
      },
      {
        citation: "{{cite web|title=Year source}}",
        key: "year",
      },
      {
        citation: "{{cite web|title=Developer source}}",
        key: "developers",
      },
      {
        citation: "{{cite web|title=Publisher source}}",
        key: "publishers",
      },
      {
        citation: "{{cite web|title=Genre source}}",
        key: "genres",
      },
      {
        citation: "{{cite web|title=Platform source}}",
        key: "platforms",
      },
    ],
    year: "",
    originalName: "サンプル",
  });

  assert.equal(
    text.includes(
      "《'''Example'''》（{{langx|ja|サンプル|label=none}}" +
        '<ref name=":1" />）是一款[[电子游戏]]' +
        '<ref name=":2" /><ref name=":5" />，' +
        "由Foo Studio开发、Bar Games发行" +
        '<ref name=":3" /><ref name=":4" />。' +
        '作品对应PC平台<ref name=":6" />。',
    ),
    true,
  );
  assert.equal(
    text.includes(
      "== 参考文献 ==\n\n<references responsive>\n" +
        '<ref name=":1">{{cite web|title=Original source}}</ref>\n' +
        '<ref name=":2">{{cite web|title=Year source}}</ref>\n' +
        '<ref name=":3">{{cite web|title=Developer source}}</ref>\n' +
        '<ref name=":4">{{cite web|title=Publisher source}}</ref>\n' +
        '<ref name=":5">{{cite web|title=Genre source}}</ref>\n' +
        '<ref name=":6">{{cite web|title=Platform source}}</ref>\n' +
        "</references>",
    ),
    true,
  );
});

test("explicit sort key renders above the first category", async () => {
  const text = await buildStubText({
    developers: "Foo Studio",
    genres: "RPG",
    name: "Example",
    platforms: "PC",
    publishers: "Bar Games",
    sortKey: "Custom Key",
    year: "2024",
  });

  assert.equal(
    text.includes(
      "\n\n{{DEFAULTSORT:Custom Key}}\n[[Category:電子角色扮演遊戲]]",
    ),
    true,
  );
});

test("official name rows render vgn refs in the infobox", async () => {
  const text = await buildStubText({
    developers: "",
    genres: "",
    name: "Example",
    officialNames: [
      {
        hans: true,
        hant: true,
        name: "Official",
        sourceUrl: "https://example.test/official",
        ww: true,
      },
    ],
    platforms: "",
    publishers: "",
    sourceReferences: [
      {
        citation: "{{cite web|title=Official source}}",
        key: "officialNames.0",
      },
    ],
    year: "",
  });

  assert.equal(
    text.startsWith(
      "{{NoteTA-lite\n" +
        "| G1 = Games\n" +
        "| zh-cn:Official; zh-tw:Official;\n" +
        "}}\n\n" +
        "{{Infobox VG\n" +
        "| title = Example\n" +
        '| official = {{vgn|ww:Official<ref name=":1" />|hans:Official<ref name=":1" />|hant:Official<ref name=":1" />}}\n' +
        "}}\n\n",
    ),
    true,
  );
  assert.equal(
    text.includes(
      '== 参考文献 ==\n\n<references responsive>\n<ref name=":1">{{cite web|title=Official source}}</ref>\n</references>',
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
