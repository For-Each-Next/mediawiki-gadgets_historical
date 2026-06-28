/**
 * Tests series navbox resolution.
 */

import assert from "node:assert/strict";
import test from "node:test";

import {
    resolveNavboxTitles,
    resolveReviewedNavboxRows,
} from "../src/handlers/navboxes.js";
import {
    buildNavboxText,
    buildReviewedNavboxText,
} from "../src/wikitext/navboxes.js";

test("buildNavboxText uses the first existing series navbox candidate", async () => {
    const titles = await resolveNavboxTitles("Foo", {
        fetcher: createTemplateFetcher(["Template:Foo电子游戏"]),
    });
    const text = buildNavboxText(titles);

    assert.equal(text, "{{Foo电子游戏}}");
});

test("buildNavboxText resolves converted template titles", async () => {
    const titles = await resolveNavboxTitles("电子游戏", {
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
    const text = buildNavboxText(titles);

    assert.equal(text, "{{電子遊戲系列電子遊戲}}");
});

test("buildNavboxText handles multiple series and omits missing navboxes", async () => {
    const titles = await resolveNavboxTitles("Foo; Bar; Baz", {
        fetcher: createTemplateFetcher([
            "Template:Foo系列电子游戏",
            "Template:Bar系列",
        ]),
    });
    const text = buildNavboxText(titles);

    assert.equal(text, "{{Foo系列电子游戏}}\n{{Bar系列}}");
});

test("buildReviewedNavboxText omits unchecked review rows", () => {
    assert.equal(
        buildReviewedNavboxText([
            { enabled: true, text: "{{Foo series}}" },
            { enabled: false, text: "{{Bar series}}" },
            { text: " Baz series " },
        ]),
        "{{Foo series}}\n{{Baz series}}",
    );
});

test("buildReviewedNavboxText wraps bare textbox titles in template braces", () => {
    assert.equal(
        buildReviewedNavboxText([
            { text: "最终幻想系列" },
            { text: "{{Foo series|state=collapsed}}" },
        ]),
        "{{最终幻想系列}}\n{{Foo series|state=collapsed}}",
    );
});

test("resolveReviewedNavboxRows applies converted titles and preserves parameters", async () => {
    const rows = await resolveReviewedNavboxRows(
        [{ enabled: false, text: "{{电子游戏系列|state=collapsed}}" }],
        {
            fetcher: createTemplateFetcher(
                ["Template:電子遊戲系列"],
                [
                    {
                        from: "Template:电子游戏系列",
                        to: "Template:電子遊戲系列",
                    },
                ],
            ),
        },
    );

    assert.deepEqual(rows, [
        {
            enabled: false,
            status: "OK",
            text: "{{電子遊戲系列|state=collapsed}}",
            title: "電子遊戲系列",
        },
    ]);
});

test("resolveReviewedNavboxRows follows template redirects", async () => {
    const rows = await resolveReviewedNavboxRows(["{{Old series}}"], {
        fetcher: createTemplateFetcher(
            ["Template:New series"],
            [],
            [
                {
                    from: "Template:Old series",
                    to: "Template:New series",
                },
            ],
        ),
    });

    assert.equal(rows[0].status, "OK");
    assert.equal(rows[0].text, "{{New series}}");
    assert.equal(rows[0].title, "New series");
});

test("resolveReviewedNavboxRows replaces a bare textbox title", async () => {
    const rows = await resolveReviewedNavboxRows(["最終幻想系列"], {
        fetcher: createTemplateFetcher(
            ["Template:最终幻想系列"],
            [
                {
                    from: "Template:最終幻想系列",
                    to: "Template:最终幻想系列",
                },
            ],
        ),
    });

    assert.deepEqual(rows, [
        {
            enabled: true,
            status: "OK",
            text: "最终幻想系列",
            title: "最终幻想系列",
        },
    ]);
});

test("resolveReviewedNavboxRows preserves exact converted variants", async () => {
    const rows = await resolveReviewedNavboxRows(["示例游戏", "示例遊戲"], {
        fetcher: createTemplateFetcher(
            ["Template:示例游戏", "Template:示例遊戲"],
            [
                {
                    from: "Template:示例游戏",
                    to: "Template:示例游戏",
                    variant: "zh-hans",
                },
                {
                    from: "Template:示例游戏",
                    to: "Template:示例遊戲",
                    variant: "zh-hant",
                },
                {
                    from: "Template:示例遊戲",
                    to: "Template:示例游戏",
                    variant: "zh-hans",
                },
                {
                    from: "Template:示例遊戲",
                    to: "Template:示例遊戲",
                    variant: "zh-hant",
                },
            ],
            [],
            {
                directMissing: true,
            },
        ),
    });

    assert.equal(rows[0].status, "OK");
    assert.equal(rows[0].text, "示例游戏");
    assert.equal(rows[0].title, "示例游戏");
    assert.equal(rows[1].status, "OK");
    assert.equal(rows[1].text, "示例遊戲");
    assert.equal(rows[1].title, "示例遊戲");
});

test("resolveReviewedNavboxRows fixes mixed converted variants", async () => {
    const rows = await resolveReviewedNavboxRows(["示例遊戏"], {
        fetcher: createTemplateFetcher(
            ["Template:示例游戏", "Template:示例遊戲"],
            [
                {
                    from: "Template:示例遊戏",
                    to: "Template:示例游戏",
                    variant: "zh-hans",
                },
                {
                    from: "Template:示例遊戏",
                    to: "Template:示例遊戲",
                    variant: "zh-hant",
                },
            ],
            [],
            {
                directMissing: true,
            },
        ),
    });

    assert.equal(rows[0].status, "OK");
    assert.equal(rows[0].text, "示例遊戲");
    assert.equal(rows[0].title, "示例遊戲");
});

function createTemplateFetcher(
    existingTitles,
    converted = [],
    redirects = [],
    fetcherOptions = {},
) {
    return async function fetcher(url, requestOptions) {
        assert.equal(requestOptions.headers.accept, "application/json");

        const params = new URL(url, "https://example.test").searchParams;
        const convertTitles = params.has("converttitles");
        const variant = params.get("variant");
        const titles = params.get("titles").split("|");
        const appliedConversions = [];
        const resolvedTitles = titles.map((title) => {
            const conversion = convertTitles
                ? converted.find(
                      (item) =>
                          item.from === title &&
                          (item.variant == null || item.variant === variant),
                  )
                : undefined;

            if (conversion != null) {
                appliedConversions.push(conversion);
            }

            const convertedTitle = conversion?.to || title;
            const redirect = redirects.find(
                (item) => item.from === convertedTitle,
            );

            return redirect?.to || convertedTitle;
        });

        return {
            ok: true,
            async json() {
                return {
                    query: {
                        converted: appliedConversions,
                        redirects,
                        pages: resolvedTitles.map((title) => ({
                            missing:
                                !convertTitles && fetcherOptions.directMissing
                                    ? true
                                    : existingTitles.includes(title)
                                      ? undefined
                                      : true,
                            title,
                        })),
                    },
                };
            },
        };
    };
}
