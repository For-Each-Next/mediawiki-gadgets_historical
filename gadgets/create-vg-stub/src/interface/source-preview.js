/* eslint-disable */

import {
    createActionFooterTemplate,
    createButtonTemplate,
    createElement,
    createFieldTemplate,
    createMessageTemplate,
} from "./template.js";

/**
 * Creates the editable generated wikitext preview dialog.
 *
 * @returns {object} Preview dialog template node.
 */
export function createPreviewDialogTemplate() {
    return createElement(
        "cdx-dialog",
        {
            class: "create-vg-stub-preview-dialog",
            "v-if": "previewOpen",
            "v-model:open": "previewOpen",
            "v-bind:title": "getArticlePreviewTitle()",
        },
        [
            createSourcePreviewLayout({
                html: "previewHtml",
                ref: "previewTextArea",
                text: "previewText",
            }),
            createEditSummaryInput({
                disabled: "sourceFetchState.loading",
                model: "previewSummary",
            }),
            createErrorParagraph(
                "sourceFetchState.error",
                "{{ sourceFetchState.error }}",
            ),
            createFooterSlot(createPreviewFooterActions()),
        ],
    );
}

/**
 * Creates generated article preview footer actions.
 *
 * @returns {object} Footer action groups.
 */
function createPreviewFooterActions() {
    return {
        left: [createPreviewDismissButton()],
        right: [createPreviewRefreshButton(), createPreviewContinueButton()],
    };
}

/**
 * Creates the preview dismiss button.
 *
 * @returns {object} Dismiss button node.
 */
function createPreviewDismissButton() {
    return createButtonTemplate({
        click: "closePreviewDialog",
        label: "Dismiss",
        weight: "quiet",
    });
}

/**
 * Creates the generated article preview refresh button.
 *
 * @returns {object} Refresh button node.
 */
function createPreviewRefreshButton() {
    return createRefreshButton({
        click: "refreshParsedPreview",
        disabled: "sourceFetchState.loading",
        label: "{{ sourceFetchState.loading ? 'Updating' : 'Update preview' }}",
    });
}

/**
 * Creates the generated article preview continue button.
 *
 * @returns {object} Continue button node.
 */
function createPreviewContinueButton() {
    return createPrimaryButton({
        click: "submitPreviewText",
        disabled: "sourceFetchState.loading || !previewText.trim()",
        label: "Continue",
    });
}

/**
 * Creates an edit-summary textbox.
 *
 * @param {object} options - Input bindings.
 * @param {string} [options.disabled] - Disabled binding expression.
 * @param {string} options.model - Summary v-model expression.
 * @returns {object} Edit-summary field node.
 */
function createEditSummaryInput(options) {
    return createFieldTemplate(
        "Edit summary",
        [
            createElement("cdx-text-input", {
                "v-bind:disabled": options.disabled || "false",
                "v-model": options.model,
            }),
        ],
        {
            attributes: {
                class: "create-vg-stub-preview-summary",
            },
        },
    );
}

/**
 * Creates the staged page source editor dialog.
 *
 * @returns {object} Page edit dialog template node.
 */
export function createPageEditDialogTemplate() {
    return createElement(
        "cdx-dialog",
        {
            class: "create-vg-stub-preview-dialog",
            "v-bind:title":
                "(pageEditState.create ? 'Create ' : 'Modify ') + '\\'' + pageEditState.title + '\\''",
            "v-if": "pageEditOpen",
            "v-model:open": "pageEditOpen",
        },
        [
            createEnglishPageField(),
            createSourcePreviewLayout({
                disabled: "pageEditState.loading",
                html: "pageEditState.html",
                ref: "pageEditTextArea",
                text: "pageEditState.text",
            }),
            createErrorParagraph(
                "pageEditState.error",
                "{{ pageEditState.error }}",
            ),
            createFooterSlot(createPageEditFooterActions()),
        ],
    );
}

/**
 * Creates staged page edit footer actions.
 *
 * @returns {object} Footer action groups.
 */
function createPageEditFooterActions() {
    return {
        left: [createPageEditCancelButton()],
        right: [
            createPageEditRefreshButton(),
            createPageEditResetButton(),
            createPageEditStageButton(),
        ],
    };
}

/**
 * Creates the staged page edit cancel button.
 *
 * @returns {object} Cancel button node.
 */
