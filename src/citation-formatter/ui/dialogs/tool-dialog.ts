/** Build-injected citation-checking and analysis dialog bundle. */

import type { CitationDialogBundle } from "./dialog-bundle.ts";

const toolDialog: CitationDialogBundle = {
    styles:
        typeof __CITATION_FORMATTER_TOOL_DIALOG_STYLES__ === "undefined"
            ? ""
            : __CITATION_FORMATTER_TOOL_DIALOG_STYLES__,
    template:
        typeof __CITATION_FORMATTER_TOOL_DIALOG_TEMPLATE__ === "undefined"
            ? ""
            : __CITATION_FORMATTER_TOOL_DIALOG_TEMPLATE__,
};

export default toolDialog;
