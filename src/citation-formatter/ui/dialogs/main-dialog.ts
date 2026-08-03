/** Build-injected main Citation Formatter dialog bundle. */

import type { CitationFormatterI18n } from "#gadget/i18n/index.ts";
import type {
    SourceSectionSelector,
    SourceTableRow,
} from "#gadget/ui/source-list-presentation.ts";
import type { SourceManagerState } from "#gadget/ui/source-manager-state.ts";
import type { MenuItemData, TableColumn } from "@wikimedia/codex";

import type { CitationDialogBundle } from "./dialog-bundle.ts";

type MainDialogStateKey =
    | "activeLookupTab"
    | "basedOnSourceId"
    | "basedOnSourceOptions"
    | "citationLayout"
    | "cs1ToolStatus"
    | "error"
    | "existingSourceQuery"
    | "existingSources"
    | "filteredExistingSources"
    | "formatScriptTitles"
    | "keywordFilterLabel"
    | "loading"
    | "manualTemplate"
    | "open"
    | "referenceStyle"
    | "scriptTitleMode"
    | "sectionFilterLabel"
    | "sourceInput"
    | "sourceSectionSelectors"
    | "sourceTablePaginationKey"
    | "sourceTableRows"
    | "warning";

type MainDialogStateBindings = {
    [Key in MainDialogStateKey]: SourceManagerState[Key] extends {
        readonly value: infer Value;
    }
        ? Value
        : never;
};

type CodexIcons = typeof import("@wikimedia/codex-icons");

export interface MainDialogActions {
    cancelAllChanges(): void;
    close(): void;
    createManualSource(): void;
    editListedSource(sourceId: string): void;
    formatArticle(): Promise<void>;
    insertListedSource(sourceId: string): void;
    onOpenChange(value: boolean): void;
    onSourcePaste(event: ClipboardEvent): void;
    openAnalysisTool(): void;
    openCs1Tool(): Promise<void>;
    openNonCs1Tool(): void;
    resolveEnteredSource(entered?: string): Promise<void>;
    selectSourceSection(
        selector: SourceSectionSelector,
        selected: string | number,
    ): void;
    setBlockCitations(enabled: boolean): void;
    setCompactReferences(enabled: boolean): void;
    setFormatScriptTitles(enabled: boolean): void;
    setScriptTitleMode(value: unknown): void;
}

/** Bindings exposed to the build-injected main dialog template. */
export type MainDialogContext = MainDialogActions &
    MainDialogStateBindings &
    Pick<CitationFormatterI18n, "interfaceLocale" | "msg"> & {
        canCheckCs1Tool: boolean;
        editSourceIcon: CodexIcons["cdxIconEdit"];
        formatArticleDisabled: boolean;
        manualTemplateOptions: MenuItemData[];
        sourceTableColumns: TableColumn[];
        toolBuildLabel: string;
        useSourceIcon: CodexIcons["cdxIconReferenceExisting"];
    };

export interface MainDialogTableSlotScope {
    item: string;
    row: SourceTableRow;
}

const mainDialog: CitationDialogBundle = {
    styles:
        typeof __CITATION_FORMATTER_MAIN_DIALOG_STYLES__ === "undefined"
            ? ""
            : __CITATION_FORMATTER_MAIN_DIALOG_STYLES__,
    template:
        typeof __CITATION_FORMATTER_MAIN_DIALOG_TEMPLATE__ === "undefined"
            ? ""
            : __CITATION_FORMATTER_MAIN_DIALOG_TEMPLATE__,
};

export default mainDialog;
