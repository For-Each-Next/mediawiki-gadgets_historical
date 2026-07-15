/**
 * Traditional Chinese catalog for VG Page Assessor.
 */

import { i18n } from "#shared";
import type english from "#me/i18n/en.ts";

export default i18n.defineMessages({
    "tool": {
        "name": "電子遊戲頁面評級工具",
    },
    "dialog": {
        "assessment": "評級",
        "assessmentControls": "評級控制項",
        "class": "評級",
        "importance": "重要度",
        "taskForces": "電子遊戲專題工作組",
        "maintenance": "維護",
        "otherProjects": "其他維基專題",
        "editSummary": "編輯摘要",
        "talkAssessment": "討論頁評級",
        "leadSource": "導言原始碼",
        "readySource": "待儲存的導言原始碼",
        "currentSource": "目前導言原始碼",
        "leadPreview": "討論頁導言預覽",
        "before": "變更前",
        "after": "變更後",
        "newPageList": "新條目列表",
        "registration": "新條目列表登記",
        "afterSave": "儲存後",
        "preview": "預覽",
        "cancel": "取消",
        "save": "儲存",
        "saved": "已儲存。",
    },
    "maintenance": {
        "reassess": "重新評級",
        "needsInfobox": "需要資訊框",
        "needsImage": "需要封面或圖像",
        "needsScreenshot": "需要截圖",
    },
    "registration": {
        "loading": "正在載入新條目列表狀態",
        "loadingList": "正在載入新條目列表……",
        "ineligible": "不符合條件（{created}）",
        "createdOn": "建立於{date}",
        "existing": "已於{date}以「{title}」登記",
        "alreadyRegistered": "已在新條目列表中登記",
        "register": "登記此頁面（{created}）",
    },
    "summary": {
        "tagProjects": "標記維基專題橫幅",
        "tagProjectsWithClass": "標記維基專題橫幅（{className}）：{projects}",
        "videoGames": "電子遊戲",
        "videoGamesWithDetails": "電子遊戲（{details}）",
        "importance": "{importance}重要度",
    },
    "common": {
        "empty": "（空）",
    },
}) satisfies i18n.LocaleCatalog<typeof english>;
