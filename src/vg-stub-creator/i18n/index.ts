/**
 * VG Stub Creator locale registry.
 */

import { i18n } from "#shared";
import english from "#stub/i18n/en.ts";
import simplifiedChinese from "#stub/i18n/zh-Hans.ts";
import traditionalChinese from "#stub/i18n/zh-Hant.ts";

const messages = i18n.createI18n(english, {
    "zh-Hans": simplifiedChinese,
    "zh-Hant": traditionalChinese,
});

export const msg = messages.msg;
export const msgParts = messages.msgParts;
