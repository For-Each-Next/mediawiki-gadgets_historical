/**
 * VG Page Assessor locale registry.
 */

import { i18n } from "#shared";
import english from "#assessor/i18n/en.ts";
import simplifiedChinese from "#assessor/i18n/zh-Hans.ts";
import traditionalChinese from "#assessor/i18n/zh-Hant.ts";

const messages = i18n.createI18n(english, {
    "zh-Hans": simplifiedChinese,
    "zh-Hant": traditionalChinese,
});

export const interfaceLocale = messages.interfaceLocale;
export const msg = messages.msg;
