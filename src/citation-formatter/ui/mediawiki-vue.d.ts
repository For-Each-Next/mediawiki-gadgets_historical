/**
 * Editor-only types for MediaWiki's runtime Vue surface.
 */

import type {
    CloseDialogContext,
    DraftDialogContext,
    MainDialogContext,
    MainDialogTableSlotScope,
    ParameterAliasContext,
    ToolDialogContext,
} from "#gadget/ui/dialogs/index.ts";

type CodexModule = typeof import("@wikimedia/codex");
type TemplateContext = CloseDialogContext &
    DraftDialogContext &
    MainDialogContext &
    ParameterAliasContext &
    ToolDialogContext;
type T = TemplateContext;
type AliasOriginalValue = T["parameterAliasDialogOriginalValue"];
type CountAnalysisReplacements = T["countSelectedAnalysisReplacements"];
type CountFindingReplacements = T["countSelectedFindingReplacements"];
type GetAliasOriginalLabel = T["getParameterAliasOriginalValueLabel"];
type OnAliasOpenChange = T["onParameterAliasDialogOpenChange"];

type CdxCardWithSlots = CodexModule["CdxCard"] & {
    new (): {
        $slots: {
            description?: () => unknown;
            "supporting-text"?: () => unknown;
            title?: () => unknown;
        };
    };
};
type CdxComboboxWithSlots = CodexModule["CdxCombobox"] & {
    new (): {
        $slots: {
            "no-results"?: () => unknown;
        };
    };
};
type CdxDialogWithSlots = CodexModule["CdxDialog"] & {
    new (): {
        $slots: {
            default?: () => unknown;
            footer?: () => unknown;
        };
    };
};
type CdxFieldWithSlots = CodexModule["CdxField"] & {
    new (): {
        $slots: {
            default?: () => unknown;
            description?: () => unknown;
            error?: () => unknown;
            "help-text"?: () => unknown;
            label?: () => unknown;
            success?: () => unknown;
            warning?: () => unknown;
        };
    };
};
type CdxTableWithSlots = CodexModule["CdxTable"] & {
    new (): {
        $slots: {
            header?: () => unknown;
            "item-actions"?: (scope: MainDialogTableSlotScope) => unknown;
            "item-reference"?: (scope: MainDialogTableSlotScope) => unknown;
            "item-source"?: (scope: MainDialogTableSlotScope) => unknown;
            tbody?: () => unknown;
        };
    };
};

declare module "vue" {
    interface GlobalDirectives {
        VTooltip: CodexModule["CdxTooltip"];
        vTooltip: string;
    }
}

