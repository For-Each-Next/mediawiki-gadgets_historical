/** VG Stub Creator locale registry. */

import { createI18n } from "../../../shared";
import english from "./en.ts";
import simplifiedChinese from "./zh-Hans.ts";
import traditionalChinese from "./zh-Hant.ts";

export const { msg, msgParts } = createI18n(english, {
    "zh-Hans": simplifiedChinese,
    "zh-Hant": traditionalChinese,
});
