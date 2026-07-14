/* eslint-disable */

/**
 * Tests MediaWiki API helpers for talk assessment.
 */

import assert from "node:assert/strict";
import test from "node:test";

import {
    fetchPageCreationTimes,
    fetchSubjectPageInfo,
    saveTalkAssessment,
} from "../../src/vg-page-assessor/src/api.js";

const projectConfig = {
    otherProjects: [],
    videoGames: {
        classParameter: "class",
        importanceParameter: "importance",
        taskForces: [],
        template: "WikiProject Video games",
    },
};

test("fetches redirect target creation date for ordering", async () => {
    const calls = [];
    const api = {
        async get(params) {
            calls.push(params);

            if (params.prop === "info") {
                assert.equal(params.redirects, undefined);

                return {
                    query: {
                        pages: [
                            {
                                ns: 0,
                                title: "Redirect",
                            },
                        ],
                    },
                };
            }

            if (params.rvprop === "content") {
                assert.equal(params.redirects, undefined);

                return {
                    query: {
                        pages: [
                            {
                                title: "Redirect",
                                revisions: [
                                    {
                                        slots: {
                                            main: {
                                                content: "#REDIRECT [[Target]]",
                                            },
                                        },
                                    },
                                ],
                            },
                        ],
                    },
                };
            }

            if (params.prop === "revisions") {
                assert.equal(params.redirects, undefined);

                return {
                    query: {
                        pages: [
                            {
                                title: "Target",
                                revisions: [
                                    {
                                        timestamp: "2026-06-15T00:00:00Z",
                                    },
                                ],
                            },
                        ],
                    },
                };
            }
        },
    };

    const info = await fetchSubjectPageInfo(api, "Redirect");

    assert.equal(info.isRedirect, true);
    assert.equal(info.targetTitle, "Target");
    assert.equal(info.creationDate.toISOString(), "2026-06-15T00:00:00.000Z");
    assert.deepEqual(
        calls.map((call) => call.rvprop || call.prop),
        ["info", "content", "timestamp"],
    );
});

test("fetches creation times in a same-namespace batch", async () => {
    const calls = [];
    const api = {
        async get(params) {
            calls.push(params);

            if (params.rvprop === "content") {
                assert.equal(params.redirects, undefined);

                return {
                    query: {
                        pages: [
                            {
                                title: params.titles,
                                revisions: [
                                    {
                                        slots: {
                                            main: {
                                                content:
                                                    params.titles === "Redirect"
                                                        ? "#REDIRECT [[Target]]"
                                                        : "",
                                            },
                                        },
                                    },
                                ],
                            },
                        ],
                    },
                };
            }

            assert.equal(params.prop, "revisions");
            assert.equal(params.redirects, undefined);

            return {
                query: {
                    pages: params.titles.split("|").map((title) => ({
                            revisions: [
                                {
                                    timestamp:
                                        title === "Target"
                                            ? "2026-06-15T00:00:00Z"
                                            : "2026-06-16T00:00:00Z",
                                },
                            ],
                            title,
                        })),
                },
            };
        },
    };

    const times = await fetchPageCreationTimes(api, ["Redirect", "Plain"]);

    assert.equal(times.get("Redirect").toISOString(), "2026-06-15T00:00:00.000Z");
    assert.equal(times.get("Target").toISOString(), "2026-06-15T00:00:00.000Z");
    assert.equal(times.get("Plain").toISOString(), "2026-06-16T00:00:00.000Z");
    assert.deepEqual(
        calls.map((call) => call.rvprop),
        ["content", "content", "timestamp"],
    );
    assert.deepEqual(
        calls.filter((call) => call.rvprop === "timestamp").map((call) => call.titles),
        ["Target|Plain"],
    );
});

