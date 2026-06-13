/**
 * Tests surgical title updates for moved manually edited articles.
 */

import assert from "node:assert/strict";
import test from "node:test";

import { updateMovedTitleText } from "../src/editing/title-move.js";

test("updateMovedTitleText changes title fragments and preserves manual edits", () => {
    const current = {
        defaultSortText: "{{DEFAULTSORT:Example}}",
        infoboxText:
            "{{Infobox VG\n" +
            "| onlysourced = no\n" +
            "| title = Example\n" +
            "| english = Example Game\n" +
            "}}",
        leadNameText:
            "《'''Example'''》（{{langx|en|Example Game|italic=yes|label=none}}）",
    };
    const target = {
        defaultSortText: "{{DEFAULTSORT:Example Game}}",
        infoboxText:
            "{{Infobox VG\n" +
            "| onlysourced = no\n" +
            "| title = Example Game\n" +
            "}}",
        leadNameText: "《'''Example Game'''》",
    };
    const text =
        "{{Infobox VG\n" +
        "| onlysourced = no\n" +
        "| title = Example\n" +
        "| english = Example Game\n" +
        "| developer = Manually fixed studio\n" +
        "}}\n\n" +
        "《'''Example'''》（{{langx|en|Example Game|italic=yes|label=none}}）" +
        "是一款手動修改的遊戲。<ref>{{cite web|title=Manually fixed}}</ref>\n\n" +
        "{{DEFAULTSORT:Example}}\n[[Category:Manually fixed category]]";

    assert.equal(
        updateMovedTitleText(text, current, target),
        "{{Infobox VG\n" +
            "| onlysourced = no\n" +
            "| title = Example Game\n" +
            "| developer = Manually fixed studio\n" +
            "}}\n\n" +
            "《'''Example Game'''》" +
            "是一款手動修改的遊戲。<ref>{{cite web|title=Manually fixed}}</ref>\n\n" +
            "{{DEFAULTSORT:Example Game}}\n" +
            "[[Category:Manually fixed category]]",
    );
});

test("updateMovedTitleText adds a newly required infobox title parameter", () => {
    const current = {
        defaultSortText: "{{DEFAULTSORT:Example Game}}",
        infoboxText:
            "{{Infobox VG\n| onlysourced = no\n| title = Example Game\n}}",
        leadNameText: "《'''Example Game'''》",
    };
    const target = {
        defaultSortText: "{{DEFAULTSORT:Example Game}}",
        infoboxText:
            "{{Infobox VG\n" +
            "| onlysourced = no\n" +
            "| title = 示例遊戲\n" +
            "| english = Example Game\n" +
            "}}",
        leadNameText:
            "《'''示例遊戲'''》（{{langx|en|Example Game|italic=yes|label=none}}）",
    };
    const text =
        "{{Infobox VG\n" +
        "| onlysourced = no\n" +
        "| title = Example Game\n" +
        "| developer = Manual\n" +
        "}}\n\n《'''Example Game'''》";

    const updated = updateMovedTitleText(text, current, target);

    assert.equal(updated.includes("| title = 示例遊戲"), true);
    assert.equal(updated.includes("| english = Example Game"), true);
    assert.equal(updated.includes("| developer = Manual"), true);
    assert.equal(updated.includes("《'''示例遊戲'''》"), true);
});
