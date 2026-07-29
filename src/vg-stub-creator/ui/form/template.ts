/**
 * Builds vg-stub-creator dialog templates.
 */

import {
    createPageEditDialogTemplate,
    createPreviewDialogTemplate,
} from "#gadget/ui/source-preview.ts";
import { createTabsTemplate } from "#gadget/ui/main/index.ts";
import { createPreSaveDialogTemplate } from "#gadget/ui/pre-save.ts";
import {
    createActionFooterTemplate,
    createButtonTemplate,
    createElement,
    createFieldTemplate,
    createMessageTemplate,
    createText,
    renderTemplate,
    toVueString,
} from "#gadget/ui/template.ts";
import { DIALOG_BODY_MASK_CLASS } from "#gadget/ui/form/constants.ts";
import { msg } from "#gadget/i18n/index.ts";

/**
 * Creates the Vue dialog template as a serialized markup tree.
 *
 * @returns Dialog template markup.
 */
export function createDialogTemplate(): string {
    const dialogTemplateRootResult = [
        createDialogTemplateRoot(),
        createPreSaveDialogTemplate(),
        createCompanyCategoryDialogTemplate(),
        createCategoryViewDialogTemplate(),
        createPageEditDialogTemplate(),
        createMoveDialogTemplate(),
        createPreviewDialogTemplate(),
        createHistoryDialogTemplate(),
        createHistoryJsonDialogTemplate(),
    ];
    const result = renderTemplate(dialogTemplateRootResult);
    return result;
}

/**
 * Creates the category page viewer dialog.
 *
 * @returns Category viewer dialog template node.
 */
function createCategoryViewDialogTemplate(): any {
    const elementResultF = [
        createElement("iframe", {
            class: "vg-stub-creator-category-view",
            "v-bind:src": "categoryViewState.url",
            "v-bind:title": "categoryViewState.title",
        }),
        createCategoryViewFooterTemplate(),
    ];
    const result = createElement(
        "cdx-dialog",
        {
            class: "vg-stub-creator-category-view-dialog",
            "v-bind:title": "categoryViewState.title",
            "v-model:open": "categoryViewOpen",
        },
        elementResultF,
    );
    return result;
}

/**
 * Creates the category-view dialog footer.
 *
 * @returns Dialog footer node.
 */
