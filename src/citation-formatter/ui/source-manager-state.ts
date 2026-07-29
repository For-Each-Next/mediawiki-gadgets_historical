/**
 * Reactive state and derived values for the citation source manager.
 */

import type { Cs1CheckedSource } from "#gadget/contracts/cs1-review.ts";
import {
    getCs1DraftFingerprint,
    mergeSourceDraftErrors,
} from "#gadget/domain/cs1-validation.ts";
import type { SourceAnalysisCell } from "#gadget/domain/source-analysis.ts";
import {
    getSourceDraftCitationNameCells,
    getSourceDraftCitationNameParts,
    listExistingSourceSections,
    listExistingSources,
    listSourceDraftParameterNames,
    serializeSourceDraft,
    type ExistingSource,
    type SourceDraft,
    type SourceDraftCitationNameCell,
    type SourceDraftCitationNameParts,
    type SourceSection,
} from "#gadget/domain/source-manager.ts";
import {
    getSourceDraftErrors,
    type SourceDraftErrors,
} from "#gadget/domain/source-validation.ts";
import type { CitationLayout } from "#gadget/domain/types.ts";
import { msg, sourceValidationMessages } from "#gadget/i18n/index.ts";
import type * as editBox from "#shared/edit-box";
import type { AnalysisUndoSnapshot } from "#gadget/ui/analysis-session.ts";
import {
    createEditableSourceAnalysis,
    type AppliedAnalysisFinding,
    type EditableCitationSourceAnalysis,
} from "#gadget/ui/source-analysis-state.ts";
import type { VueModule } from "#gadget/ui/codex.ts";
import {
    createSourceListDerivedState,
    type SourceListDerivedState,
} from "#gadget/ui/source-list-presentation.ts";
import type {
    ReferenceStyle,
    SourceManagerOptions,
} from "#gadget/ui/source-manager-contracts.ts";
import {
    buildSourcePreview,
    type SourcePreviewPart,
} from "#gadget/ui/source-preview.ts";

export type Cs1ToolStatus = "checking" | "complete" | "idle" | "unavailable";
export type SourceToolPopup = "analysis" | "cs1" | "non-cs1" | null;
export type SourceCheckerTool = Extract<SourceToolPopup, "cs1" | "non-cs1">;

export interface ArticleFormatAttempt {
    autoScriptTitle: boolean;
    citationLayout: CitationLayout;
    referenceStyle: ReferenceStyle;
    sourceRevision: number;
    text: string;
}

export interface PreloadedCheckerSource {
    checkedHtml: string;
    sourceIndex: number;
}

export interface SourceManagerState extends SourceListDerivedState {
    activeAnalysisTab: { value: SourceAnalysisCell };
    activeLookupTab: { value: string };
    appliedAnalysisFindings: { value: AppliedAnalysisFinding[] };
    analysisFindingOrder: { value: string[] };
    analysisUndo: { value: AnalysisUndoSnapshot | null };
    autoScriptTitle: { value: boolean };
    basedOnSourceId: { value: string | null };
    citationLayout: { value: CitationLayout };
    citationNameCells: {
        readonly value: Map<number, SourceDraftCitationNameCell>;
    };
    citationNameParts: {
        readonly value: SourceDraftCitationNameParts;
    };
    checkedCs1CellErrors: { value: SourceDraftErrors };
    checkedCs1Source: { value: string };
    closeConfirmationOpen: { value: boolean };
    cs1ToolMessages: { value: string[] };
    cs1ToolSources: { value: Cs1CheckedSource[] };
    cs1ToolStatus: { value: Cs1ToolStatus };
    dismissedAliasSuggestions: { value: Set<string> };
    draft: { value: SourceDraft | null };
    draftCellErrors: { readonly value: SourceDraftErrors };
    draftCs1Checking: { value: boolean };
    draftPopupOpen: { value: boolean };
    draftReviewQueue: { value: PreloadedCheckerSource[] };
    draftReviewTool: { value: SourceCheckerTool | null };
    draftSourcePreview: { readonly value: SourcePreviewPart[] };
    editingSource: { value: ExistingSource | null };
    error: { value: string };
    existingSourceQuery: { value: string };
    existingSourceSections: { value: SourceSection[] };
    existingSources: { value: ExistingSource[] };
    formatArticleAttempt: { value: ArticleFormatAttempt | null };
    loading: { value: boolean };
    manualTemplate: { value: string | null };
    open: { value: boolean };
    parameterAliasDialogDirectives: { value: string[] };
    parameterAliasDialogOpen: { value: boolean };
    parameterAliasDialogOriginalValue: { value: string };
    parameterAliasDialogRowIndex: { value: number | null };
    parameterAliasDialogValue: { value: string };
    parameterNameOptions: {
        readonly value: Array<{ label: string; value: string }>;
    };
    referenceStyle: { value: ReferenceStyle };
    sessionUndo: { value: AnalysisUndoSnapshot | null };
    sourceAnalysis: { value: EditableCitationSourceAnalysis };
    sourceInput: { value: string };
    sourceRevision: { value: number };
    sourceSectionPath: { value: string[] };
    toolPopup: { value: SourceToolPopup };
    toolPopupOpen: { value: boolean };
    warning: { value: string };
}

