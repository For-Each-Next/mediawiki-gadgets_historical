/* eslint-disable */

/**
 * Writes generated content into the MediaWiki edit form.
 */

/**
 * Replaces the MediaWiki edit textarea with generated wikitext.
 *
 * @param {string} text - Generated article wikitext.
 * @returns {void}
 */
export function writeEditText(text) {
    const textbox = document.getElementById("wpTextbox1");
    const $textbox = $(textbox);

    if (typeof $textbox.textSelection === "function") {
        $textbox.textSelection("setContents", text);
    } else {
        textbox.value = text;
    }

    $textbox.trigger("input").trigger("change");
    textbox.focus();
}

/**
 * Replaces the MediaWiki edit summary.
 *
 * @param {string} summary - Generated edit summary.
 * @returns {void}
 */
export function writeEditSummary(summary) {
    const summaryInput = document.getElementById("wpSummary");

    if (summaryInput == null) {
        return;
    }

    summaryInput.value = summary;
    $(summaryInput).trigger("input").trigger("change");
}

/**
 * Submits the MediaWiki edit form through its save button.
 *
 * @returns {void}
 */
export function submitEditForm() {
    const editForm = document.getElementById("editform");
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
 * @returns {void}
 */
export function submitPreviewForm() {
    const editForm = document.getElementById("editform");
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
 * @param {Function} onSubmit - Intercepted save callback.
 * @returns {Function} Listener removal callback.
 */
export function interceptEditSave(onSubmit) {
    const editForm = document.getElementById("editform");

    if (editForm == null) {
        return () => {};
    }

    const handleSubmit = (event) => {
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

    return () => {
        editForm.removeEventListener("submit", handleSubmit, true);
    };
}
