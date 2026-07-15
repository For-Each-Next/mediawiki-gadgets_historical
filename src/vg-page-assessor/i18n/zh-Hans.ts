/**
 * Simplified Chinese catalog for VG Page Assessor.
 */

import { i18n } from "#shared";
import type english from "#assessor/i18n/en.ts";

export default i18n.defineMessages({
    "tool": {
        "name": "电子游戏页面评级工具",
    },
    "dialog": {
        "assessment": "评级",
        "assessmentControls": "评级控件",
        "class": "评级",
        "importance": "重要度",
        "taskForces": "电子游戏专题工作组",
        "maintenance": "维护",
        "otherProjects": "其他维基专题",
        "editSummary": "编辑摘要",
        "talkAssessment": "讨论页评级",
        "leadSource": "导言源码",
        "readySource": "待保存的导言源码",
        "currentSource": "当前导言源码",
        "leadPreview": "讨论页导言预览",
        "before": "更改前",
        "after": "更改后",
        "newPageList": "新条目列表",
        "registration": "新条目列表登记",
        "afterSave": "保存后",
        "preview": "预览",
        "cancel": "取消",
        "save": "保存",
        "saved": "已保存。",
    },
    "maintenance": {
        "reassess": "重新评级",
        "needsInfobox": "需要信息框",
        "needsImage": "需要封面或图像",
        "needsScreenshot": "需要截图",
    },
    "registration": {
        "loading": "正在加载新条目列表状态",
        "loadingList": "正在加载新条目列表……",
        "ineligible": "不符合条件（{created}）",
        "createdOn": "创建于{date}",
        "existing": "已于{date}以“{title}”登记",
        "alreadyRegistered": "已在新条目列表中登记",
        "register": "登记此页面（{created}）",
    },
    "summary": {
        "tagProjects": "标记维基专题横幅",
        "tagProjectsWithClass": "标记维基专题横幅（{className}）：{projects}",
        "videoGames": "电子游戏",
        "videoGamesWithDetails": "电子游戏（{details}）",
        "importance": "{importance}重要度",
    },
    "common": {
        "empty": "（空）",
    },
}) satisfies i18n.LocaleCatalog<typeof english>;
