import {
    createActionFooterTemplate,
    createButtonTemplate,
    createElement,
    createFieldTemplate,
    createMessageTemplate,
} from "./template.ts";


/**
 * Creates the editable generated wikitext preview dialog.
 *
 * @returns Preview dialog template node.
 */
export function createPreviewDialogTemplate(): any {
    return createElement(
        "cdx-dialog",
        {
            class: "vg-stub-creator-preview-dialog",
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
 * @returns Footer action groups.
 */
function createPreviewFooterActions(): any {
    return {
        left: [createPreviewDismissButton()],
        right: [createPreviewRefreshButton(), createPreviewContinueButton()],
    };
}


/**
 * Creates the preview dismiss button.
 *
 * @returns Dismiss button node.
 */
function createPreviewDismissButton(): any {
    return createButtonTemplate({
        click: "closePreviewDialog",
        label: "Dismiss",
        weight: "quiet",
    });
}


/**
 * Creates the generated article preview refresh button.
 *
 * @returns Refresh button node.
 */
function createPreviewRefreshButton(): any {
    return createRefreshButton({
        click: "refreshParsedPreview",
        disabled: "sourceFetchState.loading",
        label: [
            "{{ sourceFetchState.loading ? 'Upd",
            "ating' : 'Update preview' }}",
        ].join(""),
    });
}


/**
 * Creates the generated article preview continue button.
 *
 * @returns Continue button node.
 */
function createPreviewContinueButton(): any {
    return createPrimaryButton({
        click: "submitPreviewText",
        disabled: "sourceFetchState.loading || !previewText.trim()",
        label: "Continue",
    });
}


/**
 * Creates an edit-summary textbox.
 *
 * @param options - Input bindings.
 * @param options.disabled - Disabled binding expression.
 * @param options.model - Summary v-model expression.
 * @returns Edit-summary field node.
 */
function createEditSummaryInput(options: any): any {
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
                class: "vg-stub-creator-preview-summary",
            },
        },
    );
}


/**
 * Creates the staged page source editor dialog.
 *
 * @returns Page edit dialog template node.
 */
export function createPageEditDialogTemplate(): any {
    return createElement(
        "cdx-dialog",
        {
            class: "vg-stub-creator-preview-dialog",
            "v-bind:title": [
                "(pageEditState.create ? 'Create ' ",
                ": 'Modify ') + '\\'' + pageEditSta",
                "te.title + '\\''",
            ].join(""),
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
 * @returns Footer action groups.
 */
function createPageEditFooterActions(): any {
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
 * @returns Cancel button node.
 */
function createPageEditCancelButton(): any {
    return createButtonTemplate({
        click: "closePageEditDialog",
        label: "Cancel",
        weight: "quiet",
    });
}


/**
 * Creates the staged page edit preview-refresh button.
 *
 * @returns Refresh button node.
 */
function createPageEditRefreshButton(): any {
    return createRefreshButton({
        click: "refreshPageEditPreview",
        disabled: "pageEditState.loading",
        label: [
            "{{ pageEditState.loading ? 'Updati",
            "ng' : 'Update preview' }}",
        ].join(""),
    });
}


/**
 * Creates the staged page edit reset button.
 *
 * @returns Reset button node.
 */
function createPageEditResetButton(): any {
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
 * @returns Stage button node.
 */
function createPageEditStageButton(): any {
    return createPrimaryButton({
        click: "stagePageEdit",
        disabled: "pageEditState.loading || !pageEditState.text.trim()",
        label: "Stage",
    });
}


/**
 * Creates a source textarea beside a rendered preview.
 *
 * @param options - Layout bindings.
 * @param options.disabled - Disabled binding expression.
 * @param options.html - Rendered HTML binding expression.
 * @param options.ref - Vue template ref for the textarea.
 * @param options.text - Source text v-model expression.
 * @returns Source preview layout node.
 */
function createSourcePreviewLayout(options: any): any {
    return createElement(
        "div",
        {
            class: "vg-stub-creator-preview-layout",
        },
        [
            createSourceTextArea(options),
            createElement("div", {
                class: "vg-stub-creator-preview-rendered mw-parser-output",
                "v-html": options.html,
            }),
        ],
    );
}


/**
 * Creates the source textarea.
 *
 * @param options - Textarea bindings.
 * @returns Source textarea node.
 */
function createSourceTextArea(options: any): any {
    const attributes = {
        class: "vg-stub-creator-preview-text",
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
 * @returns English page field node.
 */
function createEnglishPageField(): any {
    return createFieldTemplate(
        [
            "{{ pageEditState.kind === 'navbox'",
            " ? 'English Wikipedia template' : ",
            "'English Wikipedia category' }}",
        ].join(""),
        [
            createElement("cdx-text-input", {
                "v-bind:disabled": "pageEditState.loading",
                "v-bind:placeholder": [
                    "pageEditState.kind === 'navbox' ? ",
                    "'e.g. Template:Final Fantasy serie",
                    "s' : 'e.g. Action games'",
                ].join(""),
                "v-model": "pageEditState.englishName",
            }),
        ],
        {
            attributes: {
                "v-if":
                    "pageEditState.create && " +
                    [
                        "(pageEditState.kind === 'category'",
                        " || pageEditState.kind === 'navbox",
                        "')",
                    ].join(""),
            },
            bindLabel: false,
        },
    );
}


/**
 * Creates an error paragraph.
 *
 * @param condition - Vue condition expression.
 * @param message - Vue message interpolation.
 * @returns Error paragraph node.
 */
function createErrorParagraph(condition: string, message: string): any {
    return createMessageTemplate(condition, message);
}


/**
 * Wraps dialog action buttons in a footer slot.
 *
 * @param actions - Button nodes or action
 * groups.
 * @returns Footer slot node.
 */
function createFooterSlot(actions: Array<any> | any): any {
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
 * @param options - Button options.
 * @returns Button node.
 */
function createRefreshButton(options: any): any {
    return createButtonTemplate(options);
}


/**
 * Creates a progressive primary button.
 *
 * @param options - Button options.
 * @returns Button node.
 */
function createPrimaryButton(options: any): any {
    return createButtonTemplate({
        ...options,
        action: "progressive",
        weight: "primary",
    });
}
