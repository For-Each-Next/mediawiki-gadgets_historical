/** Build-injected reference-name alias dialog bundle. */

import type { CitationDialogBundle } from "./dialog-bundle.ts";

const parameterAliasDialog: CitationDialogBundle = {
    styles:
        typeof __CITATION_FORMATTER_PARAMETER_ALIAS_DIALOG_STYLES__ ===
        "undefined"
            ? ""
            : __CITATION_FORMATTER_PARAMETER_ALIAS_DIALOG_STYLES__,
    template:
        typeof __CITATION_FORMATTER_PARAMETER_ALIAS_DIALOG_TEMPLATE__ ===
        "undefined"
            ? ""
            : __CITATION_FORMATTER_PARAMETER_ALIAS_DIALOG_TEMPLATE__,
};

export default parameterAliasDialog;
