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

    editForm.requestSubmit(saveButton);
}
