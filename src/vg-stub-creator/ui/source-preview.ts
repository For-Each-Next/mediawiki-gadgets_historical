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
    const previewFooterActionsResult = createPreviewFooterActions();
    const sourcePreviewLayoutResult = [
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
        createFooterSlot(previewFooterActionsResult),
    ];
    const result = createElement(
        "cdx-dialog",
        {
            class: "vg-stub-creator-preview-dialog",
            "v-if": "previewOpen",
            "v-model:open": "previewOpen",
            "v-bind:title": "getArticlePreviewTitle()",
        },
        sourcePreviewLayoutResult,
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
    const messageJ = {
        click: "closePreviewDialog",
        label: msg("preview.dismiss"),
        weight: "quiet",
    };
    const result = createButtonTemplate(messageJ);
    return result;
}

/**
 * Creates the generated article preview refresh button.
 *
 * @returns Refresh button node.
 */
function createPreviewRefreshButton(): any {
    const messageH = msg("preview.updating");
    const messageI = msg("preview.updatePreview");
    const toVueStringResultA = {
        click: "refreshParsedPreview",
        disabled: "sourceFetchState.loading",
        label: `{{ sourceFetchState.loading ? ${toVueString(
            messageH,
        )} : ${toVueString(messageI)} }}`,
    };
    const result = createRefreshButton(toVueStringResultA);
    return result;
}

/**
 * Creates the generated article preview continue button.
 *
 * @returns Continue button node.
 */
function createPreviewContinueButton(): any {
    const messageG = {
        click: "submitPreviewText",
        disabled: "sourceFetchState.loading || !previewText.trim()",
        label: msg("preview.continue"),
    };
    const result = createPrimaryButton(messageG);
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
    const messageF = msg("preview.editSummary");
    const elementResult = [
        createElement("cdx-text-input", {
            "v-bind:disabled": options.disabled || "false",
            "v-model": options.model,
        }),
    ];
    const result = createFieldTemplate(messageF, elementResult, {
        attributes: {
            class: "vg-stub-creator-preview-summary",
        },
    });
    return result;
}

/**
 * Creates the staged page source editor dialog.
 *
 * @returns Page edit dialog template node.
 */
export function createPageEditDialogTemplate(): any {
    const pageEditFooterActionsResult = createPageEditFooterActions();
    const englishPageFieldResult = [
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
        createFooterSlot(pageEditFooterActionsResult),
    ];
    const result = createElement(
        "cdx-dialog",
        {
            class: "vg-stub-creator-preview-dialog",
            "v-bind:title": "getPageEditDialogTitle()",
            "v-if": "pageEditOpen",
            "v-model:open": "pageEditOpen",
        },
        englishPageFieldResult,
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
    const messageE = {
        click: "closePageEditDialog",
        label: msg("preview.cancel"),
        weight: "quiet",
    };
    const result = createButtonTemplate(messageE);
    return result;
}

/**
 * Creates the staged page edit preview-refresh button.
 *
 * @returns Refresh button node.
 */
function createPageEditRefreshButton(): any {
    const messageC = msg("preview.updating");
    const messageD = msg("preview.updatePreview");
    const toVueStringResult = {
        click: "refreshPageEditPreview",
        disabled: "pageEditState.loading",
        label: `{{ pageEditState.loading ? ${toVueString(
            messageC,
        )} : ${toVueString(messageD)} }}`,
    };
    const result = createRefreshButton(toVueStringResult);
    return result;
}

/**
 * Creates the staged page edit reset button.
 *
 * @returns Reset button node.
 */
function createPageEditResetButton(): any {
    const messageB = {
        action: "destructive",
        click: "resetPageEdit",
        disabled: "pageEditState.loading",
        label: msg("common.reset"),
        show: "pageEditState.pending",
    };
    const result = createButtonTemplate(messageB);
    return result;
}

/**
 * Creates the staged page edit stage button.
 *
 * @returns Stage button node.
 */
function createPageEditStageButton(): any {
    const messageA = {
        click: "stagePageEdit",
        disabled: "pageEditState.loading || !pageEditState.text.trim()",
        label: msg("preview.stage"),
    };
    const result = createPrimaryButton(messageA);
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
    const sourceTextAreaResult = [
        createSourceTextArea(options),
        createElement("div", {
            class: "vg-stub-creator-preview-rendered mw-parser-output",
            "v-html": options.html,
        }),
    ];
    const result = createElement(
        "div",
        {
            class: "vg-stub-creator-preview-layout",
        },
        sourceTextAreaResult,
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
    const actionFooterResult = [createActionFooterTemplate(actions)];
    const result = createElement(
        "template",
        {
            "v-slot:footer": "",
        },
        actionFooterResult,
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
