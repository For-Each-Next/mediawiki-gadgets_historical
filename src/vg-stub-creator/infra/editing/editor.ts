/**
 * Writes generated content into the MediaWiki edit form.
 */

import { msg } from "#me/i18n/index.ts";
import { editBox } from "#shared";

/**
 * Replaces the MediaWiki edit textarea with generated wikitext.
 *
 * @param text - Generated article wikitext.
 * @returns Result when the function
 *   replaces the mediawiki edit textarea with
 *   generated wikitext.
 */
export function writeEditText(text: string): void {
    const editor = editBox.getEditBox();

    if (editor == null) {
        const message = msg("errors.editorUnavailable");
        throw new Error(message);
    }

    editor.write(text);
    editor.focus();
}

/**
 * Reads the current MediaWiki edit textarea.
 *
 * @returns Current editor wikitext.
 */
export function readEditText(): string {
    return editBox.readEditBox();
}

/**
 * Checks whether the MediaWiki editor already contains wikitext.
 *
 * @returns Whether existing editor text should be preserved.
 */
export function hasEditText(): boolean {
    return readEditText() !== "";
}

/**
 * Checks whether save should keep the current editor text and summary.
 *
 * @returns Whether existing editor values are authoritative.
 */
export function shouldPreserveEditor(): boolean {
    return document.getElementById("editform") != null && hasEditText();
}

/**
 * Replaces the MediaWiki edit summary.
 *
 * @param summary - Generated edit summary.
 * @returns Result when the function
 *   replaces the mediawiki edit summary.
 */
export function writeEditSummary(summary: string): void {
    const summaryInput = document.getElementById(
        "wpSummary",
    ) as HTMLInputElement | null;

    if (summaryInput == null) {
        return;
    }

    summaryInput.value = summary;
    dispatchValueEvents(summaryInput);
}

/**
 * Dispatches native events after a form value changes.
 *
 * @param element - Updated form control.
 * @returns Result when the function
 *   dispatches native events after a form value
 *   changes.
 */
function dispatchValueEvents(element: HTMLElement): void {
    const inputEvent = new Event("input", { bubbles: true });
    element.dispatchEvent(inputEvent);
    const changeEvent = new Event("change", { bubbles: true });
    element.dispatchEvent(changeEvent);
}

/**
 * Reads the current MediaWiki edit summary.
 *
 * @returns Current edit summary.
 */
export function readEditSummary(): string {
    const summaryInput = document.getElementById(
        "wpSummary",
    ) as HTMLInputElement | null;

    return summaryInput?.value || "";
}

/**
 * Submits the MediaWiki edit form through its save button.
 *
 * @returns Result when the function
 *   submits the mediawiki edit form through its save
 *   button.
 */
export function submitEditForm(): void {
    const editForm = document.getElementById(
        "editform",
    ) as HTMLFormElement | null;
    const saveButton = document.getElementById("wpSave");

    if (editForm == null || saveButton == null) {
        const message = msg("errors.saveFormUnavailable");
        throw new Error(message);
    }

    allowNextSaveSubmit = true;
    editForm.requestSubmit(saveButton);
}

/**
 * Submits the MediaWiki edit form through its preview button.
 *
 * @returns Result when the function
 *   submits the mediawiki edit form through its
 *   preview button.
 */
export function submitPreviewForm(): void {
    const editForm = document.getElementById(
        "editform",
    ) as HTMLFormElement | null;
    const previewButton = document.getElementById("wpPreview");

    if (editForm == null || previewButton == null) {
        const message = msg("errors.previewFormUnavailable");
        throw new Error(message);
    }

    editForm.requestSubmit(previewButton);
}

let allowNextSaveSubmit = false;

/**
 * Routes native MediaWiki save submissions through a review callback.
 *
 * @param onSubmit - Intercepted save callback.
 * @returns Listener removal callback.
 */
export function interceptEditSave(
    onSubmit: (...args: any[]) => any,
): (...args: any[]) => any {
    const editForm = document.getElementById("editform");

    if (editForm == null) {
        return function callback() {};
    }

    const handleSubmit = function callback(event: {
        submitter: { id: unknown };
        preventDefault: () => void;
        stopImmediatePropagation: () => void;
    }) {
        const submitterId = event.submitter?.id;
        if (submitterId != null && submitterId !== "wpSave") {
            return;
        }

        if (allowNextSaveSubmit) {
            allowNextSaveSubmit = false;
            return;
        }

        event.preventDefault();
        event.stopImmediatePropagation();
        onSubmit();
    };

    editForm.addEventListener("submit", handleSubmit, true);

    const result = function callback() {
        editForm.removeEventListener("submit", handleSubmit, true);
    };
    return result;
}
