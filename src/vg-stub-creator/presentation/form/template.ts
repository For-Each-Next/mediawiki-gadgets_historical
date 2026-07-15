/**
 * Builds vg-stub-creator dialog templates.
 */

import {
    createPageEditDialogTemplate,
    createPreviewDialogTemplate,
} from "#stub/ui/source-preview.ts";
import { createTabsTemplate } from "#stub/main";
import { createPreSaveDialogTemplate } from "#stub/ui/pre-save.ts";
import {
    createActionFooterTemplate,
    createButtonTemplate,
    createElement,
    createFieldTemplate,
    createMessageTemplate,
    createText,
    renderTemplate,
    toVueString,
} from "#stub/ui/template.ts";
import { DIALOG_BODY_MASK_CLASS } from "#stub/form/constants.ts";
import { msg } from "#stub/i18n";

/**
 * Creates the Vue dialog template as a serialized markup tree.
 *
 * @returns Dialog template markup.
 */
export function createDialogTemplate(): string {
    const result = renderTemplate([
        createDialogTemplateRoot(),
        createPreSaveDialogTemplate(),
        createCompanyCategoryDialogTemplate(),
        createCategoryViewDialogTemplate(),
        createPageEditDialogTemplate(),
        createMoveDialogTemplate(),
        createPreviewDialogTemplate(),
        createHistoryDialogTemplate(),
        createHistoryJsonDialogTemplate(),
    ]);
    return result;
}

/**
 * Creates the category page viewer dialog.
 *
 * @returns Category viewer dialog template node.
 */
function createCategoryViewDialogTemplate(): any {
    const result = createElement(
        "cdx-dialog",
        {
            class: "vg-stub-creator-category-view-dialog",
            "v-bind:title": "categoryViewState.title",
            "v-model:open": "categoryViewOpen",
        },
        [
            createElement("iframe", {
                class: "vg-stub-creator-category-view",
                "v-bind:src": "categoryViewState.url",
                "v-bind:title": "categoryViewState.title",
            }),
            createCategoryViewFooterTemplate(),
        ],
    );
    return result;
}

/**
 * Creates the category-view dialog footer.
 *
 * @returns Dialog footer node.
 */
function createCategoryViewFooterTemplate(): any {
    const result = createElement(
        "template",
        {
            "v-slot:footer": "",
        },
        [createActionFooterTemplate(createCategoryViewFooterActions())],
    );
    return result;
}

/**
 * Creates the category-view footer actions.
 *
 * @returns Footer action groups.
 */
function createCategoryViewFooterActions(): any {
    const result = {
        left: [createCloseCategoryViewButtonTemplate()],
    };
    return result;
}

/**
 * Creates the category-view close button.
 *
 * @returns Close button node.
 */
function createCloseCategoryViewButtonTemplate(): any {
    const result = createButtonTemplate({
        click: "closeCategoryView",
        label: msg("common.close"),
        weight: "quiet",
    });
    return result;
}

/**
 * Creates the category editor dialog.
 *
 * @returns Company category dialog template node.
 */
function createCompanyCategoryDialogTemplate(): any {
    const result = createElement(
        "cdx-dialog",
        {
            "v-bind:title": "getCompanyCategoryDialogTitle()",
            "v-model:open": "companyCategoryOpen",
        },
        [
            createCompanyCategoryEnglishFieldTemplate(),
            createCompanyCategoryTextTemplate(),
            createMessageTemplate(
                "companyCategoryState.error",
                "{{ companyCategoryState.error }}",
            ),
            createCompanyCategoryFooterTemplate(),
        ],
    );
    return result;
}

/**
 * Creates the company-category English Wikipedia field.
 *
 * @returns Company-category field node.
 */
function createCompanyCategoryEnglishFieldTemplate(): any {
    const result = createFieldTemplate(
        msg("review.companyCategoryEnglishName"),
        [
            createElement("cdx-text-input", {
                placeholder: msg("review.companyCategoryEnglishPlaceholder"),
                "v-bind:disabled": "companyCategoryState.loading",
                "v-model": "companyCategoryState.englishName",
                "v-on:blur": "refreshCompanyCategoryMetadata",
            }),
        ],
        {
            helpText: createCompanyCategoryLookupTemplate(),
        },
    );
    return result;
}