declare module "@vue/runtime-core" {
    interface ComponentCustomProperties {
        activeAnalysisTab: T["activeAnalysisTab"];
        activeLookupTab: T["activeLookupTab"];
        addParameter: T["addParameter"];
        analysisTabs: T["analysisTabs"];
        applyAnalysisFinding: T["applyAnalysisFinding"];
        applyAnalysisReplacements: T["applyAnalysisReplacements"];
        applyDraft: T["applyDraft"];
        applyParameterAlias: T["applyParameterAlias"];
        autoScriptTitle: T["autoScriptTitle"];
        autofillDate: T["autofillDate"];
        basedOnSourceId: T["basedOnSourceId"];
        basedOnSourceOptions: T["basedOnSourceOptions"];
        canApplyParameterAlias: T["canApplyParameterAlias"];
        canCheckCs1Tool: T["canCheckCs1Tool"];
        canJoinAuthor: T["canJoinAuthor"];
        cancelAllChanges: T["cancelAllChanges"];
        cancelCloseConfirmation: T["cancelCloseConfirmation"];
        canSplitAuthor: T["canSplitAuthor"];
        changeDraftTemplate: T["changeDraftTemplate"];
        citationLayout: T["citationLayout"];
        citationNameCells: T["citationNameCells"];
        citationNameParts: T["citationNameParts"];
        clearAnalysisSelection: T["clearAnalysisSelection"];
        clearDraftValidationError: T["clearDraftValidationError"];
        close: T["close"];
        closeConfirmationOpen: T["closeConfirmationOpen"];
        closeDraftPopup: T["closeDraftPopup"];
        closeParameterAliasDialog: T["closeParameterAliasDialog"];
        closeToolPopup: T["closeToolPopup"];
        countSelectedAnalysisReplacements: CountAnalysisReplacements;
        countSelectedFindingReplacements: CountFindingReplacements;
        createManualSource: T["createManualSource"];
        cs1ToolMessages: T["cs1ToolMessages"];
        cs1ToolSources: T["cs1ToolSources"];
        cs1ToolStatus: T["cs1ToolStatus"];
        cs1WikiLabel: T["cs1WikiLabel"];
        customAnalysisReplacement: T["customAnalysisReplacement"];
        dismissAliasSuggestion: T["dismissAliasSuggestion"];
        draft: T["draft"];
        draftCellErrors: T["draftCellErrors"];
        draftCs1Checking: T["draftCs1Checking"];
        draftPopupOpen: T["draftPopupOpen"];
        draftReviewTool: T["draftReviewTool"];
        draftRowKey: T["draftRowKey"];
        draftSourcePreview: T["draftSourcePreview"];
        duplicateDraft: T["duplicateDraft"];
        editListedSource: T["editListedSource"];
        editingSource: T["editingSource"];
        editSourceIcon: T["editSourceIcon"];
        error: T["error"];
        existingSourceQuery: T["existingSourceQuery"];
        existingSources: T["existingSources"];
        filteredExistingSources: T["filteredExistingSources"];
        formatArticle: T["formatArticle"];
        getAliasSuggestion: T["getAliasSuggestion"];
        getAnalysisReplacement: T["getAnalysisReplacement"];
        getDateAutofillTooltip: T["getDateAutofillTooltip"];
        getDraftFieldLabel: T["getDraftFieldLabel"];
        getOpenableDraftUrl: T["getOpenableDraftUrl"];
        getParameterAliasActionLabel: T["getParameterAliasActionLabel"];
        getParameterAliasCaption: T["getParameterAliasCaption"];
        getParameterAliasDialogError: T["getParameterAliasDialogError"];
        getParameterAliasDialogLabel: T["getParameterAliasDialogLabel"];
        getParameterAliasOriginalValueLabel: GetAliasOriginalLabel;
        getParameterNameTooltip: T["getParameterNameTooltip"];
        hasReferenceNameExclusion: T["hasReferenceNameExclusion"];
        insertListedSource: T["insertListedSource"];
        interfaceLocale: T["interfaceLocale"];
        isAnalysisOccurrenceUnchanged: T["isAnalysisOccurrenceUnchanged"];
        isAuthorDraftParameter: T["isAuthorDraftParameter"];
        isDateAutofillParameter: T["isDateAutofillParameter"];
        isLastAuthorDraftParameter: T["isLastAuthorDraftParameter"];
        isLinkableDraftParameter: T["isLinkableDraftParameter"];
        isUrlDraftParameter: T["isUrlDraftParameter"];
        joinAuthor: T["joinAuthor"];
        joinAuthorIcon: T["joinAuthorIcon"];
        keepAnalysisChangesAndClose: T["keepAnalysisChangesAndClose"];
        keywordFilterLabel: T["keywordFilterLabel"];
        linkIcon: T["linkIcon"];
        linkOrganization: T["linkOrganization"];
        loading: T["loading"];
        magicWandIcon: T["magicWandIcon"];
        manualTemplate: T["manualTemplate"];
        manualTemplateOptions: T["manualTemplateOptions"];
        msg: T["msg"];
        nonCs1Sources: T["nonCs1Sources"];
        onCloseConfirmationOpenChange: T["onCloseConfirmationOpenChange"];
        onDraftPopupOpenChange: T["onDraftPopupOpenChange"];
        onOpenChange: T["onOpenChange"];
        onParameterAliasDialogOpenChange: OnAliasOpenChange;
        onSourcePaste: T["onSourcePaste"];
        onToolPopupOpenChange: T["onToolPopupOpenChange"];
        open: T["open"];
        openAnalysisTool: T["openAnalysisTool"];
        openCs1Tool: T["openCs1Tool"];
        openNonCs1Tool: T["openNonCs1Tool"];
        openParameterAliasDialog: T["openParameterAliasDialog"];
        openUrlIcon: T["openUrlIcon"];
        parameterAliasDialogDirectives: T["parameterAliasDialogDirectives"];
        parameterAliasDialogOpen: T["parameterAliasDialogOpen"];
        parameterAliasDialogOriginalValue: AliasOriginalValue;
        parameterAliasDialogValue: T["parameterAliasDialogValue"];
        parameterAliasIcon: T["parameterAliasIcon"];
        parameterNameOptions: T["parameterNameOptions"];
        parameterTableColumns: T["parameterTableColumns"];
        recheckCs1Tool: T["recheckCs1Tool"];
        referenceStyle: T["referenceStyle"];
        resolveEnteredSource: T["resolveEnteredSource"];
        revertAppliedAnalysisFinding: T["revertAppliedAnalysisFinding"];
        reviewCs1Source: T["reviewCs1Source"];
        reviewNonCs1Source: T["reviewNonCs1Source"];
        saveDraft: T["saveDraft"];
        sectionFilterLabel: T["sectionFilterLabel"];
        selectAllAnalysisOccurrences: T["selectAllAnalysisOccurrences"];
        selectSourceSection: T["selectSourceSection"];
        setBlockCitations: T["setBlockCitations"];
        setCompactReferences: T["setCompactReferences"];
        sortParameters: T["sortParameters"];
        sourceInput: T["sourceInput"];
        sourceSectionSelectors: T["sourceSectionSelectors"];
        sourceTableColumns: T["sourceTableColumns"];
        sourceTableRows: T["sourceTableRows"];
        sourceTemplateLabel: T["sourceTemplateLabel"];
        splitAuthor: T["splitAuthor"];
        splitAuthorIcon: T["splitAuthorIcon"];
        switchStatusIcon: T["switchStatusIcon"];
        switchUrlStatus: T["switchUrlStatus"];
        templateOptions: T["templateOptions"];
        toolBuildLabel: T["toolBuildLabel"];
        toolPopup: T["toolPopup"];
        toolPopupOpen: T["toolPopupOpen"];
        undoAnalysisChangesAndClose: T["undoAnalysisChangesAndClose"];
        updateParameterValue: T["updateParameterValue"];
        useAliasSuggestion: T["useAliasSuggestion"];
        useSourceIcon: T["useSourceIcon"];
        warning: T["warning"];
    }

    interface GlobalComponents {
        CdxButton: CodexModule["CdxButton"];
        CdxCard: CdxCardWithSlots;
        CdxCheckbox: CodexModule["CdxCheckbox"];
        CdxCombobox: CdxComboboxWithSlots;
        CdxDialog: CdxDialogWithSlots;
        CdxField: CdxFieldWithSlots;
        CdxIcon: CodexModule["CdxIcon"];
        CdxMessage: CodexModule["CdxMessage"];
        CdxProgressBar: CodexModule["CdxProgressBar"];
        CdxRadio: CodexModule["CdxRadio"];
        CdxSelect: CodexModule["CdxSelect"];
        CdxTab: CodexModule["CdxTab"];
        CdxTable: CdxTableWithSlots;
        CdxTabs: CodexModule["CdxTabs"];
        CdxTextArea: CodexModule["CdxTextArea"];
        CdxTextInput: CodexModule["CdxTextInput"];
        CdxToastContainer: CodexModule["CdxToastContainer"];
    }

    interface GlobalDirectives {
        VTooltip: CodexModule["CdxTooltip"];
        vTooltip: string;
    }
}

export {};
