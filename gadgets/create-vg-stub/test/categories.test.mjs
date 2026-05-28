import assert from "node:assert/strict";
import test from "node:test";
import {
  buildCategoryLinks,
  buildCategoryRows,
  buildFallbackCategoryRows,
  createManualCategoryRow,
  resolveCategoryRows,
  resetGeneratedCategoryRows,
  updateCategoryRowCategory,
} from "../src/categories.js";

test("buildFallbackCategoryRows keeps generated metadata categories", () => {
  const rows = buildFallbackCategoryRows({
    companyMetadata: {
      categories: ["公司游戏"],
    },
    platformSeriesMetadata: {
      categories: ["平台游戏"],
    },
    yearGenreMetadata: {
      categories: ["公司游戏", "类型游戏"],
    },
  });

  assert.deepEqual(
    rows.map((row) => [row.source, row.category, row.status]),
    [
      ["known", "公司游戏", ""],
      ["known", "平台游戏", ""],
      ["known", "类型游戏", ""],
    ],
  );
});

test("buildCategoryLinks omits unchecked rows", () => {
  assert.deepEqual(
    buildCategoryLinks([
      {
        category: "保留分类",
        enabled: true,
      },
      {
        category: "跳过分类",
        enabled: false,
      },
    ]),
    ["[[Category:保留分类]]"],
  );
});

test("buildCategoryRows fetches company categories from API", async () => {
  const rows = await buildCategoryRows(
    {
      developers: "日本开发",
      publishers: "",
      series: "",
    },
    emptyParams(),
    [],
    {
      fetcher: createCategoryFetcher({
        日本开发电子游戏: "日本開發電子遊戲",
      }),
    },
  );

  assert.deepEqual(
    rows.map((row) => [row.enabled, row.source, row.category, row.status]),
    [[true, "found", "日本開發電子遊戲", "OK"]],
  );
});

test("buildCategoryRows falls back to unchecked suggested company categories", async () => {
  const rows = await buildCategoryRows(
    {
      developers: "Foo Studio",
      publishers: "",
      series: "",
    },
    emptyParams(),
    [],
    {
      fetcher: createCategoryFetcher({}),
    },
  );

  assert.deepEqual(
    rows.map((row) => [row.enabled, row.source, row.category, row.status]),
    [[false, "suggested", "Foo Studio游戏", ""]],
  );
});

test("buildCategoryRows generates company categories from wikilink display text", async () => {
  const rows = await buildCategoryRows(
    {
      developers: "[[Foo, Inc.|Foo Studio]], [[Bar Games]]",
      publishers: "",
      series: "",
    },
    emptyParams(),
    [],
    {
      fetcher: createCategoryFetcher({}),
    },
  );

  assert.deepEqual(
    rows.map((row) => [row.enabled, row.source, row.category, row.status]),
    [
      [false, "suggested", "Foo Studio游戏", ""],
      [false, "suggested", "Bar Games游戏", ""],
    ],
  );
});

test("buildCategoryRows checks all generated candidates in one request", async () => {
  const fetchedTitles = [];
  const rows = await buildCategoryRows(
    {
      developers: "日本开发",
      publishers: "",
      series: "塞尔达传说",
    },
    emptyParams({
      platformSeriesCategories: ["PlayStation 5游戏"],
      yearGenreCategories: ["2026年电子游戏"],
    }),
    [],
    {
      fetcher: createCategoryFetcher(
        {
          PlayStation: "PlayStation",
          "PlayStation 5游戏": "PlayStation 5遊戲",
          塞尔达传说系列游戏: "薩爾達傳說系列遊戲",
          "2026年电子游戏": "2026年電子遊戲",
          日本开发电子游戏: "日本開發電子遊戲",
        },
        fetchedTitles,
      ),
    },
  );

  assert.deepEqual(
    rows.map((row) => [row.source, row.category]),
    [
      ["found", "日本開發電子遊戲"],
      ["found", "薩爾達傳說系列遊戲"],
      ["known", "PlayStation 5遊戲"],
      ["known", "2026年電子遊戲"],
    ],
  );
  assert.equal(fetchedTitles.length, 1);
  assert.deepEqual(fetchedTitles[0], [
    "日本开发电子游戏",
    "日本开发游戏",
    "日本开发",
    "塞尔达传说系列电子游戏",
    "塞尔达传说系列游戏",
    "塞尔达传说系列",
    "塞尔达传说电子游戏",
    "塞尔达传说游戏",
    "塞尔达传说",
    "PlayStation 5游戏",
    "2026年电子游戏",
  ]);
});

