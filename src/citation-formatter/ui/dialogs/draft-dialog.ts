/** Build-injected citation draft dialog bundle. */

import type { CitationDialogBundle } from "./dialog-bundle.ts";

const draftDialog: CitationDialogBundle = {
    styles:
        typeof __CITATION_FORMATTER_DRAFT_DIALOG_STYLES__ === "undefined"
            ? ""
            : __CITATION_FORMATTER_DRAFT_DIALOG_STYLES__,
    template:
        typeof __CITATION_FORMATTER_DRAFT_DIALOG_TEMPLATE__ === "undefined"
            ? ""
            : __CITATION_FORMATTER_DRAFT_DIALOG_TEMPLATE__,
};

export default draftDialog;