interface DraftDerivedInputs {
    checkedCs1CellErrors: SourceManagerState["checkedCs1CellErrors"];
    checkedCs1Source: SourceManagerState["checkedCs1Source"];
    citationLayout: SourceManagerState["citationLayout"];
    draft: SourceManagerState["draft"];
}

interface DraftDerivedState {
    citationNameCells: SourceManagerState["citationNameCells"];
    citationNameParts: SourceManagerState["citationNameParts"];
    draftCellErrors: SourceManagerState["draftCellErrors"];
    draftSourcePreview: SourceManagerState["draftSourcePreview"];
    parameterNameOptions: SourceManagerState["parameterNameOptions"];
}

interface InitialSourceListState {
    existingSourceQuery: SourceManagerState["existingSourceQuery"];
    existingSourceSections: SourceManagerState["existingSourceSections"];
    existingSources: SourceManagerState["existingSources"];
    sourceAnalysis: SourceManagerState["sourceAnalysis"];
    sourceSectionPath: SourceManagerState["sourceSectionPath"];
}

type FormatError = (error: unknown) => string;

interface SourceManagerStateConfiguration {
    options: SourceManagerOptions;
    sourceRevision: { value: number };
}

/** Creates initial reactive state from the current editor contents. */
// eslint-disable-next-line max-lines-per-function
export function createSourceManagerState(
    Vue: VueModule,
    editor: editBox.EditBox,
    configuration: SourceManagerStateConfiguration,
    wikiId: string,
    formatError: FormatError,
): SourceManagerState {
    const { options, sourceRevision } = configuration;
    const initialText = editor.read();
    const sourceList = createInitialSourceListState(Vue, initialText);
    const cs1State = createInitialCs1ToolState(Vue);
    const citationLayout = Vue.ref(options.citationLayout ?? "inline");
    const draft = Vue.ref<SourceDraft | null>(null);
    const referenceStyle = Vue.ref(options.referenceStyle ?? "ref");
    const derived = {
        ...createDraftDerivedState(
            Vue,
            {
                ...cs1State,
                citationLayout,
                draft,
            },
            wikiId,
            formatError,
        ),
        ...createSourceListDerivedState(Vue, sourceList),
    };
    const interfaceState = createInitialInterfaceState(Vue, initialText);
    return {
        ...derived,
        ...interfaceState,
        ...sourceList,
        ...cs1State,
        citationLayout,
        dismissedAliasSuggestions: Vue.ref(new Set<string>()),
        draft,
        editingSource: Vue.ref<ExistingSource | null>(null),
        error: Vue.ref(""),
        formatArticleAttempt: Vue.ref<ArticleFormatAttempt | null>(null),
        loading: Vue.ref(false),
        referenceStyle,
        sourceInput: Vue.ref(""),
        sourceRevision,
        warning: Vue.ref(""),
    };
}

function createInitialInterfaceState(Vue: VueModule, initialText: string) {
    return {
        activeAnalysisTab: Vue.ref<SourceAnalysisCell>("value"),
        activeLookupTab: Vue.ref("add"),
        appliedAnalysisFindings: Vue.ref<AppliedAnalysisFinding[]>([]),
        analysisFindingOrder: Vue.ref<string[]>([]),
        analysisUndo: Vue.ref<AnalysisUndoSnapshot | null>(null),
        autoScriptTitle: Vue.ref(true),
        basedOnSourceId: Vue.ref<string | null>(null),
        closeConfirmationOpen: Vue.ref(false),
        draftPopupOpen: Vue.ref(false),
        manualTemplate: Vue.ref<string | null>("cite magazine"),
        open: Vue.ref(true),
        parameterAliasDialogDirectives: Vue.ref<string[]>([]),
        parameterAliasDialogOpen: Vue.ref(false),
        parameterAliasDialogOriginalValue: Vue.ref(""),
        parameterAliasDialogRowIndex: Vue.ref<number | null>(null),
        parameterAliasDialogValue: Vue.ref(""),
        sessionUndo: Vue.ref<AnalysisUndoSnapshot>({
            afterText: initialText,
            beforeText: initialText,
        }),
        toolPopup: Vue.ref<SourceToolPopup>(null),
        toolPopupOpen: Vue.ref(false),
    };
}

