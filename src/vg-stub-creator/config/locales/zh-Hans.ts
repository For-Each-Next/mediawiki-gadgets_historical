/** Simplified Chinese catalog for VG Stub Creator. */

import type { LocaleCatalog } from "../../../shared";
import type english from "./en.ts";

export default {
    // Review tables and shared actions.
    "common.actions": "操作",
    "common.category": "分类",
    "common.categoryName": "分类名称",
    "common.clear": "清除",
    "common.conversion": "转换",
    "common.field": "字段",
    "common.foreignTitles": "外文标题",
    "common.history": "历史",
    "common.page": "页面",
    "common.pageName": "页面名称",
    "common.parameter": "参数",
    "common.reference": "参考资料",
    "common.reload": "重新加载",
    "common.rule": "规则",
    "common.status": "状态",
    "common.templateName": "模板名称",
    "common.value": "值",

    // Localized-name editor and Steam helper.
    "names.bySteamHelper": "由 Steam 名称助手添加",
    "names.check": "检查",
    "names.localizedName": "本地化名称",
    "names.official": "官方名称？",
    "names.originalTitleLookup": "原文标题查询",
    "names.remove": "移除本地化名称",
    "names.searchSentence": "在以下网站搜索“{query}”：{links}",
    "names.sourceUrls": "来源网址",
    "names.steamHelper": "Steam 名称助手",
    "names.title": "标题",
} satisfies LocaleCatalog<typeof english>;
