/**
 * Cursor-aware source insertion and citation-field management dialog.
 */

import { manageCitationsWithResult } from "#gadget/api.ts";
import { detectCitationLayout } from "#gadget/domain/manager.ts";
import {
    buildExistingSourceReference,
    changeSourceDraftTemplate,
    createManualSourceDraft,
    ensureNextAuthorDraftRows,
    findExistingSources,
    formatSourceDraftRows,
    getSourceDraftParameterAliasInfo,
    listExistingSourceSections,
    listExistingSources,
    moveSourceDraftTitleToScriptTitle,
    moveSourceTitlesToScriptTitle,
    parseSourceDraft,
    parseSourceInput,
    parseSourceUrl,
    replaceExistingSource,
    serializeSourceDraft,
    SourceParameterCollisionError,
    StaleSourceError,
    type ExistingSource,
    type ParsedSourceInput,
    type SourceSection,
    type SourceDraft,
    type SourceDraftRow,
} from "#gadget/domain/source-manager.ts";
import type * as validation from "#gadget/domain/source-validation.ts";
import {
    parseCs1ValidationResult,
    type Cs1ValidationResult,
} from "#gadget/domain/cs1-validation.ts";
import {
    applySourceAnalysisReplacements,
    type SourceAnalysisCell,
    type SourceAnalysisReplacement,
} from "#gadget/domain/source-analysis.ts";
import {
    interfaceLocale,
    msg,
    sourceAnalysisMessages,
    type MessageId,
} from "#gadget/i18n/index.ts";
import { getCanonicalTemplateName } from "#gadget/domain/templates.ts";
import type { CitationLayout } from "#gadget/domain/types.ts";
import {
    type Cs1CheckedSource,
    type Cs1ExistingSourceReview,
    type Cs1ReviewWorkflow,
} from "#gadget/contracts/cs1-review.ts";
import {
    registerCitationFormatterComponents,
    type CodexComponents,
    type ResourceLoaderRequire,
    type ToastController,
    type VueModule,
} from "#gadget/ui/codex.ts";
import {
    appendAnalysisUndo,
    getAnalysisUndoText,
} from "#gadget/ui/analysis-session.ts";
import {
    buildAnalysisTabs,
    refreshSourceAnalysis,
    type AppliedAnalysisFinding,
    type AppliedAnalysisTarget,
    type EditableCitationSourceAnalysis,
    type EditableSourceAnalysisFinding,
    isAnalysisFindingInTab,
    type SelectedAnalysisFinding,
    type SelectableSourceAnalysisOccurrence,
} from "#gadget/ui/source-analysis-state.ts";
import {
    createAliasDraftActions,
    createAuthorDraftActions,
} from "#gadget/ui/source-draft-alias-actions.ts";
import {
    buildSourceSectionSelectors,
    type SourceSectionSelector,
} from "#gadget/ui/source-list-presentation.ts";
import {
    applyResolvedMetadata,
    buildMetadataWarnings,
    createArchiveSeed,
    createLookupFallbackDraft,
    formatMetadataFailure,
    setSourceDraftValue,
} from "#gadget/ui/source-metadata-draft.ts";
import {
    type OpenCitationFormatterDialog,
    type ReferenceStyle,
    type SourceManagerDependencies,
    type SourceManagerOptions,
} from "#gadget/ui/source-manager-contracts.ts";
import {
    clearCheckedCs1Errors,
    clearDraftValidationSummary,
    createSourceManagerState,
    getCurrentCs1DraftFingerprint,
    type PreloadedCheckerSource,
    type SourceCheckerTool,
    type SourceManagerState,
} from "#gadget/ui/source-manager-state.ts";
import {
    type CloseDialogActions,
    SOURCE_MANAGER_TEMPLATE,
} from "#gadget/ui/dialogs/index.ts";
import { installCitationFormatterStyles } from "#gadget/ui/styles.ts";
import * as editBox from "#shared/edit-box";
import {
    cdxIconEdit,
    cdxIconKey,
    cdxIconLink,
    cdxIconMagicWand,
    cdxIconMerge,
    cdxIconNewWindow,
    cdxIconReferenceExisting,
    cdxIconUpdate,
} from "@wikimedia/codex-icons";
import * as templateOptions from "#gadget/ui/citation-template-options.ts";

export { buildSourceSectionSelectors };
export type {
    OpenCitationFormatterDialog,
    ReferenceStyle,
    SourceManagerDependencies,
    SourceManagerOptions,
} from "#gadget/ui/source-manager-contracts.ts";

const HOST_ID = "citation-formatter-source-manager";
const BASED_ON_TEMPLATE = "__based-on__";
const CUSTOM_ANALYSIS_REPLACEMENT = "\u0000custom-analysis-value";
const AUTOSIZE_DIALOG_TEXTAREA_SELECTOR = [
    ".cf-source-manager__draft-dialog .cdx-text-area__textarea",
    ".cf-source-manager__parameter-alias-dialog .cdx-text-area__textarea",
].join(", ");
const GADGET_VERSION =
    typeof __GADGET_VERSION__ === "undefined"
        ? msg("tools.development")
        : __GADGET_VERSION__;
const GADGET_BUILD_TIME =
    typeof __GADGET_BUILD_TIME__ === "undefined"
        ? msg("tools.development")
        : formatUtcBuildTime(__GADGET_BUILD_TIME__);
const TOOL_BUILD_LABEL = msg("tool.buildLabel", {
    buildTime: GADGET_BUILD_TIME,
    version: GADGET_VERSION,
});
const URL_STATUSES = ["live", "dead", "unfit"] as const;
const URL_DRAFT_PARAMETERS = new Set([
    "url",
    "archive-url",
    "archiveurl",
    "chapter-url",
    "conference-url",
    "conferenceurl",
    "contribution-url",
    "contributionurl",
    "eventurl",
    "layurl",
    "link",
    "mapurl",
    "section-url",
    "sectionurl",
    "transcript-url",
    "transcripturl",
]);
const MANUAL_TEMPLATE_OPTIONS = [
    { label: msg("lookup.basedOnExisting"), value: BASED_ON_TEMPLATE },
    ...templateOptions.CITATION_TEMPLATE_OPTIONS,
];
const SOURCE_TABLE_COLUMNS = [
    { id: "reference", label: msg("lookup.reference"), width: "28%" },
    { id: "source", label: msg("lookup.sourceColumn") },
    { id: "actions", label: msg("lookup.actions"), width: "4em" },
];
const PARAMETER_TABLE_COLUMNS = [
    { id: "name", label: msg("draft.parameter"), width: "15em" },
    { id: "value", label: msg("draft.value") },
    { id: "actions", label: msg("lookup.actions"), width: "4em" },
];

let removeActiveSourceManager: (() => void) | null = null;
let sourceManagerGeneration = 0;
let analysisChangeSequence = 0;

interface SourceManagerActionContext extends SourceManagerDependencies {
    cleanup: () => void;
    close: () => void;
    editor: editBox.EditBox;
    state: SourceManagerState;
    toast: ToastController;
}

interface SourceManagerActionServices extends SourceManagerDependencies {
    cleanup: () => void;
    toast: ToastController;
}

interface SourceManagerConfiguration extends SourceManagerDependencies {
    options: SourceManagerOptions;
}

interface SourceDraftWriteResult {
    changePosition: number;
    changeSummary: SourceDraftChangeSummary;
    previousSource: ExistingSource | null;
}

interface SourceDraftChangeSummary {
    added: string[];
    created: boolean;
    fromTemplate: string;
    removed: string[];
    textChanged: boolean;
    toTemplate: string;
    updated: string[];
}

/**
 * Creates a dialog opener with its review workflow injected.
 *
 * @param dependencies - Source-manager workflow dependencies.
 * @returns Bound dialog opener.
 */
export function createOpenCitationFormatterDialog(
    dependencies: SourceManagerDependencies,
): OpenCitationFormatterDialog {
    return async function openCitationFormatterDialog(
        editor,
        options = {},
    ): Promise<void> {
        const generation = ++sourceManagerGeneration;
        installCitationFormatterStyles();
        const require = (await mw.loader.using([
            "vue",
            "@wikimedia/codex",
            "mediawiki.api",
        ])) as ResourceLoaderRequire;
        if (generation !== sourceManagerGeneration) {
            return;
        }
        removeActiveSourceManager?.();
        mountSourceManager(editor, require, options, dependencies);
    };
}

/** Mounts the source manager into a temporary document host. */
// eslint-disable-next-line max-lines-per-function
function mountSourceManager(
    editor: editBox.EditBox,
    require: ResourceLoaderRequire,
    options: SourceManagerOptions,
    dependencies: SourceManagerDependencies,
): void {
    const Vue = require("vue");
    const Codex = require("@wikimedia/codex");
    const host = document.createElement("div");
    host.id = HOST_ID;
    document.documentElement.append(host);
    let cleaned = false;
    const cleanup = function cleanup(): void {
        if (cleaned) {
            return;
        }
        cleaned = true;
        application.unmount();
        host.remove();
        if (removeActiveSourceManager === cleanup) {
            removeActiveSourceManager = null;
        }
    };
    const component = createSourceManagerComponent(
        Vue,
        Codex,
        editor,
        cleanup,
        { ...dependencies, options },
    );
    const application = Vue.createMwApp(component);
    registerCitationFormatterComponents(application, Codex);
    application.mount(host);
    queueMicrotask(function focusSourceInput(): void {
        document
            .querySelector<HTMLInputElement>(
                ".cf-source-manager__source-lookup input",
            )
            ?.focus({ preventScroll: true });
    });
    removeActiveSourceManager = cleanup;
}

