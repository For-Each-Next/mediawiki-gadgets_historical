/** Traditional Chinese catalog for VG Page Assessor. */

import type { LocaleCatalog } from "../../../shared";
import type english from "./en.ts";

export default {
    // Dialog controls and field labels.
    "common.empty": "（空）",
    "dialog.afterSave": "儲存後",
    "dialog.assessment": "評級",
    "dialog.assessmentControls": "評級控制項",
    "dialog.before": "變更前",
    "dialog.cancel": "取消",
    "dialog.class": "評級",
    "dialog.editSummary": "編輯摘要",
    "dialog.importance": "重要度",
    "dialog.leadPreview": "討論頁導言預覽",
    "dialog.leadSource": "導言原始碼",
    "dialog.currentSource": "目前導言原始碼",
    "dialog.maintenance": "維護",
    "dialog.otherProjects": "其他維基專題",
    "dialog.preview": "預覽",
    "dialog.readySource": "待儲存的導言原始碼",
    "dialog.registration": "新條目列表登記",
    "dialog.save": "儲存",
    "dialog.talkAssessment": "討論頁評級",
    "dialog.taskForces": "電子遊戲專題工作組",
    "dialog.newPageList": "新條目列表",
    "dialog.after": "變更後",
    "maintenance.needsImage": "需要封面或圖像",
    "maintenance.needsInfobox": "需要資訊框",
    "maintenance.needsScreenshot": "需要截圖",
    "maintenance.reassess": "重新評級",
    "tool.name": "電子遊戲頁面評級工具",

    // Asynchronous new-page-list registration state.
    "registration.alreadyRegistered": "已在新條目列表中登記",
    "registration.createdOn": "建立於{date}",
    "registration.existing": "已於{date}以「{title}」登記",
    "registration.ineligible": "不符合條件（{created}）",
    "registration.loading": "正在載入新條目列表狀態",
    "registration.loadingList": "正在載入新條目列表……",
    "registration.register": "登記此頁面（{created}）",
    "status.saved": "已儲存。",
} satisfies LocaleCatalog<typeof english>;
