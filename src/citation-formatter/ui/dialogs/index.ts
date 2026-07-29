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
export type {
    DraftDialogActions,
    DraftDialogContext,
} from "./draft-dialog.ts";
export type {
    MainDialogActions,
    MainDialogContext,
    MainDialogTableSlotScope,
} from "./main-dialog.ts";
export type {
    ParameterAliasActions,
    ParameterAliasContext,
} from "./parameter-alias-dialog.ts";
export type {
    AnalysisReplacementActions,
    AnalysisToolActions,
    CheckerToolActions,
    ToolActions,
    ToolDialogActions,
    ToolDialogContext,
} from "./tool-dialog.ts";

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
