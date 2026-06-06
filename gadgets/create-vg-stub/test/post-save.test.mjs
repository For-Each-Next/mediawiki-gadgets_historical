import assert from "node:assert/strict";
import test from "node:test";

import {
  TALK_PAGE_BANNER,
  addTalkPageBanner,
  buildPostSaveActions,
  buildRedirectTitles,
  connectWikidataSitelink,
  createRedirect,
  fetchExistingPageTitles,
  runPostSaveActions,
} from "../src/post-save.js";
import { EDIT_SUMMARY_SUFFIX } from "../src/edit-summary.js";

test("TALK_PAGE_BANNER is built in block template format", () => {
  assert.equal(
    TALK_PAGE_BANNER,
    "{{WikiProject banner shell\n" +
      "| class = unassessed\n" +
      "| 1 = {{WikiProject Video games}}\n" +
      "}}",
  );
});

test("buildRedirectTitles returns unique localized aliases", () => {
  assert.deepEqual(
    buildRedirectTitles(
      {
        localizedNames: [
          { hant: true, name: "示例遊戲" },
          { hans: true, name: "示例游戏" },
          { name: "示例遊戲" },
          { name: "English Name", ww: true },
          { name: " Example ", ww: true },
        ],
      },
      "Example",
    ),
    ["示例遊戲", "示例游戏"],
  );
});

test("buildPostSaveActions includes interwiki, redirects, and talk banner", () => {
  assert.deepEqual(
    buildPostSaveActions({
      form: {
        localizedNames: [{ name: "示例遊戲" }],
        wikidataId: " Q123 ",
      },
      title: "Example",
    }).map((action) => [action.type, action.selected]),
    [
      ["interwiki", true],
      ["redirect", true],
      ["talk-banner", true],
    ],
  );
});

test("buildPostSaveActions hints existing redirects and unchecks them", () => {
  const actions = buildPostSaveActions(
    {
      form: {
        localizedNames: [
          { hant: true, name: "示例遊戲" },
          { hans: true, name: "示例游戏" },
        ],
      },
      title: "Example",
    },
    ["示例遊戲"],
  );
  const redirects = actions.filter((action) => action.type === "redirect");

  assert.deepEqual(
    redirects.map((action) => [
      action.redirectTitle,
      action.exists,
      action.selected,
      action.label,
    ]),
    [
      ["示例遊戲", true, false, "Redirect: 示例遊戲 (page already exists)"],
      [
        "示例游戏",
        false,
        true,
        "Redirect other Chinese name: 示例游戏 -> Example",
      ],
    ],
  );
});

test("fetchExistingPageTitles returns only existing pages", async () => {
  const calls = [];
  const api = createApiStub(calls, {
    query: {
      pages: {
        "-1": {
          missing: "",
          title: "不存在",
        },
        12: {
          pageid: 12,
          title: "已存在",
        },
      },
    },
  });

  assert.deepEqual(
    await fetchExistingPageTitles(api, ["已存在", "不存在"]),
    ["已存在"],
  );
  assert.deepEqual(calls[0], [
    "get",
    {
      action: "query",
      titles: "已存在|不存在",
    },
  ]);
});

test("connectWikidataSitelink posts the zhwiki sitelink", async () => {
  const calls = [];
  const api = createApiStub(calls);

  await connectWikidataSitelink(api, "Q123", "示例");

  assert.deepEqual(calls[0], [
    "postWithToken",
    "csrf",
    {
      action: "wbsetsitelink",
      id: "Q123",
      linksite: "zhwiki",
      linktitle: "示例",
      summary: `Connect zhwiki sitelink to [[示例]] ${EDIT_SUMMARY_SUFFIX}`,
    },
  ]);
});

test("createRedirect uses createonly and redirect wikitext", async () => {
  const calls = [];
  const api = createApiStub(calls);

  await createRedirect(api, "示例游戏", "示例");

  assert.deepEqual(calls[0][2], {
    action: "edit",
    createonly: true,
    summary: `Redirect to [[示例]] ${EDIT_SUMMARY_SUFFIX}`,
    text: "#REDIRECT [[示例]]",
    title: "示例游戏",
  });
});

test("addTalkPageBanner appends the requested banner", async () => {
  const calls = [];
  const api = createApiStub(calls, {
    query: {
      pages: {
        1: {
          revisions: [{ slots: { main: { content: "{{Other banner}}" } } }],
        },
      },
    },
  });

  await addTalkPageBanner(api, "示例");

  assert.equal(calls[1][2].title, "Talk:示例");
  assert.equal(calls[1][2].appendtext, `\n\n${TALK_PAGE_BANNER}`);
  assert.equal(
    calls[1][2].summary,
    `Add WikiProject Video games banner ${EDIT_SUMMARY_SUFFIX}`,
  );
});

test("addTalkPageBanner skips an existing video game banner", async () => {
  const calls = [];
  const api = createApiStub(calls, {
    query: {
      pages: {
        1: {
          revisions: [
            {
              slots: {
                main: { content: "{{WikiProject Video games}}" },
              },
            },
          ],
        },
      },
    },
  });

  await addTalkPageBanner(api, "示例");

  assert.equal(calls.length, 1);
});

test("runPostSaveActions only runs selected rows", async () => {
  const calls = [];
  const api = createApiStub(calls);
  const actions = [
    {
      selected: false,
      type: "redirect",
      redirectTitle: "Skipped",
    },
    {
      selected: true,
      type: "redirect",
      redirectTitle: "Created",
    },
  ];

  await runPostSaveActions(
    actions,
    {
      api,
      title: "Target",
    },
  );

  assert.equal(calls.length, 1);
  assert.equal(calls[0][2].title, "Created");
  assert.equal(actions[1].selected, false);
});

test("runPostSaveActions uses the Wikidata API for interwiki edits", async () => {
  const localCalls = [];
  const wikidataCalls = [];

  await runPostSaveActions(
    [
      {
        selected: true,
        type: "interwiki",
        wikidataId: "Q123",
      },
    ],
    {
      api: createApiStub(localCalls),
      title: "Target",
      wikidataApi: createApiStub(wikidataCalls),
    },
  );

  assert.equal(localCalls.length, 0);
  assert.equal(wikidataCalls[0][2].action, "wbsetsitelink");
});

function createApiStub(calls, getResponse = { query: { pages: {} } }) {
  return {
    async get(params) {
      calls.push(["get", params]);
      return getResponse;
    },
    async postWithToken(token, params) {
      calls.push(["postWithToken", token, params]);
    },
  };
}
