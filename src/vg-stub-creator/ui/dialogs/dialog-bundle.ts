/** Template and styles owned by one VG Stub Creator dialog. */
export interface VgStubCreatorDialogBundle {
    readonly styles: string;
    readonly template: string;
}

/** Joins dialogs and styles in order under one setup scope. */
export function assembleVgStubCreatorDialogs(
    dialogs: readonly VgStubCreatorDialogBundle[],
    sharedStyles: string,
): VgStubCreatorDialogBundle {
    const templates = dialogs.map(getDialogTemplate);
    const styles = [sharedStyles, ...dialogs.map(getDialogStyles)].filter(
        isNonEmpty,
    );
    return {
        styles: styles.join("\n"),
        template: templates.join(""),
    };
}

function getDialogTemplate(dialog: VgStubCreatorDialogBundle): string {
    return dialog.template;
}

function getDialogStyles(dialog: VgStubCreatorDialogBundle): string {
    return dialog.styles;
}

function isNonEmpty(value: string): boolean {
    return value !== "";
}
