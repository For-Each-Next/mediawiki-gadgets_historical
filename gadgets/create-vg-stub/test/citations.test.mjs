import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCiteTemplate,
  buildCitoidUrl,
  fetchCiteTemplate,
} from "../src/citations.js";

const RULES = [
  {
    fixes: [
      {
        action: "omit",
        field: "author",
        operand: "巴哈姆特",
      },
    ],
    host: "gnn.gamer.com.tw",
  },
  {
    fixes: [
      {
        action: "omit",
        field: "date",
      },
    ],
    host: "opencritic.com",
  },
  {
    fixes: [
      {
        action: "rstrip",
        field: "title",
        operand: " - Metacritic",
      },
    ],
    host: "www.metacritic.com",
  },
  {
    fixes: [
      {
        action: "preserve-source-query",
        field: "url",
        operand: ["l"],
      },
    ],
    host: "store.steampowered.com",
  },
];

test("buildCitoidUrl encodes the source URL", () => {
  assert.equal(
    buildCitoidUrl("https://example.test/a page?x=1&y=2"),
    "/api/rest_v1/data/citation/zotero/https%3A%2F%2Fexample.test%2Fa%20page%3Fx%3D1%26y%3D2",
  );
});

test("buildCiteTemplate formats Zotero metadata as cite web", () => {
  const text = buildCiteTemplate(
    {
      creators: [
        {
          creatorType: "author",
          firstName: "Ada",
          lastName: "Lovelace",
        },
      ],
      date: "2025-01-02",
      itemType: "webpage",
      language: "en",
      title: "Example | Title",
      url: "https://example.test/article",
      websiteTitle: "Example Site",
    },
    {
      now: new Date("2026-05-24T00:00:00Z"),
    },
  );

  assert.equal(
    text,
    "{{cite web|access-date=2026-05-24|author=Ada Lovelace|date=2025-01-02|language=en|title=Example {{!}} Title|url=https://example.test/article|website=Example Site}}",
  );
});

test("fetchCiteTemplate fetches Citoid data and formats the first item", async () => {
  const text = await fetchCiteTemplate("https://example.test/article", {
    fetcher(url, options) {
      assert.equal(
        url,
        "/api/rest_v1/data/citation/zotero/https%3A%2F%2Fexample.test%2Farticle",
      );
      assert.deepEqual(options.headers, {
        accept: "application/json",
      });

      return {
        async json() {
          return [
            {
              itemType: "webpage",
              title: "Example",
              url: "https://example.test/article",
            },
          ];
        },
        ok: true,
      };
    },
    now: new Date("2026-05-24T00:00:00Z"),
  });

  assert.equal(
    text,
    "{{cite web|access-date=2026-05-24|title=Example|url=https://example.test/article}}",
  );
});

test("buildCiteTemplate removes Gamer author by host rule", () => {
  const text = buildCiteTemplate(
    {
      creators: [
        {
          creatorType: "author",
          name: "巴哈姆特",
        },
      ],
      itemType: "webpage",
      title: "GNN article",
      url: "https://gnn.gamer.com.tw/detail.php?sn=123",
    },
    {
      now: new Date("2026-05-24T00:00:00Z"),
      rules: RULES,
    },
  );

  assert.equal(text.includes("|author="), false);
});

test("buildCiteTemplate omits OpenCritic date by host rule", () => {
  const text = buildCiteTemplate(
    {
      date: "2026-01-02",
      itemType: "webpage",
      title: "Review",
      url: "https://opencritic.com/game/1/example",
    },
    {
      now: new Date("2026-05-24T00:00:00Z"),
      rules: RULES,
    },
  );

  assert.equal(text.includes("|date="), false);
});

test("buildCiteTemplate strips Metacritic title suffix by host rule", () => {
  const text = buildCiteTemplate(
    {
      itemType: "webpage",
      title: "Example Reviews - Metacritic",
      url: "https://www.metacritic.com/game/example/",
    },
    {
      now: new Date("2026-05-24T00:00:00Z"),
      rules: RULES,
    },
  );

  assert.equal(text.includes("|title=Example Reviews|"), true);
});

test("fetchCiteTemplate restores Steam source query by host rule", async () => {
  const text = await fetchCiteTemplate(
    "https://store.steampowered.com/app/123/example/?l=schinese&utm_source=test",
    {
      fetcher() {
        return {
          async json() {
            return [
              {
                itemType: "webpage",
                title: "Example on Steam",
                url: "https://store.steampowered.com/app/123/example/",
              },
            ];
          },
          ok: true,
        };
      },
      now: new Date("2026-05-24T00:00:00Z"),
      rules: RULES,
    },
  );

  assert.equal(
    text.includes("https://store.steampowered.com/app/123/example/?l=schinese"),
    true,
  );
  assert.equal(text.includes("utm_source"), false);
});

test("fetchCiteTemplate caches generated citation templates", async () => {
  const values = new Map();
  let fetchCount = 0;
  const storage = {
    getItem(key) {
      return values.get(key) || null;
    },
    setItem(key, value) {
      values.set(key, value);
    },
  };
  const options = {
    fetcher() {
      fetchCount += 1;

      return {
        async json() {
          return [
            {
              itemType: "webpage",
              title: "Cached",
              url: "https://example.test/cached",
            },
          ];
        },
        ok: true,
      };
    },
    now: new Date("2026-05-24T00:00:00Z"),
    storage,
  };
  const first = await fetchCiteTemplate("https://example.test/cached", options);
  const second = await fetchCiteTemplate("https://example.test/cached", options);

  assert.equal(first, second);
  assert.equal(fetchCount, 1);
});
