/** Tests VG Stub Creator locale catalog integrity. */

import assert from "node:assert/strict";
import test from "node:test";

import {
    english,
    simplifiedChinese,
    traditionalChinese,
} from "vg-stub-creator/i18n/index.ts";

const translations = [simplifiedChinese, traditionalChinese];

function listPlaceholders(message: string): string[] {
    return [...message.matchAll(/\{([A-Za-z][A-Za-z0-9]*)\}/gu)]
        .map((match) => match[1])
        .toSorted();
}

test("keeps translated catalogs aligned with English", () => {
    const messageIds = (
        Object.keys(english) as Array<keyof typeof english>
    ).toSorted();

    for (const translation of translations) {
        assert.deepEqual(Object.keys(translation).toSorted(), messageIds);
        for (const messageId of messageIds) {
            assert.deepEqual(
                listPlaceholders(translation[messageId]),
                listPlaceholders(english[messageId]),
                messageId,
            );
        }
    }
});
