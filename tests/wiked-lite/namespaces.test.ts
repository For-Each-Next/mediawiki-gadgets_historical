import assert from "node:assert/strict";
import test from "node:test";
import { createLogger } from "@mediawiki-gadgets/shared/logging";
import { getNamespaceId } from "@mediawiki-gadgets/shared/wiki-titles";
import {
    createWikiNamespaceResolver,
    type WikiNamespaceState,
} from "wiked-lite/adapters/mediawiki/namespaces.ts";

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
        assert.equal(state.templateRedirectsSafe, true);
        assert.equal(state.templateMagicWords, null);
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
    assert.equal(resolver.current().templateRedirectsSafe, false);
    assert.equal(getNamespaceId(resolver.current().source, "Template"), 10);
    assert.equal(getNamespaceId(resolver.current().source, "File"), 6);
    assert.equal(getNamespaceId(resolver.current().source, "Category"), 14);
    assert.equal(getNamespaceId(resolver.current().source, "TM"), undefined);
    const first = resolver.load(api);
    const second = resolver.load(api);
    assert.equal(first, second);
    const state = await first;

    assertLoadedSiteinfo(state, request, requests);
    assert.equal(getNamespaceId(state.source, "Image"), 6);
    assert.equal(await resolver.load(api), state);
    assert.equal(requests, 1);
});

test("missing magic-word siteinfo keeps wikilink redirects safe", async () => {
    for (const property of ["magicwords", "variables", "functionhooks"]) {
        const response = createSiteinfo() as {
            query: Record<string, unknown>;
        };
        delete response.query[property];
        const resolver = createWikiNamespaceResolver("examplewiki");
        const state = await resolver.load({
            async get() {
                return response;
            },
        });

        assert.equal(state.redirectsSafe, true);
        assert.equal(state.templateRedirectsSafe, false);
        assert.equal(state.templateMagicWords, null);
        assert.equal(getNamespaceId(state.source, "Pattern"), 10);
    }
});

test("unmapped function hooks make template redirects unsafe", async () => {
    const resolver = createWikiNamespaceResolver("examplewiki");
    const response = createSiteinfo() as {
        query: { functionhooks: string[] };
    };
    response.query.functionhooks.push("missing-hook");

    const state = await resolver.load({
        async get() {
            return response;
        },
    });

    assert.equal(state.redirectsSafe, true);
    assert.equal(state.templateRedirectsSafe, false);
});

test("failed namespace loads retain a retryable safe fallback", async () => {
    let requests = 0;
    const warnings: unknown[][] = [];
    const resolver = createWikiNamespaceResolver(
        "brokenwiki",
        createWarningLogger(warnings),
    );
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
    assert.equal(first.templateRedirectsSafe, false);
    assert.equal(first.templateMagicWords, null);
    assert.equal(getNamespaceId(first.source, "Template"), 10);
    assert.equal(getNamespaceId(first.source, "TM"), undefined);
    assert.equal(second, first);
    assert.equal(resolver.current(), first);
    assertFailedWarnings(warnings);
});

function assertFailedWarnings(warnings: unknown[][]): void {
    assert.deepEqual(
        warnings.map((values) => values.slice(0, 2)),
        [
            [
                "[mediawiki-gadgets][wiked-lite] load.failed",
                {
                    databaseName: "brokenwiki",
                    error: { message: "[redacted]", name: "Error" },
                },
            ],
            [
                "[mediawiki-gadgets][wiked-lite] load.failed",
                {
                    databaseName: "brokenwiki",
                    error: { message: "[redacted]", name: "Error" },
                },
            ],
        ],
    );
}

function assertLoadedSiteinfo(
    state: WikiNamespaceState,
    request: Record<string, unknown> | undefined,
    requests: number,
): void {
    assert.deepEqual(request, {
        action: "query",
        formatversion: "2",
        meta: "siteinfo",
        siprop:
            "namespaces|namespacealiases|magicwords|variables|" +
            "functionhooks",
    });
    assert.equal(requests, 1);
    assert.equal(state.redirectsSafe, true);
    assert.equal(state.templateRedirectsSafe, true);
    assert.ok(state.templateMagicWords != null);
    assert.equal(
        state.templateMagicWords.functions.caseInsensitive.has(
            "lokalfunktion",
        ),
        true,
    );
    assert.equal(
        state.templateMagicWords.variables.caseSensitive.has("LOKALVARIABLE"),
        true,
    );
    assert.equal(
        state.templateMagicWords.modifiers.substitution.caseInsensitive.has(
            "ersetzen",
        ),
        true,
    );
}

function createWarningLogger(warnings: unknown[][]) {
    return createLogger("wiked-lite", {
        level: "warn",
        output: {
            debug() {},
            error() {},
            info() {},
            warn(...values) {
                warnings.push(values);
            },
        },
    });
}

function createSiteinfo(): unknown {
    const query: Record<string, unknown> = {
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
    };
    Object.assign(query, {
        functionhooks: ["local-function"],
        magicwords: [
            magicWord("subst", ["SUBST:", "ERSETZEN:"]),
            magicWord("safesubst", ["SAFESUBST:", "SICHERERSETZEN:"]),
            magicWord("msg", ["MSG:", "NACHRICHT:"]),
            magicWord("msgnw", ["MSGNW:", "NACHRICHTNW:"]),
            magicWord("raw", ["RAW:", "ROH:"]),
            magicWord("local-function", ["local-function:", "lokalfunktion:"]),
            magicWord("local-variable", ["LOKALVARIABLE"], true),
        ],
        variables: ["local-variable"],
    });
    return { query };
}

function magicWord(
    name: string,
    aliases: string[],
    caseSensitive = false,
): Record<string, unknown> {
    return {
        aliases,
        "case-sensitive": caseSensitive,
        name,
    };
}