/** Creates the source-manager Vue component. */
// eslint-disable-next-line max-lines-per-function
function createSourceManagerComponent(
    Vue: VueModule,
    Codex: CodexComponents,
    editor: editBox.EditBox,
    cleanup: () => void,
    configuration: SourceManagerConfiguration,
): unknown {
    // eslint-disable-next-line max-lines-per-function
    const setup = function setup(): Record<string, unknown> {
        const { options } = configuration;
        const state = createSourceManagerState(
            Vue,
            editor,
            options,
            getCurrentWikiId(),
            formatError,
        );
        const toast = Codex.useToast();
        const actions = createSourceManagerActions(editor, state, {
            ...configuration,
            cleanup,
            toast,
        });
        const draftRowKey = createDraftRowKey();
        return {
            analysisTabs: Vue.computed(() => buildAnalysisTabs(state)),
            canCheckCs1Tool: ["enwiki", "zhwiki"].includes(getCurrentWikiId()),
            draftRowKey,
            editSourceIcon: cdxIconEdit,
            interfaceLocale,
            joinAuthorIcon: cdxIconMerge,
            linkIcon: cdxIconLink,
            parameterAliasIcon: cdxIconKey,
            cs1WikiLabel:
                getCurrentWikiId() === "zhwiki"
                    ? msg("checker.chinese")
                    : msg("checker.english"),
            magicWandIcon: cdxIconMagicWand,
            manualTemplateOptions: MANUAL_TEMPLATE_OPTIONS,
            msg,
            openUrlIcon: cdxIconNewWindow,
            customAnalysisReplacement: CUSTOM_ANALYSIS_REPLACEMENT,
            parameterTableColumns: PARAMETER_TABLE_COLUMNS,
            sourceTableColumns: SOURCE_TABLE_COLUMNS,
            sourceTemplateLabel: getCanonicalTemplateName,
            splitAuthorIcon: cdxIconMerge,
            switchStatusIcon: cdxIconUpdate,
            templateOptions: templateOptions.CITATION_TEMPLATE_OPTIONS,
            toolBuildLabel: TOOL_BUILD_LABEL,
            useSourceIcon: cdxIconReferenceExisting,
            ...actions,
            ...state,
        };
    };
    return Vue.defineComponent({
        name: "CitationSourceManager",
        setup,
        template: SOURCE_MANAGER_TEMPLATE,
    });
}

/** Creates stable Vue keys for mutable citation parameter rows. */
function createDraftRowKey(): (row: SourceDraftRow) => number {
    const keys = new WeakMap<SourceDraftRow, number>();
    let nextKey = 0;
    return function getDraftRowKey(row): number {
        let key = keys.get(row);
        if (key == null) {
            key = nextKey;
            nextKey += 1;
            keys.set(row, key);
        }
        return key;
    };
}

/** Sizes visible Codex text areas before the dialog is painted. */
function scheduleVisibleTextAreaAutosize(): void {
    requestAnimationFrame(function autosizeVisibleTextAreas(): void {
        const textareas = document.querySelectorAll<HTMLTextAreaElement>(
            AUTOSIZE_DIALOG_TEXTAREA_SELECTOR,
        );
        for (const textarea of textareas) {
            textarea.style.height = "auto";
            textarea.style.height = `${textarea.scrollHeight}px`;
        }
    });
}

/** Gets the active MediaWiki database for site-specific CS1 rules. */
function getCurrentWikiId(): string {
    const wikiId = mw.config.get("wgDBname");
    return typeof wikiId === "string" ? wikiId : "";
}

/** Runs one explicit, article-wide CS1 parse check. */
async function fetchArticleCs1Issues(
    context: SourceManagerActionContext,
): Promise<void> {
    const { editor, state } = context;
    if (state.cs1ToolStatus.value === "checking") {
        return;
    }
    refreshExistingSources(editor, state);
    const sources = state.existingSources.value.filter(
        (source) => source.status !== "non-standard",
    );
    state.cs1ToolMessages.value = [];
    state.cs1ToolSources.value = [];
    state.cs1ToolStatus.value = "checking";
    if (sources.length === 0) {
        state.cs1ToolStatus.value = "complete";
        return;
    }
    try {
        const review = await context.cs1Review.checkArticleSources(
            sources,
            getCurrentCs1CheckOptions(),
        );
        state.cs1ToolSources.value = review.sources;
        state.cs1ToolMessages.value = review.messages;
        state.cs1ToolStatus.value = "complete";
    } catch {
        state.cs1ToolStatus.value = "unavailable";
    }
}

function getCurrentPageTitle(): string {
    const pageName = mw.config.get("wgPageName");
    return typeof pageName === "string"
        ? pageName.replaceAll("_", " ")
        : msg("tool.validationTitle");
}

/** Supplies the page context required by live CS1 checks. */
function getCurrentCs1CheckOptions(): { pageTitle: string } {
    return { pageTitle: getCurrentPageTitle() };
}

function formatUtcBuildTime(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return msg("tools.unknownBuildTime");
    }
    return new Intl.DateTimeFormat(interfaceLocale, {
        dateStyle: "medium",
        timeStyle: "medium",
        timeZone: "UTC",
    }).format(date);
}

/** Creates source lookup, insertion, and editing actions. */
function createSourceManagerActions(
    editor: editBox.EditBox,
    state: SourceManagerState,
    services: SourceManagerActionServices,
): Record<string, unknown> {
    const { cleanup } = services;
    const close = function close(): void {
        state.open.value = false;
        queueMicrotask(cleanup);
    };
    const context = { ...services, close, editor, state };
    return {
        ...createFormatterActions(context),
        ...createNavigationActions(context),
        ...createLookupActions(context),
        ...createDraftActions(context),
        ...createToolActions(context),
    };
}

/** Creates the footer action for formatting the article source. */
// eslint-disable-next-line max-lines-per-function
function createFormatterActions(
    context: SourceManagerActionContext,
): Record<string, unknown> {
    // eslint-disable-next-line max-lines-per-function
    function formatArticle(): void {
        const { editor, state } = context;
        const beforeText = editor.read();
        let referencesNotFormatted = 0;
        let textChanged = false;
        try {
            const compact = state.referenceStyle.value === "r";
            const source = state.autoScriptTitle.value
                ? moveSourceTitlesToScriptTitle(beforeText, getCurrentWikiId())
                      .text
                : beforeText;
            const result = manageCitationsWithResult(
                source,
                [],
                compact,
                state.citationLayout.value,
                msg("sections.lead"),
            );
            referencesNotFormatted = result.referencesNotFormatted;
            textChanged = result.text !== beforeText;
            if (textChanged) {
                editBox.writePreservingPosition(editor, result.text);
                recordSessionWrite(state, beforeText, result.text);
                clearAnalysisUndo(state);
            }
        } catch (error) {
            state.error.value = formatError(error);
            return;
        }
        if (textChanged && referencesNotFormatted > 0) {
            const message = formatPluralMessage(
                referencesNotFormatted,
                "feedback.formatIncompleteOne",
                "feedback.formatIncompleteMany",
            );
            context.toast.warning(message, { autoDismiss: true });
        } else if (textChanged) {
            context.toast.success(msg("feedback.formatComplete"), {
                autoDismiss: true,
            });
        }
        refreshExistingSources(editor, state);
        state.activeLookupTab.value = "view";
    }
    function setBlockCitations(enabled: boolean): void {
        context.state.citationLayout.value = enabled ? "block" : "inline";
    }
    function setCompactReferences(enabled: boolean): void {
        context.state.referenceStyle.value = enabled ? "r" : "ref";
    }
    return { formatArticle, setBlockCitations, setCompactReferences };
}

/** Creates dialog navigation actions. */
function createNavigationActions(
    context: SourceManagerActionContext,
): Record<string, unknown> {
    return {
        ...createManagerCloseActions(context),
        ...createDraftPopupNavigationActions(context),
        ...createCloseConfirmationActions(context),
    };
}

function createManagerCloseActions(
    context: SourceManagerActionContext,
): Record<string, unknown> {
    function cancelAllChanges(): void {
        cancelAllSourceManagerChanges(context);
    }
    function requestClose(): void {
        if (context.state.analysisUndo.value != null) {
            context.state.closeConfirmationOpen.value = true;
            return;
        }
        context.close();
    }
    function onOpenChange(value: boolean): void {
        if (value) {
            return;
        }
        if (context.state.analysisUndo.value != null) {
            context.state.open.value = true;
            context.state.closeConfirmationOpen.value = true;
            return;
        }
        queueMicrotask(context.cleanup);
    }
    return { cancelAllChanges, close: requestClose, onOpenChange };
}

/** Restores all safe editor writes made since the dialog opened. */
function cancelAllSourceManagerChanges(
    context: SourceManagerActionContext,
): void {
    const { editor, state, toast } = context;
    const snapshot = state.sessionUndo.value;
    if (
        snapshot == null ||
        getAnalysisUndoText(snapshot, editor.read()) == null
    ) {
        toast.warning(msg("feedback.cancelUnavailable"), {
            autoDismiss: true,
        });
        return;
    }
    if (snapshot.beforeText !== snapshot.afterText) {
        editor.write(snapshot.beforeText);
    }
    clearAnalysisUndo(state);
    context.close();
    queueMicrotask(function focusEditor(): void {
        editor.focus();
    });
}

function createDraftPopupNavigationActions(
    context: SourceManagerActionContext,
): Record<string, unknown> {
    function closeDraftPopup(): void {
        const { state } = context;
        const reviewTool = state.draftReviewTool.value;
        resetSourceDraft(state);
        if (reviewTool != null) {
            showCheckerResults(state, reviewTool);
        }
    }
    function onDraftPopupOpenChange(open: boolean): void {
        if (!open && context.state.draft.value != null) {
            closeDraftPopup();
        }
    }
    return { closeDraftPopup, onDraftPopupOpenChange };
}

