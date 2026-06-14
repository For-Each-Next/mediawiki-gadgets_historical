/**
 * Tests pre-save follow-up actions.
 */

import assert from "node:assert/strict";
import test from "node:test";

import {
    TALK_PAGE_BANNER,
    addTalkPageBanner,
    buildPreSaveActions,
    buildRedirectTitles,
    buildTitleFix,
    connectWikidataSitelink,
    createRedirect,
    fetchExistingPageTitles,
    movePage,
    runSelectedActions,
} from "../src/editing/pre-save.js";
import { EDIT_SUMMARY_SUFFIX } from "../src/editing/summary.js";

test("TALK_PAGE_BANNER is built in block template format", () => {
    assert.equal(
        TALK_PAGE_BANNER,
        "{{WikiProject banner shell\n" +
            "| class = stub\n" +
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

test("buildRedirectTitles includes original and English names", () => {
    assert.deepEqual(
        buildRedirectTitles(
            {
                englishName: "Example Game",
                localizedNames: [{ hans: true, name: "示例游戏" }],
                originalName: "ja:サンプルゲーム",
            },
            "示例遊戲",
        ),
        ["サンプルゲーム", "Example Game", "示例游戏"],
    );
});

test("buildPreSaveActions includes interwiki, redirects, and talk banner", () => {
    assert.deepEqual(
        buildPreSaveActions({
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

test("buildPreSaveActions includes staged category creation", () => {
    const actions = buildPreSaveActions({
        form: {
            categoryRows: [
                {
                    category: "Chibig游戏",
                    company: "Chibig",
                    enabled: true,
                    pendingCreation: {
                        englishName: "Category:Chibig games",
                        text: "Category text",
                    },
                },
            ],
        },
        title: "Example",
    });
    const category = actions.find((action) => action.type === "category");

    assert.deepEqual(category, {
        category: "Chibig游戏",
        company: "Chibig",
        englishName: "Category:Chibig games",
        id: "category:Chibig游戏",
        label: "Create category: Chibig游戏",
        selected: true,
        text: "Category text",
        type: "category",
    });
});

test("buildPreSaveActions hints existing redirects and unchecks them", () => {
    const actions = buildPreSaveActions(
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
            [
                "示例遊戲",
                true,
                false,
                "Redirect: 示例遊戲 (page already exists)",
            ],
            ["示例游戏", false, true, "Redirect name: 示例游戏 to Example"],
        ],
    );
});

test("buildTitleFix defaults an English title to the first Chinese name", () => {
    assert.deepEqual(
        buildTitleFix(
            {
                englishName: "Example Game",
                localizedNames: [
                    { hant: true, name: " 示例遊戲 " },
                    { hans: true, name: "示例游戏" },
                ],
                originalName: "ja:サンプルゲーム",
            },
            "Example Game",
        ),
        {
            enabled: true,
            to: "示例遊戲",
        },
    );
});

test("buildTitleFix stays disabled for a Chinese title", () => {
    assert.deepEqual(
        buildTitleFix(
            {
                localizedNames: [{ hans: true, name: "示例游戏" }],
            },
            "示例遊戲",
        ),
        {
            enabled: false,
            to: "示例遊戲",
        },
    );
});

test("buildTitleFix stays disabled without a Chinese name", () => {
    assert.deepEqual(buildTitleFix({}, "Example Game"), {
        enabled: false,
        to: "Example Game",
    });
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
            summary: `Connect zhwiki sitelink to [[:w:zh:示例]] ${EDIT_SUMMARY_SUFFIX}`,
        },
    ]);
});

test("connectWikidataSitelink uses an interwiki category summary link", async () => {
    const calls = [];
    const api = createApiStub(calls);

    await connectWikidataSitelink(
        api,
        "Q123",
        "Category:Private Division游戏",
    );

    assert.equal(
        calls[0][2].summary,
        `Connect zhwiki sitelink to [[:w:zh:Category:Private Division游戏]] ${EDIT_SUMMARY_SUFFIX}`,
    );
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
                    revisions: [
                        { slots: { main: { content: "{{Other banner}}" } } },
                    ],
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
                                main: {
                                    content: "{{WikiProject Video games}}",
                                },
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

test("addTalkPageBanner uses the category talk namespace", async () => {
    const calls = [];
    const api = createApiStub(calls, {
        query: {
            pages: {
                "-1": {
                    missing: "",
                    title: "Category talk:示例游戏",
                },
            },
        },
    });

    await addTalkPageBanner(api, "Category:示例游戏");

    assert.equal(calls[0][1].titles, "Category talk:示例游戏");
    assert.equal(calls[1][2].title, "Category talk:示例游戏");
});

test("runSelectedActions only runs selected rows", async () => {
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

    const result = await runSelectedActions(actions, {
        api,
        title: "Target",
    });

    assert.equal(calls.length, 1);
    assert.equal(calls[0][2].title, "Created");
    assert.equal(actions[1].selected, false);
    assert.equal(result.title, "Target");
});

test("runSelectedActions uses the Wikidata API for interwiki edits", async () => {
    const localCalls = [];
    const wikidataCalls = [];

    await runSelectedActions(
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

test("runSelectedActions creates staged categories", async () => {
    const calls = [];

    await runSelectedActions(
        [
            {
                category: "Chibig游戏",
                company: "Chibig",
                englishName: "Category:Chibig games",
                selected: true,
                text: "Category text",
                type: "category",
            },
        ],
        {
            api: createApiStub([]),
            async saveCompanyCategory(...args) {
                calls.push(args);
            },
            title: "Target",
        },
    );

    assert.deepEqual(calls, [
        ["Chibig游戏", "Category text", "Category:Chibig games"],
    ]);
});

test("movePage can leave or suppress the source redirect", async () => {
    const calls = [];
    const api = createApiStub(calls);

    await movePage(api, "Old", "New", {
        leaveRedirect: true,
    });
    await movePage(api, "Old 2", "New 2", {
        leaveRedirect: false,
    });

    assert.deepEqual(calls[0][2], {
        action: "move",
        from: "Old",
        reason: `Rename to [[New]] ${EDIT_SUMMARY_SUFFIX}`,
        to: "New",
    });
    assert.equal(calls[1][2].noredirect, true);
});

test("runSelectedActions moves first and targets the final title", async () => {
    const localCalls = [];
    const wikidataCalls = [];
    const actions = [
        {
            redirectTitle: "New",
            selected: true,
            type: "redirect",
        },
        {
            redirectTitle: "Alias",
            selected: true,
            type: "redirect",
        },
        {
            selected: true,
            type: "interwiki",
            wikidataId: "Q123",
        },
    ];

    const result = await runSelectedActions(actions, {
        api: createApiStub(localCalls),
        move: {
            enabled: true,
            leaveRedirect: false,
            to: "New",
        },
        title: "Old",
        wikidataApi: createApiStub(wikidataCalls),
    });

    assert.equal(localCalls[0][2].action, "move");
    assert.equal(localCalls[1][2].title, "Alias");
    assert.equal(localCalls[1][2].text, "#REDIRECT [[New]]");
    assert.equal(wikidataCalls[0][2].linktitle, "New");
    assert.equal(actions[0].selected, false);
    assert.equal(result.title, "New");
});

test("runSelectedActions reports a completed move before later edits", async () => {
    const calls = [];
    let movedTitle = "";
    const api = {
        async get() {
            return {
                query: {
                    pages: {},
                },
            };
        },
        async postWithToken(_token, params) {
            calls.push(params);

            if (params.action === "edit") {
                throw new Error("Edit failed");
            }
        },
    };

    await assert.rejects(
        runSelectedActions(
            [
                {
                    redirectTitle: "Alias",
                    selected: true,
                    type: "redirect",
                },
            ],
            {
                api,
                move: {
                    enabled: true,
                    leaveRedirect: true,
                    to: "New",
                },
                onMoveComplete(title) {
                    movedTitle = title;
                },
                title: "Old",
            },
        ),
        /Edit failed/u,
    );

    assert.equal(calls[0].action, "move");
    assert.equal(movedTitle, "New");
});

test("runSelectedActions reports live action progress", async () => {
    const events = [];
    const action = {
        id: "redirect:Alias",
        redirectTitle: "Alias",
        selected: true,
        type: "redirect",
    };

    await runSelectedActions([action], {
        api: createApiStub([]),
        onActionComplete(item) {
            events.push(["complete", item.id]);
        },
        onActionStart(item) {
            events.push(["start", item.id]);
        },
        title: "Target",
    });

    assert.deepEqual(events, [
        ["start", "redirect:Alias"],
        ["complete", "redirect:Alias"],
    ]);
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
