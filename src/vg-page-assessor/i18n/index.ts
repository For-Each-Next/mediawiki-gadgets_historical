/**
 * VG Page Assessor locale registry.
 */

import * as i18n from "#shared/i18n";
import english from "#gadget/i18n/en.ts";
import simplifiedChinese from "#gadget/i18n/zh-Hans.ts";
import traditionalChinese from "#gadget/i18n/zh-Hant.ts";

const messages = i18n.createI18n(english, {
    "zh-Hans": simplifiedChinese,
    "zh-Hant": traditionalChinese,
});

export const interfaceLocale = messages.interfaceLocale;
export const msg = messages.msg;