function createCloseConfirmationActions(
    context: SourceManagerActionContext,
): CloseDialogActions {
    function cancelCloseConfirmation(): void {
        context.state.closeConfirmationOpen.value = false;
    }
    function keepAnalysisChangesAndClose(): void {
        context.state.analysisUndo.value = null;
        context.state.closeConfirmationOpen.value = false;
        context.close();
    }
    function undoAnalysisChangesAndClose(): void {
        if (restoreAnalysisSession(context)) {
            context.state.closeConfirmationOpen.value = false;
            context.close();
        }
    }
    function onCloseConfirmationOpenChange(open: boolean): void {
        if (!open) {
            cancelCloseConfirmation();
        }
    }
    return {
        cancelCloseConfirmation,
        keepAnalysisChangesAndClose,
        onCloseConfirmationOpenChange,
        undoAnalysisChangesAndClose,
    };
}

/** Creates parameter-editing and draft-save actions. */
// eslint-disable-next-line max-lines-per-function
function createDraftActions(
    context: SourceManagerActionContext,
): Record<string, unknown> {
    const { state } = context;
    function addParameter(): void {
        state.draft.value?.rows.push(createBlankDraftRow());
    }
    function clearDraftValidationError(): void {
        clearDraftValidationSummary(state);
    }
    function changeDraftTemplate(template: string | null): void {
        clearDraftValidationError();
        updateDraftTemplate(state, template);
    }
    function sortParameters(): void {
        const draft = state.draft.value;
        if (draft != null) {
            if (state.autoScriptTitle.value) {
                moveSourceDraftTitleToScriptTitle(draft, getCurrentWikiId());
            }
            formatSourceDraftRows(draft);
            context.toast.success(msg("feedback.parametersSorted"), {
                autoDismiss: true,
            });
        }
    }
    async function autofillDate(index: number): Promise<void> {
        await autofillDraftDate(context, index);
    }
    async function linkOrganization(index: number): Promise<void> {
        await linkDraftOrganization(context, index);
    }
    function getDraftFieldLabel(
        index: number,
        field: keyof validation.SourceDraftRowErrors,
        parameter: string,
    ): string {
        return buildDraftFieldLabel(state, index, field, parameter);
    }
    function getParameterNameTooltip(parameter: string): string {
        const draft = state.draft.value;
        if (draft == null) {
            return "";
        }
        const info = getSourceDraftParameterAliasInfo(draft, parameter);
        if (info == null || (!info.isAlias && info.aliases.length === 0)) {
            return "";
        }
        const aliases = info.aliases.join(", ");
        return info.isAlias
            ? msg("draft.parameterAliasOf", {
                  aliases,
                  canonical: info.canonical,
                  parameter,
              })
            : msg("draft.parameterAliases", { aliases });
    }
    function duplicateDraft(): void {
        if (
            state.draft.value == null ||
            state.editingSource.value == null ||
            state.editingSource.value.status === "non-standard"
        ) {
            return;
        }
        state.editingSource.value = null;
        state.error.value = "";
        state.warning.value = msg("lookup.duplicateWarning");
        context.toast.success(msg("feedback.sourceDuplicated"), {
            autoDismiss: true,
        });
    }
    async function applyDraft(): Promise<void> {
        const reviewTool = state.draftReviewTool.value;
        const draft = state.draft.value;
        if (draft != null) {
            formatSourceDraftRows(draft);
        }
        if (!saveSourceDraft(context, false) || reviewTool !== "cs1") {
            return;
        }
        await recheckAppliedCs1Draft(context);
    }
    async function saveDraft(): Promise<void> {
        if (state.draftReviewTool.value != null) {
            saveReviewedDraft(context);
            return;
        }
        if (state.editingSource.value != null) {
            saveSourceDraft(context, true);
            return;
        }
        await saveNewSourceDraft(context);
    }
    function switchUrlStatus(index: number): void {
        const row = state.draft.value?.rows[index];
        if (row == null) {
            return;
        }
        const current = normalizeDraftName(row.value);
        const currentIndex = URL_STATUSES.indexOf(
            current as (typeof URL_STATUSES)[number],
        );
        row.value = URL_STATUSES[(currentIndex + 1) % URL_STATUSES.length];
    }
    return {
        ...createAuthorDraftActions(state),
        ...createAliasDraftActions(state, scheduleVisibleTextAreaAutosize),
        addParameter,
        applyDraft,
        autofillDate,
        changeDraftTemplate,
        clearDraftValidationError,
        duplicateDraft,
        getDraftFieldLabel,
        getOpenableDraftUrl,
        getParameterNameTooltip,
        getDateAutofillTooltip,
        isDateAutofillParameter,
        isLinkableDraftParameter,
        isUrlDraftParameter,
        linkOrganization,
        saveDraft,
        sortParameters,
        switchUrlStatus,
    };
}

/** Whether a citation parameter contains a URL. */
function isUrlDraftParameter(parameter: string): boolean {
    return URL_DRAFT_PARAMETERS.has(normalizeDraftName(parameter));
}

/** Gets a safe HTTP(S) href that preserves entered archive links. */
function getOpenableDraftUrl(value: string): string {
    const parsed = parseSourceUrl(value);
    return parsed?.archiveUrl || parsed?.originalUrl || "";
}

/** Builds an accessible draft-field label with help or an error. */
function buildDraftFieldLabel(
    state: SourceManagerState,
    index: number,
    field: keyof validation.SourceDraftRowErrors,
    parameter: string,
): string {
    const label = getDraftFieldLabelText(field, parameter);
    const error = state.draftCellErrors.value.get(index)?.[field];
    const nameCell = state.citationNameCells.value.get(index);
    const help =
        error == null && nameCell === field
            ? msg(
                  field === "value"
                      ? "draft.nameValueHelp"
                      : "draft.nameAliasHelp",
              )
            : "";
    const context = error ?? help;
    return context === ""
        ? label
        : msg("draft.fieldContext", { label, message: context });
}

/** Gets the base label for one compact citation-table control. */
function getDraftFieldLabelText(
    field: keyof validation.SourceDraftRowErrors,
    parameter: string,
): string {
    if (field === "name") {
        return msg("draft.parameterName");
    }
    if (field === "value") {
        return msg("draft.valueLabel", { parameter });
    }
    return normalizeDraftName(parameter) === "url"
        ? msg("draft.sourceKeyLabel")
        : msg("draft.aliasLabel", { parameter });
}

/** Creates explicit checker-popup actions for the Tools tab. */
function createToolActions(
    context: SourceManagerActionContext,
): Record<string, unknown> {
    return {
        ...createAnalysisToolActions(context),
        ...createCheckerToolActions(context),
    };
}

/** Creates citation-analysis popup and replacement actions. */
function createAnalysisToolActions(
    context: SourceManagerActionContext,
): Record<string, unknown> {
    function openAnalysisTool(): void {
        refreshAndOpenAnalysisTool(context.state);
    }
    return {
        ...createAnalysisReplacementActions(context),
        clearAnalysisSelection,
        getAnalysisReplacement,
        isAnalysisOccurrenceUnchanged,
        openAnalysisTool,
        selectAllAnalysisOccurrences,
    };
}

function refreshAndOpenAnalysisTool(state: SourceManagerState): void {
    refreshSourceAnalysis(state);
    state.activeAnalysisTab.value = getInitialAnalysisTab(state);
    state.toolPopup.value = "analysis";
    state.toolPopupOpen.value = true;
}

function getInitialAnalysisTab(state: SourceManagerState): SourceAnalysisCell {
    const findings = [
        ...state.sourceAnalysis.value.findings,
        ...state.appliedAnalysisFindings.value.map((entry) => entry.finding),
    ];
    const hasValueFinding = findings.some((finding) =>
        isAnalysisFindingInTab(finding, "value"),
    );
    return hasValueFinding || findings.length === 0 ? "value" : "alias";
}

function createAnalysisReplacementActions(
    context: SourceManagerActionContext,
): Record<string, unknown> {
    function countSelectedAnalysisReplacements(): number {
        return listSelectedAnalysisReplacements(
            context.state.sourceAnalysis.value,
            context.state.activeAnalysisTab.value,
        ).length;
    }
    function countSelectedFindingReplacements(
        finding: EditableSourceAnalysisFinding,
    ): number {
        return listSelectedFindingReplacements(finding).length;
    }
    function applyAnalysisReplacements(): void {
        applyAllSelectedAnalysisFindings(context);
    }
    function applyAnalysisFinding(
        finding: EditableSourceAnalysisFinding,
    ): void {
        applyOneSelectedAnalysisFinding(context, finding);
    }
    function revertAppliedAnalysisFinding(changeId: number): void {
        revertAnalysisFinding(context, changeId);
    }
    return {
        applyAnalysisFinding,
        applyAnalysisReplacements,
        countSelectedAnalysisReplacements,
        countSelectedFindingReplacements,
        revertAppliedAnalysisFinding,
    };
}

function applyAllSelectedAnalysisFindings(
    context: SourceManagerActionContext,
): void {
    const selected = listSelectedAnalysisFindings(
        context.state.sourceAnalysis.value,
        context.state.activeAnalysisTab.value,
    );
    applySelectedAnalysisFindings(context, selected);
}

function applyOneSelectedAnalysisFinding(
    context: SourceManagerActionContext,
    finding: EditableSourceAnalysisFinding,
): void {
    applySelectedAnalysisFindings(context, [
        {
            finding,
            replacements: listSelectedFindingReplacements(finding),
        },
    ]);
}

