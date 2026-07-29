/**
 * Tests citation fetching, VG formatting, and caching.
 */

import assert from "node:assert/strict";
import test from "node:test";

import { createCitationStore } from "vg-stub-creator/infra/sources/index.ts";

const citoidPrefix = "/api/rest_v1/data/citation/zotero/";
const metacriticUrl = "https://www.metacritic.com/game/example/";

function jsonResponse(value: unknown, status = 200): Response {
    return new Response(JSON.stringify(value), {
        headers: { "content-type": "application/json" },
        status,
    });
}

async function testFormatsAndCachesRawMetadata(): Promise<void> {
    let requestCount = 0;
    const fetcher = (async () => {
        requestCount += 1;
        return jsonResponse([
            {
                itemType: "webpage",
                language: "en-US",
                publisher: "Raw Publisher LLC",
                title: "Example - Metacritic",
                url: metacriticUrl,
                websiteTitle: "Raw Review Site",
            },
        ]);
    }) as typeof fetch;
    const store = createCitationStore({
        fetcher,
        now: new Date("2026-07-29T00:00:00Z"),
    });

    const first = await store.fetch(` ${metacriticUrl} `);
    const second = await store.fetch(metacriticUrl);

    assert.equal(second, first);
    assert.equal(requestCount, 1);
    assert.match(first, /\| title = Example\n/u);
    assert.match(first, /\| website = Metacritic\n/u);
    assert.match(first, /\| publisher = Raw Publisher LLC\n/u);
    assert.match(first, /\| language = en\n/u);
    assert.match(first, /\| access-date = 2026-07-29\n/u);
    assert.doesNotMatch(first, /Raw Review Site|en-US|- Metacritic/u);
}
test(
    "applies VG formatting to raw metadata and caches it",
    testFormatsAndCachesRawMetadata,
);

async function testUsesHtmlFallbackForNotFound(): Promise<void> {
    const requests: Array<[string, RequestInit | undefined]> = [];
    const sourceUrl = "https://www.example.test/news?id=1";
    const fetcher = (async (input, init) => {
        const url = String(input);
        requests.push([url, init]);
        if (url.startsWith(citoidPrefix)) {
            return jsonResponse({ message: "not found" }, 404);
        }
        return new Response(
            "<html><title>  Example &amp; News  </title></html>",
        );
    }) as typeof fetch;
    const store = createCitationStore({
        fetcher,
        now: new Date("2026-07-28T00:00:00Z"),
    });

    const result = await store.fetch(sourceUrl);

    assert.match(result, /\| title = Example & News\n/u);
    assert.match(result, /\| url = https:\/\/www\.example\.test\/news\?id=1/u);
    assert.match(result, /\| access-date = 2026-07-28\n/u);
    assert.match(result, /\| website = example\.test\n/u);
    assert.deepEqual(requests, [
        [
            `${citoidPrefix}${encodeURIComponent(sourceUrl)}`,
            { headers: { accept: "application/json" } },
        ],
        [sourceUrl, { headers: { accept: "text/html" } }],
    ]);
}
test(
    "uses the supplied fetcher for a 404 HTML fallback",
    testUsesHtmlFallbackForNotFound,
);
