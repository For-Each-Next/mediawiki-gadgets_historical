/**
 * Tests English Wikipedia to zhwiki creation handoff helpers.
 */

import assert from "node:assert/strict";
import test from "node:test";

import {
    buildZhwikiCreationTitle,
    buildZhwikiCreationUrl,
    readZhwikiActivationForm,
    removeEnwikiVideoGameSuffix,
    resolveZhwikiCreationTitle,
} from "../src/sources/zhwiki-activation.js";

test("removeEnwikiVideoGameSuffix removes only the trailing suffix", () => {
    assert.equal(
        removeEnwikiVideoGameSuffix("Example Game (video game)"),
        "Example Game",
    );
    assert.equal(
        removeEnwikiVideoGameSuffix("Example Game (Video Game)"),
        "Example Game",
    );
    assert.equal(
        removeEnwikiVideoGameSuffix("Example (video game) soundtrack"),
        "Example (video game) soundtrack",
    );
});

test("buildZhwikiCreationTitle uses the English title without video-game suffix", () => {
    assert.equal(
        buildZhwikiCreationTitle("Example Game (video game)"),
        "Example Game",
    );
});

test("resolveZhwikiCreationTitle keeps a missing base title", async () => {
    const api = createPageApi({ missing: true, title: "Example Game" });

    assert.equal(
        await resolveZhwikiCreationTitle("Example Game (video game)", api),
        "Example Game",
    );
});

test("resolveZhwikiCreationTitle adds Chinese disambiguation on title clash", async () => {
    const api = createPageApi({ pageid: 1, title: "Example Game" });

    assert.equal(
        await resolveZhwikiCreationTitle("Example Game (video game)", api),
        "Example Game (遊戲)",
    );
});

test("buildZhwikiCreationUrl carries the English title to zhwiki edit view", () => {
    const url = new URL(
        buildZhwikiCreationUrl(
            "Example Game (video game)",
            "Example Game (遊戲)",
        ),
    );

    assert.equal(url.origin, "https://zh.wikipedia.org");
    assert.equal(url.pathname, "/wiki/Example_Game_(%E9%81%8A%E6%88%B2)");
    assert.equal(url.searchParams.get("action"), "edit");
    assert.equal(url.searchParams.get("redlink"), "1");
    assert.equal(url.searchParams.get("create-vg-stub"), "1");
    assert.equal(
        url.searchParams.get("create-vg-stub-enwiki-title"),
        "Example Game (video game)",
    );
});

test("readZhwikiActivationForm reads the incoming enwiki title", () => {
    assert.deepEqual(
        readZhwikiActivationForm(
            "?action=edit&create-vg-stub=1&" +
                "create-vg-stub-enwiki-title=Example+Game",
        ),
        {
            enwikiTitle: "Example Game",
        },
    );
    assert.equal(readZhwikiActivationForm("?action=edit"), null);
});

function createPageApi(page) {
    return {
        async get(params) {
            assert.equal(params.action, "query");

            return {
                query: {
                    pages: [page],
                },
            };
        },
    };
}
