/**
 * Tests configured stub template mappings.
 */

import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const CONFIG_DIRECTORY = new URL("../src/config/", import.meta.url);

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
            await readFile(new URL(`${configName}.json`, CONFIG_DIRECTORY)),
        );

        for (const [title, expectedTag] of Object.entries(expectedTags)) {
            const definition = definitions.find(
                (candidate) => candidate.page.title === title,
            );

            assert.ok(definition, `${configName} should contain ${title}`);
            assert.deepEqual(definition.stubTags, [expectedTag]);
        }
    }
});