function createPageEditCancelButton() {
    return createButtonTemplate({
        click: "closePageEditDialog",
        label: "Cancel",
        weight: "quiet",
    });
}

/**
 * Creates the staged page edit preview-refresh button.
 *
 * @returns {object} Refresh button node.
 */
function createPageEditRefreshButton() {
    return createRefreshButton({
        click: "refreshPageEditPreview",
        disabled: "pageEditState.loading",
        label: "{{ pageEditState.loading ? 'Updating' : 'Update preview' }}",
    });
}

/**
 * Creates the staged page edit reset button.
 *
 * @returns {object} Reset button node.
 */
function createPageEditResetButton() {
    return createButtonTemplate({
        action: "destructive",
        click: "resetPageEdit",
        disabled: "pageEditState.loading",
        label: "Reset",
        show: "pageEditState.pending",
    });
}

/**
 * Creates the staged page edit stage button.
 *
 * @returns {object} Stage button node.
 */
function createPageEditStageButton() {
    return createPrimaryButton({
        click: "stagePageEdit",
        disabled: "pageEditState.loading || !pageEditState.text.trim()",
        label: "Stage",
    });
}

/**
 * Creates a source textarea beside a rendered preview.
 *
 * @param {object} options - Layout bindings.
 * @param {string} [options.disabled] - Disabled binding expression.
 * @param {string} options.html - Rendered HTML binding expression.
 * @param {string} options.ref - Vue template ref for the textarea.
 * @param {string} options.text - Source text v-model expression.
 * @returns {object} Source preview layout node.
 */
function createSourcePreviewLayout(options) {
    return createElement(
        "div",
        {
            class: "create-vg-stub-preview-layout",
        },
        [
            createSourceTextArea(options),
            createElement("div", {
                class: "create-vg-stub-preview-rendered mw-parser-output",
                "v-html": options.html,
            }),
        ],
    );
}

/**
 * Creates the source textarea.
 *
 * @param {object} options - Textarea bindings.
 * @returns {object} Source textarea node.
 */
function createSourceTextArea(options) {
    const attributes = {
        class: "create-vg-stub-preview-text",
        ref: options.ref,
        "v-model": options.text,
        rows: "18",
        spellcheck: "false",
        style: {
            fontFamily: "monospace",
        },
    };

    if (options.disabled) {
        attributes["v-bind:disabled"] = options.disabled;
    }

    return createElement("cdx-text-area", attributes);
}

/**
 * Creates the optional English page helper field.
 *
 * @returns {object} English page field node.
 */
function createEnglishPageField() {
    return createFieldTemplate(
        "{{ pageEditState.kind === 'navbox' ? 'English Wikipedia template' : 'English Wikipedia category' }}",
        [
            createElement("cdx-text-input", {
                "v-bind:disabled": "pageEditState.loading",
                "v-bind:placeholder":
                    "pageEditState.kind === 'navbox' ? 'e.g. Template:Final Fantasy series' : 'e.g. Action games'",
                "v-model": "pageEditState.englishName",
            }),
        ],
        {
            attributes: {
                "v-if":
                    "pageEditState.create && " +
                    "(pageEditState.kind === 'category' || pageEditState.kind === 'navbox')",
            },
            bindLabel: false,
        },
    );
}

/**
 * Creates an error paragraph.
 *
 * @param {string} condition - Vue condition expression.
 * @param {string} message - Vue message interpolation.
 * @returns {object} Error paragraph node.
 */
function createErrorParagraph(condition, message) {
    return createMessageTemplate(condition, message);
}

/**
 * Wraps dialog action buttons in a footer slot.
 *
 * @param {Array<object>|object} actions - Button nodes or action groups.
 * @returns {object} Footer slot node.
 */
function createFooterSlot(actions) {
    return createElement(
        "template",
        {
            "v-slot:footer": "",
        },
        [createActionFooterTemplate(actions)],
    );
}

/**
 * Creates a preview refresh button.
 *
 * @param {object} options - Button options.
 * @returns {object} Button node.
 */
function createRefreshButton(options) {
    return createButtonTemplate(options);
}

/**
 * Creates a progressive primary button.
 *
 * @param {object} options - Button options.
 * @returns {object} Button node.
 */
function createPrimaryButton(options) {
    return createButtonTemplate({
        ...options,
        action: "progressive",
        weight: "primary",
    });
}