function createInitialCs1ToolState(Vue: VueModule) {
    return {
        checkedCs1CellErrors: Vue.ref<SourceDraftErrors>(new Map()),
        checkedCs1Source: Vue.ref(""),
        cs1ToolMessages: Vue.ref<string[]>([]),
        cs1ToolSources: Vue.ref<Cs1CheckedSource[]>([]),
        cs1ToolStatus: Vue.ref<Cs1ToolStatus>("idle"),
        draftCs1Checking: Vue.ref(false),
        draftReviewQueue: Vue.ref<PreloadedCheckerSource[]>([]),
        draftReviewTool: Vue.ref<SourceCheckerTool | null>(null),
    };
}

/** Creates reactive source-list values from the current editor text. */
function createInitialSourceListState(
    Vue: VueModule,
    text: string,
): InitialSourceListState {
    const existingSources = Vue.ref(listExistingSources(text));
    return {
        existingSourceQuery: Vue.ref(""),
        existingSourceSections: Vue.ref(
            listExistingSourceSections(text, existingSources.value),
        ),
        existingSources,
        sourceAnalysis: Vue.ref(createEditableSourceAnalysis([])),
        sourceSectionPath: Vue.ref<string[]>([]),
    };
}

/** Builds live name and source-code values for the current draft. */
// eslint-disable-next-line max-lines-per-function
function createDraftDerivedState(
    Vue: VueModule,
    state: DraftDerivedInputs,
    wikiId: string,
    formatError: FormatError,
): DraftDerivedState {
    function getCitationNameCells(): Map<number, SourceDraftCitationNameCell> {
        const draft = state.draft.value;
        return draft == null
            ? new Map<number, SourceDraftCitationNameCell>()
            : getSourceDraftCitationNameCells(draft);
    }
    function getDraftSourcePreview(): SourcePreviewPart[] {
        return buildDraftSourcePreview(
            state.draft.value,
            state.citationLayout.value,
            formatError,
        );
    }
    function getCitationNameParts(): SourceDraftCitationNameParts {
        const draft = state.draft.value;
        if (draft == null) {
            return { author: "", part: "", year: "" };
        }
        try {
            return getSourceDraftCitationNameParts(draft);
        } catch {
            return { author: "", part: "", year: "" };
        }
    }
    function getDraftCellErrors(): SourceDraftErrors {
        const draft = state.draft.value;
        if (draft == null) {
            return new Map();
        }
        const local = getSourceDraftErrors(
            draft,
            wikiId,
            sourceValidationMessages,
        );
        if (
            getCurrentCs1DraftFingerprint(state) !==
            state.checkedCs1Source.value
        ) {
            return local;
        }
        return mergeSourceDraftErrors(local, state.checkedCs1CellErrors.value);
    }
    function getParameterNameOptions(): Array<{
        label: string;
        value: string;
    }> {
        const draft = state.draft.value;
        if (draft == null) {
            return [];
        }
        return listSourceDraftParameterNames(draft).map((name) => ({
            label: name,
            value: name,
        }));
    }
    return {
        citationNameCells: Vue.computed(getCitationNameCells),
        citationNameParts: Vue.computed(getCitationNameParts),
        draftCellErrors: Vue.computed(getDraftCellErrors),
        draftSourcePreview: Vue.computed(getDraftSourcePreview),
        parameterNameOptions: Vue.computed(getParameterNameOptions),
    };
}

/** Gets the stable source text represented by the current draft. */
export function getCurrentCs1DraftFingerprint(
    state: Pick<SourceManagerState, "draft">,
): string {
    const draft = state.draft.value;
    if (draft == null) {
        return "";
    }
    try {
        return getCs1DraftFingerprint(draft);
    } catch {
        return "";
    }
}

/** Clears server-side CS1 errors after the draft changes. */
export function clearCheckedCs1Errors(state: SourceManagerState): void {
    state.checkedCs1CellErrors.value = new Map();
    state.checkedCs1Source.value = "";
}

/** Clears the summary superseded by field-level validation. */
export function clearDraftValidationSummary(state: SourceManagerState): void {
    if (state.error.value === msg("draft.invalidSummary")) {
        state.error.value = "";
    }
}

/** Builds a safely segmented preview from the current source draft. */
function buildDraftSourcePreview(
    draft: SourceDraft | null,
    layout: CitationLayout,
    formatError: FormatError,
): SourcePreviewPart[] {
    if (draft == null) {
        return [];
    }
    try {
        return buildSourcePreview(serializeSourceDraft(draft, layout));
    } catch (error) {
        return [
            {
                kind: "text",
                text: msg("draft.previewUnavailable", {
                    error: formatError(error),
                }),
            },
        ];
    }
}