test("splits creation-time batches by namespace prefix", async () => {
    const calls = [];
    const api = {
        async get(params) {
            calls.push(params);

            if (params.rvprop === "content") {
                return {
                    query: {
                        pages: [
                            {
                                title: params.titles,
                                revisions: [
                                    {
                                        slots: {
                                            main: {
                                                content: "",
                                            },
                                        },
                                    },
                                ],
                            },
                        ],
                    },
                };
            }

            return {
                query: {
                    pages: params.titles.split("|").map((title) => ({
                        revisions: [
                            {
                                timestamp:
                                    title === "Plain"
                                        ? "2026-06-16T00:00:00Z"
                                        : "2026-06-17T00:00:00Z",
                            },
                        ],
                        title,
                    })),
                },
            };
        },
    };

    const times = await fetchPageCreationTimes(api, [
        "Plain",
        "Category:Example",
    ]);

    assert.equal(times.get("Plain").toISOString(), "2026-06-16T00:00:00.000Z");
    assert.equal(
        times.get("Category:Example").toISOString(),
        "2026-06-17T00:00:00.000Z",
    );
    assert.deepEqual(
        calls.filter((call) => call.rvprop === "timestamp").map((call) => call.titles),
        ["Plain", "Category:Example"],
    );
});

test("uses localStorage cached creation datetimes", async () => {
    const originalLocalStorage = globalThis.localStorage;
    const calls = [];
    const store = new Map([
        [
            "vg-page-assessor.creation-datetimes.v1",
            JSON.stringify({
                Cached: "2026-06-18T00:00:00.000Z",
            }),
        ],
    ]);

    globalThis.localStorage = {
        getItem(key) {
            return store.get(key) || null;
        },
        setItem(key, value) {
            store.set(key, value);
        },
    };

    try {
        const api = {
            async get(params) {
                calls.push(params);

                assert.equal(params.rvprop, "content");

                return {
                    query: {
                        pages: [
                            {
                                title: "Cached",
                                revisions: [
                                    {
                                        slots: {
                                            main: {
                                                content: "",
                                            },
                                        },
                                    },
                                ],
                            },
                        ],
                    },
                };
            },
        };

        const times = await fetchPageCreationTimes(api, ["Cached"]);

        assert.equal(
            times.get("Cached").toISOString(),
            "2026-06-18T00:00:00.000Z",
        );
        assert.deepEqual(
            calls.map((call) => call.rvprop),
            ["content"],
        );
    } finally {
        if (originalLocalStorage === undefined) {
            delete globalThis.localStorage;
        } else {
            globalThis.localStorage = originalLocalStorage;
        }
    }
});

test("creates a missing talk page without undefined edit params", async () => {
    const edits = [];
    const api = {
        async get() {
            return {
                curtimestamp: "2026-07-06T00:00:00Z",
                query: {
                    pages: [
                        {
                            missing: true,
                        },
                    ],
                },
            };
        },
        async postWithToken(token, params) {
            edits.push([token, params]);
        },
    };

    await saveTalkAssessment(
        api,
        "Talk:Example",
        {
            className: "Stub",
            importance: "",
            otherProjects: {},
            taskForces: {},
        },
        projectConfig,
    );

    assert.equal(edits.length, 1);
    assert.equal(edits[0][0], "csrf");
    assert.equal(edits[0][1].createonly, true);
    assert.equal(Object.values(edits[0][1]).includes(undefined), false);
    assert.equal(
        edits[0][1].text,
        "{{WikiProject banner shell|class=Stub|1=\n{{WikiProject Video games|importance=}}\n}}\n",
    );
});

test("saves manually edited preview text with custom summary", async () => {
    const edits = [];
    const api = {
        async get() {
            return {
                curtimestamp: "2026-07-06T00:00:00Z",
                query: {
                    pages: [
                        {
                            revisions: [
                                {
                                    slots: {
                                        main: {
                                            content:
                                                "{{WikiProject banner shell|class=Start|1=\n{{WikiProject Video games}}\n}}\n\n== 讨论 ==\n内容",
                                        },
                                    },
                                    timestamp: "2026-07-05T00:00:00Z",
                                },
                            ],
                        },
                    ],
                },
            };
        },
        async postWithToken(token, params) {
            edits.push([token, params]);
        },
    };

    await saveTalkAssessment(
        api,
        "Talk:Example",
        "{{Manual banner}}",
        projectConfig,
        "custom summary",
    );

    assert.equal(edits[0][1].summary, "custom summary");
    assert.equal(edits[0][1].text, "{{Manual banner}}\n\n== 讨论 ==\n内容");
});
