/** Build-injected citation draft dialog bundle. */

import type {
    CreatorAliasSuggestion,
    SourceDraftRow,
} from "#gadget/domain/source-manager.ts";
import type * as validation from "#gadget/domain/source-validation.ts";
import type { CitationFormatterI18n } from "#gadget/i18n/index.ts";
import type * as options from "#gadget/ui/citation-template-options.ts";
import type { SourceManagerState } from "#gadget/ui/source-manager-state.ts";
import type { TableColumn } from "@wikimedia/codex";

import type { CitationDialogBundle } from "./dialog-bundle.ts";

type CodexIcons = typeof import("@wikimedia/codex-icons");

type DraftStateValue<Key extends keyof SourceManagerState> =
    SourceManagerState[Key] extends {
        readonly value: infer Value;
    }
        ? Value
        : never;

export interface DraftDialogActions {
    addParameter(): void;
    applyDraft(): Promise<void>;
    autofillDate(index: number): Promise<void>;
    canJoinAuthor(index: number): boolean;
    canSplitAuthor(index: number): boolean;
    changeDraftTemplate(template: string | null): void;
    clearDraftValidationError(): void;
    closeDraftPopup(): void;
    dismissAliasSuggestion(index: number): void;
    duplicateDraft(): void;
    getAliasSuggestion(index: number): CreatorAliasSuggestion | null;
    getDateAutofillTooltip(name: string): string;
    getDraftFieldLabel(
        index: number,
        field: keyof validation.SourceDraftRowErrors,
        parameter: string,
    ): string;
    getOpenableDraftUrl(value: string): string;
    getParameterAliasActionLabel(row: SourceDraftRow): string;
    getParameterAliasCaption(parameter: string, alias: string): string;
    getParameterNameTooltip(parameter: string): string;
    hasReferenceNameExclusion(row: SourceDraftRow): boolean;
    isAuthorDraftParameter(name: string): boolean;
    isDateAutofillParameter(name: string): boolean;
    isLastAuthorDraftParameter(name: string): boolean;
    isLinkableDraftParameter(name: string): boolean;
    isUrlDraftParameter(parameter: string): boolean;
    joinAuthor(index: number): void;
    linkOrganization(index: number): Promise<void>;
    onDraftPopupOpenChange(open: boolean): void;
    openParameterAliasDialog(index: number): void;
    saveDraft(): Promise<void>;
    sortParameters(): void;
    splitAuthor(index: number): void;
    switchUrlStatus(index: number): void;
    updateParameterValue(index: number, value: string): void;
    useAliasSuggestion(index: number): void;
}

/** Bindings exposed to the build-injected source-draft template. */
export type DraftDialogContext = DraftDialogActions & {
    citationNameCells: DraftStateValue<"citationNameCells">;
    citationNameParts: DraftStateValue<"citationNameParts">;
    draft: DraftStateValue<"draft">;
    draftCellErrors: DraftStateValue<"draftCellErrors">;
    draftCs1Checking: DraftStateValue<"draftCs1Checking">;
    draftPopupOpen: DraftStateValue<"draftPopupOpen">;
    draftReviewTool: DraftStateValue<"draftReviewTool">;
    draftRowKey: (row: SourceDraftRow) => number;
    draftSourcePreview: DraftStateValue<"draftSourcePreview">;
    editingSource: DraftStateValue<"editingSource">;
    error: string;
    flashingAuthorRows: DraftStateValue<"flashingAuthorRows">;
    hasCitationIdentity: boolean;
    interfaceLocale: string;
    joinAuthorIcon: CodexIcons["cdxIconMerge"];
    linkIcon: CodexIcons["cdxIconLink"];
    loading: boolean;
    magicWandIcon: CodexIcons["cdxIconMagicWand"];
    msg: CitationFormatterI18n["msg"];
    openUrlIcon: CodexIcons["cdxIconNewWindow"];
    parameterAliasIcon: CodexIcons["cdxIconKey"];
    parameterNameOptions: DraftStateValue<"parameterNameOptions">;
    parameterTableColumns: TableColumn[];
    splitAuthorIcon: CodexIcons["cdxIconMerge"];
    switchStatusIcon: CodexIcons["cdxIconUpdate"];
    templateOptions: ReturnType<typeof options.getSourceDraftTemplateOptions>;
    warning: string;
};

const draftDialog: CitationDialogBundle = {
    styles:
        typeof __CITATION_FORMATTER_DRAFT_DIALOG_STYLES__ === "undefined"
            ? ""
            : __CITATION_FORMATTER_DRAFT_DIALOG_STYLES__,
    template:
        typeof __CITATION_FORMATTER_DRAFT_DIALOG_TEMPLATE__ === "undefined"
            ? ""
            : __CITATION_FORMATTER_DRAFT_DIALOG_TEMPLATE__,
};

export default draftDialog;