/**
 * Creates the company-category lookup feedback.
 *
 * @returns Lookup feedback nodes.
 */
function createCompanyCategoryLookupTemplate(): Array<any> {
    const result = [
        createElement(
            "span",
            {
                "v-if": "companyCategoryLookupLoading",
            },
            [createText(msg("review.companyCategoryCheckingWikidata"))],
        ),
        createElement(
            "a",
            {
                "v-bind:href": "getCompanyCategoryWikidataUrl()",
                "v-else-if": "companyCategoryState.wikidataId",
                rel: "noopener noreferrer",
                target: "_blank",
            },
            [createText("{{ companyCategoryState.wikidataId }}")],
        ),
    ];
    return result;
}

/**
 * Creates the company-category wikitext field.
 *
 * @returns Company-category text area node.
 */
function createCompanyCategoryTextTemplate(): any {
    const result = createFieldTemplate(msg("review.companyCategoryWikitext"), [
        createElement("cdx-text-area", {
            class: "vg-stub-creator-company-category-text",
            rows: "10",
            "v-bind:disabled": "companyCategoryState.loading",
            "v-model": "companyCategoryState.text",
        }),
    ]);
    return result;
}

/**
 * Creates the company-category dialog footer.
 *
 * @returns Dialog footer node.
 */
function createCompanyCategoryFooterTemplate(): any {
    const result = createElement(
        "template",
        {
            "v-slot:footer": "",
        },
        [createActionFooterTemplate(createCompanyCategoryFooterActions())],
    );
    return result;
}

/**
 * Creates the company-category dialog footer actions.
 *
 * @returns Dialog footer action groups.
 */
function createCompanyCategoryFooterActions(): any {
    const result = {
        left: [createCloseCompanyCategoryButtonTemplate()],
        right: [
            createDeleteCompanyCategoryButtonTemplate(),
            createSaveCompanyCategoryButtonTemplate(),
        ],
    };
    return result;
}

/**
 * Creates the company-category close button.
 *
 * @returns Close button node.
 */
function createCloseCompanyCategoryButtonTemplate(): any {
    const result = createButtonTemplate({
        click: "closeCompanyCategory",
        disabled: "companyCategoryState.loading",
        label: msg("common.close"),
        weight: "quiet",
    });
    return result;
}

/**
 * Creates the company-category delete button.
 *
 * @returns Delete button node.
 */
function createDeleteCompanyCategoryButtonTemplate(): any {
    const result = createButtonTemplate({
        action: "destructive",
        click: "cancelCompanyCategoryCreation",
        disabled: "companyCategoryState.loading",
        label: msg("common.delete"),
        show: "companyCategoryState.pending",
    });
    return result;
}

/**
 * Creates the company-category save button.
 *
 * @returns Save button node.
 */
function createSaveCompanyCategoryButtonTemplate(): any {
    const result = createButtonTemplate({
        action: "progressive",
        click: "saveCompanyCategory",
        disabled: [
            "companyCategoryState.loading || !c",
            "ompanyCategoryState.text.trim()",
        ].join(""),
        label: `{{ companyCategoryState.loading ? ${toVueString(
            msg("review.saving"),
        )} : ${toVueString(msg("common.save"))} }}`,
        weight: "primary",
    });
    return result;
}

/**
 * Creates the root Codex dialog template node.
 *
 * @returns Root dialog template node.
 */
function createDialogTemplateRoot(): any {
    const result = createElement(
        "cdx-dialog",
        {
            class: "vg-stub-creator-dialog",
            "v-model:open": "open",
            "v-bind:title": "getDialogTitle()",
        },
        [
            createElement(
                "div",
                {
                    class: "vg-stub-creator-dialog-body",
                    "v-bind:class": DIALOG_BODY_MASK_CLASS,
                },
                [createTabsTemplate(), createMainDialogMaskTemplate()],
            ),
            createMessageTemplate(
                "sourceFetchState.error",
                "{{ sourceFetchState.error }}",
            ),
            createTableActionTooltipTemplate(),
            createMainDialogFooterTemplate(),
        ],
    );
    return result;
}

