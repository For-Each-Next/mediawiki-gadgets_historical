/**
 * Tests configured and generated navboxes.
 */

import assert from "node:assert/strict";
import test from "node:test";

import {
    getConfiguredNavboxTitles,
    prepareNavboxRows,
} from "../../src/vg-stub-creator/application/workflow.ts";
import { wheelWorldEntry } from "./wheel-world.fixture.ts";

test("configured navboxes are collected from terminology-backed parts", () => {
    const titles = getConfiguredNavboxTitles(wheelWorldEntry.data.input);

    assert.deepEqual(titles, ["安納布爾納互動"]);
});

test("company navboxes work without a series", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = createExistingTemplateFetcher();

    try {
        const rows = await prepareNavboxRows(
            {
                ...wheelWorldEntry.data.input,
                navboxRows: [],
                series: "",
            },
            false,
        );

        assert.deepEqual(rows, [
            {
                enabled: true,
                status: "OK",
                text: "{{安納布爾納互動}}",
                title: "安納布爾納互動",
            },
        ]);
    } finally {
        globalThis.fetch = originalFetch;
    }
});

/**
 * Creates a fetch implementation reporting templates as existing.
 *
 * @returns MediaWiki-compatible fetch implementation.
 */
function createExistingTemplateFetcher(): typeof fetch {
    return async function fetcher(input) {
        const url = new URL(String(input), "https://example.test");
        const titles = url.searchParams.get("titles")?.split("|") || [];

        return {
            ok: true,
            async json() {
                return {
                    query: {
                        pages: titles.map((title) => ({ title })),
                    },
                };
            },
        } as Response;
    };
}
