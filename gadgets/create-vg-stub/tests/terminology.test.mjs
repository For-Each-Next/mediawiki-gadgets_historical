/**
 * Tests universal terminology lookup and projections.
 */

import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

import { createGetter } from "../src/terminologies/index.js";

const TERMINOLOGY_DIRECTORY = new URL(
    "../src/terminologies/",
    import.meta.url,
);
const definitions = Object.fromEntries(
    await Promise.all(
        ["companies", "genres", "platforms", "years"].map(async (type) => [
            type,
            JSON.parse(
                await readFile(new URL(`${type}.json`, TERMINOLOGY_DIRECTORY)),
            ),
        ]),
    ),
);
const get = createGetter(definitions);

test("get returns metadata by default and supports projected fields", () => {
    const metadata = get("company", "Square Enix");

    assert.equal(metadata.name, "史克威尔艾尼克斯");
    assert.deepEqual(get("company", "Square Enix", "categories"), [
        "史克威爾艾尼克斯遊戲",
    ]);
    assert.equal(get("company", "Square Enix", "page"), "史克威尔艾尼克斯");
    assert.equal(
        get("company", "Square Enix", "link"),
        "[[史克威尔艾尼克斯]]",
    );
});

test("get resolves aliases case-insensitively and accepts plural types", () => {
    assert.equal(get("platforms", "ps5", "name"), "PlayStation 5");
    assert.equal(get("genres", "rpg", "short name"), "角色扮演");
});

test("company categories can override generated English category names", () => {
    assert.deepEqual(get("company", "Focus Entertainment", "categories"), [
        "Focus娛樂遊戲",
    ]);
});

test("Roguelike uses a lowercase display name and unpiped link", () => {
    assert.equal(get("genre", "roguelike", "name"), "roguelike");
    assert.equal(get("genre", "roguelike", "page"), "Roguelike");
    assert.equal(get("genre", "roguelike", "link"), "[[roguelike]]");
});

test("link returns plain name when a term has no page", () => {
    assert.equal(get("platform", "pc", "name"), "PC");
    assert.equal(get("platform", "pc", "page"), undefined);
    assert.equal(get("platform", "pc", "link"), "PC");

    assert.equal(get("year", "26", "name"), "2026");
    assert.equal(get("year", "26", "page"), undefined);
    assert.equal(get("year", "26", "link"), "2026");
});

test("get returns undefined for unknown types and terms", () => {
    assert.equal(get("unknown", "PS5"), undefined);
    assert.equal(get("platform", "Not a platform"), undefined);
});