/**
 * Creates the shared table-action tooltip.
 *
 * @returns Tooltip node.
 */
function createTableActionTooltipTemplate(): any {
    const result = createElement(
        "span",
        {
            class: "vg-stub-creator-icon-tooltip",
            ref: "tableActionTooltipRef",
            role: "tooltip",
            "v-bind:style": "tableActionTooltip.style",
            "v-if": "tableActionTooltip.visible",
        },
        [createText("{{ tableActionTooltip.label }}")],
    );
    return result;
}

/**
 * Creates the main dialog loading mask.
 *
 * @returns Dialog loading mask template node.
 */
function createMainDialogMaskTemplate(): any {
    const result = createElement(
        "div",
        {
            class: "vg-stub-creator-dialog-mask",
            "v-if": "previewLoading",
        },
        [
            createElement(
                "div",
                {
                    class: "vg-stub-creator-dialog-mask-panel",
                },
                createMainDialogMaskPanelContentTemplate(),
            ),
        ],
    );
    return result;
}

/**
 * Creates main dialog loading-mask panel content.
 *
 * @returns Loading-mask content nodes.
 */
function createMainDialogMaskPanelContentTemplate(): Array<any> {
    const result = [
        createElement("cdx-progress-bar", {
            "aria-label": msg("preview.preparing"),
        }),
        createElement(
            "p",
            {
                class: "vg-stub-creator-dialog-mask-text",
            },
            [createText("{{ previewLoadingMessage }}")],
        ),
    ];
    return result;
}

/**
 * Creates the main dialog footer actions.
 *
 * @returns Dialog footer template node.
 */
function createMainDialogFooterTemplate(): any {
    const result = createElement(
        "template",
        {
            "v-slot:footer": "",
        },
        [createActionFooterTemplate(createMainDialogFooterActions())],
    );
    return result;
}

/**
 * Creates main dialog footer actions.
 *
 * @returns Footer action groups.
 */
function createMainDialogFooterActions(): any {
    const result = {
        left: [createMainCloseButtonTemplate()],
        right: [
            createMainActionMenuTemplate(),
            createMainSubmitButtonTemplate(),
        ],
    };
    return result;
}

/**
 * Creates the main dialog close button.
 *
 * @returns Close button node.
 */
function createMainCloseButtonTemplate(): any {
    const result = createButtonTemplate({
        click: "closeDialog",
        label: msg("common.close"),
        weight: "quiet",
    });
    return result;
}

/**
 * Creates the main dialog action menu.
 *
 * @returns Action menu node.
 */
function createMainActionMenuTemplate(): any {
    const result = createElement(
        "cdx-menu-button",
        {
            "v-bind:disabled": "sourceFetchState.loading",
            "v-bind:menu-items": "mainActionMenuItems",
            "v-model:selected": "mainActionMenuSelection",
            "v-on:update:selected": "handleMainActionSelect",
        },
        [createText(msg("form.more"))],
    );
    return result;
}

/**
 * Creates the main dialog submit button.
 *
 * @returns Submit button node.
 */
function createMainSubmitButtonTemplate(): any {
    const result = createButtonTemplate({
        action: "progressive",
        click: "submitForm",
        disabled: "sourceFetchState.loading || previewLoading",
        label: `{{ previewLoading ? ${toVueString(
            msg("preview.preparing"),
        )} : sourceFetchState.loading ? ${toVueString(
            msg("form.loading"),
        )} : ${toVueString(msg("form.review"))} }}`,
        weight: "primary",
    });
    return result;
}

/**
 * Creates the form history dialog.
 *
 * @returns History dialog template node.
 */
