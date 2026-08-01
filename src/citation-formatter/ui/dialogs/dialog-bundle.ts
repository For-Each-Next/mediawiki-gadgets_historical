/** Template and styles owned by one Citation Formatter dialog. */
export interface CitationDialogBundle {
    readonly styles: string;
    readonly template: string;
}

/**
 * Joins dialogs in document and cascade order.
 *
 * @param dialogs - Dialogs value.
 * @returns Operation result.
 */
export function assembleCitationDialogs(
    dialogs: readonly CitationDialogBundle[],
): CitationDialogBundle {
    const templates = dialogs.map(getDialogTemplate);
    const styles = dialogs.map(getDialogStyles).filter(isNonEmpty);
    return {
        styles: styles.join("\n"),
        template: templates.join(""),
    };
}

function getDialogTemplate(dialog: CitationDialogBundle): string {
    return dialog.template;
}

function getDialogStyles(dialog: CitationDialogBundle): string {
    return dialog.styles;
}

function isNonEmpty(value: string): boolean {
    return value !== "";
}