/** Creates the CS1 and non-CS1 checker popup actions. */
function createCheckerToolActions(
    context: SourceManagerActionContext,
): Record<string, unknown> {
    const { state } = context;
    const recheckCs1Tool = () => fetchArticleCs1Issues(context);
    async function openCs1Tool(): Promise<void> {
        state.toolPopup.value = "cs1";
        state.toolPopupOpen.value = true;
        await recheckCs1Tool();
    }
    function openNonCs1Tool(): void {
        state.toolPopup.value = "non-cs1";
        state.toolPopupOpen.value = true;
    }
    function closeToolPopup(): void {
        state.toolPopupOpen.value = false;
    }
    function onToolPopupOpenChange(open: boolean): void {
        if (!open) {
            state.toolPopupOpen.value = false;
        }
    }
    function reviewNonCs1Source(sourceId: string): void {
        closeToolPopup();
        reviewNonCs1CheckedSource(state, sourceId);
    }
    function reviewCs1Source(sourceId: string): void {
        closeToolPopup();
        reviewCs1CheckedSource(state, sourceId);
    }
    return {
        closeToolPopup,
        onToolPopupOpenChange,
        openCs1Tool,
        openNonCs1Tool,
        recheckCs1Tool,
        reviewCs1Source,
        reviewNonCs1Source,
    };
}

function selectAllAnalysisOccurrences(
    finding: EditableSourceAnalysisFinding,
): void {
    for (const occurrence of finding.occurrences) {
        occurrence.selected = true;
    }
}

function clearAnalysisSelection(finding: EditableSourceAnalysisFinding): void {
    for (const occurrence of finding.occurrences) {
        occurrence.selected = false;
    }
}

function getAnalysisReplacement(
    finding: EditableSourceAnalysisFinding,
): string {
    return finding.replacementChoice === CUSTOM_ANALYSIS_REPLACEMENT
        ? finding.customReplacement
        : finding.replacementChoice;
}

function isAnalysisOccurrenceUnchanged(
    finding: EditableSourceAnalysisFinding,
    occurrence: SelectableSourceAnalysisOccurrence,
): boolean {
    return occurrence.value === getAnalysisReplacement(finding);
}

/** Writes selected analysis cases as one editor operation. */
function applySelectedAnalysisFindings(
    context: SourceManagerActionContext,
    selectedFindings: SelectedAnalysisFinding[],
): void {
    const { toast } = context;
    const selected = selectedFindings.filter(
        (entry) => entry.replacements.length > 0,
    );
    const replacements = selected.flatMap((entry) => entry.replacements);
    if (replacements.length === 0) {
        toast.info(msg("analysis.selectOne"), {
            autoDismiss: true,
        });
        return;
    }
    try {
        writeSelectedAnalysisFindings(context, selected, replacements);
    } catch (error) {
        toast.error(formatError(error), { autoDismiss: true });
        return;
    }
    const message = formatPluralMessage(
        replacements.length,
        "analysis.replacedOne",
        "analysis.replacedMany",
    );
    toast.success(message, { autoDismiss: true });
}

function writeSelectedAnalysisFindings(
    context: SourceManagerActionContext,
    selected: SelectedAnalysisFinding[],
    replacements: SourceAnalysisReplacement[],
): void {
    const { editor, state } = context;
    const appliedFindings = buildAppliedAnalysisFindings(state, selected);
    const beforeText = editor.read();
    const text = applySourceAnalysisReplacements(
        beforeText,
        state.existingSources.value,
        replacements,
        sourceAnalysisMessages,
    );
    editor.write(text);
    recordSessionWrite(state, beforeText, text);
    recordAnalysisUndo(state, beforeText, text);
    state.appliedAnalysisFindings.value.push(...appliedFindings);
    refreshExistingSources(editor, state);
    refreshSourceAnalysis(state);
}

/** Captures source identities used to reverse each applied case. */
function buildAppliedAnalysisFindings(
    state: SourceManagerState,
    selected: SelectedAnalysisFinding[],
): AppliedAnalysisFinding[] {
    const sources = new Map(
        state.existingSources.value.map((source) => [source.id, source]),
    );
    return selected.map(function buildAppliedFinding(entry) {
        const targets = entry.replacements.map(
            function buildTarget(replacement) {
                const source = sources.get(replacement.sourceId);
                if (source == null) {
                    throw new Error(msg("analysis.sourceMissing"));
                }
                return {
                    cell: replacement.cell,
                    oldValue: replacement.oldValue,
                    parameter: replacement.parameter,
                    replacement: replacement.replacement,
                    rowIndex: replacement.rowIndex,
                    sourceGroup: source.group,
                    sourceId: source.id,
                    sourceReferenceName: source.referenceName,
                    sourceTemplateStart: source.templateStart,
                };
            },
        );
        analysisChangeSequence += 1;
        return {
            changeId: analysisChangeSequence,
            finding: entry.finding,
            targets,
        };
    });
}

/** Reverses one applied case without discarding later cases. */
function revertAnalysisFinding(
    context: SourceManagerActionContext,
    changeId: number,
): void {
    const { editor, state, toast } = context;
    const applied = state.appliedAnalysisFindings.value.find(
        (entry) => entry.changeId === changeId,
    );
    if (applied == null) {
        return;
    }
    try {
        const beforeText = editor.read();
        const replacements = buildReverseAnalysisReplacements(state, applied);
        const afterText = applySourceAnalysisReplacements(
            beforeText,
            state.existingSources.value,
            replacements,
            sourceAnalysisMessages,
        );
        editor.write(afterText);
        recordSessionWrite(state, beforeText, afterText);
        recordAnalysisUndo(state, beforeText, afterText);
        state.appliedAnalysisFindings.value =
            state.appliedAnalysisFindings.value.filter(
                (entry) => entry.changeId !== changeId,
            );
        refreshExistingSources(editor, state);
        refreshSourceAnalysis(state);
        clearCompletedAnalysisUndo(state, afterText);
        toast.success(msg("analysis.revertComplete"), { autoDismiss: true });
    } catch (error) {
        toast.error(formatError(error), { autoDismiss: true });
    }
}

function buildReverseAnalysisReplacements(
    state: SourceManagerState,
    applied: AppliedAnalysisFinding,
): SourceAnalysisReplacement[] {
    return applied.targets.map(function reverseTarget(target) {
        const source = findAnalysisTargetSource(
            state.existingSources.value,
            target,
        );
        const rowIndex = findAnalysisTargetRow(source, target);
        return {
            cell: target.cell,
            oldValue: target.replacement,
            parameter: target.parameter,
            replacement: target.oldValue,
            rowIndex,
            sourceId: source.id,
        };
    });
}

function findAnalysisTargetSource(
    sources: ExistingSource[],
    target: AppliedAnalysisTarget,
): ExistingSource {
    const exact = sources.find((source) => source.id === target.sourceId);
    if (exact != null) {
        return exact;
    }
    const candidates = sources
        .filter(
            (source) =>
                source.group === target.sourceGroup &&
                source.referenceName === target.sourceReferenceName,
        )
        .toSorted(
            (left, right) =>
                Math.abs(left.templateStart - target.sourceTemplateStart) -
                Math.abs(right.templateStart - target.sourceTemplateStart),
        );
    const source = candidates[0];
    if (source == null) {
        throw new Error(msg("analysis.revertUnavailable"));
    }
    return source;
}

function findAnalysisTargetRow(
    source: ExistingSource,
    target: AppliedAnalysisTarget,
): number {
    const preferred = source.draft.rows[target.rowIndex];
    if (isAnalysisTargetRow(preferred, target)) {
        return target.rowIndex;
    }
    const rowIndex = source.draft.rows.findIndex((row) =>
        isAnalysisTargetRow(row, target),
    );
    if (rowIndex < 0) {
        throw new Error(msg("analysis.revertUnavailable"));
    }
    return rowIndex;
}

function isAnalysisTargetRow(
    row: SourceDraftRow | undefined,
    target: AppliedAnalysisTarget,
): boolean {
    if (row == null || normalizeDraftName(row.name) !== target.parameter) {
        return false;
    }
    const currentValue =
        target.cell === "alias" ? row.alias.trim() : row.value.trim();
    return currentValue === target.replacement;
}

function clearCompletedAnalysisUndo(
    state: SourceManagerState,
    currentText: string,
): void {
    if (
        state.appliedAnalysisFindings.value.length === 0 &&
        state.analysisUndo.value?.beforeText === currentText
    ) {
        state.analysisUndo.value = null;
    }
}

/** Records a chain of analysis-only writes as one session undo. */
function recordAnalysisUndo(
    state: SourceManagerState,
    beforeText: string,
    afterText: string,
): void {
    state.analysisUndo.value = appendAnalysisUndo(
        state.analysisUndo.value,
        beforeText,
        afterText,
    );
}

/** Extends the whole-dialog undo snapshot after an editor write. */
function recordSessionWrite(
    state: SourceManagerState,
    beforeText: string,
    afterText: string,
): void {
    const snapshot = state.sessionUndo.value;
    if (snapshot == null || snapshot.afterText !== beforeText) {
        state.sessionUndo.value = null;
        return;
    }
    state.sessionUndo.value = {
        afterText,
        beforeText: snapshot.beforeText,
    };
}

function clearAnalysisUndo(state: SourceManagerState): void {
    state.analysisUndo.value = null;
    state.appliedAnalysisFindings.value = [];
    state.analysisFindingOrder.value = [];
}