function createHistoryDialogTemplate(): any {
    const result = createElement(
        "cdx-dialog",
        {
            "v-model:open": "historyOpen",
            title: msg("form.historyTitle"),
        },
        [
            createHistoryProgressBarTemplate(),
            createElement(
                "p",
                {
                    "v-if": "historyEntries.length === 0",
                },
                [createText(msg("form.historyEmpty"))],
            ),
            createHistoryEntryListTemplate(),
            createHistoryDialogFooterTemplate(),
        ],
    );
    return result;
}

/**
 * Creates the editable history JSON dialog.
 *
 * @returns History JSON dialog template node.
 */
function createHistoryJsonDialogTemplate(): any {
    const attributes = {
        "v-model:open": "historyJsonOpen",
        title: msg("form.historyData"),
    };
    const dialog = createElement(
        "cdx-dialog",
        attributes,
        createHistoryJsonDialogChildren(),
    );

    return dialog;
}

/**
 * Creates the editable history JSON dialog children.
 *
 * @returns The editable history JSON dialog children.
 */
function createHistoryJsonDialogChildren(): Array<any> {
    const description = msg("form.historyHelp");
    const textArea = createElement("cdx-text-area", {
        class: "vg-stub-creator-history-json-text",
        "v-bind:readonly": "!historyJsonEditable",
        "v-model": "historyJsonText",
        rows: "12",
        spellcheck: "false",
    });
    const error = createMessageTemplate(
        "historyJsonError",
        "{{ historyJsonError }}",
    );

    const result = [
        createElement("p", {}, [createText(description)]),
        createHistoryProgressBarTemplate(),
        textArea,
        error,
        createHistoryJsonDialogFooterTemplate(),
    ];
    return result;
}

/**
 * Creates the history JSON dialog footer.
 *
 * @returns Dialog footer node.
 */
function createHistoryJsonDialogFooterTemplate(): any {
    const result = createElement(
        "template",
        {
            "v-slot:footer": "",
        },
        [createActionFooterTemplate(createHistoryJsonFooterActions())],
    );
    return result;
}

/**
 * Creates history JSON footer actions.
 *
 * @returns Footer action groups.
 */
function createHistoryJsonFooterActions(): any {
    const result = {
        left: [createHistoryJsonCloseButtonTemplate()],
        right: [createHistoryJsonLoadButtonTemplate()],
    };
    return result;
}

/**
 * Creates the history JSON close button.
 *
 * @returns Close button node.
 */
function createHistoryJsonCloseButtonTemplate(): any {
    const result = createButtonTemplate({
        click: "closeHistoryJsonDialog",
        disabled: "historyLoading",
        label: msg("common.close"),
        weight: "quiet",
    });
    return result;
}

/**
 * Creates the history JSON load button.
 *
 * @returns Load button node.
 */
function createHistoryJsonLoadButtonTemplate(): any {
    const result = createButtonTemplate({
        action: "progressive",
        click: "importHistoryJson",
        disabled: "historyLoading",
        label: `{{ historyLoading ? ${toVueString(
            msg("form.loading"),
        )} : ${toVueString(msg("form.load"))} }}`,
        weight: "primary",
    });
    return result;
}

/**
 * Creates the history loading progress bar.
 *
 * @returns History loading progress bar node.
 */
function createHistoryProgressBarTemplate(): any {
    const result = createElement("cdx-progress-bar", {
        "aria-label": msg("form.historyLoading"),
        "v-if": "historyLoading",
    });
    return result;
}

/**
 * Creates the history entry list.
 *
 * @returns History entry list template node.
 */
function createHistoryEntryListTemplate(): any {
    const result = createElement(
        "div",
        {
            "v-if": "historyEntries.length > 0",
            style: {
                display: "grid",
                gap: "0.5em",
            },
        },
        [createHistoryEntryTemplate()],
    );
    return result;
}

/**
 * Creates one history entry row.
 *
 * @returns History entry row template node.
 */
