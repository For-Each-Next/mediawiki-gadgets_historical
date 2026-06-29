/* eslint-disable */

import {
    createActionFooterTemplate,
    createElement,
    createText,
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
            "v-model:open": "previewOpen",
            "v-bind:title": "getArticlePreviewTitle()",
        },
        [
            createSourcePreviewLayout({
                html: "previewHtml",
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
            createFooterSlot([
                createRefreshButton({
                    click: "refreshParsedPreview",
                    disabled: "sourceFetchState.loading",
                    label:
                        "{{ sourceFetchState.loading ? 'Working' : 'Update preview' }}",
                }),
                createPrimaryButton({
                    click: "submitPreviewText",
                    disabled:
                        "sourceFetchState.loading || !previewText.trim()",
                    label: "Continue",
                }),
                createButton({
                    click: "closePreviewDialog",
                    label: "Dismiss",
                }),
            ]),
        ],
    );
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
    return createElement(
        "label",
        {
            style: {
                display: "block",
                marginTop: "1em",
            },
        },
        [
            createElement(
                "span",
                {
                    style: {
                        display: "block",
                        marginBottom: "0.25em",
                    },
                },
                [createText("Edit summary")],
            ),
            createElement("cdx-text-input", {
                "v-bind:disabled": options.disabled || "false",
                "v-model": options.model,
            }),
        ],
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
            "v-model:open": "pageEditOpen",
        },
        [
            createEnglishCategoryField(),
            createSourcePreviewLayout({
                disabled: "pageEditState.loading",
                html: "pageEditState.html",
                text: "pageEditState.text",
            }),
            createErrorParagraph(
                "pageEditState.error",
                "{{ pageEditState.error }}",
            ),
            createFooterSlot([
                createRefreshButton({
                    click: "refreshPageEditPreview",
                    disabled: "pageEditState.loading",
                    label:
                        "{{ pageEditState.loading ? 'Working' : 'Update preview' }}",
                }),
                createPrimaryButton({
                    click: "stagePageEdit",
                    disabled:
                        "pageEditState.loading || !pageEditState.text.trim()",
                    label: "Stage",
                }),
                createButton({
                    action: "destructive",
                    click: "resetPageEdit",
                    disabled: "pageEditState.loading",
                    label: "Reset",
                    show: "pageEditState.pending",
                }),
                createButton({
                    click: "closePageEditDialog",
                    label: "Cancel",
                }),
            ]),
        ],
    );
}

/**
 * Creates a source textarea beside a rendered preview.
 *
 * @param {object} options - Layout bindings.
 * @param {string} [options.disabled] - Disabled binding expression.
 * @param {string} options.html - Rendered HTML binding expression.
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
 * Creates the optional English category helper field.
 *
 * @returns {object} English category field node.
 */
function createEnglishCategoryField() {
    return createElement(
        "label",
        {
            "v-if":
                "pageEditState.kind === 'category' && pageEditState.create && pageEditState.company",
            style: {
                display: "block",
                marginBottom: "0.75em",
            },
        },
        [
            createElement(
                "span",
                {
                    style: {
                        display: "block",
                        marginBottom: "0.25em",
                    },
                },
                [createText("English Wikipedia category")],
            ),
            createElement("cdx-text-input", {
                "v-bind:disabled": "pageEditState.loading",
                "v-model": "pageEditState.englishName",
            }),
        ],
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
    return createElement(
        "p",
        {
            class: "create-vg-stub-error",
            "v-if": condition,
        },
        [createText(message)],
    );
}

/**
 * Wraps dialog action buttons in a footer slot.
 *
 * @param {Array<object>} actions - Button nodes.
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
    return createButton(options);
}

/**
 * Creates a progressive primary button.
 *
 * @param {object} options - Button options.
 * @returns {object} Button node.
 */
function createPrimaryButton(options) {
    return createButton({
        ...options,
        action: "progressive",
        weight: "primary",
    });
}

/**
 * Creates a Codex button.
 *
 * @param {object} options - Button options.
 * @param {string} [options.action] - Codex action.
 * @param {string} options.click - Click handler expression.
 * @param {string} [options.disabled] - Disabled binding expression.
 * @param {string} options.label - Button label or interpolation.
 * @param {string} [options.show] - Visibility binding expression.
 * @param {string} [options.weight] - Codex weight.
 * @returns {object} Button node.
 */
function createButton(options) {
    const attributes = {
        "v-on:click": options.click,
    };

    if (options.action) {
        attributes.action = options.action;
    }

    if (options.disabled) {
        attributes["v-bind:disabled"] = options.disabled;
    }

    if (options.show) {
        attributes["v-if"] = options.show;
    }

    if (options.weight) {
        attributes.weight = options.weight;
    }

    return createElement("cdx-button", attributes, [createText(options.label)]);
}