/** Restores analysis writes unless a later editor change intervened. */
function restoreAnalysisSession(context: SourceManagerActionContext): boolean {
    const { editor, state, toast } = context;
    const snapshot = state.analysisUndo.value;
    if (snapshot == null) {
        return true;
    }
    const beforeText = getAnalysisUndoText(snapshot, editor.read());
    if (beforeText == null) {
        clearAnalysisUndo(state);
        toast.warning(msg("analysis.undoUnavailable"), {
            autoDismiss: true,
        });
        return false;
    }
    const currentText = editor.read();
    editor.write(beforeText);
    recordSessionWrite(state, currentText, beforeText);
    clearAnalysisUndo(state);
    refreshExistingSources(editor, state);
    refreshSourceAnalysis(state);
    toast.success(msg("analysis.undoComplete"), { autoDismiss: true });
    return true;
}

/** Expands checked occurrences into domain-layer replacements. */
function listSelectedAnalysisReplacements(
    analysis: EditableCitationSourceAnalysis,
    tab: SourceAnalysisCell,
): SourceAnalysisReplacement[] {
    return analysis.findings
        .filter((finding) => isAnalysisFindingInTab(finding, tab))
        .flatMap(listSelectedFindingReplacements);
}

function listSelectedAnalysisFindings(
    analysis: EditableCitationSourceAnalysis,
    tab: SourceAnalysisCell,
): SelectedAnalysisFinding[] {
    return analysis.findings
        .filter((finding) => isAnalysisFindingInTab(finding, tab))
        .map((finding) => ({
            finding,
            replacements: listSelectedFindingReplacements(finding),
        }));
}

/** Expands checked occurrences from one finding into replacements. */
function listSelectedFindingReplacements(
    finding: EditableSourceAnalysisFinding,
): SourceAnalysisReplacement[] {
    if (
        finding.replacementChoice === CUSTOM_ANALYSIS_REPLACEMENT &&
        finding.customReplacement === ""
    ) {
        return [];
    }
    return finding.occurrences.flatMap(function toReplacement(occurrence) {
        if (
            !occurrence.selected ||
            isAnalysisOccurrenceUnchanged(finding, occurrence)
        ) {
            return [];
        }
        return [
            {
                cell: occurrence.cell,
                oldValue: occurrence.value,
                parameter: occurrence.parameter,
                replacement: getAnalysisReplacement(finding),
                rowIndex: occurrence.rowIndex,
                sourceId: occurrence.sourceId,
            },
        ];
    });
}

function reviewCs1CheckedSource(
    state: SourceManagerState,
    sourceId: string,
): void {
    const checked = state.cs1ToolSources.value.find(
        (result) => result.source.id === sourceId,
    );
    if (checked == null) {
        return;
    }
    const queue = preloadCs1ReviewQueue(state, sourceId);
    openCs1ReviewSource(state, sourceId, checked.html, queue);
}

/** Opens a prechecked CS1 draft without another API request. */
function openCs1ReviewSource(
    state: SourceManagerState,
    sourceId: string,
    checkedHtml: string,
    queue: PreloadedCheckerSource[],
): boolean {
    openExistingSourceWhenIdle(state, sourceId);
    const draft = state.draft.value;
    if (draft == null) {
        return false;
    }
    state.draftReviewQueue.value = queue;
    state.draftReviewTool.value = "cs1";
    const result = parseCs1ValidationResult(draft, checkedHtml);
    state.checkedCs1CellErrors.value = result.cellErrors;
    state.checkedCs1Source.value = getCurrentCs1DraftFingerprint(state);
    if (result.messages.length > 0) {
        state.warning.value = result.messages.join("\n");
    }
    return true;
}

/** Opens one non-CS1 result in the sequential checker-edit workflow. */
function reviewNonCs1CheckedSource(
    state: SourceManagerState,
    sourceId: string,
): void {
    const source = findExistingSourceById(state, sourceId);
    if (source == null) {
        return;
    }
    const queue = preloadNonCs1ReviewQueue(state, sourceId);
    openNonCs1ReviewSource(state, sourceId, queue);
}

/** Opens a preloaded non-CS1 draft in the checker workflow. */
function openNonCs1ReviewSource(
    state: SourceManagerState,
    sourceId: string,
    queue: PreloadedCheckerSource[],
): boolean {
    openExistingSourceWhenIdle(state, sourceId);
    if (state.draft.value == null) {
        return false;
    }
    state.draftReviewQueue.value = queue;
    state.draftReviewTool.value = "non-cs1";
    return true;
}

/** Preloads other CS1 results, wrapping after the final item. */
function preloadCs1ReviewQueue(
    state: SourceManagerState,
    sourceId: string,
): PreloadedCheckerSource[] {
    const results = state.cs1ToolSources.value;
    const currentIndex = results.findIndex(
        (result) => result.source.id === sourceId,
    );
    if (currentIndex < 0) {
        return [];
    }
    const ordered = [
        ...results.slice(currentIndex + 1),
        ...results.slice(0, currentIndex),
    ];
    return ordered.flatMap(function preload(result) {
        return preloadCheckerSource(state, result.source, result.html);
    });
}

/** Preloads other non-CS1 results, wrapping after the final item. */
function preloadNonCs1ReviewQueue(
    state: SourceManagerState,
    sourceId: string,
): PreloadedCheckerSource[] {
    const sources = state.nonCs1Sources.value;
    const currentIndex = sources.findIndex((source) => source.id === sourceId);
    if (currentIndex < 0) {
        return [];
    }
    const ordered = [
        ...sources.slice(currentIndex + 1),
        ...sources.slice(0, currentIndex),
    ];
    return ordered.flatMap(function preload(source) {
        return preloadCheckerSource(state, source);
    });
}

/** Captures one check result by stable source-list position. */
function preloadCheckerSource(
    state: SourceManagerState,
    source: ExistingSource,
    checkedHtml: string = "",
): PreloadedCheckerSource[] {
    const sourceIndex = state.existingSources.value.findIndex(
        (candidate) => candidate.id === source.id,
    );
    return sourceIndex < 0 ? [] : [{ checkedHtml, sourceIndex }];
}

/** Returns whether a row supports one-click date filling. */
function isDateAutofillParameter(name: string): boolean {
    return isAccessDateParameter(name) || isArchiveDateParameter(name);
}

function isAccessDateParameter(name: string): boolean {
    return ["access-date", "accessdate"].includes(normalizeDraftName(name));
}

function isArchiveDateParameter(name: string): boolean {
    return ["archive-date", "archivedate"].includes(normalizeDraftName(name));
}

function getDateAutofillTooltip(name: string): string {
    return isAccessDateParameter(name)
        ? msg("draft.fillToday")
        : msg("draft.fillArchiveDate");
}

/** Checks whether an organization field can become a local link. */
function isLinkableDraftParameter(name: string): boolean {
    return [
        "agency",
        "department",
        "institution",
        "journal",
        "magazine",
        "newspaper",
        "organization",
        "periodical",
        "publisher",
        "website",
        "work",
    ].includes(normalizeDraftName(name));
}

/** Fills today's date or derives archive fields from an archive URL. */
async function autofillDraftDate(
    context: SourceManagerActionContext,
    index: number,
): Promise<void> {
    const { state, toast } = context;
    const draft = state.draft.value;
    const row = draft?.rows[index];
    if (draft == null || row == null || state.loading.value) {
        return;
    }
    if (isAccessDateParameter(row.name)) {
        row.value = formatLocalIsoDate(new Date());
        toast.success(msg("feedback.accessDateFilled"), {
            autoDismiss: true,
        });
        return;
    }
    await autofillArchiveDate(context, draft, row);
}

/** Resolves archive fields from an available snapshot. */
async function autofillArchiveDate(
    context: SourceManagerActionContext,
    draft: SourceDraft,
    row: SourceDraftRow,
): Promise<void> {
    const { state, toast } = context;
    state.loading.value = true;
    try {
        const archiveUrl = getDraftRowValue(draft, "archive-url");
        const parsed = parseSourceUrl(archiveUrl);
        if (parsed?.archiveDate) {
            row.value = parsed.archiveDate;
            toast.success(msg("feedback.archiveDateFilled"), {
                autoDismiss: true,
            });
            return;
        }
        const sourceUrl = getDraftRowValue(draft, "url");
        const archive = await context.fetchAvailableArchive(sourceUrl);
        if (!isCurrentDraftRow(state, draft, row)) {
            return;
        }
        if (archive == null) {
            toast.error(msg("draft.noArchiveSnapshot"), {
                autoDismiss: true,
            });
            return;
        }
        setSourceDraftValue(draft, "archive-url", archive.archiveUrl);
        row.value = archive.archiveDate;
        toast.success(msg("feedback.archiveFieldsFilled"), {
            autoDismiss: true,
        });
    } catch {
        reportArchiveCheckFailure(context, draft, row);
    } finally {
        state.loading.value = false;
    }
}

/** Validates and redirect-normalizes an organization wikilink. */
async function linkDraftOrganization(
    context: SourceManagerActionContext,
    index: number,
): Promise<void> {
    const { state, toast } = context;
    const draft = state.draft.value;
    const row = draft?.rows[index];
    if (draft == null || row == null || state.loading.value) {
        return;
    }
    const enteredValue = row.value;
    state.loading.value = true;
    try {
        const linkedValue = await context.resolveWikiLink(enteredValue);
        if (
            !isCurrentDraftRow(state, draft, row) ||
            row.value !== enteredValue
        ) {
            return;
        }
        row.value = linkedValue;
        toast.success(msg("feedback.articleLinkChecked"), {
            autoDismiss: true,
        });
    } catch {
        if (isCurrentDraftRow(state, draft, row)) {
            toast.error(msg("feedback.linkCheckFailed"), {
                autoDismiss: true,
            });
        }
    } finally {
        state.loading.value = false;
    }
}