function createHistoryEntryTemplate(): any {
    const result = createElement(
        "div",
        {
            "v-bind:key": "entry.id",
            "v-for": "(entry, index) in historyEntries",
            style: {
                alignItems: "center",
                borderBottom: "1px solid var(--border-color-subtle, #eaecf0)",
                display: "grid",
                gap: "0.5em",
                gridTemplateColumns: "1fr auto auto auto",
                padding: "0.5em 0",
            },
        },
        [
            createHistoryEntryTextTemplate(),
            createHistoryEntryLoadButtonTemplate(),
            createHistoryEntryExportButtonTemplate(),
            createHistoryEntryDeleteButtonTemplate(),
            createHistoryEntryUpdateButtonTemplate(),
        ],
    );
    return result;
}

/**
 * Creates the history entry text block.
 *
 * @returns History entry text block node.
 */
function createHistoryEntryTextTemplate(): any {
    const result = createElement("div", {}, [
        createElement("div", {}, [
            createText("{{ index + 1 }}. {{ formatHistoryEntryPage(entry) }}"),
        ]),
        createHistoryEntrySavedAtTemplate(),
    ]);
    return result;
}

/**
 * Creates the history entry saved-at text.
 *
 * @returns Saved-at text node.
 */
function createHistoryEntrySavedAtTemplate(): any {
    const result = createElement(
        "div",
        {
            style: {
                color: "var(--color-subtle, #54595d)",
                fontSize: "0.75em",
            },
        },
        [createText("{{ entry.metadata.savedAt }}")],
    );
    return result;
}

/**
 * Creates the history entry load button.
 *
 * @returns Load button node.
 */
function createHistoryEntryLoadButtonTemplate(): any {
    const result = createButtonTemplate({
        click: "fillHistoryEntry(entry)",
        disabled: "historyLoading",
        label: `{{ historyLoading ? ${toVueString(
            msg("form.loading"),
        )} : ${toVueString(msg("form.load"))} }}`,
    });
    return result;
}

/**
 * Creates the history entry export button.
 *
 * @returns Export button node.
 */
function createHistoryEntryExportButtonTemplate(): any {
    const result = createButtonTemplate({
        click: "openHistoryJsonDialog(entry)",
        disabled: "historyLoading",
        label: msg("form.export"),
    });
    return result;
}

/**
 * Creates the history entry delete button.
 *
 * @returns Delete button node.
 */
function createHistoryEntryDeleteButtonTemplate(): any {
    const result = createButtonTemplate({
        action: "destructive",
        click: "deleteHistoryEntry(entry.id)",
        disabled: "historyLoading",
        label: msg("common.delete"),
        show: "!entry.metadata.temporary",
    });
    return result;
}

/**
 * Creates the temporary history update button.
 *
 * @returns Update button node.
 */
function createHistoryEntryUpdateButtonTemplate(): any {
    const result = createButtonTemplate({
        click: "updateTemporaryHistoryEntry",
        disabled: "historyLoading",
        label: msg("form.update"),
        show: "entry.metadata.temporary",
    });
    return result;
}

/**
 * Creates the history dialog footer actions.
 *
 * @returns History dialog footer template node.
 */
function createHistoryDialogFooterTemplate(): any {
    const result = createElement(
        "template",
        {
            "v-slot:footer": "",
        },
        [createActionFooterTemplate(createHistoryFooterActions())],
    );
    return result;
}

/**
 * Creates history dialog footer actions.
 *
 * @returns Footer action groups.
 */
function createHistoryFooterActions(): any {
    const result = {
        left: [createHistoryCloseButtonTemplate()],
        right: [
            createHistoryClearButtonTemplate(),
            createHistoryImportButtonTemplate(),
        ],
    };
    return result;
}

/**
 * Creates the history close button.
 *
 * @returns Close button node.
 */
function createHistoryCloseButtonTemplate(): any {
    const result = createButtonTemplate({
        click: "closeHistoryDialog",
        disabled: "historyLoading",
        label: msg("common.close"),
        weight: "quiet",
    });
    return result;
}

/**
 * Creates the history clear button.
 *
 * @returns Clear button node.
 */
