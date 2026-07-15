import {
    createActionFooterTemplate,
    createButtonTemplate,
    createElement,
    createFieldTemplate,
    createMessageTemplate,
    toVueString,
} from "#me/ui/template.ts";
import { msg } from "#me/i18n/index.ts";

/**
 * Creates the editable generated wikitext preview dialog.
 *
 * @returns Preview dialog template node.
 */
export function createPreviewDialogTemplate(): any {
    const result = createElement(
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
    return result;
}

/**
 * Creates generated article preview footer actions.
 *
 * @returns Footer action groups.
 */
function createPreviewFooterActions(): any {
    const result = {
        left: [createPreviewDismissButton()],
        right: [createPreviewRefreshButton(), createPreviewContinueButton()],
    };
    return result;
}

/**
 * Creates the preview dismiss button.
 *
 * @returns Dismiss button node.
 */
function createPreviewDismissButton(): any {
    const result = createButtonTemplate({
        click: "closePreviewDialog",
        label: msg("preview.dismiss"),
        weight: "quiet",
    });
    return result;
}

/**
 * Creates the generated article preview refresh button.
 *
 * @returns Refresh button node.
 */
function createPreviewRefreshButton(): any {
    const result = createRefreshButton({
        click: "refreshParsedPreview",
        disabled: "sourceFetchState.loading",
        label: `{{ sourceFetchState.loading ? ${toVueString(
            msg("preview.updating"),
        )} : ${toVueString(msg("preview.updatePreview"))} }}`,
    });
    return result;
}

/**
 * Creates the generated article preview continue button.
 *
 * @returns Continue button node.
 */
function createPreviewContinueButton(): any {
    const result = createPrimaryButton({
        click: "submitPreviewText",
        disabled: "sourceFetchState.loading || !previewText.trim()",
        label: msg("preview.continue"),
    });
    return result;
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
    const result = createFieldTemplate(
        msg("preview.editSummary"),
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
    return result;
}

/**
 * Creates the staged page source editor dialog.
 *
 * @returns Page edit dialog template node.
 */
export function createPageEditDialogTemplate(): any {
    const result = createElement(
        "cdx-dialog",
        {
            class: "vg-stub-creator-preview-dialog",
            "v-bind:title": "getPageEditDialogTitle()",
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
    return result;
}

/**
 * Creates staged page edit footer actions.
 *
 * @returns Footer action groups.
 */
function createPageEditFooterActions(): any {
    const result = {
        left: [createPageEditCancelButton()],
        right: [
            createPageEditRefreshButton(),
            createPageEditResetButton(),
            createPageEditStageButton(),
        ],
    };
    return result;
}

/**
 * Creates the staged page edit cancel button.
 *
 * @returns Cancel button node.
 */
function createPageEditCancelButton(): any {
    const result = createButtonTemplate({
        click: "closePageEditDialog",
        label: msg("preview.cancel"),
        weight: "quiet",
    });
    return result;
}

/**
 * Creates the staged page edit preview-refresh button.
 *
 * @returns Refresh button node.
 */
function createPageEditRefreshButton(): any {
    const result = createRefreshButton({
        click: "refreshPageEditPreview",
        disabled: "pageEditState.loading",
        label: `{{ pageEditState.loading ? ${toVueString(
            msg("preview.updating"),
        )} : ${toVueString(msg("preview.updatePreview"))} }}`,
    });
    return result;
}

/**
 * Creates the staged page edit reset button.
 *
 * @returns Reset button node.
 */
function createPageEditResetButton(): any {
    const result = createButtonTemplate({
        action: "destructive",
        click: "resetPageEdit",
        disabled: "pageEditState.loading",
        label: msg("common.reset"),
        show: "pageEditState.pending",
    });
    return result;
}

/**
 * Creates the staged page edit stage button.
 *
 * @returns Stage button node.
 */
function createPageEditStageButton(): any {
    const result = createPrimaryButton({
        click: "stagePageEdit",
        disabled: "pageEditState.loading || !pageEditState.text.trim()",
        label: msg("preview.stage"),
    });
    return result;
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
    const result = createElement(
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
    return result;
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
    const label = "getPageEditEnglishLabel()";
    const input = createElement("cdx-text-input", {
        "v-bind:disabled": "pageEditState.loading",
        "v-bind:placeholder": "getPageEditEnglishPlaceholder()",
        "v-model": "pageEditState.englishName",
    });
    const condition = [
        "pageEditState.create && (pageEditState.kind === 'category'",
        " || pageEditState.kind === 'navbox')",
    ].join("");
    const field = createFieldTemplate(label, [input], {
        attributes: { "v-if": condition },
        bindLabel: true,
    });

    return field;
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
    const result = createElement(
        "template",
        {
            "v-slot:footer": "",
        },
        [createActionFooterTemplate(actions)],
    );
    return result;
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
    const result = createButtonTemplate({
        ...options,
        action: "progressive",
        weight: "primary",
    });
    return result;
}
