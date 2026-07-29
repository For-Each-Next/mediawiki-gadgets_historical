/** Build-injected main Citation Formatter dialog bundle. */

import type { CitationDialogBundle } from "./dialog-bundle.ts";

const mainDialog: CitationDialogBundle = {
    styles:
        typeof __CITATION_FORMATTER_MAIN_DIALOG_STYLES__ === "undefined"
            ? ""
            : __CITATION_FORMATTER_MAIN_DIALOG_STYLES__,
    template:
        typeof __CITATION_FORMATTER_MAIN_DIALOG_TEMPLATE__ === "undefined"
            ? ""
            : __CITATION_FORMATTER_MAIN_DIALOG_TEMPLATE__,
};

export default mainDialog;