test("buildCategoryRows preserves manual rows and edited generated rows", async () => {
  const manual = {
    ...createManualCategoryRow(),
    category: "手动分类",
  };
  const rows = await buildCategoryRows(
    {
      developers: "Foo Studio",
      publishers: "",
      series: "",
    },
    emptyParams(),
    [
      {
        category: "改后分类",
        enabled: false,
        originalCategory: "Foo Studio游戏",
        source: "suggested",
      },
      manual,
    ],
    {
      fetcher: createCategoryFetcher({}),
    },
  );

  assert.deepEqual(
    rows.map((row) => [row.enabled, row.source, row.category, row.status]),
    [
      [false, "suggested †", "改后分类", "Not exists"],
      [true, "manual", "手动分类", "Not exists"],
    ],
  );
});

test("resetGeneratedCategoryRows resets generated rows but keeps manual rows", () => {
  assert.deepEqual(
    resetGeneratedCategoryRows([
      {
        category: "改后分类",
        enabled: false,
        originalCategory: "Foo Studio游戏",
        source: "suggested †",
        status: "Not exists",
      },
      {
        category: "手动分类",
        enabled: true,
        originalCategory: "手动分类",
        source: "manual",
        status: "OK",
      },
    ]).map((row) => [row.enabled, row.source, row.category, row.status]),
    [
      [false, "suggested", "Foo Studio游戏", ""],
      [true, "manual", "手动分类", "OK"],
    ],
  );
});

test("updateCategoryRowCategory updates the modified marker immediately", () => {
  const row = {
    category: "Foo Studio游戏",
    originalCategory: "Foo Studio游戏",
    source: "suggested",
  };

  const edited = updateCategoryRowCategory(row, "改后分类");
  const restored = updateCategoryRowCategory(edited, "Foo Studio游戏");

  assert.equal(edited.source, "suggested †");
  assert.equal(restored.source, "suggested");
});

test("resolveCategoryRows applies converted category titles", async () => {
  const rows = await resolveCategoryRows(
    [
      {
        category: "日本开发电子游戏",
        source: "manual added",
      },
    ],
    {
      fetcher: createCategoryFetcher({
        日本开发电子游戏: "日本開發電子遊戲",
      }),
    },
  );

  assert.equal(rows[0].category, "日本開發電子遊戲");
});

test("resolveCategoryRows follows category redirect targets", async () => {
  const rows = await resolveCategoryRows(
    [
      {
        category: "旧分类",
        source: "manual added",
      },
    ],
    {
      fetcher: createRedirectCategoryFetcher({
        旧分类: "新分類",
      }),
    },
  );

  assert.equal(rows[0].category, "新分類");
});

function emptyParams(options = {}) {
  return {
    companyMetadata: {
      categories: [],
    },
    platformSeriesMetadata: {
      categories: options.platformSeriesCategories || [],
    },
    yearGenreMetadata: {
      categories: options.yearGenreCategories || [],
    },
  };
}

function createCategoryFetcher(existing, fetchedTitles) {
  return async (url) => {
    const titles = new URL(url, "https://zh.wikipedia.org").searchParams
      .get("titles")
      .split("|")
      .map((title) => title.replace(/^Category:/u, ""));
    fetchedTitles?.push(titles);
    const pages = titles
      .filter((title) => existing[title] != null)
      .map((title, index) => ({
        pageid: index + 1,
        title: `Category:${existing[title]}`,
      }));
    const converted = titles
      .filter((title) => existing[title] != null && existing[title] !== title)
      .map((title) => ({
        from: `Category:${title}`,
        to: `Category:${existing[title]}`,
      }));

    return {
      ok: true,
      json: async () => ({
        query: {
          converted,
          pages,
        },
      }),
    };
  };
}

function createRedirectCategoryFetcher(redirects) {
  return async (url) => {
    const titles = new URL(url, "https://zh.wikipedia.org").searchParams
      .get("titles")
      .split("|")
      .map((title) => title.replace(/^Category:/u, ""));
    const pages = titles.map((title, index) => {
      const redirectTarget = redirects[title];

      if (redirectTarget == null) {
        return {
          pageid: index + 1,
          title: `Category:${title}`,
        };
      }

      return {
        pageid: index + 1,
        pageprops: {
          category_redirect_target: `Category:${redirectTarget}`,
        },
        title: `Category:${title}`,
      };
    });

    return {
      ok: true,
      json: async () => ({
        query: {
          pages,
        },
      }),
    };
  };
}
