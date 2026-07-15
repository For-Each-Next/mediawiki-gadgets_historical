/** Simplified Chinese catalog for VG Page Assessor. */

import type { LocaleCatalog } from "../../../shared";
import type english from "./en.ts";

export default {
    // Dialog controls and field labels.
    "common.empty": "（空）",
    "dialog.afterSave": "保存后",
    "dialog.assessment": "评级",
    "dialog.assessmentControls": "评级控件",
    "dialog.before": "更改前",
    "dialog.cancel": "取消",
    "dialog.class": "评级",
    "dialog.editSummary": "编辑摘要",
    "dialog.importance": "重要度",
    "dialog.leadPreview": "讨论页导言预览",
    "dialog.leadSource": "导言源码",
    "dialog.currentSource": "当前导言源码",
    "dialog.maintenance": "维护",
    "dialog.otherProjects": "其他维基专题",
    "dialog.preview": "预览",
    "dialog.readySource": "待保存的导言源码",
    "dialog.registration": "新条目列表登记",
    "dialog.save": "保存",
    "dialog.talkAssessment": "讨论页评级",
    "dialog.taskForces": "电子游戏专题工作组",
    "dialog.newPageList": "新条目列表",
    "dialog.after": "更改后",
    "maintenance.needsImage": "需要封面或图像",
    "maintenance.needsInfobox": "需要信息框",
    "maintenance.needsScreenshot": "需要截图",
    "maintenance.reassess": "重新评级",
    "tool.name": "电子游戏页面评级工具",

    // Asynchronous new-page-list registration state.
    "registration.alreadyRegistered": "已在新条目列表中登记",
    "registration.createdOn": "创建于{date}",
    "registration.existing": "已于{date}以“{title}”登记",
    "registration.ineligible": "不符合条件（{created}）",
    "registration.loading": "正在加载新条目列表状态",
    "registration.loadingList": "正在加载新条目列表……",
    "registration.register": "登记此页面（{created}）",
    "status.saved": "已保存。",
} satisfies LocaleCatalog<typeof english>;
