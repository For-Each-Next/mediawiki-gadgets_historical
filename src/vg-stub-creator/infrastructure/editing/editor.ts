/**
 * Writes generated content into the MediaWiki edit form.
 */

/**
 * Replaces the MediaWiki edit textarea with generated wikitext.
 *
 * @param text - Generated article wikitext.
 * @returns */
export function writeEditText(text: string): void {
    const textbox = document.getElementById(
        "wpTextbox1",
    ) as HTMLTextAreaElement | null;

    if (textbox == null) {
        throw new Error("MediaWiki edit textbox is unavailable.");
    }

    textbox.value = text;
    dispatchValueEvents(textbox);
    textbox.focus();
}

/**
 * Reads the current MediaWiki edit textarea.
 *
 * @returns Current editor wikitext.
 */
export function readEditText(): string {
    const textbox = document.getElementById(
        "wpTextbox1",
    ) as HTMLTextAreaElement | null;

    return textbox?.value || "";
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
 * @returns */
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
 * @returns */
function dispatchValueEvents(element: HTMLElement): void {
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
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
 * @returns */
export function submitEditForm(): void {
    const editForm = document.getElementById(
        "editform",
    ) as HTMLFormElement | null;
    const saveButton = document.getElementById("wpSave");

    if (editForm == null || saveButton == null) {
        throw new Error("MediaWiki save form is unavailable.");
    }

    allowNextSaveSubmit = true;
    editForm.requestSubmit(saveButton);
}

/**
 * Submits the MediaWiki edit form through its preview button.
 *
 * @returns */
export function submitPreviewForm(): void {
    const editForm = document.getElementById(
        "editform",
    ) as HTMLFormElement | null;
    const previewButton = document.getElementById("wpPreview");

    if (editForm == null || previewButton == null) {
        throw new Error("MediaWiki preview form is unavailable.");
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

    const handleSubmit = function callback(event) {
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

    return function callback() {
        editForm.removeEventListener("submit", handleSubmit, true);
    };
}
