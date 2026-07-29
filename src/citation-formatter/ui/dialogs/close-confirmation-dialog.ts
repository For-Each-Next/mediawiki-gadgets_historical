/** Build-injected manager-close confirmation dialog bundle. */

import type { CitationFormatterI18n } from "#gadget/i18n/index.ts";

import type { CitationDialogBundle } from "./dialog-bundle.ts";

export interface CloseDialogActions {
    cancelCloseConfirmation(): void;
    keepAnalysisChangesAndClose(): void;
    onCloseConfirmationOpenChange(open: boolean): void;
    undoAnalysisChangesAndClose(): void;
}

/**
 * Public bindings exposed to the build-injected confirmation template.
 */
export type CloseDialogContext = CloseDialogActions & {
    closeConfirmationOpen: boolean;
    interfaceLocale: string;
    msg: CitationFormatterI18n["msg"];
};

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
