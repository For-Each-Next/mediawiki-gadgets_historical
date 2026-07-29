/** Build-injected move-target confirmation dialog bundle. */

import type { VgStubCreatorDialogBundle } from "./dialog-bundle.ts";

const moveDialog: VgStubCreatorDialogBundle = {
    styles:
        typeof __VG_STUB_CREATOR_MOVE_DIALOG_STYLES__ === "undefined"
            ? ""
            : __VG_STUB_CREATOR_MOVE_DIALOG_STYLES__,
    template:
        typeof __VG_STUB_CREATOR_MOVE_DIALOG_TEMPLATE__ === "undefined"
            ? ""
            : __VG_STUB_CREATOR_MOVE_DIALOG_TEMPLATE__,
};

export default moveDialog;
