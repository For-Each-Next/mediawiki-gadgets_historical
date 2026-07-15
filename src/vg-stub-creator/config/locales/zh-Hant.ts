/** Traditional Chinese catalog for VG Stub Creator. */

import type { LocaleCatalog } from "../../../shared";
import type english from "./en.ts";

export default {
    // Review tables and shared actions.
    "common.actions": "操作",
    "common.category": "分類",
    "common.categoryName": "分類名稱",
    "common.clear": "清除",
    "common.conversion": "轉換",
    "common.field": "欄位",
    "common.foreignTitles": "外文標題",
    "common.history": "歷史",
    "common.page": "頁面",
    "common.pageName": "頁面名稱",
    "common.parameter": "參數",
    "common.reference": "參考資料",
    "common.reload": "重新載入",
    "common.rule": "規則",
    "common.status": "狀態",
    "common.templateName": "模板名稱",
    "common.value": "值",

    // Localized-name editor and Steam helper.
    "names.bySteamHelper": "由 Steam 名稱助手新增",
    "names.check": "檢查",
    "names.localizedName": "本地化名稱",
    "names.official": "官方名稱？",
    "names.originalTitleLookup": "原文標題查詢",
    "names.remove": "移除本地化名稱",
    "names.searchSentence": "在以下網站搜尋「{query}」：{links}",
    "names.sourceUrls": "來源網址",
    "names.steamHelper": "Steam 名稱助手",
    "names.title": "標題",
} satisfies LocaleCatalog<typeof english>;
