/** Tests browser console timing helpers. */

import assert from "node:assert/strict";
import test from "node:test";

import { startExecutionTimer } from "citation-formatter/infra/logger.ts";

test("logs a timed operation once with the citation formatter marker", () => {
    const times = [10, 13.456];
    const messages: Array<[string, string]> = [];
    const finish = startExecutionTimer(
        "format action",
        () => times.shift() ?? 0,
        (prefix, message) => messages.push([prefix, message]),
    );

    finish();
    finish();

    assert.deepEqual(messages, [
        ["[citation formatter]", "format action in 3.46 ms"],
    ]);
});

test("does not report a negative elapsed time", () => {
    const times = [20, 19];
    const messages: Array<[string, string]> = [];
    const finish = startExecutionTimer(
        "loaded",
        () => times.shift() ?? 0,
        (prefix, message) => messages.push([prefix, message]),
    );

    finish();

    assert.deepEqual(messages, [
        ["[citation formatter]", "loaded in 0.00 ms"],
    ]);
});
