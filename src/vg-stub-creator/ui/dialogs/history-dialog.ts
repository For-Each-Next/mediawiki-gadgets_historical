/** Build-injected form-history dialog bundle. */

import type { VgStubCreatorDialogBundle } from "./dialog-bundle.ts";

const historyDialog: VgStubCreatorDialogBundle = {
    styles:
        typeof __VG_STUB_CREATOR_HISTORY_DIALOG_STYLES__ === "undefined"
            ? ""
            : __VG_STUB_CREATOR_HISTORY_DIALOG_STYLES__,
    template:
        typeof __VG_STUB_CREATOR_HISTORY_DIALOG_TEMPLATE__ === "undefined"
            ? ""
            : __VG_STUB_CREATOR_HISTORY_DIALOG_TEMPLATE__,
};

export default historyDialog;
