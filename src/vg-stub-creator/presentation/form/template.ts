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
    return renderTemplate([
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
}

/**
 * Creates the category page viewer dialog.
 *
 * @returns Category viewer dialog template node.
 */
function createCategoryViewDialogTemplate(): any {
    return createElement(
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
}

/**
 * Creates the category-view dialog footer.
 *
 * @returns Dialog footer node.
 */
function createCategoryViewFooterTemplate(): any {
    return createElement(
        "template",
        {
            "v-slot:footer": "",
        },
        [createActionFooterTemplate(createCategoryViewFooterActions())],
    );
}

/**
 * Creates the category-view footer actions.
 *
 * @returns Footer action groups.
 */
function createCategoryViewFooterActions(): any {
    return {
        left: [createCloseCategoryViewButtonTemplate()],
    };
}

/**
 * Creates the category-view close button.
 *
 * @returns Close button node.
 */
function createCloseCategoryViewButtonTemplate(): any {
    return createButtonTemplate({
        click: "closeCategoryView",
        label: msg("common.close"),
        weight: "quiet",
    });
}

/**
 * Creates the category editor dialog.
 *
 * @returns Company category dialog template node.
 */
function createCompanyCategoryDialogTemplate(): any {
    return createElement(
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
}

/**
 * Creates the company-category English Wikipedia field.
 *
 * @returns Company-category field node.
 */
function createCompanyCategoryEnglishFieldTemplate(): any {
    return createFieldTemplate(
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
}

/**
 * Creates the company-category lookup feedback.
 *
 * @returns Lookup feedback nodes.
 */
function createCompanyCategoryLookupTemplate(): Array<any> {
    return [
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
}

/**
 * Creates the company-category wikitext field.
 *
 * @returns Company-category text area node.
 */
function createCompanyCategoryTextTemplate(): any {
    return createFieldTemplate(msg("review.companyCategoryWikitext"), [
        createElement("cdx-text-area", {
            class: "vg-stub-creator-company-category-text",
            rows: "10",
            "v-bind:disabled": "companyCategoryState.loading",
            "v-model": "companyCategoryState.text",
        }),
    ]);
}

/**
 * Creates the company-category dialog footer.
 *
 * @returns Dialog footer node.
 */
function createCompanyCategoryFooterTemplate(): any {
    return createElement(
        "template",
        {
            "v-slot:footer": "",
        },
        [createActionFooterTemplate(createCompanyCategoryFooterActions())],
    );
}

/**
 * Creates the company-category dialog footer actions.
 *
 * @returns Dialog footer action groups.
 */
function createCompanyCategoryFooterActions(): any {
    return {
        left: [createCloseCompanyCategoryButtonTemplate()],
        right: [
            createDeleteCompanyCategoryButtonTemplate(),
            createSaveCompanyCategoryButtonTemplate(),
        ],
    };
}

/**
 * Creates the company-category close button.
 *
 * @returns Close button node.
 */
function createCloseCompanyCategoryButtonTemplate(): any {
    return createButtonTemplate({
        click: "closeCompanyCategory",
        disabled: "companyCategoryState.loading",
        label: msg("common.close"),
        weight: "quiet",
    });
}

/**
 * Creates the company-category delete button.
 *
 * @returns Delete button node.
 */
function createDeleteCompanyCategoryButtonTemplate(): any {
    return createButtonTemplate({
        action: "destructive",
        click: "cancelCompanyCategoryCreation",
        disabled: "companyCategoryState.loading",
        label: msg("common.delete"),
        show: "companyCategoryState.pending",
    });
}

/**
 * Creates the company-category save button.
 *
 * @returns Save button node.
 */
function createSaveCompanyCategoryButtonTemplate(): any {
    return createButtonTemplate({
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
}

/**
 * Creates the root Codex dialog template node.
 *
 * @returns Root dialog template node.
 */
function createDialogTemplateRoot(): any {
    return createElement(
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
}

/**
 * Creates the shared table-action tooltip.
 *
 * @returns Tooltip node.
 */
function createTableActionTooltipTemplate(): any {
    return createElement(
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
}

/**
 * Creates the main dialog loading mask.
 *
 * @returns Dialog loading mask template node.
 */
function createMainDialogMaskTemplate(): any {
    return createElement(
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
}

/**
 * Creates main dialog loading-mask panel content.
 *
 * @returns Loading-mask content nodes.
 */
function createMainDialogMaskPanelContentTemplate(): Array<any> {
    return [
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
}

/**
 * Creates the main dialog footer actions.
 *
 * @returns Dialog footer template node.
 */
function createMainDialogFooterTemplate(): any {
    return createElement(
        "template",
        {
            "v-slot:footer": "",
        },
        [createActionFooterTemplate(createMainDialogFooterActions())],
    );
}

/**
 * Creates main dialog footer actions.
 *
 * @returns Footer action groups.
 */
function createMainDialogFooterActions(): any {
    return {
        left: [createMainCloseButtonTemplate()],
        right: [
            createMainActionMenuTemplate(),
            createMainSubmitButtonTemplate(),
        ],
    };
}

/**
 * Creates the main dialog close button.
 *
 * @returns Close button node.
 */
function createMainCloseButtonTemplate(): any {
    return createButtonTemplate({
        click: "closeDialog",
        label: msg("common.close"),
        weight: "quiet",
    });
}

/**
 * Creates the main dialog action menu.
 *
 * @returns Action menu node.
 */
function createMainActionMenuTemplate(): any {
    return createElement(
        "cdx-menu-button",
        {
            "v-bind:disabled": "sourceFetchState.loading",
            "v-bind:menu-items": "mainActionMenuItems",
            "v-model:selected": "mainActionMenuSelection",
            "v-on:update:selected": "handleMainActionSelect",
        },
        [createText(msg("form.more"))],
    );
}

/**
 * Creates the main dialog submit button.
 *
 * @returns Submit button node.
 */
function createMainSubmitButtonTemplate(): any {
    return createButtonTemplate({
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
}

/**
 * Creates the form history dialog.
 *
 * @returns History dialog template node.
 */
function createHistoryDialogTemplate(): any {
    return createElement(
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

/** Creates the editable history JSON dialog children. */
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

    return [
        createElement("p", {}, [createText(description)]),
        createHistoryProgressBarTemplate(),
        textArea,
        error,
        createHistoryJsonDialogFooterTemplate(),
    ];
}

/**
 * Creates the history JSON dialog footer.
 *
 * @returns Dialog footer node.
 */
function createHistoryJsonDialogFooterTemplate(): any {
    return createElement(
        "template",
        {
            "v-slot:footer": "",
        },
        [createActionFooterTemplate(createHistoryJsonFooterActions())],
    );
}

/**
 * Creates history JSON footer actions.
 *
 * @returns Footer action groups.
 */
function createHistoryJsonFooterActions(): any {
    return {
        left: [createHistoryJsonCloseButtonTemplate()],
        right: [createHistoryJsonLoadButtonTemplate()],
    };
}

/**
 * Creates the history JSON close button.
 *
 * @returns Close button node.
 */
function createHistoryJsonCloseButtonTemplate(): any {
    return createButtonTemplate({
        click: "closeHistoryJsonDialog",
        disabled: "historyLoading",
        label: msg("common.close"),
        weight: "quiet",
    });
}

/**
 * Creates the history JSON load button.
 *
 * @returns Load button node.
 */
function createHistoryJsonLoadButtonTemplate(): any {
    return createButtonTemplate({
        action: "progressive",
        click: "importHistoryJson",
        disabled: "historyLoading",
        label: `{{ historyLoading ? ${toVueString(
            msg("form.loading"),
        )} : ${toVueString(msg("form.load"))} }}`,
        weight: "primary",
    });
}

/**
 * Creates the history loading progress bar.
 *
 * @returns History loading progress bar node.
 */
function createHistoryProgressBarTemplate(): any {
    return createElement("cdx-progress-bar", {
        "aria-label": msg("form.historyLoading"),
        "v-if": "historyLoading",
    });
}

/**
 * Creates the history entry list.
 *
 * @returns History entry list template node.
 */
function createHistoryEntryListTemplate(): any {
    return createElement(
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
}

/**
 * Creates one history entry row.
 *
 * @returns History entry row template node.
 */
function createHistoryEntryTemplate(): any {
    return createElement(
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
}

/**
 * Creates the history entry text block.
 *
 * @returns History entry text block node.
 */
function createHistoryEntryTextTemplate(): any {
    return createElement("div", {}, [
        createElement("div", {}, [
            createText("{{ index + 1 }}. {{ formatHistoryEntryPage(entry) }}"),
        ]),
        createHistoryEntrySavedAtTemplate(),
    ]);
}

/**
 * Creates the history entry saved-at text.
 *
 * @returns Saved-at text node.
 */
function createHistoryEntrySavedAtTemplate(): any {
    return createElement(
        "div",
        {
            style: {
                color: "var(--color-subtle, #54595d)",
                fontSize: "0.75em",
            },
        },
        [createText("{{ entry.metadata.savedAt }}")],
    );
}

/**
 * Creates the history entry load button.
 *
 * @returns Load button node.
 */
function createHistoryEntryLoadButtonTemplate(): any {
    return createButtonTemplate({
        click: "fillHistoryEntry(entry)",
        disabled: "historyLoading",
        label: `{{ historyLoading ? ${toVueString(
            msg("form.loading"),
        )} : ${toVueString(msg("form.load"))} }}`,
    });
}

/**
 * Creates the history entry export button.
 *
 * @returns Export button node.
 */
function createHistoryEntryExportButtonTemplate(): any {
    return createButtonTemplate({
        click: "openHistoryJsonDialog(entry)",
        disabled: "historyLoading",
        label: msg("form.export"),
    });
}

/**
 * Creates the history entry delete button.
 *
 * @returns Delete button node.
 */
function createHistoryEntryDeleteButtonTemplate(): any {
    return createButtonTemplate({
        action: "destructive",
        click: "deleteHistoryEntry(entry.id)",
        disabled: "historyLoading",
        label: msg("common.delete"),
        show: "!entry.metadata.temporary",
    });
}

/**
 * Creates the temporary history update button.
 *
 * @returns Update button node.
 */
function createHistoryEntryUpdateButtonTemplate(): any {
    return createButtonTemplate({
        click: "updateTemporaryHistoryEntry",
        disabled: "historyLoading",
        label: msg("form.update"),
        show: "entry.metadata.temporary",
    });
}

/**
 * Creates the history dialog footer actions.
 *
 * @returns History dialog footer template node.
 */
function createHistoryDialogFooterTemplate(): any {
    return createElement(
        "template",
        {
            "v-slot:footer": "",
        },
        [createActionFooterTemplate(createHistoryFooterActions())],
    );
}

/**
 * Creates history dialog footer actions.
 *
 * @returns Footer action groups.
 */
function createHistoryFooterActions(): any {
    return {
        left: [createHistoryCloseButtonTemplate()],
        right: [
            createHistoryClearButtonTemplate(),
            createHistoryImportButtonTemplate(),
        ],
    };
}

/**
 * Creates the history close button.
 *
 * @returns Close button node.
 */
function createHistoryCloseButtonTemplate(): any {
    return createButtonTemplate({
        click: "closeHistoryDialog",
        disabled: "historyLoading",
        label: msg("common.close"),
        weight: "quiet",
    });
}

/**
 * Creates the history clear button.
 *
 * @returns Clear button node.
 */
function createHistoryClearButtonTemplate(): any {
    return createButtonTemplate({
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
}

/**
 * Creates the history import button.
 *
 * @returns Import button node.
 */
function createHistoryImportButtonTemplate(): any {
    return createButtonTemplate({
        action: "progressive",
        click: "openHistoryImportDialog",
        disabled: "historyLoading",
        label: msg("form.import"),
    });
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

/** Creates the move dialog message and control children. */
function createMoveDialogChildren(): Array<any> {
    const confirmation = msg("form.movePrompt");
    const warning = msg("form.moveConflict");

    return [
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
}

/**
 * Creates the move target field.
 *
 * @returns Move target field node.
 */
function createMoveTargetFieldTemplate(): any {
    return createFieldTemplate(msg("text.pageName"), [
        createElement("cdx-text-input", {
            placeholder: msg("text.pageNamePlaceholder"),
            "v-bind:model-value": "moveTarget",
            "v-on:update:model-value": "updateMoveTarget($event)",
        }),
    ]);
}

/**
 * Creates the move dialog footer actions.
 *
 * @returns Move dialog footer template node.
 */
function createMoveDialogFooterTemplate(): any {
    return createElement(
        "template",
        {
            "v-slot:footer": "",
        },
        [createActionFooterTemplate(createMoveFooterActions())],
    );
}

/**
 * Creates move dialog footer actions.
 *
 * @returns Footer action groups.
 */
function createMoveFooterActions(): any {
    return {
        left: [createMoveCloseButtonTemplate()],
        right: [
            createMovePreviewWithoutMovingButtonTemplate(),
            createMoveSubmitButtonTemplate(),
        ],
    };
}

/**
 * Creates the move close button.
 *
 * @returns Close button node.
 */
function createMoveCloseButtonTemplate(): any {
    return createButtonTemplate({
        click: "closeMoveDialog",
        label: msg("common.close"),
        weight: "quiet",
    });
}

/**
 * Creates the preview-without-moving button.
 *
 * @returns Preview-without-moving button node.
 */
function createMovePreviewWithoutMovingButtonTemplate(): any {
    return createButtonTemplate({
        click: "previewWithoutMoving",
        disabled: "sourceFetchState.loading || moveTargetState.loading",
        label: msg("text.previewWithoutMoving"),
        show: "movePreviewConfirmation",
        weight: "quiet",
    });
}

/**
 * Creates the move submit button.
 *
 * @returns Submit button node.
 */
function createMoveSubmitButtonTemplate(): any {
    const loading = "sourceFetchState.loading || moveTargetState.loading";

    return createButtonTemplate({
        action: "progressive",
        click: "submitMoveTarget",
        disabled: "sourceFetchState.loading || moveTargetState.loading",
        label: `{{ ${loading} ? ${toVueString(
            msg("text.opening"),
        )} : ${toVueString(msg("text.openPageName"))} }}`,
        weight: "primary",
    });
}