function createCategoryViewFooterTemplate(): any {
    const categoryViewFooterActionsResul = createCategoryViewFooterActions();
    const actionFooterResultE = [
        createActionFooterTemplate(categoryViewFooterActionsResul),
    ];
    const result = createElement(
        "template",
        {
            "v-slot:footer": "",
        },
        actionFooterResultE,
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
    const messageAG = {
        click: "closeCategoryView",
        label: msg("common.close"),
        weight: "quiet",
    };
    const result = createButtonTemplate(messageAG);
    return result;
}

/**
 * Creates the category editor dialog.
 *
 * @returns Company category dialog template node.
 */
function createCompanyCategoryDialogTemplate(): any {
    const companyCategoryEnglishFieldRes = [
        createCompanyCategoryEnglishFieldTemplate(),
        createCompanyCategoryTextTemplate(),
        createMessageTemplate(
            "companyCategoryState.error",
            "{{ companyCategoryState.error }}",
        ),
        createCompanyCategoryFooterTemplate(),
    ];
    const result = createElement(
        "cdx-dialog",
        {
            "v-bind:title": "getCompanyCategoryDialogTitle()",
            "v-model:open": "companyCategoryOpen",
        },
        companyCategoryEnglishFieldRes,
    );
    return result;
}

/**
 * Creates the company-category English Wikipedia field.
 *
 * @returns Company-category field node.
 */
function createCompanyCategoryEnglishFieldTemplate(): any {
    const messageAE = msg("review.companyCategoryEnglishName");
    const messageAF = {
        placeholder: msg("review.companyCategoryEnglishPlaceholder"),
        "v-model": "companyCategoryState.englishName",
        "v-on:blur": "refreshCompanyCategoryMetadata",
    };
    const elementResultE = [createElement("cdx-text-input", messageAF)];
    const companyCategoryLookupResult = {
        helpText: createCompanyCategoryLookupTemplate(),
    };
    const result = createFieldTemplate(
        messageAE,
        elementResultE,
        companyCategoryLookupResult,
    );
    return result;
}

/**
 * Creates the company-category lookup feedback.
 *
 * @returns Lookup feedback nodes.
 */
function createCompanyCategoryLookupTemplate(): Array<any> {
    const messageAD = msg("review.companyCategoryCheckingWikidata");
    const textResultG = [createText(messageAD)];
    const textResultH = [createText("{{ companyCategoryState.wikidataId }}")];
    const result = [
        createElement(
            "span",
            {
                "v-if": "companyCategoryLookupLoading",
            },
            textResultG,
        ),
        createElement(
            "a",
            {
                "v-bind:href": "getCompanyCategoryWikidataUrl()",
                "v-else-if": "companyCategoryState.wikidataId",
                rel: "noopener noreferrer",
                target: "_blank",
            },
            textResultH,
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
    const messageAC = msg("review.companyCategoryWikitext");
    const elementResultD = [
        createElement("cdx-text-area", {
            class: "vg-stub-creator-company-category-text",
            rows: "10",
            "v-bind:disabled": "companyCategoryState.loading",
            "v-model": "companyCategoryState.text",
        }),
    ];
    const result = createFieldTemplate(messageAC, elementResultD);
    return result;
}

/**
 * Creates the company-category dialog footer.
 *
 * @returns Dialog footer node.
 */
function createCompanyCategoryFooterTemplate(): any {
    const companyCategoryFooterActionsRe =
        createCompanyCategoryFooterActions();
    const actionFooterResultD = [
        createActionFooterTemplate(companyCategoryFooterActionsRe),
    ];
    const result = createElement(
        "template",
        {
            "v-slot:footer": "",
        },
        actionFooterResultD,
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
    const messageAB = {
        click: "closeCompanyCategory",
        disabled: "companyCategoryState.loading",
        label: msg("common.close"),
        weight: "quiet",
    };
    const result = createButtonTemplate(messageAB);
    return result;
}

/**
 * Creates the company-category delete button.
 *
 * @returns Delete button node.
 */
function createDeleteCompanyCategoryButtonTemplate(): any {
    const messageAA = {
        action: "destructive",
        click: "cancelCompanyCategoryCreation",
        disabled: "companyCategoryState.loading",
        label: msg("common.delete"),
        show: "companyCategoryState.pending",
    };
    const result = createButtonTemplate(messageAA);
    return result;
}

/**
 * Creates the company-category save button.
 *
 * @returns Save button node.
 */
function createSaveCompanyCategoryButtonTemplate(): any {
    const messageY = msg("review.saving");
    const messageZ = msg("common.save");
    const joinedTextA = {
        action: "progressive",
        click: "saveCompanyCategory",
        disabled: [
            "companyCategoryState.loading || !c",
            "ompanyCategoryState.text.trim()",
        ].join(""),
        label: `{{ companyCategoryState.loading ? ${toVueString(
            messageY,
        )} : ${toVueString(messageZ)} }}`,
        weight: "primary",
    };
    const result = createButtonTemplate(joinedTextA);
    return result;
}

/**
 * Creates the root Codex dialog template node.
 *
 * @returns Root dialog template node.
 */
function createDialogTemplateRoot(): any {
    const tabsResult = [createTabsTemplate(), createMainDialogMaskTemplate()];
    const elementResultC = [
        createElement(
            "div",
            {
                class: "vg-stub-creator-dialog-body",
                "v-bind:class": DIALOG_BODY_MASK_CLASS,
            },
            tabsResult,
        ),
        createMessageTemplate(
            "sourceFetchState.error",
            "{{ sourceFetchState.error }}",
        ),
        createTableActionTooltipTemplate(),
        createMainDialogFooterTemplate(),
    ];
    const result = createElement(
        "cdx-dialog",
        {
            class: "vg-stub-creator-dialog",
            "v-model:open": "open",
            "v-bind:title": "getDialogTitle()",
        },
        elementResultC,
    );
    return result;
}

/**
 * Creates the shared table-action tooltip.
 *
 * @returns Tooltip node.
 */
function createTableActionTooltipTemplate(): any {
    const textResultF = [createText("{{ tableActionTooltip.label }}")];
    const result = createElement(
        "span",
        {
            class: "vg-stub-creator-icon-tooltip",
            ref: "tableActionTooltipRef",
            role: "tooltip",
            "v-bind:style": "tableActionTooltip.style",
            "v-if": "tableActionTooltip.visible",
        },
        textResultF,
    );
    return result;
}

/**
 * Creates the main dialog loading mask.
 *
 * @returns Dialog loading mask template node.
 */
function createMainDialogMaskTemplate(): any {
    const mainDialogMaskPanelContentResu =
        createMainDialogMaskPanelContentTemplate();
    const elementResultB = [
        createElement(
            "div",
            {
                class: "vg-stub-creator-dialog-mask-panel",
            },
            mainDialogMaskPanelContentResu,
        ),
    ];
    const result = createElement(
        "div",
        {
            class: "vg-stub-creator-dialog-mask",
            "v-if": "previewLoading",
        },
        elementResultB,
    );
    return result;
}

/**
 * Creates main dialog loading-mask panel content.
 *
 * @returns Loading-mask content nodes.
 */
function createMainDialogMaskPanelContentTemplate(): Array<any> {
    const messageX = {
        "aria-label": msg("preview.preparing"),
    };
    const textResultE = [createText("{{ previewLoadingMessage }}")];
    const result = [
        createElement("cdx-progress-bar", messageX),
        createElement(
            "p",
            {
                class: "vg-stub-creator-dialog-mask-text",
            },
            textResultE,
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
    const mainDialogFooterActionsResult = createMainDialogFooterActions();
    const actionFooterResultC = [
        createActionFooterTemplate(mainDialogFooterActionsResult),
    ];
    const result = createElement(
        "template",
        {
            "v-slot:footer": "",
        },
        actionFooterResultC,
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
    const messageW = {
        click: "closeDialog",
        label: msg("common.close"),
        weight: "quiet",
    };
    const result = createButtonTemplate(messageW);
    return result;
}

/**
 * Creates the main dialog action menu.
 *
 * @returns Action menu node.
 */
function createMainActionMenuTemplate(): any {
    const messageV = msg("form.more");
    const textResultD = [createText(messageV)];
    const result = createElement(
        "cdx-menu-button",
        {
            "v-bind:disabled": "sourceFetchState.loading",
            "v-bind:menu-items": "mainActionMenuItems",
            "v-model:selected": "mainActionMenuSelection",
            "v-on:update:selected": "handleMainActionSelect",
        },
        textResultD,
    );
    return result;
}

/**
 * Creates the main dialog submit button.
 *
 * @returns Submit button node.
 */
function createMainSubmitButtonTemplate(): any {
    const messageS = msg("preview.preparing");
    const messageT = msg("form.loading");
    const messageU = msg("form.review");
    const toVueStringResultC = {
        action: "progressive",
        click: "submitForm",
        disabled: "sourceFetchState.loading || previewLoading",
        label: `{{ previewLoading ? ${toVueString(
            messageS,
        )} : sourceFetchState.loading ? ${toVueString(
            messageT,
        )} : ${toVueString(messageU)} }}`,
        weight: "primary",
    };
    const result = createButtonTemplate(toVueStringResultC);
    return result;
}

/**
 * Creates the form history dialog.
 *
 * @returns History dialog template node.
 */
function createHistoryDialogTemplate(): any {
    const messageQ = {
        "v-model:open": "historyOpen",
        title: msg("form.historyTitle"),
    };
    const messageR = msg("form.historyEmpty");
    const textResultC = [createText(messageR)];
    const historyProgressBarResult = [
        createHistoryProgressBarTemplate(),
        createElement(
            "p",
            {
                "v-if": "historyEntries.length === 0",
            },
            textResultC,
        ),
        createHistoryEntryListTemplate(),
        createHistoryDialogFooterTemplate(),
    ];
    const result = createElement(
        "cdx-dialog",
        messageQ,
        historyProgressBarResult,
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
    const historyJsonDialogChildrenResul = createHistoryJsonDialogChildren();
    const dialog = createElement(
        "cdx-dialog",
        attributes,
        historyJsonDialogChildrenResul,
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

    const textResultB = [createText(description)];
    const result = [
        createElement("p", {}, textResultB),
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
    const historyJsonFooterActionsResult = createHistoryJsonFooterActions();
    const actionFooterResultB = [
        createActionFooterTemplate(historyJsonFooterActionsResult),
    ];
    const result = createElement(
        "template",
        {
            "v-slot:footer": "",
        },
        actionFooterResultB,
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
    const messageP = {
        click: "closeHistoryJsonDialog",
        disabled: "historyLoading",
        label: msg("common.close"),
        weight: "quiet",
    };
    const result = createButtonTemplate(messageP);
    return result;
}

/**
 * Creates the history JSON load button.
 *
 * @returns Load button node.
 */
function createHistoryJsonLoadButtonTemplate(): any {
    const messageN = msg("form.loading");
    const messageO = msg("form.load");
    const toVueStringResultB = {
        action: "progressive",
        click: "importHistoryJson",
        disabled: "historyLoading",
        label: `{{ historyLoading ? ${toVueString(
            messageN,
        )} : ${toVueString(messageO)} }}`,
        weight: "primary",
    };
    const result = createButtonTemplate(toVueStringResultB);
    return result;
}

/**
 * Creates the history loading progress bar.
 *
 * @returns History loading progress bar node.
 */
function createHistoryProgressBarTemplate(): any {
    const messageM = {
        "aria-label": msg("form.historyLoading"),
        "v-if": "historyLoading",
    };
    const result = createElement("cdx-progress-bar", messageM);
    return result;
}

/**
 * Creates the history entry list.
 *
 * @returns History entry list template node.
 */
function createHistoryEntryListTemplate(): any {
    const historyEntryResult = [createHistoryEntryTemplate()];
    const result = createElement(
        "div",
        {
            "v-if": "historyEntries.length > 0",
            style: {
                display: "grid",
                gap: "0.5em",
            },
        },
        historyEntryResult,
    );
    return result;
}

/**
 * Creates one history entry row.
 *
 * @returns History entry row template node.
 */
function createHistoryEntryTemplate(): any {
    const historyEntryTextResult = [
        createHistoryEntryTextTemplate(),
        createHistoryEntryLoadButtonTemplate(),
        createHistoryEntryExportButtonTemplate(),
        createHistoryEntryDeleteButtonTemplate(),
        createHistoryEntryUpdateButtonTemplate(),
    ];
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
        historyEntryTextResult,
    );
    return result;
}

/**
 * Creates the history entry text block.
 *
 * @returns History entry text block node.
 */
function createHistoryEntryTextTemplate(): any {
    const textResultA = [
        createText("{{ index + 1 }}. {{ formatHistoryEntryPage(entry) }}"),
    ];
    const elementResultA = [
        createElement("div", {}, textResultA),
        createHistoryEntrySavedAtTemplate(),
    ];
    const result = createElement("div", {}, elementResultA);
    return result;
}

/**
 * Creates the history entry saved-at text.
 *
 * @returns Saved-at text node.
 */
function createHistoryEntrySavedAtTemplate(): any {
    const textResult = [createText("{{ entry.metadata.savedAt }}")];
    const result = createElement(
        "div",
        {
            style: {
                color: "var(--color-subtle, #54595d)",
                fontSize: "0.75em",
            },
        },
        textResult,
    );
    return result;
}

/**
 * Creates the history entry load button.
 *
 * @returns Load button node.
 */
function createHistoryEntryLoadButtonTemplate(): any {
    const messageK = msg("form.loading");
    const messageL = msg("form.load");
    const toVueStringResultA = {
        click: "fillHistoryEntry(entry)",
        disabled: "historyLoading",
        label: `{{ historyLoading ? ${toVueString(
            messageK,
        )} : ${toVueString(messageL)} }}`,
    };
    const result = createButtonTemplate(toVueStringResultA);
    return result;
}

/**
 * Creates the history entry export button.
 *
 * @returns Export button node.
 */
function createHistoryEntryExportButtonTemplate(): any {
    const messageJ = {
        click: "openHistoryJsonDialog(entry)",
        disabled: "historyLoading",
        label: msg("form.export"),
    };
    const result = createButtonTemplate(messageJ);
    return result;
}

/**
 * Creates the history entry delete button.
 *
 * @returns Delete button node.
 */
function createHistoryEntryDeleteButtonTemplate(): any {
    const messageI = {
        action: "destructive",
        click: "deleteHistoryEntry(entry.id)",
        disabled: "historyLoading",
        label: msg("common.delete"),
        show: "!entry.metadata.temporary",
    };
    const result = createButtonTemplate(messageI);
    return result;
}

/**
 * Creates the temporary history update button.
 *
 * @returns Update button node.
 */
function createHistoryEntryUpdateButtonTemplate(): any {
    const messageH = {
        click: "updateTemporaryHistoryEntry",
        disabled: "historyLoading",
        label: msg("form.update"),
        show: "entry.metadata.temporary",
    };
    const result = createButtonTemplate(messageH);
    return result;
}

/**
 * Creates the history dialog footer actions.
 *
 * @returns History dialog footer template node.
 */
function createHistoryDialogFooterTemplate(): any {
    const historyFooterActionsResult = createHistoryFooterActions();
    const actionFooterResultA = [
        createActionFooterTemplate(historyFooterActionsResult),
    ];
    const result = createElement(
        "template",
        {
            "v-slot:footer": "",
        },
        actionFooterResultA,
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
    const messageG = {
        click: "closeHistoryDialog",
        disabled: "historyLoading",
        label: msg("common.close"),
        weight: "quiet",
    };
    const result = createButtonTemplate(messageG);
    return result;
}

/**
 * Creates the history clear button.
 *
 * @returns Clear button node.
 */
function createHistoryClearButtonTemplate(): any {
    const joinedText = {
        action: "destructive",
        click: "clearHistory",
        disabled:
            "historyLoading || " +
            [
                "!historyEntries.some((entry) => !e",
                "ntry.metadata.temporary)",
            ].join(""),
        label: msg("form.clear"),
    };
    const result = createButtonTemplate(joinedText);
    return result;
}

/**
 * Creates the history import button.
 *
 * @returns Import button node.
 */
function createHistoryImportButtonTemplate(): any {
    const messageF = {
        action: "progressive",
        click: "openHistoryImportDialog",
        disabled: "historyLoading",
        label: msg("form.import"),
    };
    const result = createButtonTemplate(messageF);
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
    const moveDialogChildrenResult = createMoveDialogChildren();
    const dialog = createElement(
        "cdx-dialog",
        attributes,
        moveDialogChildrenResult,
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
    const messageD = msg("text.pageName");
    const messageE = {
        placeholder: msg("text.pageNamePlaceholder"),
        "v-bind:model-value": "moveTarget",
        "v-on:update:model-value": "updateMoveTarget($event)",
    };
    const elementResult = [createElement("cdx-text-input", messageE)];
    const result = createFieldTemplate(messageD, elementResult);
    return result;
}

/**
 * Creates the move dialog footer actions.
 *
 * @returns Move dialog footer template node.
 */
function createMoveDialogFooterTemplate(): any {
    const moveFooterActionsResult = createMoveFooterActions();
    const actionFooterResult = [
        createActionFooterTemplate(moveFooterActionsResult),
    ];
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
    const messageC = {
        click: "closeMoveDialog",
        label: msg("common.close"),
        weight: "quiet",
    };
    const result = createButtonTemplate(messageC);
    return result;
}

/**
 * Creates the preview-without-moving button.
 *
 * @returns Preview-without-moving button node.
 */
function createMovePreviewWithoutMovingButtonTemplate(): any {
    const messageB = {
        click: "previewWithoutMoving",
        disabled: "sourceFetchState.loading || moveTargetState.loading",
        label: msg("text.previewWithoutMoving"),
        show: "movePreviewConfirmation",
        weight: "quiet",
    };
    const result = createButtonTemplate(messageB);
    return result;
}

/**
 * Creates the move submit button.
 *
 * @returns Submit button node.
 */
function createMoveSubmitButtonTemplate(): any {
    const loading = "sourceFetchState.loading || moveTargetState.loading";

    const message = msg("text.opening");
    const messageA = msg("text.openPageName");
    const toVueStringResult = {
        action: "progressive",
        click: "submitMoveTarget",
        disabled: "sourceFetchState.loading || moveTargetState.loading",
        label: `{{ ${loading} ? ${toVueString(
            message,
        )} : ${toVueString(messageA)} }}`,
        weight: "primary",
    };
    const result = createButtonTemplate(toVueStringResult);
    return result;
}
