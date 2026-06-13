/**
 * Tests configured stub template mappings.
 */

import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const TERMINOLOGY_DIRECTORY = new URL(
    "../src/terminologies/",
    import.meta.url,
);
const SUBJECT_CONFIG_NAMES = ["companies", "genres", "platforms", "years"];

test("subject definitions separate names from optional page titles", async () => {
    for (const configName of SUBJECT_CONFIG_NAMES) {
        const definitions = JSON.parse(
            await readFile(
                new URL(`${configName}.json`, TERMINOLOGY_DIRECTORY),
            ),
        );

        for (const definition of definitions) {
            assert.equal(typeof definition.name, "string");
            assert.equal(Array.isArray(definition.aliases), true);
            assert.equal(
                definition.page == null || typeof definition.page === "string",
                true,
            );
        }
    }

    const platforms = JSON.parse(
        await readFile(new URL("platforms.json", TERMINOLOGY_DIRECTORY)),
    );
    const pc = platforms.find((definition) => definition.name === "PC");

    assert.ok(pc);
    assert.equal(Object.hasOwn(pc, "page"), false);
});

test("specific subjects use their matching stub templates", async () => {
    const expectations = {
        companies: {
            "Bandai Namco Forge Digitals": "BandaiNamco-stub",
            万代南梦宫娱乐: "BandaiNamco-stub",
            万代南梦宫工作室: "BandaiNamco-stub",
        },
        genres: {
            大型多人在线游戏: "Online-videogame-stub",
            多人在线战斗竞技场: "Online-videogame-stub",
            数字桌上游戏: "Board-videogame-stub",
            教育游戏: "Edu-videogame-stub",
            日本成人遊戲: "Eroge-videogame-stub",
            清版动作游戏: "Beatemup-videogame-stub",
            生活模拟游戏: "Life-simulation-videogame-stub",
            聚会游戏: "Party-videogame-stub",
            交通工具模拟游戏: "Vehicle-simulation-videogame-stub",
        },
        platforms: {
            街机游戏: "Arcade-stub",
        },
    };

    for (const [configName, expectedTags] of Object.entries(expectations)) {
        const definitions = JSON.parse(
            await readFile(
                new URL(`${configName}.json`, TERMINOLOGY_DIRECTORY),
            ),
        );

        for (const [title, expectedTag] of Object.entries(expectedTags)) {
            const definition = definitions.find(
                (candidate) => candidate.page === title,
            );

            assert.ok(definition, `${configName} should contain ${title}`);
            assert.deepEqual(definition.stubTags, [expectedTag]);
        }
    }
});
