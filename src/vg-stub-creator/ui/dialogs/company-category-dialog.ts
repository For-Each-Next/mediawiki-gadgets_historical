/** Build-injected company-category editor dialog bundle. */

import type { VgStubCreatorDialogBundle } from "./dialog-bundle.ts";

const companyCategoryDialog: VgStubCreatorDialogBundle = {
    styles:
        typeof __VG_STUB_CREATOR_COMPANY_CATEGORY_DIALOG_STYLES__ ===
        "undefined"
            ? ""
            : __VG_STUB_CREATOR_COMPANY_CATEGORY_DIALOG_STYLES__,
    template:
        typeof __VG_STUB_CREATOR_COMPANY_CATEGORY_DIALOG_TEMPLATE__ ===
        "undefined"
            ? ""
            : __VG_STUB_CREATOR_COMPANY_CATEGORY_DIALOG_TEMPLATE__,
};

export default companyCategoryDialog;
