import assert from "node:assert/strict";
import test from "node:test";
import { getNamespaceId } from "@mediawiki-gadgets/shared/wikitext";
// eslint-disable-next-line max-len
import { createWikiNamespaceResolver } from "../../src/wiked-lite/infra/namespaces.ts";

test("English and Chinese namespaces need no API request", async () => {
    for (const databaseName of ["enwiki", "zhwiki"] as const) {
        let requests = 0;
        const resolver = createWikiNamespaceResolver(databaseName);
        const state = await resolver.load({
            async get() {
                requests += 1;
                return {};
            },
        });

        assert.equal(requests, 0);
        assert.equal(state.redirectsSafe, true);
        assert.equal(state.source, databaseName);
        assert.equal(resolver.current(), state);
    }
});

test("other wikis load and cache namespace siteinfo", async () => {
    let request: Record<string, unknown> | undefined;
    let requests = 0;
    const resolver = createWikiNamespaceResolver("examplewiki");
    const api = {
        async get(parameters: Record<string, unknown>) {
            request = parameters;
            requests += 1;
            return createSiteinfo();
        },
    };

    assert.equal(resolver.current().redirectsSafe, false);
    assert.equal(getNamespaceId(resolver.current().source, "Template"), 10);
    assert.equal(getNamespaceId(resolver.current().source, "File"), 6);
    assert.equal(getNamespaceId(resolver.current().source, "Category"), 14);
    assert.equal(getNamespaceId(resolver.current().source, "TM"), undefined);
    const first = resolver.load(api);
    const second = resolver.load(api);
    assert.equal(first, second);
    const state = await first;

    assert.deepEqual(request, {
        action: "query",
        formatversion: "2",
        meta: "siteinfo",
        siprop: "namespaces|namespacealiases",
    });
    assert.equal(requests, 1);
    assert.equal(state.redirectsSafe, true);
    assert.equal(getNamespaceId(state.source, "Image"), 6);
    assert.equal(await resolver.load(api), state);
    assert.equal(requests, 1);
});

test("failed namespace loads retain a retryable safe fallback", async () => {
    let requests = 0;
    const resolver = createWikiNamespaceResolver("brokenwiki");
    const api = {
        async get() {
            requests += 1;
            throw new Error("offline");
        },
    };

    const first = await resolver.load(api);
    const second = await resolver.load(api);

    assert.equal(requests, 2);
    assert.equal(first.redirectsSafe, false);
    assert.equal(getNamespaceId(first.source, "Template"), 10);
    assert.equal(getNamespaceId(first.source, "TM"), undefined);
    assert.equal(second, first);
    assert.equal(resolver.current(), first);
});

function createSiteinfo(): unknown {
    return {
        query: {
            namespacealiases: [{ alias: "Image", id: 6 }],
            namespaces: {
                0: { id: 0, name: "" },
                6: { canonical: "File", id: 6, name: "Asset" },
                10: { canonical: "Template", id: 10, name: "Pattern" },
                14: {
                    canonical: "Category",
                    id: 14,
                    name: "Grouping",
                },
            },
        },
    };
}
