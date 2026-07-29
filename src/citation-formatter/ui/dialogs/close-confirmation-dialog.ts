/** Build-injected manager-close confirmation dialog bundle. */

import type { CitationDialogBundle } from "./dialog-bundle.ts";

const closeConfirmationDialog: CitationDialogBundle = {
    styles:
        typeof __CITATION_FORMATTER_CLOSE_DIALOG_STYLES__ === "undefined"
            ? ""
            : __CITATION_FORMATTER_CLOSE_DIALOG_STYLES__,
    template:
        typeof __CITATION_FORMATTER_CLOSE_DIALOG_TEMPLATE__ === "undefined"
            ? ""
            : __CITATION_FORMATTER_CLOSE_DIALOG_TEMPLATE__,
};

export default closeConfirmationDialog;
