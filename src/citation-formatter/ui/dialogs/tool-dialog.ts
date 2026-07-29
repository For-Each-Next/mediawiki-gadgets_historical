/** Build-injected citation-checking and analysis dialog bundle. */

import type { Cs1CheckedSource } from "#gadget/contracts/cs1-review.ts";
import type { SourceAnalysisCell } from "#gadget/domain/source-analysis.ts";
import type { ExistingSource } from "#gadget/domain/source-manager.ts";
import type { CitationFormatterI18n } from "#gadget/i18n/index.ts";
import type {
    AnalysisTab,
    EditableSourceAnalysisFinding,
    SelectableSourceAnalysisOccurrence,
} from "#gadget/ui/source-analysis-state.ts";
import type {
    Cs1ToolStatus,
    SourceToolPopup,
} from "#gadget/ui/source-manager-state.ts";

import type { CitationDialogBundle } from "./dialog-bundle.ts";

type CodexIcons = typeof import("@wikimedia/codex-icons");

export interface AnalysisReplacementActions {
    applyAnalysisFinding(finding: EditableSourceAnalysisFinding): void;
    applyAnalysisReplacements(): void;
    countSelectedAnalysisReplacements(): number;
    countSelectedFindingReplacements(
        finding: EditableSourceAnalysisFinding,
    ): number;
    revertAppliedAnalysisFinding(changeId: number): void;
}

export interface AnalysisToolActions extends AnalysisReplacementActions {
    clearAnalysisSelection(finding: EditableSourceAnalysisFinding): void;
    getAnalysisReplacement(finding: EditableSourceAnalysisFinding): string;
    isAnalysisOccurrenceUnchanged(
        finding: EditableSourceAnalysisFinding,
        occurrence: SelectableSourceAnalysisOccurrence,
    ): boolean;
    openAnalysisTool(): void;
    selectAllAnalysisOccurrences(finding: EditableSourceAnalysisFinding): void;
}

export interface CheckerToolActions {
    closeToolPopup(): void;
    onToolPopupOpenChange(open: boolean): void;
    openCs1Tool(): Promise<void>;
    openNonCs1Tool(): void;
    recheckCs1Tool(): Promise<void>;
    reviewCs1Source(sourceId: string): void;
    reviewNonCs1Source(sourceId: string): void;
}

export type ToolActions = AnalysisToolActions & CheckerToolActions;
export type ToolDialogActions = Omit<
    ToolActions,
    "openAnalysisTool" | "openCs1Tool" | "openNonCs1Tool"
>;

/** Bindings exposed to the checker and analysis template. */
export type ToolDialogContext = ToolDialogActions & {
    activeAnalysisTab: SourceAnalysisCell;
    analysisTabs: AnalysisTab[];
    cs1ToolMessages: string[];
    cs1ToolSources: Cs1CheckedSource[];
    cs1ToolStatus: Cs1ToolStatus;
    cs1WikiLabel: string;
    customAnalysisReplacement: string;
    editSourceIcon: CodexIcons["cdxIconEdit"];
    formatSourceUsageTitle: (source: ExistingSource) => string;
    interfaceLocale: string;
    loading: boolean;
    msg: CitationFormatterI18n["msg"];
    nonCs1Sources: ExistingSource[];
    sourceTemplateLabel: (value: string) => string;
    toolPopup: SourceToolPopup;
    toolPopupOpen: boolean;
};

const toolDialog: CitationDialogBundle = {
    styles:
        typeof __CITATION_FORMATTER_TOOL_DIALOG_STYLES__ === "undefined"
            ? ""
            : __CITATION_FORMATTER_TOOL_DIALOG_STYLES__,
    template:
        typeof __CITATION_FORMATTER_TOOL_DIALOG_TEMPLATE__ === "undefined"
            ? ""
            : __CITATION_FORMATTER_TOOL_DIALOG_TEMPLATE__,
};

export default toolDialog;
