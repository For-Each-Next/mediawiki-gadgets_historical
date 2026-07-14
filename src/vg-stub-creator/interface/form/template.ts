/**
 * Builds vg-stub-creator dialog templates.
 */

import {
    createPageEditDialogTemplate,
    createPreviewDialogTemplate,
} from "../source-preview.ts";
import { createTabsTemplate } from "../main/index.ts";
import { createPreSaveDialogTemplate } from "../pre-save.ts";
import {
    createActionFooterTemplate,
    createButtonTemplate,
    createElement,
    createFieldTemplate,
    createMessageTemplate,
    createText,
    renderTemplate,
} from "../template.ts";
import { DIALOG_BODY_MASK_CLASS } from "./constants.ts";


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
        label: "Close",
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
            "v-bind:title": [
                "(companyCategoryState.pending ? 'M",
                "odify ' : 'Create ') + '\\'Categor",
                "y:' + companyCategoryState.categor",
                "y + '\\''",
            ].join(""),
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
        "English Wikipedia category",
        [
            createElement("cdx-text-input", {
                placeholder: "e.g. Private Division games",
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
            [createText("Checking Wikidata...")],
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
    return createFieldTemplate("Category page wikitext", [
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
        label: "Close",
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
        label: "Delete",
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
        label: [
            "{{ companyCategoryState.loading ? ",
            "'Saving' : 'Save' }}",
        ].join(""),
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
            "aria-label": "Preparing preview",
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
        label: "Close",
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
        [createText("More")],
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
        label:
            "{{ previewLoading ? 'Preparing preview' : " +
            "sourceFetchState.loading ? 'Loading' : 'Review' }}",
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
            title: "Form history",
        },
        [
            createHistoryProgressBarTemplate(),
            createElement(
                "p",
                {
                    "v-if": "historyEntries.length === 0",
                },
                [createText("No saved form history.")],
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
    return createElement(
        "cdx-dialog",
        {
            "v-model:open": "historyJsonOpen",
            title: "History data",
        },
        [
            createElement("p", {}, [
                createText(
                    [
                        "Copy exported history data, or pas",
                        "te history data to load this form.",
                    ].join(""),
                ),
            ]),
            createHistoryProgressBarTemplate(),
            createElement("cdx-text-area", {
                class: "vg-stub-creator-history-json-text",
                "v-bind:readonly": "!historyJsonEditable",
                "v-model": "historyJsonText",
                rows: "12",
                spellcheck: "false",
            }),
            createMessageTemplate(
                "historyJsonError",
                "{{ historyJsonError }}",
            ),
            createHistoryJsonDialogFooterTemplate(),
        ],
    );
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
        label: "Close",
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
        label: "{{ historyLoading ? 'Loading' : 'Load' }}",
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
        "aria-label": "Loading history entry",
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
        label: "{{ historyLoading ? 'Loading' : 'Load' }}",
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
        label: "Export",
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
        label: "Delete",
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
        label: "Update",
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
        label: "Close",
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
        label: "Clear",
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
        label: "Import",
    });
}


/**
 * Creates the move target dialog.
 *
 * @returns Move dialog template node.
 */
function createMoveDialogTemplate(): any {
    return createElement(
        "cdx-dialog",
        {
            "v-model:open": "moveOpen",
            title: "Move to page name",
        },
        [
            createMessageTemplate(
                "movePreviewConfirmation",
                [
                    "Page name differs from the current",
                    " page. Move to that page name befo",
                    "re previewing?",
                ].join(""),
                {
                    type: "notice",
                },
            ),
            createMessageTemplate(
                "moveTargetState.exists",
                [
                    "Target page exists. Opening it may",
                    " overwrite or conflict with existi",
                    "ng content.",
                ].join(""),
                {
                    type: "warning",
                },
            ),
            createMoveTargetFieldTemplate(),
            createMessageTemplate(
                "sourceFetchState.error",
                "{{ sourceFetchState.error }}",
            ),
            createMoveDialogFooterTemplate(),
        ],
    );
}


/**
 * Creates the move target field.
 *
 * @returns Move target field node.
 */
function createMoveTargetFieldTemplate(): any {
    return createFieldTemplate("Page name", [
        createElement("cdx-text-input", {
            placeholder: "Actual wiki page title",
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
        label: "Close",
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
        label: "Preview without moving",
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
    return createButtonTemplate({
        action: "progressive",
        click: "submitMoveTarget",
        disabled: "sourceFetchState.loading || moveTargetState.loading",
        label:
            [
                "{{ sourceFetchState.loading || mov",
                "eTargetState.loading ",
            ].join("") + "? 'Opening' : 'Open page name' }}",
        weight: "primary",
    });
}
