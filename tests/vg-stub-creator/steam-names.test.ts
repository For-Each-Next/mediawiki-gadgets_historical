/**
 * Tests localized Steam name extraction.
 */

import assert from "node:assert/strict";
import test from "node:test";

import { fetchSteamNameRows } from "../../src/vg-stub-creator/sources/steam-names.ts";

test("Steam names are extracted with localized source URLs", async () => {
    const rows = await fetchSteamNameRows(
        "https://store.steampowered.com/app/123/example/",
        {
            async fetch(url) {
                const title = url.includes("l=schinese")
                    ? "Steam 上的 简体名"
                    : "Steam - 繁體名";

                return `{{cite web|title=${title}|url=${url}}}`;
            },
        },
    );

    assert.deepEqual(
        rows.map((row) => [row.markets, row.name]),
        [
            [["hans"], "简体名"],
            [["hant"], "繁體名"],
        ],
    );
    assert.equal(rows[0].sourceUrl.includes("l=schinese"), true);
    assert.equal(rows[1].sourceUrl.includes("l=tchinese"), true);
});

test("Steam name lookup optionally includes preview-only Japanese", async () => {
    const rows = await fetchSteamNameRows(
        "https://store.steampowered.com/app/123/example/",
        {
            async fetch(url) {
                return `{{cite web|title=Steam - ${
                    url.includes("l=japanese") ? "日本語名" : "中文名"
                }|url=${url}}}`;
            },
        },
        {
            includeJapanese: true,
        },
    );
    const japanese = rows.find((row) => row.label === "Japanese");

    assert.equal(japanese.name, "日本語名");
    assert.equal(japanese.previewOnly, true);
    assert.deepEqual(japanese.markets, []);
    assert.equal(japanese.sourceUrl.includes("l=japanese"), true);
});

test("Steam name lookup rejects non-app URLs", async () => {
    await assert.rejects(
        fetchSteamNameRows("https://store.steampowered.com/", {
            async fetch() {
                return "";
            },
        }),
        /Enter a Steam app URL/u,
    );
});
