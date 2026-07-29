/** Assembles five dialogs in shared setup scope. */

import closeConfirmationDialog from "./close-confirmation-dialog.ts";
import {
    assembleCitationDialogs,
    type CitationDialogBundle,
} from "./dialog-bundle.ts";
import draftDialog from "./draft-dialog.ts";
import mainDialog from "./main-dialog.ts";
import parameterAliasDialog from "./parameter-alias-dialog.ts";
import toolDialog from "./tool-dialog.ts";

export type {
    CloseDialogActions,
    CloseDialogContext,
} from "./close-confirmation-dialog.ts";

const dialogs: readonly CitationDialogBundle[] = [
    mainDialog,
    draftDialog,
    parameterAliasDialog,
    toolDialog,
    closeConfirmationDialog,
];
const sourceManagerDialogs = assembleCitationDialogs(dialogs);

export const SOURCE_MANAGER_DIALOG_STYLES = sourceManagerDialogs.styles;
export const SOURCE_MANAGER_TEMPLATE = sourceManagerDialogs.template;