function createHistoryClearButtonTemplate(): any {
    const result = createButtonTemplate({
        action: "destructive",
        click: "clearHistory",
        disabled:
            "historyLoading || " +
            [
                "!historyEntries.some((entry) => !e",
                "ntry.metadata.temporary)",
            ].join(""),
        label: msg("form.clear"),
    });
    return result;
}

/**
 * Creates the history import button.
 *
 * @returns Import button node.
 */
function createHistoryImportButtonTemplate(): any {
    const result = createButtonTemplate({
        action: "progressive",
        click: "openHistoryImportDialog",
        disabled: "historyLoading",
        label: msg("form.import"),
    });
    return result;
}

/**
 * Creates the move target dialog.
 *
 * @returns Move dialog template node.
 */
function createMoveDialogTemplate(): any {
    const attributes = {
        "v-model:open": "moveOpen",
        title: msg("form.moveTitle"),
    };
    const dialog = createElement(
        "cdx-dialog",
        attributes,
        createMoveDialogChildren(),
    );

    return dialog;
}

/**
 * Creates the move dialog message and control children.
 *
 * @returns The move dialog message and control children.
 */
function createMoveDialogChildren(): Array<any> {
    const confirmation = msg("form.movePrompt");
    const warning = msg("form.moveConflict");

    const result = [
        createMessageTemplate("movePreviewConfirmation", confirmation, {
            type: "notice",
        }),
        createMessageTemplate("moveTargetState.exists", warning, {
            type: "warning",
        }),
        createMoveTargetFieldTemplate(),
        createMessageTemplate(
            "sourceFetchState.error",
            "{{ sourceFetchState.error }}",
        ),
        createMoveDialogFooterTemplate(),
    ];
    return result;
}

/**
 * Creates the move target field.
 *
 * @returns Move target field node.
 */
function createMoveTargetFieldTemplate(): any {
    const result = createFieldTemplate(msg("text.pageName"), [
        createElement("cdx-text-input", {
            placeholder: msg("text.pageNamePlaceholder"),
            "v-bind:model-value": "moveTarget",
            "v-on:update:model-value": "updateMoveTarget($event)",
        }),
    ]);
    return result;
}

/**
 * Creates the move dialog footer actions.
 *
 * @returns Move dialog footer template node.
 */
function createMoveDialogFooterTemplate(): any {
    const result = createElement(
        "template",
        {
            "v-slot:footer": "",
        },
        [createActionFooterTemplate(createMoveFooterActions())],
    );
    return result;
}

/**
 * Creates move dialog footer actions.
 *
 * @returns Footer action groups.
 */
function createMoveFooterActions(): any {
    const result = {
        left: [createMoveCloseButtonTemplate()],
        right: [
            createMovePreviewWithoutMovingButtonTemplate(),
            createMoveSubmitButtonTemplate(),
        ],
    };
    return result;
}

/**
 * Creates the move close button.
 *
 * @returns Close button node.
 */
function createMoveCloseButtonTemplate(): any {
    const result = createButtonTemplate({
        click: "closeMoveDialog",
        label: msg("common.close"),
        weight: "quiet",
    });
    return result;
}

/**
 * Creates the preview-without-moving button.
 *
 * @returns Preview-without-moving button node.
 */
function createMovePreviewWithoutMovingButtonTemplate(): any {
    const result = createButtonTemplate({
        click: "previewWithoutMoving",
        disabled: "sourceFetchState.loading || moveTargetState.loading",
        label: msg("text.previewWithoutMoving"),
        show: "movePreviewConfirmation",
        weight: "quiet",
    });
    return result;
}

/**
 * Creates the move submit button.
 *
 * @returns Submit button node.
 */
function createMoveSubmitButtonTemplate(): any {
    const loading = "sourceFetchState.loading || moveTargetState.loading";

    const result = createButtonTemplate({
        action: "progressive",
        click: "submitMoveTarget",
        disabled: "sourceFetchState.loading || moveTargetState.loading",
        label: `{{ ${loading} ? ${toVueString(
            msg("text.opening"),
        )} : ${toVueString(msg("text.openPageName"))} }}`,
        weight: "primary",
    });
    return result;
}
