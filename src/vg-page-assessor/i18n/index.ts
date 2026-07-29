/**
 * VG Page Assessor locale registry.
 */

import * as i18n from "#shared/i18n";
import englishCatalog from "#gadget/i18n/en.json" with { type: "json" };
import zhHansCatalog from "#gadget/i18n/zh-Hans.json" with { type: "json" };
import zhHantCatalog from "#gadget/i18n/zh-Hant.json" with { type: "json" };

export const english = englishCatalog;
export const simplifiedChinese: i18n.LocaleCatalog<typeof english> =
    zhHansCatalog;
export const traditionalChinese: i18n.LocaleCatalog<typeof english> =
    zhHantCatalog;

export type MessageId = Extract<keyof typeof english, string>;

const messages = i18n.createI18n(english, {
    "zh-Hans": simplifiedChinese,
    "zh-Hant": traditionalChinese,
});

export const interfaceLocale = messages.interfaceLocale;
export const msg = messages.msg;