/** Reports an archive failure only for an active draft row. */
function reportArchiveCheckFailure(
    context: SourceManagerActionContext,
    draft: SourceDraft,
    row: SourceDraftRow,
): void {
    if (isCurrentDraftRow(context.state, draft, row)) {
        context.toast.error(msg("feedback.archiveCheckFailed"), {
            autoDismiss: true,
        });
    }
}

/** Checks whether an awaited action still targets this draft row. */
function isCurrentDraftRow(
    state: SourceManagerState,
    draft: SourceDraft,
    row: SourceDraftRow,
): boolean {
    return state.draft.value === draft && draft.rows.includes(row);
}

/** Gets one case-insensitive draft row value. */
function getDraftRowValue(draft: SourceDraft, name: string): string {
    const normalized = normalizeDraftName(name);
    return (
        draft.rows.find((row) => normalizeDraftName(row.name) === normalized)
            ?.value ?? ""
    );
}

function normalizeDraftName(name: string): string {
    return name.trim().toLocaleLowerCase("en-US");
}

/** Formats today using the user's local calendar date. */
function formatLocalIsoDate(date: Date): string {
    const year = String(date.getFullYear()).padStart(4, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

/** Validates, saves, and consistency-checks one new source. */
async function saveNewSourceDraft(
    context: SourceManagerActionContext,
): Promise<void> {
    if (!(await validateNewSourceWithCs1(context))) {
        return;
    }
    if (!saveSourceDraft(context, true)) {
        return;
    }
    context.state.activeLookupTab.value = "tools";
    refreshAndOpenAnalysisTool(context.state);
}

/** Uses installed CS1 modules as a new-source save gate. */
async function validateNewSourceWithCs1(
    context: SourceManagerActionContext,
): Promise<boolean> {
    const { cs1Review, state, toast } = context;
    const draft = state.draft.value;
    if (draft == null || state.loading.value) {
        return false;
    }
    clearCheckedCs1Errors(state);
    if (state.draftCellErrors.value.size > 0) {
        state.error.value = msg("draft.invalidSummary");
        return false;
    }
    if (!["enwiki", "zhwiki"].includes(getCurrentWikiId())) {
        return true;
    }
    state.draftCs1Checking.value = true;
    state.loading.value = true;
    try {
        const result = await checkNewSourceDraft(cs1Review, draft);
        if (state.draft.value !== draft) {
            return false;
        }
        const issueCount = applyNewSourceCs1Result(state, result);
        if (issueCount === 0) {
            return true;
        }
        toast.warning(formatNewSourceCs1IssueMessage(issueCount), {
            autoDismiss: true,
        });
        return false;
    } catch {
        toast.error(msg("checker.unavailable"), { autoDismiss: true });
        return false;
    } finally {
        state.draftCs1Checking.value = false;
        state.loading.value = false;
    }
}

/** Runs the injected new-source checker for the current article. */
function checkNewSourceDraft(
    cs1Review: Cs1ReviewWorkflow,
    draft: SourceDraft,
): Promise<Cs1ValidationResult> {
    return cs1Review.checkNewSourceDraft(draft, getCurrentCs1CheckOptions());
}

function formatNewSourceCs1IssueMessage(issueCount: number): string {
    return formatPluralMessage(
        issueCount,
        "feedback.newSourceCs1IssueOne",
        "feedback.newSourceCs1IssueMany",
    );
}

function applyNewSourceCs1Result(
    state: SourceManagerState,
    result: Cs1ValidationResult,
): number {
    state.checkedCs1CellErrors.value = result.cellErrors;
    state.checkedCs1Source.value = getCurrentCs1DraftFingerprint(state);
    state.warning.value = result.messages.join("\n");
    return result.issueCount;
}

/** Validates and applies the current source draft. */
function saveSourceDraft(
    context: SourceManagerActionContext,
    closeAfterSave: boolean,
): boolean {
    const { editor, state, toast } = context;
    if (state.loading.value) {
        return false;
    }
    const writeResult = writeSourceDraft(context);
    if (writeResult == null) {
        return false;
    }
    const message = closeAfterSave
        ? msg("feedback.sourceSaved")
        : formatAppliedSourceFeedback(writeResult.changeSummary);
    toast.success(message, { autoDismiss: true });
    refreshExistingSources(editor, state);
    if (!closeAfterSave) {
        return finishAppliedSourceDraft(state, writeResult);
    }
    resetSourceDraft(state);
    state.activeLookupTab.value = "view";
    return true;
}

function finishAppliedSourceDraft(
    state: SourceManagerState,
    writeResult: SourceDraftWriteResult,
): boolean {
    if (rebindAppliedDraft(state, writeResult)) {
        return true;
    }
    const error = state.error.value;
    resetSourceDraft(state);
    state.error.value = error;
    state.activeLookupTab.value = "view";
    return false;
}

/** Rechecks an applied CS1 review while keeping its draft open. */
async function recheckAppliedCs1Draft(
    context: SourceManagerActionContext,
): Promise<void> {
    const { state, toast } = context;
    const draft = state.draft.value;
    const source = state.editingSource.value;
    if (draft == null || source == null || state.loading.value) {
        return;
    }
    clearCheckedCs1Errors(state);
    state.warning.value = "";
    state.draftCs1Checking.value = true;
    state.loading.value = true;
    try {
        const review = await context.cs1Review.checkExistingSourceDraft(
            draft,
            source,
            getCurrentCs1CheckOptions(),
        );
        if (!isCurrentAppliedDraft(state, draft, source)) {
            return;
        }
        if (applyCs1DraftRecheckResult(context, source, review) === 0) {
            toast.success(msg("checker.noIssues"), { autoDismiss: true });
        }
    } catch {
        if (isCurrentAppliedDraft(state, draft, source)) {
            toast.error(msg("checker.unavailable"), { autoDismiss: true });
        }
    } finally {
        state.draftCs1Checking.value = false;
        state.loading.value = false;
    }
}

function applyCs1DraftRecheckResult(
    context: SourceManagerActionContext,
    source: ExistingSource,
    review: Cs1ExistingSourceReview,
): number {
    const { state } = context;
    const { checkedSource, validation } = review;
    const result = validation;
    state.checkedCs1CellErrors.value = result.cellErrors;
    state.checkedCs1Source.value = getCurrentCs1DraftFingerprint(state);
    state.warning.value = result.messages.join("\n");
    updateAppliedCs1BatchResult(context, source, checkedSource);
    return result.issueCount;
}

function isCurrentAppliedDraft(
    state: SourceManagerState,
    draft: SourceDraft,
    source: ExistingSource,
): boolean {
    return (
        state.draft.value === draft &&
        state.editingSource.value?.id === source.id
    );
}

/** Replaces the applied source's stale open-result entry. */
function updateAppliedCs1BatchResult(
    context: SourceManagerActionContext,
    source: ExistingSource,
    checked: Cs1CheckedSource | undefined,
): void {
    const { state } = context;
    syncCs1BatchResults(context, state.draftReviewQueue.value);
    if (checked == null) {
        return;
    }
    const sourceOrder = new Map(
        state.existingSources.value.map((candidate, index) => [
            candidate.id,
            index,
        ]),
    );
    state.cs1ToolSources.value = [
        ...state.cs1ToolSources.value,
        { ...checked, source },
    ].toSorted(
        (left, right) =>
            (sourceOrder.get(left.source.id) ?? 0) -
            (sourceOrder.get(right.source.id) ?? 0),
    );
}

/** Saves a checker result and returns to its result popup. */
function saveReviewedDraft(context: SourceManagerActionContext): void {
    const { editor, state, toast } = context;
    const reviewTool = state.draftReviewTool.value;
    const reviewQueue = state.draftReviewQueue.value;
    if (state.loading.value || reviewTool == null) {
        return;
    }
    const writeResult = writeSourceDraft(context);
    if (writeResult == null) {
        return;
    }
    refreshExistingSources(editor, state);
    if (reviewTool === "cs1") {
        syncCs1BatchResults(context, reviewQueue);
    }
    resetSourceDraft(state);
    toast.success(msg("feedback.sourceSaved"), { autoDismiss: true });
    showCheckerResults(state, reviewTool);
}

/** Keeps unreviewed CS1 results from the original batch request. */
function syncCs1BatchResults(
    context: SourceManagerActionContext,
    queue: PreloadedCheckerSource[],
): void {
    const { cs1Review, state } = context;
    state.cs1ToolSources.value = queue
        .toSorted((left, right) => left.sourceIndex - right.sourceIndex)
        .flatMap(function restoreResult(preloaded) {
            const source = state.existingSources.value[preloaded.sourceIndex];
            if (source == null || source.status === "non-standard") {
                return [];
            }
            const checked = cs1Review.restoreCheckedSource(
                source,
                preloaded.checkedHtml,
            );
            return checked == null ? [] : [checked];
        });
    if (state.cs1ToolSources.value.length === 0) {
        state.cs1ToolMessages.value = [];
    }
}

/** Opens refreshed checker results over the manager lookup view. */
function showCheckerResults(
    state: SourceManagerState,
    reviewTool: SourceCheckerTool,
): void {
    state.activeLookupTab.value = "tools";
    state.toolPopup.value = reviewTool;
    state.toolPopupOpen.value = true;
}

/** Validates and writes the current source draft. */
function writeSourceDraft(
    context: SourceManagerActionContext,
): SourceDraftWriteResult | null {
    const { editor, state } = context;
    const draft = state.draft.value;
    if (draft == null) {
        return null;
    }
    const beforeText = editor.read();
    const previousSource = state.editingSource.value;
    try {
        if (state.autoScriptTitle.value) {
            moveSourceDraftTitleToScriptTitle(draft, getCurrentWikiId());
        }
        if (state.draftCellErrors.value.size > 0) {
            state.error.value = msg("draft.invalidSummary");
            return null;
        }
        validateDraft(draft);
        if (state.editingSource.value == null) {
            insertNewSource(editor, draft, state.citationLayout.value);
        } else {
            updateExistingSource(editor, state, draft);
        }
        clearAnalysisUndo(state);
    } catch (error) {
        state.error.value = formatError(error);
        return null;
    }
    const afterText = editor.read();
    return finishSourceDraftWrite(
        state,
        draft,
        previousSource,
        beforeText,
        afterText,
    );
}

function finishSourceDraftWrite(
    state: SourceManagerState,
    draft: SourceDraft,
    previousSource: ExistingSource | null,
    beforeText: string,
    afterText: string,
): SourceDraftWriteResult {
    recordSessionWrite(state, beforeText, afterText);
    return {
        changePosition: findFirstDifference(beforeText, afterText),
        changeSummary: summarizeSourceDraftChange(
            previousSource?.draft ?? null,
            draft,
            beforeText !== afterText,
        ),
        previousSource,
    };
}

/** Anchors an applied draft to its refreshed source definition. */
function rebindAppliedDraft(
    state: SourceManagerState,
    writeResult: SourceDraftWriteResult,
): boolean {
    const changedSource = state.existingSources.value.find(
        function containsChange(source) {
            return (
                writeResult.changePosition >= source.referenceStart &&
                writeResult.changePosition < source.referenceEnd
            );
        },
    );
    const savedSource =
        changedSource ??
        findRefreshedSource(state, writeResult.previousSource);
    if (savedSource == null) {
        state.error.value = msg("lookup.sourceUnavailable");
        return false;
    }
    clearCheckedCs1Errors(state);
    state.editingSource.value = savedSource;
    state.error.value = "";
    state.warning.value = "";
    return true;
}

/** Finds a named source after a no-op write. */
function findRefreshedSource(
    state: SourceManagerState,
    previousSource: ExistingSource | null,
): ExistingSource | null {
    if (previousSource == null) {
        return null;
    }
    const matches = state.existingSources.value.filter(
        function matchesPreviousSource(source) {
            return (
                source.group === previousSource.group &&
                source.referenceName === previousSource.referenceName
            );
        },
    );
    matches.sort(function compareDistance(left, right) {
        return (
            Math.abs(left.templateStart - previousSource.templateStart) -
            Math.abs(right.templateStart - previousSource.templateStart)
        );
    });
    return matches[0] ?? null;
}

function summarizeSourceDraftChange(
    previous: SourceDraft | null,
    current: SourceDraft,
    textChanged: boolean,
): SourceDraftChangeSummary {
    const before = listDraftParameterValues(previous);
    const after = listDraftParameterValues(current);
    return {
        added: [...after.keys()].filter((name) => !before.has(name)),
        created: previous == null,
        fromTemplate: previous?.template ?? "",
        removed: [...before.keys()].filter((name) => !after.has(name)),
        textChanged,
        toTemplate: current.template,
        updated: [...after].flatMap(([name, value]) =>
            before.has(name) && before.get(name) !== value ? [name] : [],
        ),
    };
}

function listDraftParameterValues(
    draft: SourceDraft | null,
): Map<string, string> {
    if (draft == null) {
        return new Map();
    }
    return new Map(
        draft.rows.flatMap(function getPopulatedRow(row) {
            const values = [row.value, row.alias, row.directive];
            return values.every((value) => value.trim() === "")
                ? []
                : [
                      [
                          normalizeDraftName(row.name),
                          JSON.stringify(values),
                      ] as const,
                  ];
        }),
    );
}

function formatAppliedSourceFeedback(
    summary: SourceDraftChangeSummary,
): string {
    if (summary.created) {
        return msg("feedback.sourceAppliedCreated");
    }
    const changes = listAppliedSourceChanges(summary);
    if (changes.length === 0) {
        return msg(
            summary.textChanged
                ? "feedback.sourceAppliedReordered"
                : "feedback.sourceAppliedNoChanges",
        );
    }
    return msg("feedback.sourceApplied", { changes: changes.join("; ") });
}

function listAppliedSourceChanges(
    summary: SourceDraftChangeSummary,
): string[] {
    const changes: string[] = [];
    if (
        normalizeDraftName(summary.fromTemplate) !==
        normalizeDraftName(summary.toTemplate)
    ) {
        changes.push(
            msg("feedback.sourceTemplateChanged", {
                after: getCanonicalTemplateName(summary.toTemplate),
                before: getCanonicalTemplateName(summary.fromTemplate),
            }),
        );
    }
    appendParameterChange(
        changes,
        summary.added,
        "feedback.sourceParametersAdded",
    );
    appendParameterChange(
        changes,
        summary.updated,
        "feedback.sourceParametersUpdated",
    );
    appendParameterChange(
        changes,
        summary.removed,
        "feedback.sourceParametersRemoved",
    );
    return changes;
}

function appendParameterChange(
    changes: string[],
    parameters: string[],
    messageId: MessageId,
): void {
    if (parameters.length > 0) {
        changes.push(msg(messageId, { parameters: parameters.join(", ") }));
    }
}

function findFirstDifference(beforeText: string, afterText: string): number {
    const limit = Math.min(beforeText.length, afterText.length);
    for (let index = 0; index < limit; index += 1) {
        if (beforeText[index] !== afterText[index]) {
            return index;
        }
    }
    return limit;
}

/** Clears the draft view without changing the source-list state. */
function resetSourceDraft(state: SourceManagerState): void {
    state.dismissedAliasSuggestions.value = new Set();
    state.parameterAliasDialogOpen.value = false;
    state.parameterAliasDialogDirectives.value = [];
    state.parameterAliasDialogRowIndex.value = null;
    state.parameterAliasDialogValue.value = "";
    state.draft.value = null;
    state.draftReviewQueue.value = [];
    state.draftReviewTool.value = null;
    state.editingSource.value = null;
    state.error.value = "";
    state.draftPopupOpen.value = false;
    state.warning.value = "";
}

/** Applies a selected citation type without discarding entered rows. */
function updateDraftTemplate(
    state: SourceManagerState,
    template: string | null,
): void {
    const draft = state.draft.value;
    if (draft != null && template != null) {
        const changed = changeSourceDraftTemplate(draft, template);
        ensureNextAuthorDraftRows(changed);
        state.draft.value = changed;
    }
}

/** Validates user-added names and aliases. */
function validateDraft(draft: SourceDraft): void {
    const empty = draft.rows.every((row) => row.value.trim() === "");
    if (empty) {
        throw new Error(msg("draft.emptyCitation"));
    }
    for (const row of draft.rows) {
        const hasContent = hasDraftRowUserContent(row);
        if (row.name.trim() === "" && hasContent) {
            throw new Error(msg("draft.missingParameterName"));
        }
        if (hasDraftAliasWithoutValue(row)) {
            throw new Error(
                msg("draft.aliasNeedsValue", {
                    parameter: row.name,
                }),
            );
        }
    }
}

/** Checks whether an entered row has a visible value or alias. */
function hasDraftRowUserContent(row: SourceDraftRow): boolean {
    return row.value.trim() !== "" || row.alias.trim() !== "";
}

/** Checks whether a row has an alias that cannot annotate a value. */
function hasDraftAliasWithoutValue(row: SourceDraftRow): boolean {
    return row.alias.trim() !== "" && row.value.trim() === "";
}

/** Creates URL, manual-source, and existing-source tab actions. */
function createLookupActions(
    context: SourceManagerActionContext,
): Record<string, unknown> {
    async function resolveEnteredSource(entered?: string): Promise<void> {
        await resolveSourceInput(context, entered);
    }
    function editListedSource(sourceId: string): void {
        openExistingSourceWhenIdle(context.state, sourceId);
    }
    function createManualSource(): void {
        openManualSourceWhenIdle(context.state);
    }
    function insertListedSource(sourceId: string): void {
        insertListedSourceWhenIdle(context, sourceId);
    }
    return {
        createManualSource,
        editListedSource,
        insertListedSource,
        onSourcePaste(event: ClipboardEvent): void {
            handleSourcePaste(context, event);
        },
        resolveEnteredSource,
        selectSourceSection(
            selector: SourceSectionSelector,
            selected: string | number,
        ): void {
            selectSourceSectionOption(context.state, selector, selected);
        },
    };
}

function selectSourceSectionOption(
    state: SourceManagerState,
    selector: SourceSectionSelector,
    selected: string | number,
): void {
    const entered = String(selected);
    const option = selector.menuItems.find(
        (item) =>
            item.value === entered ||
            item.label === entered ||
            item.sectionId === entered,
    );
    if (option != null) {
        updateSourceSectionSelection(state, selector.level, option.sectionId);
    }
}

/** Resolves a recognizable pasted source immediately. */
function handleSourcePaste(
    context: SourceManagerActionContext,
    event: ClipboardEvent,
): void {
    if (context.state.loading.value) {
        return;
    }
    const entered = event.clipboardData?.getData("text/plain").trim() || "";
    if (parseSourceInput(entered) == null) {
        return;
    }
    event.preventDefault();
    context.state.sourceInput.value = entered;
    void resolveSourceInput(context, entered);
}

/** Opens a manual draft only when no URL request can replace it. */
function openManualSourceWhenIdle(state: SourceManagerState): void {
    if (state.loading.value) {
        return;
    }
    const template = state.manualTemplate.value;
    if (template == null) {
        state.error.value = msg("lookup.chooseCitationType");
        return;
    }
    if (template === BASED_ON_TEMPLATE) {
        openBasedOnSource(state, state.basedOnSourceId.value);
        return;
    }
    openDraft(state, createManualSourceDraft(template));
}

/** Clones one selected citation into a new source draft. */
function openBasedOnSource(
    state: SourceManagerState,
    sourceId: string | null,
): void {
    const source =
        sourceId == null ? null : findExistingSourceById(state, sourceId);
    if (source == null || source.status === "non-standard") {
        state.error.value = msg("lookup.chooseBasedOn");
        return;
    }
    openDraft(state, cloneDraft(source.draft));
}

/** Updates one level of the hierarchical source-section filter. */
function updateSourceSectionSelection(
    state: SourceManagerState,
    level: number,
    selected: string | number,
): void {
    const value = String(selected);
    if (value === "") {
        state.sourceSectionPath.value =
            level === 0 ? [] : state.sourceSectionPath.value.slice(0, level);
        return;
    }
    state.sourceSectionPath.value = [
        ...state.sourceSectionPath.value.slice(0, level),
        value,
    ];
}

/** Opens an existing draft only when no URL request can replace it. */
function openExistingSourceWhenIdle(
    state: SourceManagerState,
    sourceId: string,
): void {
    if (!state.loading.value) {
        openExistingSource(state, sourceId);
    }
}

/** Inserts a listed source only when URL lookup is idle. */
function insertListedSourceWhenIdle(
    context: SourceManagerActionContext,
    sourceId: string,
): void {
    if (!context.state.loading.value) {
        insertListedExistingSource(context, sourceId);
    }
}

/** Inserts one source chosen directly from the existing-source list. */
function insertListedExistingSource(
    context: SourceManagerActionContext,
    sourceId: string,
): void {
    const source = findExistingSourceById(context.state, sourceId);
    if (source == null) {
        context.state.error.value = msg("lookup.sourceUnavailable");
        return;
    }
    clearAnalysisUndo(context.state);
    insertExistingSource(
        context.editor,
        source,
        context.state.referenceStyle.value,
    );
    context.toast.success(msg("lookup.existingInserted"), {
        autoDismiss: true,
    });
    finishSourceManager(context);
}

/** Resolves a source or immediately inserts its existing ref. */
async function resolveSourceInput(
    context: SourceManagerActionContext,
    entered?: string,
): Promise<void> {
    const { editor, state } = context;
    if (state.loading.value) {
        return;
    }
    const value = entered ?? state.sourceInput.value;
    const parsed = parseSourceInput(value);
    if (parsed == null) {
        state.error.value = msg("lookup.sourceRequired");
        return;
    }
    state.sourceInput.value = value.trim();
    state.error.value = "";
    state.warning.value = "";
    const matches =
        parsed.originalUrl === ""
            ? []
            : findExistingSources(editor.read(), value);
    const existing = chooseAutomaticSource(matches);
    if (existing != null) {
        clearAnalysisUndo(state);
        insertExistingSource(editor, existing, state.referenceStyle.value);
        context.toast.success(msg("lookup.existingInserted"), {
            autoDismiss: true,
        });
        finishSourceManager(context);
        return;
    }
    if (matches.length > 0) {
        state.activeLookupTab.value = "view";
        state.warning.value = msg("lookup.ambiguousSource");
        return;
    }
    await loadNewSourceDraft(context, parsed);
}

/** Chooses an unambiguous reusable match for immediate insertion. */
function chooseAutomaticSource(
    matches: ExistingSource[],
): ExistingSource | null {
    const groups = new Set(matches.map((source) => source.group));
    if (groups.size > 1) {
        return null;
    }
    const named = matches.find((source) => source.referenceName !== "");
    return named ?? matches[0] ?? null;
}

/** Opens one listed existing citation as a cloned editable draft. */
function openExistingSource(
    state: SourceManagerState,
    sourceId: string,
): void {
    const source = findExistingSourceById(state, sourceId);
    if (source == null) {
        state.error.value = msg("lookup.sourceUnavailable");
        return;
    }
    clearCheckedCs1Errors(state);
    state.draftReviewTool.value = null;
    const draft = cloneDraft(source.draft);
    ensureNextAuthorDraftRows(draft);
    state.dismissedAliasSuggestions.value = new Set();
    state.editingSource.value = source;
    state.draft.value = draft;
    state.error.value = "";
    state.warning.value =
        source.status === "non-standard" ? msg("lookup.replaceWarning") : "";
    state.draftPopupOpen.value = true;
    scheduleVisibleTextAreaAutosize();
}

/** Gets one existing source by its stable list identifier. */
function findExistingSourceById(
    state: SourceManagerState,
    sourceId: string,
): ExistingSource | null {
    return (
        state.existingSources.value.find(
            (candidate) => candidate.id === sourceId,
        ) ?? null
    );
}

/** Fetches Citoid and archive data for a new source. */
async function loadNewSourceDraft(
    context: SourceManagerActionContext,
    parsed: ParsedSourceInput,
): Promise<void> {
    const { state } = context;
    state.loading.value = true;
    const archiveSeed = createArchiveSeed(parsed);
    try {
        const metadata = await context.resolveSourceMetadata(
            parsed.search,
            archiveSeed,
        );
        const draft = parseSourceDraft(metadata.citeTemplate);
        const liveOriginal =
            parsed.originalUrl !== "" &&
            archiveSeed == null &&
            metadata.metadataError === "";
        applyResolvedMetadata(draft, metadata, liveOriginal);
        const warnings = buildMetadataWarnings(metadata);
        state.warning.value = warnings.join(" ");
        openDraft(state, draft, warnings.length > 0);
    } catch (error) {
        const draft = createLookupFallbackDraft(parsed);
        setSourceDraftValue(draft, "archive-url", parsed.archiveUrl);
        setSourceDraftValue(draft, "archive-date", parsed.archiveDate);
        state.warning.value = formatMetadataFailure(error, formatError);
        openDraft(state, draft, true);
    } finally {
        state.loading.value = false;
    }
}

/** Opens a source draft without replacing the source-list view. */
function openDraft(
    state: SourceManagerState,
    draft: SourceDraft,
    preserveWarning: boolean = false,
): void {
    ensureNextAuthorDraftRows(draft);
    clearCheckedCs1Errors(state);
    state.dismissedAliasSuggestions.value = new Set();
    state.draft.value = draft;
    state.draftReviewTool.value = null;
    state.editingSource.value = null;
    state.error.value = "";
    if (!preserveWarning) {
        state.warning.value = "";
    }
    state.draftPopupOpen.value = true;
    scheduleVisibleTextAreaAutosize();
}

/** Re-reads source definitions and filters after an in-dialog save. */
function refreshExistingSources(
    editor: editBox.EditBox,
    state: SourceManagerState,
): void {
    const text = editor.read();
    const sources = listExistingSources(text);
    state.existingSources.value = sources;
    const sections = listExistingSourceSections(text, sources);
    state.existingSourceSections.value = sections;
    state.sourceSectionPath.value = retainExistingSectionPath(
        state.sourceSectionPath.value,
        sections,
    );
}

function retainExistingSectionPath(
    path: string[],
    sections: SourceSection[],
): string[] {
    const available = new Set(sections.map((section) => section.id));
    const retained = [];
    for (const sectionId of path) {
        if (!available.has(sectionId)) {
            break;
        }
        retained.push(sectionId);
    }
    return retained;
}

/** Inserts a reuse or anonymous full ref at the active selection. */
function insertExistingSource(
    editor: editBox.EditBox,
    source: ExistingSource,
    style: ReferenceStyle,
): void {
    const compact = style === "r";
    editor.replaceSelection(buildExistingSourceReference(source, compact));
}

/** Inserts a newly built full reference at the active selection. */
function insertNewSource(
    editor: editBox.EditBox,
    draft: SourceDraft,
    layout: CitationLayout,
): void {
    const citation = serializeSourceDraft(draft, layout);
    editor.replaceSelection(`<ref>${citation}</ref>`);
}

/** Updates one citation while preserving its current layout. */
function updateExistingSource(
    editor: editBox.EditBox,
    state: SourceManagerState,
    draft: SourceDraft,
): void {
    const current = editor.read();
    const source = state.editingSource.value as ExistingSource;
    const layout =
        source.status === "non-standard"
            ? state.citationLayout.value
            : detectCitationLayout(`<ref>${source.rawTemplate}</ref>`);
    const replaced = replaceExistingSource(current, source, draft, layout);
    editor.write(replaced);
}

/** Closes the modal before restoring editor focus. */
function finishSourceManager(context: SourceManagerActionContext): void {
    context.close();
    queueMicrotask(function focusEditor(): void {
        context.editor.focus();
    });
}

/** Creates a user-addable empty parameter row. */
function createBlankDraftRow(): SourceDraftRow {
    return {
        alias: "",
        directive: "",
        main: false,
        name: "",
        value: "",
    };
}

/** Clones a draft without mutating the source list. */
function cloneDraft(draft: SourceDraft): SourceDraft {
    return {
        rows: draft.rows.map((row) => ({ ...row })),
        template: draft.template,
    };
}

/** Converts a rejected value into readable UI text. */
function formatError(error: unknown): string {
    if (error instanceof StaleSourceError) {
        return msg("errors.sourceChanged");
    }
    if (error instanceof SourceParameterCollisionError) {
        return msg("errors.parameterCollision", {
            first: error.firstParameter,
            parameter: error.canonicalParameter,
            second: error.secondParameter,
        });
    }
    return error instanceof Error ? error.message : String(error);
}

/** Formats a plural message for the active interface locale. */
function formatPluralMessage(
    count: number,
    one: MessageId,
    many: MessageId,
): string {
    const id =
        new Intl.PluralRules(interfaceLocale).select(count) === "one"
            ? one
            : many;
    return msg(id, { count });
}
