/** Tests citation metadata and existing Wayback snapshot resolution. */

import assert from "node:assert/strict";
import test from "node:test";

import {
    fetchAvailableArchive,
    resolveSourceMetadata,
} from "citation-formatter/infra/source-metadata.ts";

const sourceUrl = "https://example.test/news?id=1";
const archiveUrl =
    "https://web.archive.org/web/20240506123456/https://example.test/news";

function jsonResponse(value: unknown, status = 200): Response {
    return new Response(JSON.stringify(value), {
        headers: { "content-type": "application/json" },
        status,
    });
}

const testAvailableArchive = async () => {
    let requestedUrl = "";
    const fetcher = (async (input: RequestInfo | URL) => {
        requestedUrl = String(input);
        return jsonResponse({
            archived_snapshots: {
                closest: {
                    available: true,
                    timestamp: "20240506123456",
                    url: archiveUrl,
                },
            },
        });
    }) as typeof fetch;
    const result = await fetchAvailableArchive(sourceUrl, { fetcher });

    assert.equal(
        requestedUrl,
        "https://archive.org/wayback/available?" +
            "url=https%3A%2F%2Fexample.test%2Fnews%3Fid%3D1",
    );
    assert.deepEqual(result, {
        archiveDate: "2024-05-06",
        archiveUrl,
    });
};
test("resolves an existing Wayback snapshot", testAvailableArchive);

const testUnavailableArchive = async () => {
    const fetcher = (async () => {
        throw new Error("Wayback is unavailable");
    }) as typeof fetch;
    const result = await fetchAvailableArchive(sourceUrl, { fetcher });

    assert.equal(result, null);
};
test(
    "treats an archive lookup failure as no snapshot",
    testUnavailableArchive,
);

const testResolvedMetadata = async () => {
    const requests: string[] = [];
    const fetcher = (async (input: RequestInfo | URL) => {
        const url = String(input);
        requests.push(url);
        if (url.startsWith("/api/rest_v1/data/citation/zotero/")) {
            return jsonResponse([
                { itemType: "webpage", title: "Example", url: sourceUrl },
            ]);
        }
        return jsonResponse({
            archived_snapshots: {
                closest: {
                    available: true,
                    timestamp: "20240506123456",
                    url: archiveUrl,
                },
            },
        });
    }) as typeof fetch;
    const result = await resolveSourceMetadata(sourceUrl, null, {
        fetcher,
        now: new Date("2026-07-22T00:00:00Z"),
    });

    assert.equal(requests.length, 2);
    assert.match(requests[0], /^\/api\/rest_v1\/data\/citation\/zotero\//u);
    assert.match(result.citeTemplate, /\| title = Example/u);
    assert.match(result.citeTemplate, /\| access-date = 2026-07-22/u);
    assert.equal(result.archiveDate, "2024-05-06");
    assert.equal(result.archiveUrl, archiveUrl);
    assert.equal(result.archiveError, "");
    assert.equal(result.metadataError, "");
};
test("combines Citoid metadata with archive metadata", testResolvedMetadata);

const testNonFatalArchiveFailure = async () => {
    const fetcher = (async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.startsWith("/api/rest_v1/data/citation/zotero/")) {
            return jsonResponse([
                { itemType: "webpage", title: "Example", url: sourceUrl },
            ]);
        }
        throw new Error("Wayback is unavailable");
    }) as typeof fetch;
    const result = await resolveSourceMetadata(sourceUrl, null, {
        fetcher,
        now: new Date("2026-07-22T00:00:00Z"),
    });

    assert.match(result.citeTemplate, /\| title = Example/u);
    assert.equal(result.archiveDate, "");
    assert.equal(result.archiveUrl, "");
    assert.match(result.archiveError, /Wayback is unavailable/u);
    assert.equal(result.metadataError, "");
};
test(
    "keeps resolved citation metadata when archive lookup fails",
    testNonFatalArchiveFailure,
);

const testNonFatalCitoidFailure = async () => {
    const fetcher = (async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.startsWith("/api/rest_v1/data/citation/zotero/")) {
            throw new Error("Citoid is unavailable");
        }
        return jsonResponse({
            archived_snapshots: {
                closest: {
                    available: true,
                    timestamp: "20240506123456",
                    url: archiveUrl,
                },
            },
        });
    }) as typeof fetch;
    const result = await resolveSourceMetadata(sourceUrl, null, {
        fetcher,
        now: new Date("2026-07-22T00:00:00Z"),
    });

    assert.match(result.citeTemplate, /\| url = https:\/\/example\.test/u);
    assert.match(result.metadataError, /Citoid is unavailable/u);
    assert.equal(result.archiveUrl, archiveUrl);
    assert.equal(result.archiveDate, "2024-05-06");
};
test("keeps a Wayback result when Citoid fails", testNonFatalCitoidFailure);

const testArchiveSeed = async () => {
    const requests: string[] = [];
    const fetcher = (async (input: RequestInfo | URL) => {
        requests.push(String(input));
        return jsonResponse([
            { itemType: "webpage", title: "Archived", url: sourceUrl },
        ]);
    }) as typeof fetch;
    const archiveSeed = {
        archiveDate: "2020-01-02",
        archiveUrl:
            "https://web.archive.org/web/20200102030405/https://example.test/",
    };
    const result = await resolveSourceMetadata(sourceUrl, archiveSeed, {
        fetcher,
        now: new Date("2026-07-22T00:00:00Z"),
    });

    assert.equal(requests.length, 1);
    assert.equal(result.archiveError, "");
    assert.equal(result.metadataError, "");
    assert.deepEqual(
        {
            archiveDate: result.archiveDate,
            archiveUrl: result.archiveUrl,
        },
        archiveSeed,
    );
};
test("uses a pasted archive seed without another lookup", testArchiveSeed);

test("resolves an ISBN without requesting a Wayback snapshot", async () => {
    const isbn = "978-0-306-40615-7";
    const requests: string[] = [];
    const fetcher = (async (input: RequestInfo | URL) => {
        requests.push(String(input));
        return jsonResponse([
            {
                ISBN: isbn,
                creators: [
                    {
                        creatorType: "author",
                        firstName: "Jane",
                        lastName: "Doe",
                    },
                ],
                date: "2024",
                itemType: "book",
                publisher: "Example Press",
                title: "Example Book",
            },
        ]);
    }) as typeof fetch;

    const result = await resolveSourceMetadata(isbn, null, {
        fetcher,
        now: new Date("2026-07-22T00:00:00Z"),
    });

    assert.deepEqual(requests, [
        "/api/rest_v1/data/citation/zotero/978-0-306-40615-7",
    ]);
    assert.match(result.citeTemplate, /^\{\{cite book/u);
    assert.match(result.citeTemplate, /\|title=Example Book/u);
    assert.match(result.citeTemplate, /\|isbn=978-0-306-40615-7/u);
    assert.doesNotMatch(result.citeTemplate, /\|url=/u);
    assert.equal(result.originalUrl, "");
    assert.equal(result.archiveError, "");
    assert.equal(result.metadataError, "");
});

test("keeps an unresolvable ISSN in an editable fallback", async () => {
    const fetcher = (async () => jsonResponse({}, 404)) as typeof fetch;
    const result = await resolveSourceMetadata("ISSN 2049-3630", null, {
        fetcher,
    });

    assert.match(result.citeTemplate, /^\{\{cite journal/u);
    assert.match(result.citeTemplate, /\|issn=2049-3630/u);
    assert.doesNotMatch(result.citeTemplate, /\|url=/u);
    assert.match(result.metadataError, /could not resolve/u);
    assert.equal(result.archiveError, "");
});
