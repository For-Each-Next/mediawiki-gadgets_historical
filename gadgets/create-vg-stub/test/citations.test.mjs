import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCiteTemplate,
  buildCitoidUrl,
  fetchCiteTemplate,
} from "../src/citations.js";

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
