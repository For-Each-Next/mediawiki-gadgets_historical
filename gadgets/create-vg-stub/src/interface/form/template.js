/* eslint-disable */

/**
 * Builds create-vg-stub dialog templates.
 */

import {
    createPageEditDialogTemplate,
    createPreviewDialogTemplate,
} from "../source-preview.js";
import { createTabsTemplate } from "../main/index.js";
import { createPreSaveDialogTemplate } from "../pre-save.js";
import {
    createActionFooterTemplate,
    createButtonTemplate,
    createElement,
    createFieldTemplate,
    createMessageTemplate,
    createText,
    renderTemplate,
} from "../template.js";
import { DIALOG_BODY_MASK_CLASS } from "./constants.js";

/**
 * Creates the Vue dialog template as a serialized markup tree.
 *
 * @returns {string} Dialog template markup.
 */
export function createDialogTemplate() {
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
 * @returns {object} Category viewer dialog template node.
 */
function createCategoryViewDialogTemplate() {
    return createElement(
        "cdx-dialog",
        {
            class: "create-vg-stub-category-view-dialog",
            "v-bind:title": "categoryViewState.title",
            "v-model:open": "categoryViewOpen",
        },
        [
            createElement("iframe", {
                class: "create-vg-stub-category-view",
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
 * @returns {object} Dialog footer node.
 */
function createCategoryViewFooterTemplate() {
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
 * @returns {object} Footer action groups.
 */
function createCategoryViewFooterActions() {
    return {
        left: [createCloseCategoryViewButtonTemplate()],
    };
}

/**
 * Creates the category-view close button.
 *
 * @returns {object} Close button node.
 */
function createCloseCategoryViewButtonTemplate() {
    return createButtonTemplate({
        click: "closeCategoryView",
        label: "Close",
        weight: "quiet",
    });
}

/**
 * Creates the category editor dialog.
 *
 * @returns {object} Company category dialog template node.
 */
function createCompanyCategoryDialogTemplate() {
    return createElement(
        "cdx-dialog",
        {
            "v-bind:title":
                "(companyCategoryState.pending ? 'Modify ' : 'Create ') + '\\'Category:' + companyCategoryState.category + '\\''",
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
 * @returns {object} Company-category field node.
 */
function createCompanyCategoryEnglishFieldTemplate() {
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
 * @returns {Array<object>} Lookup feedback nodes.
 */
function createCompanyCategoryLookupTemplate() {
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
 * @returns {object} Company-category text area node.
 */
function createCompanyCategoryTextTemplate() {
    return createFieldTemplate("Category page wikitext", [
        createElement("cdx-text-area", {
            class: "create-vg-stub-company-category-text",
            rows: "10",
            "v-bind:disabled": "companyCategoryState.loading",
            "v-model": "companyCategoryState.text",
        }),
    ]);
}

/**
 * Creates the company-category dialog footer.
 *
 * @returns {object} Dialog footer node.
 */
function createCompanyCategoryFooterTemplate() {
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
 * @returns {object} Dialog footer action groups.
 */
function createCompanyCategoryFooterActions() {
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
 * @returns {object} Close button node.
 */
function createCloseCompanyCategoryButtonTemplate() {
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
 * @returns {object} Delete button node.
 */
function createDeleteCompanyCategoryButtonTemplate() {
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
 * @returns {object} Save button node.
 */
function createSaveCompanyCategoryButtonTemplate() {
    return createButtonTemplate({
        action: "progressive",
        click: "saveCompanyCategory",
        disabled:
            "companyCategoryState.loading || !companyCategoryState.text.trim()",
        label: "{{ companyCategoryState.loading ? 'Saving' : 'Save' }}",
        weight: "primary",
    });
}

/**
 * Creates the root Codex dialog template node.
 *
 * @returns {object} Root dialog template node.
 */
function createDialogTemplateRoot() {
    return createElement(
        "cdx-dialog",
        {
            class: "create-vg-stub-dialog",
            "v-model:open": "open",
            "v-bind:title": "getDialogTitle()",
        },
        [
            createElement(
                "div",
                {
                    class: "create-vg-stub-dialog-body",
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
 * @returns {object} Tooltip node.
 */
function createTableActionTooltipTemplate() {
    return createElement(
        "span",
        {
            class: "create-vg-stub-icon-tooltip",
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
 * @returns {object} Dialog loading mask template node.
 */
function createMainDialogMaskTemplate() {
    return createElement(
        "div",
        {
            class: "create-vg-stub-dialog-mask",
            "v-if": "previewLoading",
        },
        [
            createElement(
                "div",
                {
                    class: "create-vg-stub-dialog-mask-panel",
                },
                createMainDialogMaskPanelContentTemplate(),
            ),
        ],
    );
}

/**
 * Creates main dialog loading-mask panel content.
 *
 * @returns {Array<object>} Loading-mask content nodes.
 */
function createMainDialogMaskPanelContentTemplate() {
    return [
        createElement("cdx-progress-bar", {
            "aria-label": "Preparing preview",
        }),
        createElement(
            "p",
            {
                class: "create-vg-stub-dialog-mask-text",
            },
            [createText("{{ previewLoadingMessage }}")],
        ),
    ];
}

/**
 * Creates the main dialog footer actions.
 *
 * @returns {object} Dialog footer template node.
 */
function createMainDialogFooterTemplate() {
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
 * @returns {object} Footer action groups.
 */
function createMainDialogFooterActions() {
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
 * @returns {object} Close button node.
 */
function createMainCloseButtonTemplate() {
    return createButtonTemplate({
        click: "closeDialog",
        label: "Close",
        weight: "quiet",
    });
}

/**
 * Creates the main dialog action menu.
 *
 * @returns {object} Action menu node.
 */
function createMainActionMenuTemplate() {
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
 * @returns {object} Submit button node.
 */
function createMainSubmitButtonTemplate() {
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
 * @returns {object} History dialog template node.
 */
function createHistoryDialogTemplate() {
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
 * @returns {object} History JSON dialog template node.
 */
function createHistoryJsonDialogTemplate() {
    return createElement(
        "cdx-dialog",
        {
            "v-model:open": "historyJsonOpen",
            title: "History data",
        },
        [
            createElement("p", {}, [
                createText(
                    "Copy exported history data, or paste history data to load this form.",
                ),
            ]),
            createHistoryProgressBarTemplate(),
            createElement("cdx-text-area", {
                class: "create-vg-stub-history-json-text",
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
 * @returns {object} Dialog footer node.
 */
function createHistoryJsonDialogFooterTemplate() {
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
 * @returns {object} Footer action groups.
 */
function createHistoryJsonFooterActions() {
    return {
        left: [createHistoryJsonCloseButtonTemplate()],
        right: [createHistoryJsonLoadButtonTemplate()],
    };
}

/**
 * Creates the history JSON close button.
 *
 * @returns {object} Close button node.
 */
function createHistoryJsonCloseButtonTemplate() {
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
 * @returns {object} Load button node.
 */
function createHistoryJsonLoadButtonTemplate() {
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
 * @returns {object} History loading progress bar node.
 */
function createHistoryProgressBarTemplate() {
    return createElement("cdx-progress-bar", {
        "aria-label": "Loading history entry",
        "v-if": "historyLoading",
    });
}

/**
 * Creates the history entry list.
 *
 * @returns {object} History entry list template node.
 */
function createHistoryEntryListTemplate() {
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
 * @returns {object} History entry row template node.
 */
function createHistoryEntryTemplate() {
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
 * @returns {object} History entry text block node.
 */
function createHistoryEntryTextTemplate() {
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
 * @returns {object} Saved-at text node.
 */
function createHistoryEntrySavedAtTemplate() {
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
 * @returns {object} Load button node.
 */
function createHistoryEntryLoadButtonTemplate() {
    return createButtonTemplate({
        click: "fillHistoryEntry(entry)",
        disabled: "historyLoading",
        label: "{{ historyLoading ? 'Loading' : 'Load' }}",
    });
}

/**
 * Creates the history entry export button.
 *
 * @returns {object} Export button node.
 */
function createHistoryEntryExportButtonTemplate() {
    return createButtonTemplate({
        click: "openHistoryJsonDialog(entry)",
        disabled: "historyLoading",
        label: "Export",
    });
}

/**
 * Creates the history entry delete button.
 *
 * @returns {object} Delete button node.
 */
function createHistoryEntryDeleteButtonTemplate() {
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
 * @returns {object} Update button node.
 */
function createHistoryEntryUpdateButtonTemplate() {
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
 * @returns {object} History dialog footer template node.
 */
function createHistoryDialogFooterTemplate() {
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
 * @returns {object} Footer action groups.
 */
function createHistoryFooterActions() {
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
 * @returns {object} Close button node.
 */
function createHistoryCloseButtonTemplate() {
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
 * @returns {object} Clear button node.
 */
function createHistoryClearButtonTemplate() {
    return createButtonTemplate({
        action: "destructive",
        click: "clearHistory",
        disabled:
            "historyLoading || " +
            "!historyEntries.some((entry) => !entry.metadata.temporary)",
        label: "Clear",
    });
}

/**
 * Creates the history import button.
 *
 * @returns {object} Import button node.
 */
function createHistoryImportButtonTemplate() {
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
 * @returns {object} Move dialog template node.
 */
function createMoveDialogTemplate() {
    return createElement(
        "cdx-dialog",
        {
            "v-model:open": "moveOpen",
            title: "Move to page name",
        },
        [
            createMessageTemplate(
                "movePreviewConfirmation",
                "Page name differs from the current page. Move to that page name before previewing?",
                {
                    type: "notice",
                },
            ),
            createMessageTemplate(
                "moveTargetState.exists",
                "Target page exists. Opening it may overwrite or conflict with existing content.",
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
 * @returns {object} Move target field node.
 */
function createMoveTargetFieldTemplate() {
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
 * @returns {object} Move dialog footer template node.
 */
function createMoveDialogFooterTemplate() {
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
 * @returns {object} Footer action groups.
 */
function createMoveFooterActions() {
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
 * @returns {object} Close button node.
 */
function createMoveCloseButtonTemplate() {
    return createButtonTemplate({
        click: "closeMoveDialog",
        label: "Close",
        weight: "quiet",
    });
}

/**
 * Creates the preview-without-moving button.
 *
 * @returns {object} Preview-without-moving button node.
 */
function createMovePreviewWithoutMovingButtonTemplate() {
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
 * @returns {object} Submit button node.
 */
function createMoveSubmitButtonTemplate() {
    return createButtonTemplate({
        action: "progressive",
        click: "submitMoveTarget",
        disabled: "sourceFetchState.loading || moveTargetState.loading",
        label:
            "{{ sourceFetchState.loading || moveTargetState.loading " +
            "? 'Opening' : 'Open page name' }}",
        weight: "primary",
    });
}
