/**
 * Editor-only types for MediaWiki's runtime Vue surface.
 */

import type { CloseDialogContext } from "#gadget/ui/dialogs/index.ts";

type CodexModule = typeof import("@wikimedia/codex");
type CancelClose = CloseDialogContext["cancelCloseConfirmation"];
type KeepAndClose = CloseDialogContext["keepAnalysisChangesAndClose"];
type OpenChange = CloseDialogContext["onCloseConfirmationOpenChange"];
type UndoAndClose = CloseDialogContext["undoAnalysisChangesAndClose"];
type CdxDialogWithSlots = CodexModule["CdxDialog"] & {
    new (): {
        $slots: {
            default?: () => unknown;
            footer?: () => unknown;
        };
    };
};

declare module "vue" {
    interface ComponentCustomProperties {
        cancelCloseConfirmation: CancelClose;
        closeConfirmationOpen: CloseDialogContext["closeConfirmationOpen"];
        interfaceLocale: CloseDialogContext["interfaceLocale"];
        keepAnalysisChangesAndClose: KeepAndClose;
        msg: CloseDialogContext["msg"];
        onCloseConfirmationOpenChange: OpenChange;
        undoAnalysisChangesAndClose: UndoAndClose;
    }
}

declare module "@vue/runtime-core" {
    interface ComponentCustomProperties {
        cancelCloseConfirmation: CancelClose;
        closeConfirmationOpen: CloseDialogContext["closeConfirmationOpen"];
        interfaceLocale: CloseDialogContext["interfaceLocale"];
        keepAnalysisChangesAndClose: KeepAndClose;
        msg: CloseDialogContext["msg"];
        onCloseConfirmationOpenChange: OpenChange;
        undoAnalysisChangesAndClose: UndoAndClose;
    }

    interface GlobalComponents {
        CdxButton: CodexModule["CdxButton"];
        CdxCard: CodexModule["CdxCard"];
        CdxCheckbox: CodexModule["CdxCheckbox"];
        CdxCombobox: CodexModule["CdxCombobox"];
        CdxDialog: CdxDialogWithSlots;
        CdxField: CodexModule["CdxField"];
        CdxIcon: CodexModule["CdxIcon"];
        CdxMessage: CodexModule["CdxMessage"];
        CdxProgressBar: CodexModule["CdxProgressBar"];
        CdxRadio: CodexModule["CdxRadio"];
        CdxSelect: CodexModule["CdxSelect"];
        CdxTab: CodexModule["CdxTab"];
        CdxTable: CodexModule["CdxTable"];
        CdxTabs: CodexModule["CdxTabs"];
        CdxTextArea: CodexModule["CdxTextArea"];
        CdxTextInput: CodexModule["CdxTextInput"];
        CdxToastContainer: CodexModule["CdxToastContainer"];
    }
}

export {};
