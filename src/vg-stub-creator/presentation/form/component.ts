/**
 * Builds the vg-stub-creator dialog form component.
 */

import {
    completeMetadataFieldValue,
    formatArticleFormField,
    isArticleListField,
    isCompletableMetadataField,
} from "#stub/article";
import {
    hasFirstLevelFieldSeparator,
    parsePrefixedValue,
    trimFieldValue,
} from "#stub/local/form-values.ts";
import {
    createSaveProgress,
    getSaveProgressGroups,
    isSaveProgressComplete,
    updateSaveProgress,
} from "#stub/save/progress.ts";
import { sortNoteTaEntries } from "#stub/wiki";
import {
    createPreSaveGroups,
    serializePreSaveProgressGroups,
} from "#stub/ui/pre-save.ts";
import {
    ARTICLE_PARAMETER_GROUPS,
    CATEGORY_TABLE_COLUMNS,
    CITATION_TABLE_COLUMNS,
    CODEMIRROR_MODULES,
    HISTORY_EXPORT_ERROR,
    MAIN_ACTION_MENU_ITEMS,
    METADATA_TABLE_COLUMNS,
    NAME_MARKETS,
    NAVBOX_TABLE_COLUMNS,
    NOTE_TA_NAMES_SOURCE,
    NOTETA_TABLE_COLUMNS,
    PRE_SAVE_STATUS_ICONS,
    REDIRECT_TABLE_COLUMNS,
    STEAM_NAME_BUTTONS,
    STEAM_NAME_HELPER_ROW,
    STUB_TAG_TABLE_COLUMNS,
    TABLE_ACTION_ICONS,
} from "#stub/form/constants.ts";
import { createDialogTemplate } from "#stub/form/template.ts";
import { msg } from "#stub/i18n";

/**
 * Creates the Vue component definition for the Codex dialog.
 *
 * @param Vue - ResourceLoader Vue module.
 * @param options - Dialog options.
 * @param options.currentTitle - Current page title.
 * @param options.currentPageExists - Whether the current article
 * exists.
 * @param options.defaultName - Default article display title.
 * @param options.getFieldPlaceholder - Field placeholder
 * builder.
 * @param options.getProseSinographs - Prose length
 * calculator.
 * @param options.getProseWikitext - Prose wikitext preview
 * builder.
 * @param options.initialForm - Initial form values.
 * @param options.initialEnwikiLookup - Whether to lookup
 * the
 * initial enwiki title.
 * @param options.citationPrefetchDelay - Citation prefetch
 * debounce
 * delay.
 * @param options.getFieldPreview - Field wikitext preview
 * builder.
 * @param options.getHistoryEntries - Form history entry
 * provider.
 * @param options.onActivate - Tool activation handler.
 * @param options.onCategoryRowsRefresh - Category refresh
 * handler.
 * @param options.onClearHistory - Form history clear
 * handler.
 * @param options.onCreateCategoryRow - Category row factory.
 * @param options.onDeleteHistoryEntry - Form history delete
 * handler.
 * @param options.onFormChange - Form change handler.
 * @param options.onMoveTarget - New-page target opener.
 * @param options.onCheckRedirectRows - Redirect review row
 * checker.
 * @param options.onPrepareCompanyCategory - Company category
 * text
 * builder.
 * @param options.onPrepareRedirectRows - Redirect review row
 * builder.
 * @param options.onPrepareReview - Review report builder.
 * @param options.onFetchPageText - Existing page source
 * fetcher.
 * @param options.onEnwikiTitleChange - Enwiki metadata
 * lookup
 * handler.
 * @param options.onParseArticlePreview - Article preview
 * parser.
 * @param options.onParsePreview - Wikitext preview parser.
 * @param options.onPreview - Editor preview handler.
 * @param options.onPreSavePrepare - Follow-up action
 * builder.
 * @param options.onSourceUrlChange - Source URL change
 * handler.
 * @param options.onSubmit - Submit handler.
 * @param options.onSubmitHistory - Form history submit
 * handler.
 * @param options.onUpdateCategoryRowCategory - Category
 * title
 * update handler.
 * @returns Vue component options.
 */
let Vue: any;
let options: any;
let currentTitle: string;
let activeTab: any;
let form: any;
let categoryState: any;
let citationState: any;
let reviewState: any;
let companyCategoryOpen: any;
let companyCategoryState: any;
let companyCategoryLookupLoading: any;
let companyCategoryLookupSerial: any;
let pageEditOpen: any;
let pageEditState: any;
let categoryViewOpen: any;
let categoryViewState: any;
let historyEntries: any;
let historyJsonError: any;
let historyJsonEditable: any;
let historyJsonOpen: any;
let historyJsonText: any;
let historyLoading: any;
let historyOpen: any;
let mainActionMenuSelection: any;
let moveTarget: any;
let moveTargetState: any;
let moveOpen: any;
let movePreviewConfirmation: any;
let previewWithoutMoveTitle: any;
let activeCitationTab: any;
let preSaveMoveEnabled: any;
let preSaveMoveTitle: any;
let preSaveOpen: any;
let preSaveActions: any;
let preSaveGroups: any;
let preSaveProgress: any;
let preSaveProgressGroups: any;
let stubTagRows: any;
let previewOpen: any;
let previewTextArea: any;
let previewText: any;
let previewSummary: any;
let previewHtml: any;
let previewLoading: any;
let previewLoadingMessage: any;
let previewSubmitted: any;
let pageEditTextArea: any;
let enwikiLookupLoading: any;
let enwikiLookupSerial: any;
let enwikiMetadata: any;
let fetchedSteamNameRows: any;
let steamUrl: any;
let sourceFetchState: any;
let tableActionTooltip: any;
let tableActionTooltipRef: any;
let open: any;
let sourceEditors: Map<any, any>;
let sourceEditorLoads: Set<any>;
let openedReviewLinkUrls: Set<any>;
let componentMounted: boolean;
let navboxRowsPrepared: boolean;
let queueCitationPrefetch: (...args: any[]) => any;
const pageEditTextBinding = {
    get value() {
        return pageEditState.text;
    },
    set value(text) {
        pageEditState.text = text;
    },
};

interface CodeMirrorEditor {
    destroy?: () => void;
    initialize?: () => void;
    toTextArea?: () => void;
}

/**
 * Creates the Vue component definition for the dialog.
 *
 * @param VueModule - Vue module value.
 * @param dialogOptions - Dialog options value.
 * @returns The Vue component definition for the dialog.
 */
export function createDialogComponent(
    VueModule: any,
    dialogOptions: any,
): any {
    Vue = VueModule;
    options = dialogOptions;
    initializeDialogState();
    initializeDialogBehavior();

    return createComponentDefinition();
}

/**
 * Initializes primary form and review state.
 */
function initializePrimaryState(): void {
    currentTitle = trimFieldValue(options.currentTitle) || options.defaultName;
    activeTab = Vue.ref(ARTICLE_PARAMETER_GROUPS[0].key);
    form = Vue.reactive(createFormValues());
    categoryState = Vue.reactive(createLoadingState());
    citationState = Vue.reactive(createLoadingState());
    reviewState = Vue.reactive(createLoadingState());
    companyCategoryOpen = Vue.ref(false);
    companyCategoryState = Vue.reactive(createCompanyCategoryState());
    companyCategoryLookupLoading = Vue.ref(false);
    companyCategoryLookupSerial = Vue.ref(0);
    pageEditOpen = Vue.ref(false);
    pageEditState = Vue.reactive(createPageEditState());
    categoryViewOpen = Vue.ref(false);
    categoryViewState = Vue.reactive({ title: "", url: "" });
}

/**
 * Initializes history, move, and pre-save state.
 */
function initializeActionState(): void {
    historyEntries = Vue.ref(options.getHistoryEntries());
    historyJsonError = Vue.ref("");
    historyJsonEditable = Vue.ref(false);
    historyJsonOpen = Vue.ref(false);
    historyJsonText = Vue.ref("");
    historyLoading = Vue.ref(false);
    historyOpen = Vue.ref(false);
    mainActionMenuSelection = Vue.ref(null);
    moveTarget = Vue.ref(currentTitle);
    moveTargetState = Vue.reactive(createMoveTargetState());
    moveOpen = Vue.ref(false);
    movePreviewConfirmation = Vue.ref(false);
    previewWithoutMoveTitle = Vue.ref("");
    activeCitationTab = Vue.ref("");
    preSaveMoveEnabled = Vue.ref(false);
    preSaveMoveTitle = Vue.ref(currentTitle);
    preSaveOpen = Vue.ref(false);
    preSaveActions = Vue.reactive([]);
    preSaveGroups = Vue.computed(getCurrentPreSaveGroups);
    preSaveProgress = Vue.ref(null);
    preSaveProgressGroups = Vue.computed(getCurrentProgressGroups);
}

/**
 * Initializes preview, source, and metadata state.
 */
function initializePreviewState(): void {
    stubTagRows = Vue.computed(() => form.stubTagRows || []);
    previewOpen = Vue.ref(false);
    previewTextArea = Vue.ref(null);
    previewText = Vue.ref("");
    previewSummary = Vue.ref("");
    previewHtml = Vue.ref("");
    previewLoading = Vue.ref(false);
    previewLoadingMessage = Vue.ref(msg("preview.preparing"));
    previewSubmitted = Vue.ref(false);
    pageEditTextArea = Vue.ref(null);
    enwikiLookupLoading = Vue.ref(false);
    enwikiLookupSerial = Vue.ref(0);
    enwikiMetadata = Vue.reactive(createBlankEnwikiMetadata());
    fetchedSteamNameRows = Vue.ref([]);
    steamUrl = Vue.ref("");
    sourceFetchState = Vue.reactive(createLoadingState());
    tableActionTooltip = Vue.reactive(createTableActionTooltip());
    tableActionTooltipRef = Vue.ref(null);
    open = Vue.ref(options.initialOpen === true);
}

/**
 * Initializes all mutable dialog state.
 */
function initializeDialogState(): void {
    initializePrimaryState();
    initializeActionState();
    initializePreviewState();
    sourceEditors = new Map();
    sourceEditorLoads = new Set();
    openedReviewLinkUrls = new Set();
    componentMounted = true;
    queueCitationPrefetch = createCitationPrefetchQueue(options);

    if (options.initialForm != null) {
        replaceFormValues(form, options.initialForm);
    }

    navboxRowsPrepared = hasPreparedNavboxRows(form);
    syncPageNameFields();
    syncGeneratedNameNoteTaRow(form);
}

/**
 * Registers dialog watchers and external controls.
 */
function initializeDialogBehavior(): void {
    watchFormChanges();
    watchActiveTab();
    watchPreviewEditor();
    watchPageEditEditor();
    registerUnmountHandler();
    registerDialogGlobal();

    if (options.initialOpen === true) {
        options.onActivate();
    }

    if (shouldLoadInitialEnwikiMetadata()) {
        refreshEnwikiMetadata();
    }
}

/**
 * Creates a standard loading state object.
 *
 * @returns A standard loading state object.
 */
function createLoadingState(): any {
    return { error: "", loading: false };
}

/**
 * Creates company-category dialog state.
 *
 * @returns Company-category dialog state.
 */
function createCompanyCategoryState(): any {
    const result = {
        category: "",
        company: "",
        englishName: "",
        error: "",
        loading: false,
        pending: false,
        text: "",
        wikidataId: "",
    };
    return result;
}

/**
 * Creates page-edit dialog state.
 *
 * @returns Page-edit dialog state.
 */
function createPageEditState(): any {
    const result = {
        create: false,
        company: "",
        englishName: "",
        error: "",
        html: "",
        kind: "",
        loading: false,
        pending: false,
        previousStatus: "",
        row: null,
        text: "",
        title: "",
    };
    return result;
}

/**
 * Creates move-target lookup state.
 *
 * @returns Move-target lookup state.
 */
function createMoveTargetState(): any {
    return { checkedTitle: "", exists: false, loading: false };
}

/**
 * Creates table-action tooltip state.
 *
 * @returns Table-action tooltip state.
 */
function createTableActionTooltip(): any {
    const result = {
        label: "",
        style: { left: "0", top: "0" },
        visible: false,
    };
    return result;
}

/**
 * Gets current grouped pre-save actions.
 *
 * @returns Current grouped pre-save actions.
 */
function getCurrentPreSaveGroups(): any {
    return createPreSaveGroups(preSaveActions, form);
}

/**
 * Gets current save progress groups.
 *
 * @returns Current save progress groups.
 */
function getCurrentProgressGroups(): any {
    return getSaveProgressGroups(preSaveProgress.value);
}

/**
 * Watches form mutations and queues dependent work.
 */
function watchFormChanges(): void {
    Vue.watch(
        form,
        function callback(currentForm: unknown) {
            syncGeneratedNameNoteTaRow(currentForm);
            options.onFormChange(currentForm);
            queueCitationPrefetch(currentForm);
        },
        { deep: true },
    );
    queueCitationPrefetch(form);
}

/**
 * Watches tab changes that require refreshed data.
 */
function watchActiveTab(): void {
    Vue.watch(activeTab, function callback(tab: string) {
        if (tab === "review") {
            refreshReview();
        }

        if (tab === "references") {
            refreshCitationRows();
        }
    });
}

/**
 * Watches the article preview editor dialog.
 */
function watchPreviewEditor(): void {
    Vue.watch(previewOpen, function callback(isOpen: unknown) {
        if (isOpen) {
            queueSourceEditor("preview", previewTextArea, previewText);
            return;
        }

        destroySourceEditor("preview");
    });
}

/**
 * Watches the follow-up page editor dialog.
 */
function watchPageEditEditor(): void {
    Vue.watch(pageEditOpen, function callback(isOpen: unknown) {
        if (!isOpen) {
            destroySourceEditor("pageEdit");
            return;
        }

        queueSourceEditor("pageEdit", pageEditTextArea, pageEditTextBinding);
    });
}

/**
 * Registers source editor cleanup for component unmount.
 */
function registerUnmountHandler(): void {
    if (typeof Vue.onBeforeUnmount !== "function") {
        return;
    }

    Vue.onBeforeUnmount(function callback() {
        componentMounted = false;

        for (const key of [...sourceEditors.keys()]) {
            destroySourceEditor(key);
        }
    });
}

/**
 * Registers the external singleton dialog controller.
 */
function registerDialogGlobal(): void {
    (window as any).vgStubCreatorDialog = {
        open: openExternalDialog,
        submit: submitExternalDialog,
    };
}

/**
 * Opens the dialog through its global controller.
 */
function openExternalDialog(): void {
    options.onActivate();
    openDialog(open);
}

/**
 * Opens pre-save review through the global controller.
 */
async function submitExternalDialog(): Promise<void> {
    open.value = true;
    await openPreSave();
}

/**
 * Checks whether initial English Wikipedia metadata is required.
 *
 * @returns Whether initial English Wikipedia metadata is required.
 */
function shouldLoadInitialEnwikiMetadata(): boolean {
    const result =
        options.initialEnwikiLookup === true &&
        trimFieldValue(form.enwikiTitle) !== "";
    return result;
}

/**
 * Opens pre-save review state for the current form.
 */
async function openPreSave() {
    await refreshReview({
        recheck: true,
    });
    sourceFetchState.error = "";
    sourceFetchState.loading = true;
    preSaveMoveTitle.value = getCurrentTitle();
    preSaveProgress.value = null;
    preSaveOpen.value = true;

    try {
        const prepared = await options.onPreSavePrepare(
            form,
            getCurrentTitle(),
        );

        preSaveActions.splice(
            0,
            preSaveActions.length,
            ...(prepared.actions || []),
        );
        preSaveMoveEnabled.value = false;
        preSaveMoveTitle.value =
            trimFieldValue(prepared.move?.to) || getCurrentTitle();
    } catch (error) {
        sourceFetchState.error = error.message || String(error);
    } finally {
        sourceFetchState.loading = false;
    }
}

/**
 * Creates the running save-progress state for a submit attempt.
 *
 * @param title - Current page title.
 * @param pending - Pending follow-up actions.
 * @returns Running save progress state.
 */
function createRunningSaveProgress(title: string, pending: any): any {
    const progress = createSaveProgress(
        title,
        pending.actions || [],
        pending.move || {},
        pending.registration || {},
        pending.progressGroups || [],
    );

    return updateSaveProgress(progress, "save", "running");
}

/**
 * Creates callbacks used by the submit path to update this dialog.
 *
 * @returns Progress reporter callbacks.
 */
function createPreSaveProgressReporter(): any {
    const reporter = {
        fail: failPreSaveProgress,
        report: reportPreSaveProgress,
        set: setPreSaveProgressStep,
        start: startPreSaveProgress,
    };
    return reporter;
}

/**
 * Marks the active pre-save step as failed.
 *
 * @param error - Caught error.
 */
function failPreSaveProgress(error: unknown): void {
    if (preSaveProgress.value == null) {
        return;
    }

    const steps: Array<{ id: string; status: string }> =
        preSaveProgress.value.steps;
    const running = steps.find((step) => step.status === "running");
    reportPreSaveProgress(error);

    if (running != null) {
        setPreSaveProgressStep(running.id, "failed");
    }
}

/**
 * Records a pre-save error without changing step state.
 *
 * @param error - Caught error.
 */
function reportPreSaveProgress(error: unknown): void {
    if (preSaveProgress.value == null) {
        return;
    }

    preSaveProgress.value = {
        ...preSaveProgress.value,
        error: error instanceof Error ? error.message : String(error),
    };
}

/**
 * Starts save progress for the current submit attempt.
 *
 * @param title - Page title.
 * @param pending - Pending value.
 */
function startPreSaveProgress(title: string, pending: unknown): void {
    preSaveProgress.value = createRunningSaveProgress(title, pending);
}

/**
 * Updates one in-dialog progress step.
 *
 * @param id - Progress step ID.
 * @param status - New status.
 * @returns Result when the function
 *   updates one in-dialog progress step.
 */
function setPreSaveProgressStep(id: string, status: string): void {
    if (preSaveProgress.value == null) {
        return;
    }

    preSaveProgress.value = updateSaveProgress(
        preSaveProgress.value,
        id,
        status,
    );
}

/**
 * Handles create reviewed submit pending.
 *
 * Creates the pending follow-up action payload for a reviewed
 * submit.
 *
 * @returns Pending submit payload.
 */
function createReviewedSubmitPending(): any {
    const result = {
        actions: preSaveActions,
        move: {
            enabled: false,
            to: getCurrentTitle(),
        },
        progressGroups: serializePreSaveProgressGroups(preSaveGroups.value),
        progress: createPreSaveProgressReporter(),
        registration: {
            enabled: form.registerNewPage !== false,
        },
    };
    return result;
}

/**
 * Handles find company category row.
 *
 * Finds the category row being edited in the company-category
 * dialog.
 *
 * @returns Matching category row.
 */
function findCompanyCategoryRow(): any | undefined {
    return form.categoryRows.find(isCurrentCompanyCategoryRow);
}

/**
 * Handles is current company category row.
 *
 * Checks whether a category row matches the company-category
 * dialog.
 *
 * @param row - Category review row.
 * @returns Whether the row matches.
 */
function isCurrentCompanyCategoryRow(row: any): boolean {
    return trimFieldValue(row.category) === companyCategoryState.category;
}

/**
 * Creates the staged company-category creation payload.
 *
 * @param row - Category review row.
 * @returns Pending creation payload.
 */
function createPendingCompanyCategory(row: any): any {
    const result = {
        englishName: trimFieldValue(companyCategoryState.englishName),
        previousStatus: row.pendingCreation?.previousStatus || row.status,
        text: companyCategoryState.text,
        wikidataId: trimFieldValue(companyCategoryState.wikidataId),
    };
    return result;
}

/**
 * Describes one persisted save-progress step.
 */
interface VisibleProgressStep {
    id: unknown;
    label: unknown;
}

/**
 * Describes save-progress steps grouped by target page.
 */
interface VisibleProgressGroup {
    steps: VisibleProgressStep[];
    targetPage: unknown;
}

/**
 * Builds one progress row shown in the pre-save dialog.
 *
 * @param step - Persisted save-progress step.
 * @returns Pre-save dialog row.
 */
function createVisiblePreSaveRow(step: VisibleProgressStep) {
    const result = {
        key: step.id,
        label: step.label,
        step,
        type: "progress",
    };
    return result;
}

/**
 * Builds one visible pre-save progress group.
 *
 * @param group - Persisted target-page progress group.
 * @returns Pre-save dialog group.
 */
function createVisiblePreSaveGroup(group: VisibleProgressGroup) {
    const result = {
        key: group.targetPage,
        rows: group.steps.map(createVisiblePreSaveRow),
        title: group.targetPage,
    };
    return result;
}

const methods = {
    /**
     * Closes the Codex dialog without writing text.
     *
     * @returns Result when the function
     *   closes the codex dialog without writing text.
     */
    closeDialog(): void {
        open.value = false;
    },

    /**
     * Gets the main dialog title.
     *
     * @returns Main dialog title.
     */
    getDialogTitle(): string {
        return msg("form.title", { title: getCurrentTitle() });
    },

    /**
     * Gets the staged company-category dialog title.
     *
     * @returns The staged company-category dialog title.
     */
    getCompanyCategoryDialogTitle(): string {
        const values = { category: companyCategoryState.category };
        if (companyCategoryState.pending) {
            return msg("review.companyCategoryModifyTitle", values);
        }

        return msg("review.companyCategoryCreateTitle", values);
    },

    /**
     * Gets the staged category or navbox editor title.
     *
     * @returns The staged category or navbox editor title.
     */
    getPageEditDialogTitle(): string {
        const values = { title: pageEditState.title };
        if (pageEditState.create) {
            return msg("preview.createPageTitle", values);
        }

        return msg("preview.modifyPageTitle", values);
    },

    /**
     * Gets the English Wikipedia helper label for a staged page.
     *
     * @returns The English Wikipedia helper label for a staged page.
     */
    getPageEditEnglishLabel(): string {
        if (pageEditState.kind === "navbox") {
            return msg("review.pageEditEnwikiTemplate");
        }

        return msg("review.pageEditEnwikiCategory");
    },

    /**
     * Gets the English Wikipedia helper placeholder for a staged page.
     *
     * @returns The English Wikipedia helper placeholder for a staged
     *   page.
     */
    getPageEditEnglishPlaceholder(): string {
        if (pageEditState.kind === "navbox") {
            return msg("review.pageEditEnwikiTemplatePlaceholder");
        }

        return msg("review.pageEditEnwikiCategoryPlaceholder");
    },

    /**
     * Clears all form and helper data across every tab.
     *
     * @returns Result when the function
     *   clears all form and helper data across every
     *   tab.
     */
    clearForm(): void {
        clearFormState();
    },

    /**
     * Handles a selected main action menu item.
     *
     * @param value - Selected menu item value.
     * @returns Resolves after the action finishes.
     */
    async handleMainActionSelect(value: string): Promise<void> {
        mainActionMenuSelection.value = null;

        if (value === "history") {
            this.openHistoryDialog();
            return;
        }

        if (value === "reload") {
            await this.reloadForm();
            return;
        }

        if (value === "clear") {
            this.clearForm();
        }
    },

    /**
     * Reloads derived form data from the current inputs.
     *
     * @returns Resolves after refreshes complete.
     */
    async reloadForm(): Promise<void> {
        await refreshEnwikiMetadata();
        await refreshCitationRows();
        await refreshReview({
            recheck: true,
        });
    },

    /**
     * Opens an editable generated wikitext preview after review.
     *
     * @returns Resolves after preview text is
     * ready.
     */
    async previewForm(): Promise<void> {
        previewLoading.value = true;
        previewLoadingMessage.value = msg("progress.preparingCitations");

        try {
            await refreshCitationRows();
            previewLoadingMessage.value = msg("progress.checkingPages");
            await refreshReview();
            previewLoadingMessage.value = msg("progress.buildingPreview");
            options.onSubmitHistory(form, getCurrentTitle());
            historyEntries.value = options.getHistoryEntries();
            const preview = await options.onPreview(form, sourceFetchState);

            if (preview == null) {
                return;
            }

            previewText.value = preview.text || "";
            previewSummary.value = preview.summary || "";
            previewHtml.value = preview.html || "";
            previewSubmitted.value = false;
            previewOpen.value = true;
            queueSourceEditor("preview", previewTextArea, previewText);
        } finally {
            previewLoading.value = false;
            previewLoadingMessage.value = msg("preview.preparing");
        }
    },

    /**
     * Refreshes the parsed HTML preview from the editable wikitext.
     *
     * @returns Resolves after parsed HTML is
     * refreshed.
     */
    async refreshParsedPreview(): Promise<void> {
        syncSourceEditorText("preview", previewText);
        sourceFetchState.error = "";
        sourceFetchState.loading = true;

        try {
            const parseArticlePreview =
                options.onParseArticlePreview || options.onParsePreview;

            previewHtml.value = await parseArticlePreview(
                previewText.value,
                form,
            );
        } catch (error) {
            sourceFetchState.error = error.message || String(error);
        } finally {
            sourceFetchState.loading = false;
        }
    },

    /**
     * Closes the editable preview dialog.
     *
     * @returns Result when the function
     *   closes the editable preview dialog.
     */
    closePreviewDialog(): void {
        destroySourceEditor("preview");
        previewOpen.value = false;
        clearPreviewState();
    },

    /**
     * Opens pre-save checks for the edited preview text.
     *
     * @returns Resolves after checklist
     * preparation.
     */
    async submitPreviewText(): Promise<void> {
        syncSourceEditorText("preview", previewText);
        previewSubmitted.value = true;
        destroySourceEditor("preview");
        previewOpen.value = false;
        await openPreSave();
    },

    /**
     * Opens the editable preview before final submission.
     *
     * @returns Resolves after preview text is
     * ready.
     */
    async submitForm(): Promise<void> {
        if (await this.shouldConfirmPageNameMove()) {
            this.openMovePreviewConfirmation();
            return;
        }

        await this.previewForm();
    },

    /**
     * Saves the article after confirming the pre-save fixes.
     *
     * @returns Resolves after save submission
     * starts.
     */
    async confirmSubmit(): Promise<void> {
        syncSourceEditorText("preview", previewText);
        options.onSubmitHistory(form, getCurrentTitle());
        historyEntries.value = options.getHistoryEntries();

        const moveTitle = trimFieldValue(preSaveMoveTitle.value);

        if (shouldMoveBeforeSubmit(moveTitle)) {
            await submitMoveTarget(moveTitle);
            return;
        }

        await options.onSubmit(
            form,
            sourceFetchState,
            this.closeDialog,
            createReviewedSubmitPending(),
            getReviewedPreview(),
        );

        if (sourceFetchState.error === "") {
            previewSubmitted.value = false;
        }
    },

    /**
     * Opens the form history dialog.
     *
     * @returns Result when the function
     *   opens the form history dialog.
     */
    openHistoryDialog(): void {
        historyEntries.value = options.getHistoryEntries();
        historyOpen.value = true;
    },

    /**
     * Gets the label for the currently running pre-save step.
     *
     * @returns Running step label.
     */
    getPreSaveCurrentStepLabel(): string {
        const step = preSaveProgress.value?.steps.find(
            function callback(item: { status: string }) {
                return item.status === "running" || item.status === "retrying";
            },
        );

        return step == null ? msg("progress.saving") : step.label;
    },

    /**
     * Gets the icon used for a pre-save progress status.
     *
     * @param status - Progress status.
     * @returns Codex icon definition.
     */
    getPreSaveStatusIcon(status: string): any {
        return PRE_SAVE_STATUS_ICONS[status] || PRE_SAVE_STATUS_ICONS.pending;
    },

    /**
     * Gets the status icon CSS class for one progress row.
     *
     * @param status - Progress status.
     * @returns CSS class list.
     */
    getPreSaveStatusIconClass(status: string): string {
        const normalized = selectValue(
            PRE_SAVE_STATUS_ICONS[status],
            function trueBranch() {
                return status;
            },
            function falseBranch() {
                return "pending";
            },
        );

        const result = [
            "vg-stub-creator-pre-save-status-ic",
            "on vg-stub-creator-pre-save-status",
            "-icon--",
            normalized,
            "",
        ].join("");
        return result;
    },

    /**
     * Gets the CSS class for one progress row.
     *
     * @param step - Progress step.
     * @returns CSS class list.
     */
    getPreSaveProgressRowClass(step: any): string {
        if (step == null) {
            return "";
        }

        const status = trimFieldValue(step?.status);
        const active = ["failed", "retrying", "running"].includes(status);

        let result = "vg-stub-creator-pre-save-progress-row";

        if (active) {
            result = [
                "vg-stub-creator-pre-save-progress-",
                "row vg-stub-creator-pre-save-progr",
                "ess-row--",
                status,
                "",
            ].join("");
        }
        return result;
    },

    /**
     * Gets the groups currently shown in the pre-save dialog.
     *
     * @returns Checkbox or progress groups.
     */
    getVisiblePreSaveGroups(): Array<any> {
        if (preSaveProgress.value == null) {
            return preSaveGroups.value;
        }

        const groups: VisibleProgressGroup[] = preSaveProgressGroups.value;
        const result = groups.map(createVisiblePreSaveGroup);
        return result;
    },

    /**
     * Checks whether the pre-save progress is still running.
     *
     * @returns Whether progress has active work.
     */
    isPreSaveProgressRunning(): boolean {
        const result =
            preSaveProgress.value != null &&
            !isSaveProgressComplete(preSaveProgress.value);
        return result;
    },

    /**
     * Handles is category add review row.
     *
     * Checks whether a checked missing category row should stand
     * out.
     *
     * @param row - Category review row.
     * @returns Whether the row should be highlighted.
     */
    isCategoryAddReviewRow(row: any): boolean {
        const result =
            row?.enabled !== false &&
            trimFieldValue(row?.category) !== "" &&
            (row?.pendingCreation != null ||
                row?.status === "Not exists" ||
                row?.status === "Pending creation");
        return result;
    },

    /**
     * Checks whether a checked missing navbox row should stand out.
     *
     * @param row - Navbox review row.
     * @returns Whether the row should be highlighted.
     */
    isNavboxAddReviewRow(row: any): boolean {
        const result =
            row?.enabled !== false &&
            trimFieldValue(row?.text) !== "" &&
            (row?.pendingCreation != null ||
                row?.status === "Not exists" ||
                row?.status === "Missing" ||
                row?.status === "Pending creation");
        return result;
    },

    /**
     * Handles is stub tag add review row.
     *
     * Checks whether a checked missing stub-tag row should stand
     * out.
     *
     * @param row - Stub-tag review row.
     * @returns Whether the row should be highlighted.
     */
    isStubTagAddReviewRow(row: any): boolean {
        const result =
            row?.enabled !== false &&
            trimStubTagValue(row?.stubTag) !== "" &&
            (row?.pendingCreation != null ||
                row?.status === "Not exists" ||
                row?.status === "Missing" ||
                row?.status === "Pending creation");
        return result;
    },

    /**
     * Handles is redirect conflict review row.
     *
     * Checks whether a checked redirect row targets an existing
     * page.
     *
     * @param row - Redirect review row.
     * @returns Whether the row should be highlighted.
     */
    isRedirectConflictReviewRow(row: any): boolean {
        const result =
            row?.enabled !== false &&
            trimFieldValue(row?.title) !== "" &&
            row?.exists === true;
        return result;
    },

    /**
     * Closes the form history dialog.
     *
     * @returns Result when the function
     *   closes the form history dialog.
     */
    closeHistoryDialog(): void {
        historyOpen.value = false;
    },

    /**
     * Formats one history entry page label for display.
     *
     * @param entry - History entry.
     * @returns Display page label.
     */
    formatHistoryEntryPage(entry: any): string {
        const page = trimFieldValue(entry.metadata?.page);

        if (entry.metadata?.temporary === true) {
            const result = msg("history.temporaryPage", {
                page: page || msg("history.untitled"),
            });
            return result;
        }

        return page || msg("history.untitled");
    },

    /**
     * Fills the current form from a history entry.
     *
     * @param entry - History entry.
     * @returns Resolves after the restored form is
     * refreshed.
     */
    async fillHistoryEntry(entry: any): Promise<void> {
        historyLoading.value = true;

        try {
            await restoreHistoryForm(getHistoryEntryForm(entry));
            await refreshCitationRows();
            await refreshReview();
            historyOpen.value = false;
        } finally {
            historyLoading.value = false;
        }
    },

    /**
     * Opens an editable JSON representation of a history entry.
     *
     * @param entry - History entry.
     * @returns Result when the function
     *   opens an editable json representation of a
     *   history entry.
     */
    openHistoryJsonDialog(entry: any): void {
        historyJsonError.value = "";
        historyJsonEditable.value = entry.metadata?.temporary === true;
        historyJsonText.value = JSON.stringify(entry, null, 2);
        historyJsonOpen.value = true;
    },

    /**
     * Opens the history JSON dialog for importing values.
     *
     * @returns Result when the function
     *   opens the history json dialog for importing
     *   values.
     */
    openHistoryImportDialog(): void {
        historyJsonError.value = "";
        historyJsonEditable.value = true;
        historyJsonText.value = "";
        historyJsonOpen.value = true;
    },

    /**
     * Closes the history JSON dialog.
     *
     * @returns Result when the function
     *   closes the history json dialog.
     */
    closeHistoryJsonDialog(): void {
        historyJsonOpen.value = false;
        historyJsonText.value = "";
    },

    /**
     * Imports form values from the history JSON dialog.
     *
     * @returns Result when the function
     *   imports form values from the history json
     *   dialog.
     */
    async importHistoryJson(): Promise<void> {
        historyJsonError.value = "";

        try {
            const data = JSON.parse(historyJsonText.value);
            const importedForm = getHistoryEntryForm(data);

            if (
                importedForm == null ||
                typeof importedForm !== "object" ||
                Array.isArray(importedForm)
            ) {
                throw new Error(HISTORY_EXPORT_ERROR);
            }

            historyLoading.value = true;
            await restoreHistoryForm(importedForm);
            await refreshCitationRows();
            await refreshReview();
            historyJsonOpen.value = false;
            historyOpen.value = false;
        } catch (error) {
            historyJsonError.value = error.message || String(error);
        } finally {
            historyLoading.value = false;
        }
    },

    /**
     * Deletes one history entry.
     *
     * @param id - History entry ID.
     * @returns Result when the function
     *   deletes one history entry.
     */
    deleteHistoryEntry(id: string): void {
        options.onDeleteHistoryEntry(id);
        historyEntries.value = options.getHistoryEntries();
    },

    /**
     * Shows the shared table-action tooltip near one icon button.
     *
     * @param event - Focus or mouse event from the action
     * button.
     * @returns Result when the function
     *   shows the shared table-action tooltip near one
     *   icon button.
     */
    showTableActionTooltip(event: Event): void {
        const target = event.currentTarget as HTMLElement | null;
        const label =
            target?.getAttribute("aria-label") ||
            target?.getAttribute("title") ||
            "";

        if (
            target == null ||
            label === "" ||
            typeof target.getBoundingClientRect !== "function"
        ) {
            return;
        }

        const rect = target.getBoundingClientRect();
        tableActionTooltip.label = label;
        tableActionTooltip.visible = true;
        positionTableActionTooltip(rect);

        if (typeof Vue.nextTick === "function") {
            Vue.nextTick(() => positionTableActionTooltip(rect));
        }
    },

    /**
     * Hides the shared table-action tooltip.
     *
     * @returns Result when the function
     *   hides the shared table-action tooltip.
     */
    hideTableActionTooltip(): void {
        tableActionTooltip.visible = false;
    },

    /**
     * Updates the temporary draft row from current form values.
     *
     * @returns Result when the function
     *   updates the temporary draft row from current
     *   form values.
     */
    updateTemporaryHistoryEntry(): void {
        options.onFormChange(form);
        historyEntries.value = options.getHistoryEntries();
    },

    /**
     * Clears all form history entries.
     *
     * @returns Result when the function
     *   clears all form history entries.
     */
    clearHistory(): void {
        options.onClearHistory();
        historyEntries.value = options.getHistoryEntries();
    },

    /**
     * Opens the move target dialog.
     *
     * @returns Result when the function
     *   opens the move target dialog.
     */
    openMoveDialog(): void {
        moveTarget.value = getCurrentTitle();
        movePreviewConfirmation.value = false;
        moveOpen.value = true;
        this.checkMoveTarget();
    },

    /**
     * Handles open move preview confirmation.
     *
     * Opens the move target dialog before previewing a renamed
     * page.
     *
     * @returns *
     */
    openMovePreviewConfirmation(): void {
        moveTarget.value = getCurrentTitle();
        movePreviewConfirmation.value = true;
        moveOpen.value = true;

        if (moveTargetState.checkedTitle !== moveTarget.value) {
            this.checkMoveTarget();
        }
    },

    /**
     * Closes the move target dialog.
     *
     * @returns Result when the function
     *   closes the move target dialog.
     */
    closeMoveDialog(): void {
        moveOpen.value = false;
        movePreviewConfirmation.value = false;
    },

    /**
     * Updates the move target title from live input.
     *
     * @param value - Raw input value.
     * @returns Result when the function
     *   updates the move target title from live input.
     */
    updateMoveTarget(value: string): void {
        moveTarget.value = trimFieldValue(value);
        moveTargetState.checkedTitle = "";
        moveTargetState.exists = false;
    },

    /**
     * Checks whether the current move target page exists.
     *
     * @returns Resolves after status is refreshed.
     */
    async checkMoveTarget(): Promise<void> {
        if (options.onCheckPageTitle == null) {
            return;
        }

        const title = trimFieldValue(moveTarget.value);

        moveTargetState.checkedTitle = "";
        moveTargetState.exists = false;

        if (title === "") {
            return;
        }

        moveTargetState.loading = true;

        try {
            const result = await options.onCheckPageTitle(title);

            if (trimFieldValue(moveTarget.value) !== title) {
                return;
            }

            moveTargetState.checkedTitle = title;
            moveTargetState.exists = result?.exists === true;
        } catch (error) {
            sourceFetchState.error = error.message || String(error);
        } finally {
            moveTargetState.loading = false;
        }
    },

    /**
     * Handles can move page name.
     *
     * Checks whether the entered page name differs from the current
     * page.
     *
     * @returns Whether the move action should be shown.
     */
    canMovePageName(): boolean {
        const title = trimFieldValue(form.pageName);

        if (title === "" || title === currentTitle) {
            return false;
        }

        if (options.currentPageExists === true) {
            return true;
        }

        const result =
            moveTargetState.exists === true &&
            moveTargetState.checkedTitle === title;
        return result;
    },

    /**
     * Checks whether preview needs an explicit move decision first.
     *
     * @returns Resolves to whether preview needs confirmation.
     */
    async shouldConfirmPageNameMove(): Promise<boolean> {
        const title = trimFieldValue(form.pageName);

        if (
            title === "" ||
            title === currentTitle ||
            title === previewWithoutMoveTitle.value
        ) {
            return false;
        }

        if (options.currentPageExists === true) {
            return true;
        }

        moveTarget.value = title;
        await this.checkMoveTarget();

        return moveTargetState.exists === true;
    },

    /**
     * Continues previewing after the user chooses not to move.
     *
     * @returns Resolves after preview text is
     * ready.
     */
    async previewWithoutMoving(): Promise<void> {
        previewWithoutMoveTitle.value = trimFieldValue(form.pageName);
        moveOpen.value = false;
        movePreviewConfirmation.value = false;
        await this.previewForm();
    },

    /**
     * Handles submit move target.
     *
     * Generates current data and opens it in the target page
     * editor.
     *
     * @returns Resolves after navigation starts.
     */
    async submitMoveTarget(): Promise<void> {
        await this.checkMoveTarget();
        await refreshCategoryRows();
        form.pageName = trimFieldValue(moveTarget.value);
        movePreviewConfirmation.value = false;
        options.onSubmitHistory(form, getCurrentTitle());
        historyEntries.value = options.getHistoryEntries();
        await options.onMoveTarget(form, getCurrentTitle(), sourceFetchState);
    },

    /**
     * Normalizes multiline article field values.
     *
     * @param field - Article parameter field.
     * @param field.key - Form key for the field.
     * @returns Multiline article field values.
     */
    normalizeFieldValue(field: any): void {
        const value = selectValue(
            field.key === "enwikiTitle",
            function trueBranch() {
                return normalizeEnwikiTitleValue(form[field.key]);
            },
            function falseBranch() {
                return form[field.key];
            },
        );

        const completed = completeMetadataFieldValue(field.key, value, true);
        form[field.key] = formatArticleFormField(form, field.key, completed);
    },

    /**
     * Trims pasted source URL field values.
     *
     * @param field - Source reference field.
     * @param field.sourceKey - Form key for the source
     * URL.
     * @returns Result when the function
     *   trims pasted source url field values.
     */
    trimSourceValue(field: any): void {
        form[field.sourceKey] = trimFieldValue(form[field.sourceKey]);
    },

    /**
     * Updates one article field from live input.
     *
     * @param field - Article parameter field.
     * @param value - Raw input value.
     * @returns Result when the function
     *   updates one article field from live input.
     */
    updateFieldValue(field: any, value: string): void {
        if (moveFieldUrlToSource(field, value)) {
            markCategoryRowsUnfixed(form.categoryRows);
            return;
        }

        form[field.key] = getFormattedFieldValue(field, value);
        updateFieldDependencies(field.key);
        markCategoryRowsUnfixed(form.categoryRows);
    },

    /**
     * Updates one source URL field from live input.
     *
     * @param field - Source reference field.
     * @param value - Raw input value.
     * @returns Result when the function
     *   updates one source url field from live input.
     */
    updateSourceValue(field: any, value: string): void {
        form[field.sourceKey] = trimFieldValue(value);
    },

    /**
     * Updates one managed citation parameter value.
     *
     * @param citationIndex - Citation row index.
     * @param paramIndex - Parameter row index.
     * @param field - Parameter field key.
     * @param value - Raw input value.
     * @returns Result when the function
     *   updates one managed citation parameter value.
     */
    updateCitationParam(
        citationIndex: number,
        paramIndex: number,
        field: string,
        value: string,
    ): void {
        const citation = form.citationRows[citationIndex];

        if (citation == null) {
            return;
        }

        if (citation.params[paramIndex] == null) {
            citation.params.push(createCitationParamRow());
        }

        citation.params[paramIndex][field] = trimFieldValue(value);
        citation.modified = true;
    },

    /**
     * Sorts one managed citation's parameters.
     *
     * @param citationIndex - Citation row index.
     * @returns Result when the function
     *   sorts one managed citation's parameters.
     */
    sortCitation(citationIndex: number): void {
        const citation = form.citationRows[citationIndex];

        if (citation == null) {
            return;
        }

        citation.params = sortManagedCitationParams(
            citation.params,
            citation.template,
        );
    },

    /**
     * Appends a blank parameter row to one managed citation.
     *
     * @param citationIndex - Citation row index.
     * @returns Result when the function
     *   appends a blank parameter row to one managed
     *   citation.
     */
    addCitationParam(citationIndex: number): void {
        const citation = form.citationRows[citationIndex];

        if (citation == null) {
            return;
        }

        citation.params.push(createCitationParamRow());
        citation.modified = true;
    },

    /**
     * Removes blank editable parameters from one managed citation.
     *
     * @param citationIndex - Citation row index.
     * @returns Result when the function
     *   removes blank editable parameters from one
     *   managed citation.
     */
    cleanCitationParams(citationIndex: number): void {
        const citation = form.citationRows[citationIndex];

        if (citation == null) {
            return;
        }

        const params: Array<{ value?: unknown }> = citation.params || [];
        citation.params = params.filter(
            (param) => trimFieldValue(param?.value) !== "",
        );
        citation.modified = true;
    },

    /**
     * Removes one managed citation parameter row.
     *
     * @param citationIndex - Citation row index.
     * @param paramIndex - Parameter row index.
     * @returns Result when the function
     *   removes one managed citation parameter row.
     */
    removeCitationParam(citationIndex: number, paramIndex: number): void {
        const citation = form.citationRows[citationIndex];

        if (citation == null) {
            return;
        }

        citation.params.splice(paramIndex, 1);
        citation.modified = true;
    },

    /**
     * Handles reset citation param.
     *
     * Resets one managed citation parameter row to its generated
     * value.
     *
     * @param citationIndex - Citation row index.
     * @param paramIndex - Parameter row index.
     * @returns *
     */
    resetCitationParam(citationIndex: number, paramIndex: number): void {
        const citation = form.citationRows[citationIndex];

        if (citation == null || citation.params[paramIndex] == null) {
            return;
        }

        const generated = findGeneratedCitationParam(citation, paramIndex);

        if (generated == null) {
            citation.params.splice(paramIndex, 1);
        } else {
            citation.params[paramIndex] = cloneValue(generated);
        }

        citation.params = sortManagedCitationParams(
            citation.params,
            citation.template,
        );
        citation.modified = !areCitationParamsEqual(
            citation.params,
            citation.generatedParams,
        );
    },

    /**
     * Resets one managed citation to its generated parameters.
     *
     * @param citationIndex - Citation row index.
     * @returns Result when the function
     *   resets one managed citation to its generated
     *   parameters.
     */
    resetCitation(citationIndex: number): void {
        const citation = form.citationRows[citationIndex];

        if (citation == null) {
            return;
        }

        citation.params = cloneValue(citation.generatedParams || []);
        citation.modified = false;
    },

    /**
     * Handles refetch citation.
     *
     * Re-fetches one managed citation and overwrites edited
     * parameters.
     *
     * @param citationIndex - Citation row index.
     * @returns Resolves after the citation is
     * refreshed.
     */
    async refetchCitation(citationIndex: number): Promise<void> {
        const citation = form.citationRows[citationIndex];

        if (citation == null || options.onPrepareCitations == null) {
            return;
        }

        citationState.error = "";
        citationState.loading = true;

        try {
            const rows = await options.onPrepareCitations(form, {
                refetchSourceUrls: [citation.sourceUrl],
            });
            const refreshed = findRefetchedCitation(rows, citation);

            if (refreshed != null) {
                replaceRefetchedCitation(citationIndex, refreshed);
                syncActiveCitationTab();
            }
        } catch (error) {
            citationState.error = error.message || String(error);
        } finally {
            citationState.loading = false;
        }
    },

    /**
     * Trims one form value by key.
     *
     * @param key - Form value key.
     * @returns Result when the function
     *   trims one form value by key.
     */
    trimFormValue(key: string): void {
        form[key] = trimFieldValue(form[key]);
    },

    /**
     * Updates one form value by key from live input.
     *
     * @param key - Form value key.
     * @param value - Raw input value.
     * @returns Result when the function
     *   updates one form value by key from live input.
     */
    updateFormValue(key: string, value: string): void {
        form[key] = trimFieldValue(value);
        markCategoryRowsUnfixed(form.categoryRows);
    },

    /**
     * Handles update enwiki title.
     *
     * Refreshes English Wikipedia metadata after the enwiki title
     * changes.
     *
     * @returns Resolves after metadata is
     * refreshed.
     */
    async updateEnwikiTitle(): Promise<void> {
        await refreshEnwikiMetadata();
    },

    /**
     * Normalizes pasted multiline article field values.
     *
     * @param field - Article parameter field.
     * @param field.key - Form key for the field.
     * @param event - Clipboard paste event.
     * @returns Pasted multiline article field values.
     */
    normalizePastedFieldValue(field: any, event: any): void {
        const clipboardData =
            event.clipboardData || event.originalEvent.clipboardData;
        const text = clipboardData.getData("text");

        if (field.key === "enwikiTitle") {
            const title = extractEnwikiTitleFromUrl(text);

            if (title === "") {
                return;
            }

            event.preventDefault();
            form[field.key] = formatArticleFormField(form, field.key, title);
            refreshEnwikiMetadata();
            markCategoryRowsUnfixed(form.categoryRows);
            return;
        }

        if (!isArticleListField(field.key)) {
            return;
        }

        if (!hasFirstLevelFieldSeparator(text)) {
            return;
        }

        event.preventDefault();
        const completed = completeMetadataFieldValue(field.key, text, true);
        form[field.key] = formatArticleFormField(form, field.key, completed);
        markCategoryRowsUnfixed(form.categoryRows);
    },

    /**
     * Trims a localized name row value.
     *
     * @param key - Localized name group key.
     * @param index - Row index.
     * @param field - Row field key.
     * @returns Result when the function
     *   trims a localized name row value.
     */
    updateNameRow(key: string, index: number, field: string): void {
        form[key][index][field] = trimFieldValue(form[key][index][field]);
        ensureTrailingNameRow(form[key]);
        syncGeneratedNameNoteTaRow(form);
    },

    /**
     * Updates a localized name row value from live input.
     *
     * @param key - Localized name group key.
     * @param index - Row index.
     * @param field - Row field key.
     * @param value - Raw input value.
     * @returns Result when the function
     *   updates a localized name row value from live
     *   input.
     */
    updateNameRowValue(
        key: string,
        index: number,
        field: string,
        value: string,
    ): void {
        form[key][index][field] = trimFieldValue(value);
        ensureTrailingNameRow(form[key]);
        syncGeneratedNameNoteTaRow(form);
    },

    /**
     * Updates whether a localized name row is official.
     *
     * @param key - Localized name group key.
     * @param index - Row index.
     * @param value - Whether the row is official.
     * @returns Result when the function
     *   updates whether a localized name row is
     *   official.
     */
    updateNameOfficial(key: string, index: number, value: boolean): void {
        form[key][index].official = Boolean(value);
        ensureTrailingNameRow(form[key]);
        syncGeneratedNameNoteTaRow(form);
    },

    /**
     * Updates one localized name row region.
     *
     * @param key - Localized name group key.
     * @param index - Row index.
     * @param market - Region key.
     * @param value - Whether the region is selected.
     * @returns Result when the function
     *   updates one localized name row region.
     */
    updateNameMarket(
        key: string,
        index: number,
        market: string,
        value: boolean,
    ): void {
        const row = form[key][index];

        if (row == null) {
            return;
        }

        row[market] = Boolean(value);
        ensureTrailingNameRow(form[key]);
        syncGeneratedNameNoteTaRow(form);
    },

    /**
     * Appends a blank localized name row.
     *
     * @param key - Localized name group key.
     * @returns Result when the function
     *   appends a blank localized name row.
     */
    addNameRow(key: string): void {
        form[key].push(createNameRow());
    },

    /**
     * Removes one localized name row.
     *
     * @param key - Localized name group key.
     * @param index - Row index.
     * @returns Result when the function
     *   removes one localized name row.
     */
    removeNameRow(key: string, index: number): void {
        form[key].splice(index, 1);
        ensureTrailingNameRow(form[key]);
        syncGeneratedNameNoteTaRow(form);
    },

    /**
     * Fills the page title from one Chinese-name row.
     *
     * @param key - Localized name group key.
     * @param index - Localized name row index.
     * @returns Result when the title is applied.
     */
    applyNameAsPageTitle(key: string, index: number): void {
        if (!applyLocalizedNameAsPageTitle(form, key, index)) {
            return;
        }

        updateFieldDependencies("pageName");
        markCategoryRowsUnfixed(form.categoryRows);
    },

    /**
     * Updates the Steam helper URL.
     *
     * @param value - Raw Steam URL.
     * @returns Result when the function
     *   updates the steam helper url.
     */
    updateSteamUrl(value: string): void {
        steamUrl.value = trimFieldValue(value);
        fetchedSteamNameRows.value = [];
    },

    /**
     * Fetches Steam names and stores them as helper suggestions.
     *
     * @returns Resolves after rows are fetched.
     */
    async addSteamNames(): Promise<void> {
        await fetchSteamNames();
    },

    /**
     * Applies one Steam name helper suggestion choice.
     *
     * @param choice - Steam helper choice key.
     * @returns Result when the function
     *   applies one steam name helper suggestion
     *   choice.
     */
    applySteamNameChoice(choice: string): void {
        if (!choice) {
            return;
        }

        removeSteamAppliedNameRows();
        buildSteamNameChoiceRows(fetchedSteamNameRows.value, choice)
            .map(createNameRowFromValues)
            .forEach(function callback(row) {
                markSteamNameHelperRow(row);
                form.localizedNames.push(row);
            });
        ensureTrailingNameRow(form.localizedNames);
        syncGeneratedNameNoteTaRow(form);
    },

    /**
     * Clears all localized name rows.
     *
     * @param key - Localized name group key.
     * @returns Result when the function
     *   clears all localized name rows.
     */
    clearNameRows(key: string): void {
        form[key] = [createNameRow()];
        syncGeneratedNameNoteTaRow(form);
    },

    /**
     * Refreshes generated category rows.
     *
     * @returns Resolves after category rows are
     * refreshed.
     */
    async refreshCategoryRows(): Promise<void> {
        await refreshCategoryRows();
    },

    /**
     * Handles rebuild category rows.
     *
     * Rebuilds category rows, bypassing the stored category query
     * cache.
     *
     * @returns Resolves after category rows are
     * rebuilt.
     */
    async rebuildCategoryRows(): Promise<void> {
        form.stubTagRows = null;
        await refreshCategoryRows({
            bypassCache: true,
            recheck: true,
        });
    },

    /**
     * Adds one manual category row.
     *
     * @returns Result when the function
     *   adds one manual category row.
     */
    addCategoryRow(): void {
        form.categoryRows.push(options.onCreateCategoryRow());
        ensureTrailingCategoryRow(form, options.onCreateCategoryRow);
    },

    /**
     * Removes one category row.
     *
     * @param index - Category row index.
     * @returns Result when the function
     *   removes one category row.
     */
    removeCategoryRow(index: number): void {
        form.categoryRows.splice(index, 1);
        ensureTrailingCategoryRow(form, options.onCreateCategoryRow);
    },

    /**
     * Removes surplus blank category rows.
     *
     * @returns Result when the function
     *   removes surplus blank category rows.
     */
    cleanCategoryRows(): void {
        form.categoryRows = cleanEditableRows(
            form.categoryRows,
            isBlankCategoryRow,
            () => options.onCreateCategoryRow(),
        );
    },

    /**
     * Appends a blank stub-tag row.
     *
     * @returns Result when the function
     *   appends a blank stub-tag row.
     */
    addStubTagRow(): void {
        ensureStubTagRows(form).push(createStubTagRow());
        ensureTrailingStubTagRow(form);
    },

    /**
     * Resets stub-tag rows from current category metadata.
     *
     * @returns Result when the function
     *   resets stub-tag rows from current category
     *   metadata.
     */
    resetStubTagRows(): void {
        form.stubTagRows = buildStubTagRowsFromCategories(form.categoryRows);
        ensureTrailingStubTagRow(form);
    },

    /**
     * Updates one stub-tag row.
     *
     * @param index - Stub-tag row index.
     * @param stubTag - Stub template name.
     * @returns Result when the function
     *   updates one stub-tag row.
     */
    updateStubTagRow(index: number, stubTag: string): void {
        const row = ensureStubTagRows(form)[index];

        if (row != null) {
            row.stubTag = trimStubTagValue(stubTag);
            ensureTrailingStubTagRow(form);
        }
    },

    /**
     * Removes one stub-tag row.
     *
     * @param index - Stub-tag row index.
     * @returns Result when the function
     *   removes one stub-tag row.
     */
    removeStubTagRow(index: number): void {
        ensureStubTagRows(form).splice(index, 1);
        ensureTrailingStubTagRow(form);
    },

    /**
     * Removes surplus blank stub-tag rows.
     *
     * @returns Result when the function
     *   removes surplus blank stub-tag rows.
     */
    cleanStubTagRows(): void {
        form.stubTagRows = cleanEditableRows(
            ensureStubTagRows(form),
            isBlankStubTagRow,
            createStubTagRow,
        );
    },

    /**
     * Appends a blank redirect row.
     *
     * @returns Result when the function
     *   appends a blank redirect row.
     */
    addRedirectRow(): void {
        ensureRedirectRows(form).push(createRedirectRow());
        ensureTrailingRedirectRow(form);
    },

    /**
     * Resets generated redirect rows.
     *
     * @returns Resolves after rows are refreshed.
     */
    async rebuildRedirectRows(): Promise<void> {
        form.redirectRows = null;
        await refreshRedirectRows({
            recheck: true,
        });
    },

    /**
     * Updates one redirect row title from live input.
     *
     * @param index - Redirect row index.
     * @param value - Raw title input.
     * @returns Result when the function
     *   updates one redirect row title from live
     *   input.
     */
    updateRedirectRowTitle(index: number, value: string): void {
        const row = form.redirectRows?.[index];

        if (row != null) {
            setRedirectRowTitle(row, value);
            ensureTrailingRedirectRow(form);
        }
    },

    /**
     * Removes one redirect row.
     *
     * @param index - Redirect row index.
     * @returns Result when the function
     *   removes one redirect row.
     */
    removeRedirectRow(index: number): void {
        ensureRedirectRows(form).splice(index, 1);
        ensureTrailingRedirectRow(form);
    },

    /**
     * Removes surplus blank redirect rows.
     *
     * @returns Result when the function
     *   removes surplus blank redirect rows.
     */
    cleanRedirectRows(): void {
        form.redirectRows = cleanEditableRows(
            ensureRedirectRows(form),
            isBlankRedirectRow,
            createRedirectRow,
        );
    },

    /**
     * Appends a blank navbox row.
     *
     * @returns Result when the function
     *   appends a blank navbox row.
     */
    addNavboxRow(): void {
        ensureNavboxRows(form).push(createNavboxRow());
        ensureTrailingNavboxRow(form);
        navboxRowsPrepared = true;
    },

    /**
     * Removes surplus blank navbox rows.
     *
     * @returns Result when the function
     *   removes surplus blank navbox rows.
     */
    cleanNavboxRows(): void {
        form.navboxRows = cleanEditableRows(
            ensureNavboxRows(form),
            isBlankNavboxRow,
            createNavboxRow,
        );
        navboxRowsPrepared = true;
    },

    /**
     * Appends a blank NoteTA row.
     *
     * @returns Result when the function
     *   appends a blank noteta row.
     */
    addNoteTaRow(): void {
        ensureNoteTaRows(form).push(createNoteTaRow());
    },

    /**
     * Removes one NoteTA row.
     *
     * @param index - NoteTA row index.
     * @returns Result when the function
     *   removes one noteta row.
     */
    removeNoteTaRow(index: number): void {
        const rows = ensureNoteTaRows(form);
        const row = rows[index];

        if (row?.source === NOTE_TA_NAMES_SOURCE) {
            form.noteTaNamesRemoved = true;
        }

        rows.splice(index, 1);
    },

    /**
     * Removes surplus blank NoteTA rows.
     *
     * @returns Result when the function
     *   removes surplus blank noteta rows.
     */
    cleanNoteTaRows(): void {
        const rows = ensureNoteTaRows(form);

        rows.splice(
            0,
            rows.length,
            ...cleanEditableRows(rows, isBlankNoteTaRow, createNoteTaRow),
        );
    },

    /**
     * Updates one NoteTA row key or value from live input.
     *
     * @param index - NoteTA row index.
     * @param field - Row field key.
     * @param value - Raw input value.
     * @returns Result when the function
     *   updates one noteta row key or value from live
     *   input.
     */
    updateNoteTaRow(index: number, field: string, value: string): void {
        const row = ensureNoteTaRows(form)[index];

        row[field] = trimFieldValue(value);

        if (row.source === NOTE_TA_NAMES_SOURCE) {
            row.modified = true;
        }
    },

    /**
     * Sorts NoteTA rows by output source order.
     *
     * @returns Result when the function
     *   sorts noteta rows by output source order.
     */
    sortNoteTaRows(): void {
        const rows = ensureNoteTaRows(form);

        rows.splice(0, rows.length, ...sortNoteTaEntries(rows));
    },

    /**
     * Rebuilds generated NoteTA rows and preserves manual extras.
     *
     * @returns Result when the function
     *   rebuilds generated noteta rows and preserves
     *   manual extras.
     */
    regenerateNoteTaRows(): void {
        regenerateNoteTaRows(form);
    },

    /**
     * Updates one navbox row.
     *
     * @param index - Navbox row index.
     * @param navbox - Navbox wikitext.
     * @returns Result when the function
     *   updates one navbox row.
     */
    updateNavboxRow(index: number, navbox: string): void {
        const row = ensureNavboxRows(form)[index];

        setNavboxRowText(row, navbox);
        row.title = getNavboxTitle(navbox);
        row.status = "";
        ensureTrailingNavboxRow(form);
    },

    /**
     * Removes one navbox row.
     *
     * @param index - Navbox row index.
     * @returns Result when the function
     *   removes one navbox row.
     */
    removeNavboxRow(index: number): void {
        ensureNavboxRows(form).splice(index, 1);
        ensureTrailingNavboxRow(form);
    },

    /**
     * Regenerates navbox rows from the current series field.
     *
     * @returns Resolves after suggestions are
     * refreshed.
     */
    async rebuildNavboxRows(): Promise<void> {
        await refreshNavboxRows(true, true);
    },

    /**
     * Checks the current navbox rows.
     *
     * @returns Resolves after statuses are
     * refreshed.
     */
    async checkNavboxRows(): Promise<void> {
        await refreshNavboxRows(true, false);
    },

    /**
     * Refreshes generated redirect rows.
     *
     * @returns Resolves after redirect rows are
     * refreshed.
     */
    async refreshRedirectRows(): Promise<void> {
        await refreshRedirectRows();
    },

    /**
     * Checks the current redirect rows.
     *
     * @returns Resolves after redirect rows are
     * fixed.
     */
    async checkRedirectRows(): Promise<void> {
        await checkRedirectRows();
    },

    /**
     * Checks one edited redirect row after its textbox loses focus.
     *
     * @param index - Redirect row index.
     * @param event - Text input blur event.
     * @returns Resolves after the row is fixed.
     */
    async checkRedirectRow(index: number, event: Event): Promise<void> {
        const value = (event.target as HTMLInputElement | null)?.value;

        if (value != null && form.redirectRows?.[index] != null) {
            setRedirectRowTitle(form.redirectRows[index], value);
            ensureTrailingRedirectRow(form);
        }

        await this.checkRedirectRows();
    },

    /**
     * Checks one edited navbox row after its textbox loses focus.
     *
     * @param index - Navbox row index.
     * @param event - Text input blur event.
     * @returns Resolves after the textbox is
     * updated.
     */
    async checkNavboxRow(index: number, event: Event): Promise<void> {
        const value = (event.target as HTMLInputElement | null)?.value;

        if (value != null) {
            this.updateNavboxRow(index, value);
        }

        await this.checkNavboxRows();
    },

    /**
     * Opens an editable navbox template source preview.
     *
     * @param row - Navbox review row.
     * @returns Resolves after the editor is ready.
     */
    async openNavboxEdit(row: any): Promise<void> {
        await openPageEdit({
            create: getPageEditCreateState(row, row.status !== "OK"),
            kind: "navbox",
            row,
            title: `Template:${row.title}`,
        });
    },

    /**
     * Opens an editable redirect page source preview.
     *
     * @param row - Redirect review row.
     * @returns Resolves after the editor is ready.
     */
    async openRedirectEdit(row: any): Promise<void> {
        await openPageEdit({
            create: getPageEditCreateState(row, row.exists !== true),
            kind: "redirect",
            row,
            title: trimFieldValue(row.title),
        });
    },

    /**
     * Opens an editable stub template source preview.
     *
     * @param row - Stub-tag review row.
     * @returns Resolves after the editor is ready.
     */
    async openStubTagEdit(row: any): Promise<void> {
        await openPageEdit({
            create: false,
            kind: "stubTag",
            row,
            title: `Template:${trimStubTagValue(row.stubTag)}`,
        });
    },

    /**
     * Updates one category row title and its modified marker.
     *
     * @param index - Category row index.
     * @param category - New category title.
     * @returns Result when the function
     *   updates one category row title and its
     *   modified marker.
     */
    updateCategoryRowCategory(index: number, category: string): void {
        const current = form.categoryRows[index];

        form.categoryRows[index] = options.onUpdateCategoryRowCategory(
            form.categoryRows[index],
            trimFieldValue(category),
        );
        syncCategoryRowFixedState(form.categoryRows[index], current);
        ensureTrailingCategoryRow(form, options.onCreateCategoryRow);
    },

    /**
     * Checks one edited category after its textbox loses focus.
     *
     * @param index - Category row index.
     * @param event - Text input blur event.
     * @returns Resolves after the textbox is
     * updated.
     */
    async checkCategoryRow(index: number, event: Event): Promise<void> {
        const value = (event.target as HTMLInputElement | null)?.value;

        if (value != null) {
            this.updateCategoryRowCategory(index, value);
        }

        await refreshCategoryRows({
            bypassCache: true,
        });

        if (value != null && form.categoryRows[index] != null) {
            form.categoryRows[index].category = trimFieldValue(value);
            ensureTrailingCategoryRow(form, options.onCreateCategoryRow);
        }
    },

    /**
     * Opens an editor for one missing category.
     *
     * @param row - Category review row.
     * @returns Resolves after the category text is
     * prepared.
     */
    async openCategoryCreate(row: any): Promise<void> {
        const pendingCreation = row.pendingCreation;

        Object.assign(companyCategoryState, {
            category: trimFieldValue(row.category),
            company: trimFieldValue(row.company),
            englishName: trimFieldValue(pendingCreation?.englishName),
            error: "",
            loading: false,
            pending: pendingCreation != null,
            text: String(pendingCreation?.text || ""),
            wikidataId: trimFieldValue(pendingCreation?.wikidataId),
        });
        companyCategoryLookupLoading.value = false;
        companyCategoryOpen.value = true;

        if (pendingCreation != null) {
            return;
        }

        if (companyCategoryState.company === "") {
            return;
        }

        companyCategoryState.loading = true;

        try {
            companyCategoryState.text =
                await options.onPrepareCompanyCategory(row);
        } catch (error) {
            companyCategoryState.error = error.message || String(error);
        } finally {
            companyCategoryState.loading = false;
        }
    },

    /**
     * Closes the company category editor.
     *
     * @returns Result when the function
     *   closes the company category editor.
     */
    closeCompanyCategory(): void {
        companyCategoryOpen.value = false;
    },

    /**
     * Cancels the staged category creation.
     *
     * @returns Result when the function
     *   cancels the staged category creation.
     */
    cancelCompanyCategoryCreation(): void {
        const row = form.categoryRows.find(function callback(item: {
            category: unknown;
        }) {
            return (
                trimFieldValue(item.category) === companyCategoryState.category
            );
        });

        if (row == null || row.pendingCreation == null) {
            return;
        }

        row.status = row.pendingCreation.previousStatus || "";
        delete row.pendingCreation;
        companyCategoryOpen.value = false;
    },

    /**
     * Stages the category for creation after the article is saved.
     *
     * @returns Resolves after the category is
     * staged.
     */
    async saveCompanyCategory(): Promise<void> {
        companyCategoryState.error = "";
        companyCategoryState.loading = true;

        try {
            const row = findCompanyCategoryRow();

            if (row == null) {
                throw new Error(msg("errors.categoryRowUnavailable"));
            }

            row.pendingCreation = createPendingCompanyCategory(row);
            row.enabled = true;
            row.status = "Pending creation";
            companyCategoryOpen.value = false;
        } catch (error) {
            companyCategoryState.error = error.message || String(error);
        } finally {
            companyCategoryState.loading = false;
        }
    },

    /**
     * Checks whether a category row supports the company helper.
     *
     * @param row - Category review row.
     * @returns Whether the helper should be shown.
     */
    canCreateCompanyCategory(row: any): boolean {
        return trimFieldValue(row.company) !== "" && row.status !== "OK";
    },

    /**
     * Refreshes metadata for the company-category English title.
     *
     * @returns Resolves after lookup state is
     * updated.
     */
    async refreshCompanyCategoryMetadata(): Promise<void> {
        await refreshCompanyCategoryMetadata();
    },

    /**
     * Gets the Wikidata URL for the staged company category.
     *
     * @returns Wikidata entity URL.
     */
    getCompanyCategoryWikidataUrl(): string {
        const id = trimFieldValue(companyCategoryState.wikidataId);
        let result = "";

        if (id !== "") {
            result = `https://www.wikidata.org/wiki/${encodeURIComponent(id)}`;
        }
        return result;
    },

    /**
     * Checks whether a category row can be created.
     *
     * @param row - Category review row.
     * @returns Whether the category editor should be
     * shown.
     */
    canCreateCategory(row: any): boolean {
        const result =
            trimFieldValue(row.category) !== "" &&
            row.status !== "OK" &&
            row.pendingCreation == null;
        return result;
    },

    /**
     * Opens an editable category source preview.
     *
     * @param row - Category review row.
     * @returns Resolves after the editor is ready.
     */
    async openCategoryEdit(row: any): Promise<void> {
        const category = trimFieldValue(row.category);

        await openPageEdit({
            create: getPageEditCreateState(row, row.status !== "OK"),
            kind: "category",
            row,
            title: `Category:${category}`,
        });
    },

    /**
     * Closes the category page viewer.
     *
     * @returns Result when the function
     *   closes the category page viewer.
     */
    closeCategoryView(): void {
        categoryViewOpen.value = false;
    },

    /**
     * Refreshes the edited page source preview.
     *
     * @returns Resolves after the preview is
     * refreshed.
     */
    async refreshPageEditPreview(): Promise<void> {
        syncSourceEditorText("pageEdit", {
            get value() {
                return pageEditState.text;
            },
            set value(text) {
                pageEditState.text = text;
            },
        });
        pageEditState.error = "";
        pageEditState.loading = true;

        try {
            pageEditState.html = await options.onParsePreview(
                pageEditState.text,
                pageEditState.title,
            );
        } catch (error) {
            pageEditState.error = error.message || String(error);
        } finally {
            pageEditState.loading = false;
        }
    },

    /**
     * Closes the page edit dialog without staging changes.
     *
     * @returns Result when the function
     *   closes the page edit dialog without staging
     *   changes.
     */
    closePageEditDialog(): void {
        destroySourceEditor("pageEdit");
        pageEditOpen.value = false;
        clearPageEditState();
    },

    /**
     * Cancels staged source changes for the current review row.
     *
     * @returns Result when the function
     *   cancels staged source changes for the current
     *   review row.
     */
    resetPageEdit(): void {
        resetPageEdit();
    },

    /**
     * Stages the edited page source for final submission.
     *
     * @returns Result when the function
     *   stages the edited page source for final
     *   submission.
     */
    stagePageEdit(): void {
        syncSourceEditorText("pageEdit", {
            get value() {
                return pageEditState.text;
            },
            set value(text) {
                pageEditState.text = text;
            },
        });
        stagePageEdit();
    },

    /**
     * Formats a category row source as a compact badge label.
     *
     * @param source - Category row source.
     * @returns Compact source label.
     */
    formatCategorySourceLabel(source: string): string {
        return formatCategorySourceLabel(source);
    },

    /**
     * Formats a category row source tooltip.
     *
     * @param source - Category row source.
     * @returns Source tooltip.
     */
    formatCategorySourceTitle(source: string): string {
        return formatCategorySourceTitle(source);
    },

    /**
     * Formats a category review row status as a compact badge.
     *
     * @param row - Category review row.
     * @returns Compact status label.
     */
    formatCategoryStatusLabel(row: any): string {
        return formatReviewRowStatusLabel(row, isBlankCategoryRow);
    },

    /**
     * Formats a category review row status tooltip.
     *
     * @param row - Category review row.
     * @returns Status tooltip.
     */
    formatCategoryStatusTitle(row: any): string {
        const sourceTitle = formatCategorySourceTitle(row?.source);
        const label = formatReviewRowStatusLabel(row, isBlankCategoryRow);

        return sourceTitle === "" ? label : `${label} (${sourceTitle})`;
    },

    /**
     * Gets the InfoChip status for a category row.
     *
     * @param row - Category review row.
     * @returns Codex InfoChip status.
     */
    getCategoryStatusChipStatus(row: any): string {
        return getReviewRowStatusChipStatus(row, isBlankCategoryRow);
    },

    /**
     * Formats a stub template name for display.
     *
     * @param stubTag - Stub template name.
     * @returns Template call label.
     */
    formatStubTagLabel(stubTag: string): string {
        return `{{${trimStubTagValue(stubTag)}}}`;
    },

    /**
     * Formats a stub-tag row status as a compact badge.
     *
     * @param row - Stub-tag review row.
     * @returns Compact status label.
     */
    formatStubTagStatusLabel(row: any): string {
        const result = selectValue(
            isBlankStubTagRow(row),
            function trueBranch() {
                return msg("review.empty");
            },
            function falseBranch() {
                return formatReviewRowStatusLabel(row, isBlankStubTagRow);
            },
        );
        return result;
    },

    /**
     * Gets the InfoChip status for a stub-tag row.
     *
     * @param row - Stub-tag review row.
     * @returns Codex InfoChip status.
     */
    getStubTagStatusChipStatus(row: any): string {
        return getReviewRowStatusChipStatus(row, isBlankStubTagRow);
    },

    /**
     * Gets a category page URL for a review row.
     *
     * @param row - Category review row.
     * @returns Category page URL.
     */
    getCategoryPageUrl(row: any): string {
        const category = trimFieldValue(row?.category);

        const result = selectValue(
            category === "",
            function trueBranch() {
                return "";
            },
            function falseBranch() {
                return options.getPageUrl(`Category:${category}`);
            },
        );
        return result;
    },

    /**
     * Gets a redirect page URL for a review row.
     *
     * @param row - Redirect review row.
     * @returns Redirect page URL.
     */
    getRedirectPageUrl(row: any): string {
        const title = trimFieldValue(row?.title);

        return title === "" ? "" : options.getPageUrl(title);
    },

    /**
     * Gets a navbox template page URL for a review row.
     *
     * @param row - Navbox review row.
     * @returns Navbox template page URL.
     */
    getNavboxPageUrl(row: any): string {
        const title = trimFieldValue(row?.title);

        return title === "" ? "" : options.getPageUrl(`Template:${title}`);
    },

    /**
     * Gets a stub template page URL for a review row.
     *
     * @param row - Stub-tag review row.
     * @returns Stub template page URL.
     */
    getStubTagPageUrl(row: any): string {
        const stubTag = trimStubTagValue(row?.stubTag);

        const result = selectValue(
            stubTag === "",
            function trueBranch() {
                return "";
            },
            function falseBranch() {
                return options.getPageUrl(`Template:${stubTag}`);
            },
        );
        return result;
    },

    /**
     * Formats a Check-tab Page action label.
     *
     * @param row - Review row.
     * @param exists - Whether the target page exists.
     * @returns Lowercase action label.
     */
    getReviewPageActionLabel(row: any, exists: boolean): string {
        if (
            row?.pendingEdit != null ||
            row?.pendingCreation != null ||
            String(row?.status || "").startsWith("Pending")
        ) {
            return msg("review.pendingAction");
        }

        return exists ? msg("review.editAction") : msg("review.createAction");
    },

    /**
     * Formats an accessible label for a review page action.
     *
     * @param row - Row values.
     * @param exists - Exists value.
     * @returns An accessible label for a review page action.
     */
    getReviewPageActionAriaLabel(row: any, exists: boolean): string {
        const result = msg("review.pageAction", {
            action: this.getReviewPageActionLabel(row, exists),
        });
        return result;
    },

    /**
     * Formats a navbox existence status as a compact badge.
     *
     * @param row - Navbox review row or existence
     * status.
     * @returns Compact status label.
     */
    formatNavboxStatusLabel(row: any | string): string {
        return formatReviewRowStatusLabel(row, isBlankNavboxRow);
    },

    /**
     * Gets the InfoChip status for a navbox existence state.
     *
     * @param row - Navbox review row or existence
     * status.
     * @returns Codex InfoChip status.
     */
    getNavboxStatusChipStatus(row: any | string): string {
        return getReviewRowStatusChipStatus(row, isBlankNavboxRow);
    },

    /**
     * Formats a redirect existence status as a compact badge.
     *
     * @param row - Redirect review row or existence
     * status.
     * @returns Compact status label.
     */
    formatRedirectStatusLabel(row: any | string): string {
        if (
            typeof row === "object" &&
            row != null &&
            isBlankRedirectRow(row)
        ) {
            return msg("review.empty");
        }

        const status =
            typeof row === "object" && row != null ? row.status : row;

        if (
            typeof row === "object" &&
            row != null &&
            !isRedirectRowFixed(row)
        ) {
            return msg("review.unchecked");
        }

        const result =
            {
                Exists: msg("review.overwrite"),
                Missing: msg("review.ok"),
            }[status] || msg("review.unchecked");
        return result;
    },

    /**
     * Gets the InfoChip status for a redirect existence state.
     *
     * @param row - Redirect review row or existence
     * status.
     * @returns Codex InfoChip status.
     */
    getRedirectStatusChipStatus(row: any | string): string {
        if (
            typeof row === "object" &&
            row != null &&
            isBlankRedirectRow(row)
        ) {
            return "notice";
        }

        const status =
            typeof row === "object" && row != null ? row.status : row;

        if (
            typeof row === "object" &&
            row != null &&
            !isRedirectRowFixed(row)
        ) {
            return "notice";
        }

        if (status === "Missing") {
            return "success";
        }

        if (status === "Exists") {
            return "warning";
        }

        return getReviewStatusChipStatus(status);
    },

    /**
     * Gets the current generated prose length.
     *
     * @returns Hanzi-equivalent sinograph count.
     */
    getProseSinographs(): number {
        return options.getProseSinographs(form);
    },

    /**
     * Gets the current generated prose wikitext.
     *
     * @returns Generated prose wikitext.
     */
    getProseWikitext(): string {
        return options.getProseWikitext(form);
    },

    /**
     * Handles get metadata field label.
     *
     * Gets the metadata table field label, including list item
     * counts.
     *
     * @param field - Article parameter field.
     * @param field.key - Form field key.
     * @param field.label - Field display label.
     * @returns Field label for metadata table display.
     */
    getMetadataFieldLabel(field: any): string {
        const label = field?.label || "";

        if (!isArticleListField(field?.key)) {
            return label;
        }

        const count = splitFieldValues(form[field.key]).length;

        return `${label} (${count})`;
    },

    /**
     * Handles is steam name helper row.
     *
     * Checks whether a localized name row came from the Steam
     * helper.
     *
     * @param row - Localized name row.
     * @returns Whether the row was helper-generated.
     */
    isSteamNameHelperRow(row: any): boolean {
        return row?.[STEAM_NAME_HELPER_ROW] === true;
    },
};

/**
 * Checks whether submit must first move to another title.
 *
 * @param moveTitle - Move title value.
 * @returns Whether submit must first move to another title.
 */
function shouldMoveBeforeSubmit(moveTitle: string): boolean {
    const result =
        preSaveMoveEnabled.value &&
        moveTitle !== "" &&
        moveTitle !== getCurrentTitle();
    return result;
}

/**
 * Moves the pending article target before submission.
 *
 * @param moveTitle - Move title value.
 */
async function submitMoveTarget(moveTitle: string): Promise<void> {
    await options.onMoveTarget(form, moveTitle, sourceFetchState);

    if (sourceFetchState.error === "") {
        preSaveOpen.value = false;
    }
}

/**
 * Gets the edited preview payload when one was submitted.
 *
 * @returns The edited preview payload when one was submitted.
 */
function getReviewedPreview(): any | undefined {
    if (!previewSubmitted.value) {
        return undefined;
    }

    return { summary: previewSummary.value, text: previewText.value };
}

/**
 * Formats one live field input value.
 *
 * @param field - Field value.
 * @param value - Input value.
 * @returns One live field input value.
 */
function getFormattedFieldValue(field: any, value: string): string {
    const completed = completeWikiLinkBrackets(
        field.key,
        value,
        form[field.key],
    );
    let normalized = completed;

    if (field.key === "enwikiTitle") {
        normalized = normalizeEnwikiTitleValue(completed);
    }

    if (isCompletableMetadataField(field.key)) {
        return completeMetadataFieldValue(field.key, normalized);
    }

    return formatArticleFormField(form, field.key, normalized);
}

/**
 * Refreshes state derived from an updated field.
 *
 * @param key - Lookup key.
 */
function updateFieldDependencies(key: string): void {
    if (
        key === "pageName" &&
        trimFieldValue(form.pageName) !== previewWithoutMoveTitle.value
    ) {
        previewWithoutMoveTitle.value = "";
        moveTargetState.checkedTitle = "";
        moveTargetState.exists = false;
    }

    if (key === "enwikiTitle") {
        refreshEnwikiMetadata();
    }

    if (WIKI_LINK_COMPLETION_FIELDS.has(key)) {
        navboxRowsPrepared = false;
    }
}

/**
 * Finds a refreshed citation matching the requested source.
 *
 * @param rows - Row values.
 * @param citation - Citation value.
 * @returns A refreshed citation matching the requested source.
 */
function findRefetchedCitation(rows: Array<any>, citation: any): any {
    const sourceUrl = trimFieldValue(citation.sourceUrl);
    const result = rows.map(createCitationRow).find(function callback(row) {
        return trimFieldValue(row.sourceUrl) === sourceUrl;
    });
    return result;
}

/**
 * Replaces one citation with refreshed generated parameters.
 *
 * @param index - Zero-based item index.
 * @param refreshed - Refreshed value.
 */
function replaceRefetchedCitation(index: number, refreshed: any): void {
    form.citationRows.splice(index, 1, {
        ...refreshed,
        modified: false,
        params: cloneValue(refreshed.generatedParams || []),
    });
}

/**
 * Creates Vue component options from initialized dialog state.
 *
 * @returns Vue component options from initialized dialog state.
 */
function createComponentDefinition(): any {
    const result = {
        methods,
        /**
         * Exposes dialog state and actions to the template.
         *
         * @returns Component state consumed by the template.
         */
        setup(): any {
            const state = {
                ...getCoreSetupState(),
                ...getFieldSetupState(),
                ...getHistorySetupState(),
                ...getPreviewSetupState(),
            };
            return state;
        },
        template: createDialogTemplate(),
    };
    return result;
}

/**
 * Gets core dialog setup bindings.
 *
 * @returns Core dialog setup bindings.
 */
function getCoreSetupState(): any {
    const state = {
        activeCitationTab,
        activeTab,
        categoryState,
        categoryViewOpen,
        categoryViewState,
        pageEditOpen,
        pageEditState,
        pageEditTextArea,
        categoryTableColumns: CATEGORY_TABLE_COLUMNS,
        citationTableColumns: CITATION_TABLE_COLUMNS,
        citationState,
        companyCategoryOpen,
        companyCategoryLookupLoading,
        companyCategoryState,
        groups: ARTICLE_PARAMETER_GROUPS,
        form,
        fetchedSteamNameRows,
    };
    return state;
}

/**
 * Gets form field helper setup bindings.
 *
 * @returns Form field helper setup bindings.
 */
function getFieldSetupState(): any {
    const state = {
        getSteamNameSuggestions,
        getCitationParamRows,
        getCitationParamTableRows,
        getCitationTabLabel,
        getCitationTabName,
        getCitationTabsKey,
        getMetadataFieldLabel: methods.getMetadataFieldLabel,
        getMetadataFieldTableRows,
        getArticleField,
        getArticlePreviewTitle,
        getFieldPlaceholder: options.getFieldPlaceholder.bind(null, form),
        getFieldPreview,
        getGroupPreview,
        getProseReviewDescription,
        getNameSearchRows,
        getEnwikiTipLinks,
        getWikidataText,
        getWikidataStatusText,
    };
    return state;
}

/**
 * Gets history and navigation setup bindings.
 *
 * @returns History and navigation setup bindings.
 */
function getHistorySetupState(): any {
    const state = {
        historyEntries,
        historyJsonEditable,
        historyJsonError,
        historyJsonOpen,
        historyJsonText,
        historyLoading,
        historyOpen,
        mainActionMenuItems: MAIN_ACTION_MENU_ITEMS,
        mainActionMenuSelection,
        moveOpen,
        movePreviewConfirmation,
        moveTarget,
        moveTargetState,
        metadataTableColumns: METADATA_TABLE_COLUMNS,
        nameMarkets: NAME_MARKETS,
        navboxTableColumns: NAVBOX_TABLE_COLUMNS,
        notetaTableColumns: NOTETA_TABLE_COLUMNS,
        open,
        reviewState,
        redirectTableColumns: REDIRECT_TABLE_COLUMNS,
    };
    return state;
}

/**
 * Gets save and preview setup bindings.
 *
 * @returns Save and preview setup bindings.
 */
function getPreviewSetupState(): any {
    const state = {
        preSaveMoveEnabled,
        preSaveMoveTitle,
        preSaveOpen,
        preSaveActions,
        preSaveGroups,
        preSaveProgress,
        preSaveProgressGroups,
        previewOpen,
        previewText,
        previewSummary,
        previewHtml,
        previewLoading,
        previewLoadingMessage,
        previewSubmitted,
        previewTextArea,
        sourceFetchState,
        steamNameButtons: STEAM_NAME_BUTTONS,
        steamUrl,
        tableActionTooltip,
        tableActionTooltipRef,
        tableActionIcons: TABLE_ACTION_ICONS,
        stubTagTableColumns: STUB_TAG_TABLE_COLUMNS,
        stubTagRows,
    };
    return state;
}

/**
 * Positions the shared table-action tooltip inside the viewport.
 *
 * @param rect - Trigger button bounds.
 * @returns Result when the function
 *   positions the shared table-action tooltip inside
 *   the viewport.
 */
function positionTableActionTooltip(rect: DOMRect): void {
    const tooltip = tableActionTooltipRef.value;
    const margin = 8;
    const viewportWidth =
        globalThis.innerWidth ||
        globalThis.document?.documentElement?.clientWidth ||
        0;
    const width = tooltip?.offsetWidth || 0;
    const halfWidth = width / 2;
    const centered = rect.left + rect.width / 2;
    const minLeft = margin + halfWidth;
    const maxLeft =
        viewportWidth > 0 ? viewportWidth - margin - halfWidth : centered;
    const left = selectValue(
        width > 0 && maxLeft >= minLeft,
        function trueBranch() {
            return Math.min(Math.max(centered, minLeft), maxLeft);
        },
        function falseBranch() {
            return centered;
        },
    );

    tableActionTooltip.style = {
        left: `${left}px`,
        top: `${rect.bottom + 6}px`,
    };
}

/**
 * Handles queue source editor.
 *
 * Queues source editor initialization after Vue has rendered the
 * textarea.
 *
 * @param key - Editor instance key.
 * @param textareaRef - Vue template ref.
 * @param textRef - Mutable text ref.
 * @returns *
 */
function queueSourceEditor(key: string, textareaRef: any, textRef: any): void {
    if (typeof Vue.nextTick === "function") {
        Vue.nextTick(function callback() {
            if (isSourceEditorOpen(key)) {
                initializeSourceEditor(key, textareaRef, textRef);
            }
        });
        return;
    }

    if (isSourceEditorOpen(key)) {
        initializeSourceEditor(key, textareaRef, textRef);
    }
}

/**
 * Handles initialize source editor.
 *
 * Initializes MediaWiki CodeMirror for a source textarea when
 * available.
 *
 * @param key - Editor instance key.
 * @param textareaRef - Vue template ref.
 * @param textRef - Mutable text ref.
 * @returns Resolves after enhancement attempt.
 */
async function initializeSourceEditor(
    key: string,
    textareaRef: any,
    textRef: any,
): Promise<void> {
    const textarea = findTextareaElement(textareaRef.value);

    if (!canInitializeSourceEditor(key, textarea)) {
        return;
    }

    textarea.value = textRef.value;
    sourceEditorLoads.add(key);

    try {
        const loader = getCodeMirrorLoader();

        if (loader == null) {
            return;
        }

        const require = await loader.using(CODEMIRROR_MODULES);
        attachLoadedSourceEditor(key, textarea, textareaRef, textRef, require);
    } catch (_error) {
        sourceEditors.delete(key);
    } finally {
        sourceEditorLoads.delete(key);
    }
}

/**
 * Checks whether a source editor can start loading.
 *
 * @param key - Lookup key.
 * @param textarea - Textarea value.
 * @returns Whether a source editor can start loading.
 */
function canInitializeSourceEditor(key: string, textarea: any): boolean {
    const result =
        textarea != null &&
        !sourceEditors.has(key) &&
        !sourceEditorLoads.has(key);
    return result;
}

/**
 * Attaches a loaded CodeMirror editor to the current textarea.
 *
 * @param key - Lookup key.
 * @param textarea - Textarea value.
 * @param textareaRef - Textarea ref value.
 * @param textRef - Text ref value.
 * @param require - Require value.
 */
function attachLoadedSourceEditor(
    key: string,
    textarea: HTMLTextAreaElement,
    textareaRef: { value: unknown },
    textRef: unknown,
    require: {
        (
            module: "ext.CodeMirror",
        ): new (
            textarea: HTMLTextAreaElement,
            mode: unknown,
        ) => CodeMirrorEditor;
        (module: "ext.CodeMirror.mode.mediawiki"): () => unknown;
    },
): void {
    const current = findTextareaElement(textareaRef.value);

    if (!isSourceEditorOpen(key) || current !== textarea) {
        return;
    }

    const CodeMirror = require("ext.CodeMirror");
    const mediawiki = require("ext.CodeMirror.mode.mediawiki");
    const editor = new CodeMirror(textarea, mediawiki());

    if (!isSourceEditorOpen(key)) {
        destroyLoadedSourceEditor(editor);
        return;
    }

    if (typeof editor.initialize === "function") {
        editor.initialize();
    }

    sourceEditors.set(key, { editor, textRef, textarea });
}

/**
 * Destroys one source editor instance.
 *
 * @param key - Editor instance key.
 * @returns Result when the function
 *   destroys one source editor instance.
 */
function destroySourceEditor(key: string): void {
    const state = sourceEditors.get(key);

    if (state == null) {
        return;
    }

    syncSourceEditorText(key, state.textRef);

    if (typeof state.editor.destroy === "function") {
        destroyLoadedSourceEditor(state.editor);
    } else if (typeof state.editor.toTextArea === "function") {
        destroyLoadedSourceEditor(state.editor);
    }

    sourceEditors.delete(key);
}

/**
 * Checks whether an editor key still belongs to an open dialog.
 *
 * @param key - Editor instance key.
 * @returns Whether the backing dialog is open.
 */
function isSourceEditorOpen(key: string): boolean {
    if (!componentMounted) {
        return false;
    }

    if (key === "preview") {
        return previewOpen.value === true;
    }

    if (key === "pageEdit") {
        return pageEditOpen.value === true;
    }

    return false;
}

/**
 * Tears down a CodeMirror instance with either supported API.
 *
 * @param editor - CodeMirror instance.
 * @returns Result when the function
 *   tears down a codemirror instance with either
 *   supported api.
 */
function destroyLoadedSourceEditor(editor: any): void {
    if (typeof editor.destroy === "function") {
        editor.destroy();
        return;
    }

    if (typeof editor.toTextArea === "function") {
        editor.toTextArea();
    }
}

/**
 * Releases generated preview text and HTML after dismissal.
 *
 * @returns Result when the function
 *   releases generated preview text and html after
 *   dismissal.
 */
function clearPreviewState(): void {
    previewText.value = "";
    previewSummary.value = "";
    previewHtml.value = "";
}

/**
 * Releases fetched page edit text and parsed HTML after dismissal.
 *
 * @returns Result when the function
 *   releases fetched page edit text and parsed html
 *   after dismissal.
 */
function clearPageEditState(): void {
    Object.assign(pageEditState, {
        error: "",
        html: "",
        row: null,
        text: "",
        title: "",
    });
}

/**
 * Copies the live editor text into a Vue ref.
 *
 * @param key - Editor instance key.
 * @param textRef - Mutable text ref.
 * @returns Result when the function
 *   copies the live editor text into a vue ref.
 */
function syncSourceEditorText(key: string, textRef: any): void {
    const state = sourceEditors.get(key);

    if (state == null) {
        return;
    }

    const text = getCodeMirrorText(state.editor, state.textarea);

    const target = textRef || state.textRef;

    if (target != null) {
        target.value = text;
    }
}

/**
 * Pushes refreshed source text into an existing editor instance.
 *
 * @param key - Editor instance key.
 * @param text - Source text.
 * @returns Result when the function
 *   pushes refreshed source text into an existing
 *   editor instance.
 */
function setSourceEditorText(key: string, text: string): void {
    const state = sourceEditors.get(key);

    if (state == null) {
        return;
    }

    setCodeMirrorText(state.editor, state.textarea, text);
}

/**
 * Refreshes category rows through the owning module.
 *
 * @param refreshOptions - Refresh options value.
 * @returns Resolves after rows are refreshed.
 */
async function refreshCategoryRows(refreshOptions = {}): Promise<void> {
    const categoryRows: unknown[] = form.categoryRows;

    if (
        shouldSkipFixedRows(
            refreshOptions,
            categoryRows.filter((row) => !isBlankCategoryRow(row)),
            isCategoryRowFixed,
        )
    ) {
        syncStubTagRowsFromCategories(form);
        return;
    }

    await options.onCategoryRowsRefresh(form, categoryState, refreshOptions);
    applyCategoryPatches(form.categoryRows, form.historyPatches?.categories);
    markCategoryRowsFixed(form.categoryRows);
    ensureTrailingCategoryRow(form, options.onCreateCategoryRow);
    syncStubTagRowsFromCategories(form);
}

/**
 * Gets category refresh options for a review refresh.
 *
 * @param refreshOptions - Requested refresh options.
 * @returns Category refresh options.
 */
function getCategoryRefreshOptions(refreshOptions: any): any {
    if (refreshOptions.recheck !== true) {
        return refreshOptions;
    }

    const result = {
        ...refreshOptions,
        bypassCache: true,
    };
    return result;
}

/**
 * Refreshes categories and generated review details.
 *
 * @param refreshOptions - Refresh options value.
 * @returns Resolves after review data is refreshed.
 */
async function refreshReview(refreshOptions: any = {}): Promise<void> {
    reviewState.error = "";
    reviewState.loading = true;

    try {
        await Promise.all([
            refreshCategoryRows(getCategoryRefreshOptions(refreshOptions)),
            refreshRedirectRows(refreshOptions),
            refreshNavboxRows(
                refreshOptions.recheck === true,
                false,
                refreshOptions,
            ),
        ]);
    } catch (error) {
        reviewState.error = error.message || String(error);
    } finally {
        reviewState.loading = false;
    }
}

/**
 * Refreshes editable citation rows from the current source URLs.
 *
 * @returns Resolves after citation rows are ready.
 */
async function refreshCitationRows(): Promise<void> {
    if (options.onPrepareCitations == null) {
        return;
    }

    citationState.error = "";
    citationState.loading = true;
    sourceFetchState.error = "";
    sourceFetchState.loading = true;

    try {
        const rows = await options.onPrepareCitations(form);
        const patchedRows = applyCitationPatches(
            rows.map(createCitationRow),
            form.historyPatches?.citations,
        );

        form.citationRows.splice(0, form.citationRows.length, ...patchedRows);
        syncActiveCitationTab();
    } catch (error) {
        citationState.error = error.message || String(error);
        sourceFetchState.error = citationState.error;
    } finally {
        citationState.loading = false;
        sourceFetchState.loading = false;
    }
}

/**
 * Keeps the active citation tab pointed at an available row.
 *
 * @returns Result when the function
 *   keeps the active citation tab pointed at an
 *   available row.
 */
function syncActiveCitationTab(): void {
    const names = form.citationRows.map(getCitationTabName);

    activeCitationTab.value = selectValue(
        names.includes(activeCitationTab.value),
        function trueBranch() {
            return activeCitationTab.value;
        },
        function falseBranch() {
            return names[0] || "";
        },
    );
}

/**
 * Merges a refreshed navbox row with the current editable row.
 *
 * @param row - Refreshed navbox row.
 * @param index - Row index.
 * @returns Merged row.
 */
function updatePreparedNavboxRow(row: any, index: number): any {
    const current = form.navboxRows[index];

    if (current == null) {
        return row;
    }

    Object.assign(current, row);
    return current;
}

/**
 * Generates navbox rows when needed or explicitly requested.
 *
 * @param force - Whether to replace reviewed rows.
 * @param rebuild - Rebuild value.
 * @param refreshOptions - Refresh options value.
 * @returns Resolves after navbox rows are
 * refreshed.
 */
async function refreshNavboxRows(
    force: boolean,
    rebuild = false,
    refreshOptions = {},
): Promise<void> {
    if (!force && navboxRowsPrepared) {
        return;
    }

    if (shouldSkipNavboxRefresh(force, rebuild, refreshOptions)) {
        navboxRowsPrepared = true;
        return;
    }

    const rows = await getPreparedNavboxRows(rebuild);

    if (!rebuild && Array.isArray(form.navboxRows)) {
        mergePreparedNavboxRows(rows);
        return;
    }

    form.navboxRows = rows;
    ensureTrailingNavboxRow(form);
    navboxRowsPrepared = true;
}

/**
 * Checks whether fixed navbox rows should be preserved.
 *
 * @param force - Force value.
 * @param rebuild - Rebuild value.
 * @returns Whether fixed navbox rows should be preserved.
 */
function shouldSkipNavboxRefresh(
    force: boolean,
    rebuild: boolean,
    refreshOptions: {},
): boolean {
    const navboxRows: unknown[] = form.navboxRows || [];
    const rows = navboxRows.filter((row) => !isBlankNavboxRow(row));
    const result =
        force &&
        !rebuild &&
        shouldSkipFixedRows(refreshOptions, rows, isNavboxRowFixed);
    return result;
}

/**
 * Builds patched generated navbox rows.
 *
 * @param rebuild - Rebuild value.
 * @returns Patched generated navbox rows.
 */
async function getPreparedNavboxRows(rebuild: boolean): Promise<any[]> {
    const prepared = await options.onPrepareReview(form, rebuild);
    const rows = prepared.map(function callback(row: unknown) {
        return createNavboxRow(row, true);
    });
    return applyNavboxPatches(rows, form.historyPatches?.navboxes);
}

/**
 * Merges generated navboxes into the current reactive rows.
 *
 * @param rows - Row values.
 */
function mergePreparedNavboxRows(rows: Array<any>): void {
    const merged = rows.map(updatePreparedNavboxRow);
    form.navboxRows.splice(0, form.navboxRows.length, ...merged);
    ensureTrailingNavboxRow(form);
    navboxRowsPrepared = true;
}

/**
 * Refreshes generated redirect review rows.
 *
 * @param refreshOptions - Refresh options value.
 * @returns Resolves after redirect rows are
 * refreshed.
 */
async function refreshRedirectRows(refreshOptions = {}): Promise<void> {
    if (options.onPrepareRedirectRows == null) {
        return;
    }

    if (Array.isArray(form.redirectRows)) {
        await checkRedirectRows(refreshOptions);
        return;
    }

    const preparedRows: unknown[] = await options.onPrepareRedirectRows(
        form,
        getCurrentTitle(),
    );
    const rows = preparedRows.map((row) => createRedirectRow(row, true));

    form.redirectRows = rows;
    ensureTrailingRedirectRow(form);
}

/**
 * Checks current redirect review rows in place.
 *
 * @param refreshOptions - Refresh options value.
 * @returns Resolves after redirect rows are fixed.
 */
async function checkRedirectRows(refreshOptions = {}): Promise<void> {
    if (options.onCheckRedirectRows == null) {
        return;
    }

    let currentRows = [];

    if (Array.isArray(form.redirectRows)) {
        currentRows = form.redirectRows;
    }
    const rowsToCheck = currentRows.filter((row) => !isBlankRedirectRow(row));

    if (shouldSkipFixedRows(refreshOptions, rowsToCheck, isRedirectRowFixed)) {
        return;
    }

    const checkedRows: unknown[] = await options.onCheckRedirectRows(
        rowsToCheck,
        getCurrentTitle(),
    );
    const rows = checkedRows.map((row) => createRedirectRow(row, true));

    form.redirectRows = rows.map(mergeCheckedRedirectRow);
    ensureTrailingRedirectRow(form);
}

/**
 * Preserves editable state for a checked redirect row.
 *
 * @param row - Row values.
 * @param index - Zero-based item index.
 * @returns Result when the function
 *   preserves editable state for a checked redirect
 *   row.
 */
function mergeCheckedRedirectRow(row: any, index: number): any {
    const current = form.redirectRows[index];

    if (current == null) {
        return row;
    }

    row.enabled = !row.exists;
    return row;
}

/**
 * Opens a source editor for a page action staged at final submit.
 *
 * @param params - Page edit parameters.
 * @param params.create - Whether the page is missing.
 * @param params.kind - Edited row kind.
 * @param params.row - Review row to update.
 * @param params.title - Full page title.
 * @returns Resolves after the editor is populated.
 */
async function openPageEdit(params: any): Promise<void> {
    Object.assign(pageEditState, createOpenPageEditState(params));
    pageEditOpen.value = true;
    queueSourceEditor("pageEdit", pageEditTextArea, pageEditTextBinding);

    try {
        await loadPageEditText(params);
    } catch (error) {
        pageEditState.error = error.message || String(error);
    } finally {
        pageEditState.loading = false;
    }
}

/**
 * Creates initial state for an opened page editor.
 *
 * @param params - Params value.
 * @returns Initial state for an opened page editor.
 */
function createOpenPageEditState(params: any): any {
    const row = params.row;
    let company = "";

    if (params.kind === "category") {
        company = trimFieldValue(row.company);
    }
    const result = {
        create: params.create,
        company,
        englishName: trimFieldValue(
            row.pendingEdit?.englishName || row.pendingCreation?.englishName,
        ),
        error: "",
        html: "",
        kind: params.kind,
        loading: true,
        pending: row.pendingEdit != null,
        previousStatus: row.pendingEdit?.previousStatus || row.status,
        row,
        text: "",
        title: params.title,
    };
    return result;
}

/**
 * Loads and parses the source used by a page editor.
 *
 * @param params - Params value.
 */
async function loadPageEditText(params: any): Promise<void> {
    const staged = getStagedPageText(params.row, params.kind);
    pageEditState.text = staged ?? (await getPageEditFallbackText(params));
    setSourceEditorText("pageEdit", pageEditState.text);
    pageEditState.html = await options.onParsePreview(
        pageEditState.text,
        params.title,
    );
}

/**
 * Gets source text when no staged page edit exists.
 *
 * @param params - Params value.
 * @returns Source text when no staged page edit exists.
 */
async function getPageEditFallbackText(params: any): Promise<string> {
    if (params.create) {
        return await getNewPageEditText(params);
    }

    return await options.onFetchPageText(params.title);
}

/**
 * Gets already staged source text for a review row.
 *
 * @param row - Review row.
 * @param kind - Review row kind.
 * @returns Staged source text.
 */
function getStagedPageText(row: any, kind: string): string | undefined {
    if (kind === "category" && row.pendingCreation != null) {
        return String(row.pendingCreation.text || "");
    }

    if (row.pendingEdit != null) {
        return String(row.pendingEdit.text || "");
    }

    return undefined;
}

/**
 * Handles get page edit create state.
 *
 * Gets whether a review-row source editor should create or modify a
 * page.
 *
 * @param row - Review row.
 * @param fallbackCreate - Status-derived create state.
 * @returns Whether the editor should stage a create.
 */
function getPageEditCreateState(row: any, fallbackCreate: boolean): boolean {
    if (row?.pendingEdit != null) {
        return row.pendingEdit.create === true;
    }

    if (row?.pendingCreation != null) {
        return true;
    }

    return fallbackCreate;
}

/**
 * Gets the initial source for a missing page.
 *
 * @param params - Page edit parameters.
 * @returns Initial source text.
 */
async function getNewPageEditText(params: any): Promise<string> {
    if (
        params.kind === "category" &&
        trimFieldValue(params.row.company) !== ""
    ) {
        return options.onPrepareCompanyCategory(params.row);
    }

    if (params.kind === "redirect") {
        return `#REDIRECT [[${getCurrentTitle()}]]\n`;
    }

    return "";
}

/**
 * Stages the current page edit for the final submit.
 *
 * @returns Result when the function
 *   stages the current page edit for the final submit.
 */
function stagePageEdit(): void {
    const row = pageEditState.row;

    if (row == null) {
        return;
    }

    if (pageEditState.kind === "category" && pageEditState.create) {
        stageCategoryCreation(row);
        return;
    }

    row.pendingEdit = createPendingPageEdit(row);
    row.enabled = true;
    row.status = "Pending edit";

    if (pageEditState.create) {
        row.status = "Pending creation";
    }
    closePageEditor();
}

/**
 * Stages a new company category page.
 *
 * @param row - Row values.
 */
function stageCategoryCreation(row: any): void {
    row.pendingCreation = {
        englishName: trimFieldValue(pageEditState.englishName),
        previousStatus: row.pendingCreation?.previousStatus || row.status,
        text: pageEditState.text,
    };
    row.enabled = true;
    row.status = "Pending creation";
    closePageEditor();
}

/**
 * Creates a staged generic page edit payload.
 *
 * @param row - Row values.
 * @returns A staged generic page edit payload.
 */
function createPendingPageEdit(row: any): any {
    const englishName = trimFieldValue(pageEditState.englishName);
    const pending = {
        create: pageEditState.create,
        ...(englishName === "" ? {} : { englishName }),
        previousStatus:
            row.pendingEdit?.previousStatus || pageEditState.previousStatus,
        summary: buildPageEditSummary(pageEditState),
        text: pageEditState.text,
        title: pageEditState.title,
    };
    return pending;
}

/**
 * Closes and clears the page source editor.
 */
function closePageEditor(): void {
    destroySourceEditor("pageEdit");
    pageEditOpen.value = false;
    clearPageEditState();
}

/**
 * Cancels staged source changes for the current review row.
 *
 * @returns Result when the function
 *   cancels staged source changes for the current
 *   review row.
 */
function resetPageEdit(): void {
    const row = pageEditState.row;

    if (row == null || row.pendingEdit == null) {
        return;
    }

    row.status =
        row.pendingEdit.previousStatus || pageEditState.previousStatus;
    delete row.pendingEdit;
    destroySourceEditor("pageEdit");
    pageEditOpen.value = false;
    clearPageEditState();
}

/**
 * Builds the edit summary for one staged page edit.
 *
 * @param state - Page edit state.
 * @returns Edit summary text.
 */
function buildPageEditSummary(state: any): string {
    const action = state.create ? "create" : "modify";
    const suffix = selectValue(
        state.kind === "navbox",
        function trueBranch() {
            return `, with link to '[[${currentTitle}]]'`;
        },
        function falseBranch() {
            return "";
        },
    );

    if (state.kind === "navbox" && !state.create) {
        return `add link to '[[${currentTitle}]]'`;
    }

    return `${action} '${state.title}'${suffix}`;
}

/**
 * Gets the current page title.
 *
 * @returns Current page title.
 */
function getCurrentTitle(): string {
    return trimFieldValue(form.pageName) || currentTitle;
}

/**
 * Handles move field url to source.
 *
 * Moves a URL entered into a source-backed value field to its
 * source field.
 *
 * @param field - Article parameter field.
 * @param field.key - Form key for the article value.
 * @param field.sourceField - Source reference field.
 * @param field.sourceField.sourceKey - Form key for the
 * source
 * URL.
 * @param value - Raw input value.
 * @returns Whether the URL was moved.
 */
function moveFieldUrlToSource(field: any, value: string): boolean {
    const sourceKey = field.sourceField?.sourceKey;
    const sourceUrl = trimFieldValue(value);

    if (sourceKey == null || !/^https?:\/\/\S+$/iu.test(sourceUrl)) {
        return false;
    }

    const existingValue = trimFieldValue(form[sourceKey]);
    form[sourceKey] = selectValue(
        existingValue === "",
        function trueBranch() {
            return sourceUrl;
        },
        function falseBranch() {
            return `${existingValue}\n${sourceUrl}`;
        },
    );
    form[field.key] = "";

    return true;
}

/**
 * Gets the editable article preview dialog title.
 *
 * @returns Preview dialog title.
 */
function getArticlePreviewTitle(): string {
    return msg("preview.createPageTitle", { title: getCurrentTitle() });
}

/**
 * Builds a small wikitext preview for one field.
 *
 * @param field - Article parameter field.
 * @returns Preview wikitext, or an empty string.
 */
function getFieldPreview(field: any): string {
    if (options.getFieldPreview == null) {
        return "";
    }

    return options.getFieldPreview(form, field.previewKey || field.key) || "";
}

/**
 * Builds a small wikitext preview for one group.
 *
 * @param group - Article parameter group.
 * @returns Preview wikitext, or an empty string.
 */
function getGroupPreview(group: any): string {
    if (options.getFieldPreview == null || !group.previewKey) {
        return "";
    }

    return options.getFieldPreview(form, group.previewKey) || "";
}

/**
 * Formats the generated prose length for the full-text preview.
 *
 * @returns The generated prose length for the full-text preview.
 */
function getProseReviewDescription(): string {
    const result = msg("preview.sinographs", {
        count: options.getProseSinographs(form),
    });
    return result;
}

/**
 * Gets the Wikidata note text.
 *
 * @returns Wikidata ID or lookup status text.
 */
function getWikidataText(): string {
    const result =
        form.wikidataId ||
        options.getFieldPlaceholder(form, {
            key: "wikidataId",
        }) ||
        "";
    return result;
}

/**
 * Formats the Wikidata lookup note beside the metadata fields.
 *
 * @returns The Wikidata lookup note beside the metadata fields.
 */
function getWikidataStatusText(): string {
    return msg("metadata.wikidataText", { value: getWikidataText() });
}

/**
 * Gets external links discovered from the English Wikipedia title.
 *
 * @returns Tip link definitions.
 */
function getEnwikiTipLinks(): Array<any> {
    if (enwikiLookupLoading.value) {
        return createEnwikiTipPlaceholders(msg("metadata.checking"));
    }

    const title = getBasePageTitle(form.enwikiTitle);
    const links = [
        createWikidataTipLink(title),
        createServiceTipLink("Metacritic", enwikiMetadata.metacriticId, title),
        createServiceTipLink("OpenCritic", enwikiMetadata.openCriticId, title),
        createServiceTipLink("Steam", enwikiMetadata.steamId, title),
    ];
    return links;
}

/**
 * Creates the Wikidata lookup tip link.
 *
 * @param title - Page title.
 * @returns The Wikidata lookup tip link.
 */
function createWikidataTipLink(title: string): any {
    const id = form.wikidataId;
    let url = getOptionalSearchUrl(title, buildWikidataSearchUrl);

    if (id) {
        url = `https://www.wikidata.org/wiki/${encodeURIComponent(id)}`;
    }
    const result = {
        label: "Wikidata",
        value: id || getWikidataLookupStatus(enwikiMetadata.pageExists),
        url,
    };
    return result;
}

/**
 * Creates one external review service tip link.
 *
 * @param label - Label value.
 * @param id - Id value.
 * @param title - Page title.
 * @returns One external review service tip link.
 */
function createServiceTipLink(
    label: string,
    id: string,
    title: string,
): unknown {
    let url = getServiceSearchUrl(label, title);

    if (id) {
        url = buildServiceUrl(label, id);
    }
    const result = {
        label,
        value:
            id || (title ? msg("metadata.search") : msg("metadata.notFound")),
        url,
    };
    return result;
}

/**
 * Builds a direct external review service URL.
 *
 * @param label - Label value.
 * @param id - Id value.
 * @returns A direct external review service URL.
 */
function buildServiceUrl(label: string, id: string): string {
    if (label === "Metacritic") {
        return buildMetacriticUrl(id);
    }

    if (label === "OpenCritic") {
        return buildOpenCriticUrl(id);
    }

    return buildSteamUrl(id);
}

/**
 * Builds an external review service search URL.
 *
 * @param label - Label value.
 * @param title - Page title.
 * @returns An external review service search URL.
 */
function getServiceSearchUrl(label: string, title: string): string {
    if (title === "") {
        return "";
    }

    if (label === "Metacritic") {
        return buildMetacriticSearchUrl(title);
    }

    if (label === "OpenCritic") {
        return buildOpenCriticSearchUrl(title);
    }

    return buildSteamSearchUrl(title);
}

/**
 * Calls a search URL builder only for a nonblank title.
 *
 * @param title - Page title.
 * @returns Result when the function
 *   calls a search url builder only for a nonblank
 *   title.
 */
function getOptionalSearchUrl(
    title: string,
    buildUrl: { (title: string): string; (arg0: unknown): string },
): string {
    return title === "" ? "" : buildUrl(title);
}

/**
 * Opens Metacritic and OpenCritic lookup links in new tabs.
 *
 * @returns Result when the function
 *   opens metacritic and opencritic lookup links in
 *   new tabs.
 */
function openEnwikiReviewLinks(): void {
    if (typeof window?.open !== "function") {
        return;
    }

    const openedTabs = getEnwikiTipLinks()
        .filter(function callback(link) {
            return ["Metacritic", "OpenCritic"].includes(link.label);
        })
        .map(function callback(link) {
            if (!link.url || openedReviewLinkUrls.has(link.url)) {
                return null;
            }

            openedReviewLinkUrls.add(link.url);

            return window.open(link.url, "_blank");
        })
        .filter((tab) => tab != null);

    const firstTab = openedTabs[0];

    if (typeof firstTab?.focus === "function") {
        firstTab.focus();
    }
}

/**
 * Gets original and English title lookup rows.
 *
 * @returns Search row definitions.
 */
function getNameSearchRows(): Array<any> {
    const rows = [
        {
            key: "original",
            query: getOriginalNameSearchQuery(),
        },
        {
            key: "english",
            query: getEnglishNameSearchQuery(),
        },
    ].filter((row) => row.query !== "");

    const result = rows.map(function callback(row) {
        const result = {
            ...row,
            links: buildNameSearchLinks(row.query),
        };
        return result;
    });
    return result;
}

/**
 * Builds title lookup links for one search query.
 *
 * @param query - Search query title.
 * @returns Search link definitions.
 */
function buildNameSearchLinks(query: string): Array<any> {
    const result = [
        {
            label: msg("names.cnDomain"),
            url: buildGoogleSiteSearchUrl(query, "*.cn"),
        },
        {
            label: msg("names.bahamut"),
            url: buildGoogleSiteSearchUrl(query, "gnn.gamer.com.tw"),
        },
        {
            label: "zhwp",
            url:
                "https://cse.google.com.hk/cse?cx=25f8f2342cbfa4e46&q=" +
                encodeURIComponent(`"${getBasePageTitle(query)}"`),
        },
    ];
    return result;
}

/**
 * Gets the original-title lookup query.
 *
 * @returns Search query title.
 */
function getOriginalNameSearchQuery(): string {
    return getBasePageTitle(parsePrefixedValue(form.originalName, "").value);
}

/**
 * Gets the English-title lookup query.
 *
 * @returns Search query title.
 */
function getEnglishNameSearchQuery(): string {
    return getBasePageTitle(form.englishName);
}

/**
 * Handles sync page name fields.
 *
 * Ensures page-name fields have current values after form
 * replacement.
 *
 * @returns *
 */
function syncPageNameFields(): void {
    if (trimFieldValue(form.pageName) === "") {
        form.pageName = currentTitle;
    }
}

/**
 * Fetches localized Steam names for the current helper URL.
 *
 * @returns Resolves after helper rows are updated.
 */
async function fetchSteamNames(): Promise<void> {
    if (options.onSteamNamesFetch == null) {
        return;
    }

    sourceFetchState.error = "";
    sourceFetchState.loading = true;

    try {
        const rows = await options.onSteamNamesFetch(steamUrl.value, {
            includeJapanese: getOriginalNameLanguage(form) === "ja",
        });

        fetchedSteamNameRows.value = rows;
    } catch (error) {
        sourceFetchState.error = error.message;
    } finally {
        sourceFetchState.loading = false;
    }
}

/**
 * Refreshes form values derived from the English Wikipedia title.
 *
 * @returns Resolves after the lookup is handled.
 */
async function refreshEnwikiMetadata(): Promise<void> {
    const title = trimFieldValue(form.enwikiTitle);
    const serial = enwikiLookupSerial.value + 1;

    resetEnwikiMetadataLookup(title, serial);

    if (title === "" || options.onEnwikiTitleChange == null) {
        return;
    }

    const metadata = await fetchEnwikiMetadata(title);

    if (serial !== enwikiLookupSerial.value) {
        return;
    }

    applyEnwikiMetadata(metadata);
    applyEnwikiSourceUrls();
    const fetchSteam = prepareEnwikiSteamNames();
    enwikiLookupLoading.value = false;
    openEnwikiReviewLinks();

    if (fetchSteam) {
        await fetchSteamNames();
    }
}

/**
 * Clears metadata before starting an English Wikipedia lookup.
 *
 * @param title - Page title.
 * @param serial - Serial value.
 */
function resetEnwikiMetadataLookup(title: string, serial: number): void {
    enwikiLookupSerial.value = serial;
    enwikiLookupLoading.value =
        title !== "" && options.onEnwikiTitleChange != null;
    form.wikidataId = "";
    Object.assign(enwikiMetadata, createBlankEnwikiMetadata());
}

/**
 * Fetches English Wikipedia metadata with an empty fallback.
 *
 * @param title - Page title.
 * @returns English Wikipedia metadata with an empty fallback.
 */
async function fetchEnwikiMetadata(title: string): Promise<any> {
    try {
        return await options.onEnwikiTitleChange(title);
    } catch (_error) {
        return {};
    }
}

/**
 * Applies fetched English Wikipedia metadata to form state.
 *
 * @param metadata - Article metadata.
 */
function applyEnwikiMetadata(metadata: any): void {
    const hasPageState =
        metadata.pageExists === true || metadata.pageExists === false;
    Object.assign(enwikiMetadata, {
        metacriticId: trimFieldValue(metadata.metacriticId),
        openCriticId: trimFieldValue(metadata.openCriticId),
        pageExists: hasPageState ? metadata.pageExists : null,
        steamId: trimFieldValue(metadata.steamId),
    });
    form.wikidataId = trimFieldValue(metadata.wikidataId);

    if (trimFieldValue(form.englishName) === "") {
        form.englishName = getBasePageTitle(metadata.title);
    }
}

/**
 * Fills blank review source URLs from fetched service IDs.
 */
function applyEnwikiSourceUrls(): void {
    if (
        trimFieldValue(form.metacriticScoreSourceUrl) === "" &&
        enwikiMetadata.metacriticId
    ) {
        form.metacriticScoreSourceUrl = buildMetacriticUrl(
            enwikiMetadata.metacriticId,
        );
    }

    if (
        trimFieldValue(form.openCriticRecommendSourceUrl) === "" &&
        enwikiMetadata.openCriticId
    ) {
        form.openCriticRecommendSourceUrl = buildOpenCriticUrl(
            enwikiMetadata.openCriticId,
        );
    }
}

/**
 * Prepares a Steam name lookup when a new app ID is available.
 *
 * @returns Result when the function
 *   prepares a steam name lookup when a new app id is
 *   available.
 */
function prepareEnwikiSteamNames(): boolean {
    const shouldFetch =
        trimFieldValue(steamUrl.value) === "" && enwikiMetadata.steamId;

    if (shouldFetch) {
        steamUrl.value = buildSteamUrl(enwikiMetadata.steamId);
        fetchedSteamNameRows.value = [];
    }

    return Boolean(shouldFetch);
}

/**
 * Handles refresh company category metadata.
 *
 * Refreshes Wikidata metadata for the company-category English
 * title.
 *
 * @returns Resolves after lookup state is updated.
 */
async function refreshCompanyCategoryMetadata(): Promise<void> {
    const title = normalizeEnglishCategoryTitle(
        companyCategoryState.englishName,
    );
    const serial = companyCategoryLookupSerial.value + 1;

    companyCategoryLookupSerial.value = serial;
    companyCategoryState.wikidataId = "";
    companyCategoryLookupLoading.value =
        title !== "" && options.onEnwikiTitleChange != null;

    if (title === "" || options.onEnwikiTitleChange == null) {
        return;
    }

    let metadata: { wikidataId?: unknown };

    try {
        metadata = await options.onEnwikiTitleChange(title);
    } catch (_error) {
        metadata = {};
    }

    if (serial !== companyCategoryLookupSerial.value) {
        return;
    }

    companyCategoryState.wikidataId = trimFieldValue(metadata.wikidataId);
    companyCategoryLookupLoading.value = false;
}

/**
 * Restores form values from history and refreshes enwiki metadata.
 *
 * @param values - Restored form values.
 * @returns Resolves after enwiki metadata is
 * refreshed.
 */
async function restoreHistoryForm(values: any): Promise<void> {
    enwikiLookupSerial.value += 1;
    enwikiLookupLoading.value = false;
    clearFormState();
    replaceFormValues(form, values);
    syncGeneratedNameNoteTaRow(form);
    navboxRowsPrepared = false;
    await refreshEnwikiMetadata();
}

/**
 * Clears form values and helper state.
 *
 * @returns Result when the function
 *   clears form values and helper state.
 */
function clearFormState(): void {
    replaceFormValues(form, {
        ...createFormValues(),
        publishers: "",
    });
    syncPageNameFields();
    syncGeneratedNameNoteTaRow(form);
    activeTab.value = ARTICLE_PARAMETER_GROUPS[0].key;
    activeCitationTab.value = "";
    fetchedSteamNameRows.value = [];
    steamUrl.value = "";
    Object.assign(enwikiMetadata, createBlankEnwikiMetadata());
    categoryState.error = "";
    citationState.error = "";
    reviewState.error = "";
    sourceFetchState.error = "";
    navboxRowsPrepared = false;
    form.redirectRows = null;
}

/**
 * Removes rows previously inserted by the Steam helper.
 *
 * @returns Result when the function
 *   removes rows previously inserted by the steam
 *   helper.
 */
function removeSteamAppliedNameRows(): void {
    form.localizedNames = form.localizedNames.filter(function callback(
        row: Record<PropertyKey, unknown>,
    ) {
        return row[STEAM_NAME_HELPER_ROW] !== true && hasAnyNameRowValue(row);
    });
}

/**
 * Formats a review row status as a compact badge label.
 *
 * @param row - Review row or raw status.
 * @param isBlank - Blank row checker.
 * @returns Compact status label.
 */
function formatReviewRowStatusLabel(
    row: any | string,
    isBlank: (...args: any[]) => any,
): string {
    if (typeof row === "object" && row != null && isBlank(row)) {
        return msg("review.empty");
    }

    const status = typeof row === "object" && row != null ? row.status : row;

    const result =
        {
            Exists: msg("review.ok"),
            Missing: msg("review.missing"),
            "Not exists": msg("review.missing"),
            OK: msg("review.ok"),
            "Pending creation": msg("review.pending"),
            "Pending edit": msg("review.pending"),
        }[status] || msg("review.unchecked");
    return result;
}

/**
 * Gets the InfoChip status for a review row.
 *
 * @param row - Review row or raw status.
 * @param isBlank - Blank row checker.
 * @returns Codex InfoChip status.
 */
function getReviewRowStatusChipStatus(
    row: any | string,
    isBlank: (...args: any[]) => any,
): string {
    if (typeof row === "object" && row != null && isBlank(row)) {
        return "notice";
    }

    const status = typeof row === "object" && row != null ? row.status : row;

    return getReviewStatusChipStatus(status);
}

/**
 * Finds the generated parameter that should restore one citation row.
 *
 * @param citation - Managed citation row.
 * @param paramIndex - Editable parameter index.
 * @returns Generated parameter row.
 */
function findGeneratedCitationParam(
    citation: any,
    paramIndex: number,
): any | undefined {
    const param = citation.params[paramIndex];
    const name = trimFieldValue(param?.name);
    const generatedParams: Array<{ name: string }> =
        citation.generatedParams || [];

    const result =
        generatedParams.find((generated) => generated.name === name) ||
        generatedParams[paramIndex];
    return result;
}

/**
 * Checks whether two citation parameter lists have the same values.
 *
 * @param first - First parameter list.
 * @param second - Second parameter list.
 * @returns Whether the parameter lists are equal.
 */
function areCitationParamsEqual(
    first: Array<any> = [],
    second: Array<any> = [],
): boolean {
    return JSON.stringify(first) === JSON.stringify(second || []);
}

const WIKI_LINK_COMPLETION_FIELDS = new Set([
    "developers",
    "publishers",
    "series",
    "platforms",
    "genres",
]);

/**
 * Completes wiki-link brackets for selected metadata list fields.
 *
 * @param key - Form field key.
 * @param value - Current input value.
 * @param previousValue - Previous stored field value.
 * @returns Input value with the matching wiki-link brackets
 * inserted.
 */
function completeWikiLinkBrackets(
    key: string,
    value: any,
    previousValue: any,
): string {
    const text = String(value ?? "");

    if (!WIKI_LINK_COMPLETION_FIELDS.has(key)) {
        return text;
    }

    const insertion = getInsertedText(String(previousValue ?? ""), text);

    if (insertion == null) {
        return text;
    }

    const openingMarkerIndex = getInsertedMarkerIndex(text, insertion, "[[");

    if (openingMarkerIndex >= 0) {
        return completeOpeningWikiLink(text, openingMarkerIndex);
    }

    const closingMarkerIndex = getInsertedMarkerIndex(text, insertion, "]]");

    if (closingMarkerIndex >= 0) {
        return completeClosingWikiLink(text, closingMarkerIndex);
    }

    return text;
}

/**
 * Finds the single inserted range between two text values.
 *
 * @param previousText - Previous text.
 * @param text - Current text.
 * @returns Inserted text and index, or null when not a
 * simple
 * insertion.
 */
function getInsertedText(previousText: string, text: string): any | null {
    if (text.length <= previousText.length) {
        return null;
    }

    let start = 0;

    while (
        start < previousText.length &&
        previousText[start] === text[start]
    ) {
        start += 1;
    }

    let previousEnd = previousText.length;
    let textEnd = text.length;

    while (
        previousEnd > start &&
        textEnd > start &&
        previousText[previousEnd - 1] === text[textEnd - 1]
    ) {
        previousEnd -= 1;
        textEnd -= 1;
    }

    if (previousEnd !== start) {
        return null;
    }

    const result = {
        index: start,
        text: text.slice(start, textEnd),
    };
    return result;
}

/**
 * Locates a completed marker touched by the current insertion.
 *
 * @param text - Current text.
 * @param insertion - Inserted text and index.
 * @param marker - Marker to find.
 * @returns Marker index, or -1 when the insertion did not
 * complete
 * it.
 */
function getInsertedMarkerIndex(
    text: string,
    insertion: any,
    marker: string,
): number {
    const start = Math.max(0, insertion.index - marker.length + 1);
    const end = insertion.index + insertion.text.length;

    for (let index = start; index <= end - marker.length; index += 1) {
        if (text.slice(index, index + marker.length) === marker) {
            return index;
        }
    }

    return -1;
}

/**
 * Completes an opening wiki-link marker by adding its close marker.
 *
 * @param text - Current input text.
 * @param markerIndex - Index where "[[" was inserted.
 * @returns Completed input text.
 */
function completeOpeningWikiLink(text: string, markerIndex: number): string {
    const segmentEnd = findListSegmentEnd(text, markerIndex + 2);
    const segmentAfterMarker = text.slice(markerIndex + 2, segmentEnd);

    if (segmentAfterMarker.includes("]]")) {
        return text;
    }

    const trailingWhitespace = segmentAfterMarker.match(/\s*$/u)[0];
    const insertIndex = segmentEnd - trailingWhitespace.length;

    const result = [
        "",
        text.slice(0, insertIndex),
        "]]",
        text.slice(insertIndex),
        "",
    ].join("");
    return result;
}

/**
 * Completes a closing wiki-link marker by adding its open marker.
 *
 * @param text - Current input text.
 * @param markerIndex - Index where "]]" was inserted.
 * @returns Completed input text.
 */
function completeClosingWikiLink(text: string, markerIndex: number): string {
    const segmentStart = findListSegmentStart(text, markerIndex);
    const segmentBeforeMarker = text.slice(segmentStart, markerIndex);

    if (segmentBeforeMarker.includes("[[")) {
        return text;
    }

    if (trimFieldValue(segmentBeforeMarker) === "") {
        return text;
    }

    const leadingWhitespace = segmentBeforeMarker.match(/^\s*/u)[0];
    const insertIndex = segmentStart + leadingWhitespace.length;

    const result = [
        "",
        text.slice(0, insertIndex),
        "[[",
        text.slice(insertIndex),
        "",
    ].join("");
    return result;
}

/**
 * Handles find list segment start.
 *
 * Finds the start index of the current semicolon/newline-delimited
 * item.
 *
 * @param text - Current input text.
 * @param index - Index inside the current item.
 * @returns Segment start index.
 */
function findListSegmentStart(text: string, index: number): number {
    const before = text.slice(0, index);
    const separatorIndex = Math.max(
        before.lastIndexOf(";"),
        before.lastIndexOf("；"),
        before.lastIndexOf("\n"),
        before.lastIndexOf("\r"),
    );

    return separatorIndex < 0 ? 0 : separatorIndex + 1;
}

/**
 * Finds the end index of the current semicolon/newline-delimited item.
 *
 * @param text - Current input text.
 * @param index - Index inside the current item.
 * @returns Segment end index.
 */
function findListSegmentEnd(text: string, index: number): number {
    const match = text.slice(index).match(/[;；\r\n]/u);

    return match == null ? text.length : index + match.index;
}

import {
    markSteamNameHelperRow,
    formatCategorySourceLabel,
    formatCategorySourceTitle,
    normalizeEnglishCategoryTitle,
    syncStubTagRowsFromCategories,
    buildStubTagRowsFromCategories,
    ensureStubTagRows,
    cleanEditableRows,
    ensureTrailingCategoryRow,
    ensureTrailingRedirectRow,
    ensureTrailingNavboxRow,
    ensureTrailingStubTagRow,
    isBlankCategoryRow,
    isBlankStubTagRow,
    createStubTagRow,
    trimStubTagValue,
    createCitationPrefetchQueue,
    createFormValues,
    createNameRow,
    applyLocalizedNameAsPageTitle,
    createNoteTaRow,
    createNameRowFromValues,
    getSteamNameSuggestions,
    getOriginalNameLanguage,
    buildSteamNameChoiceRows,
    ensureTrailingNameRow,
    hasAnyNameRowValue,
    getArticleField,
    getReviewStatusChipStatus,
    getBasePageTitle,
    createBlankEnwikiMetadata,
    getWikidataLookupStatus,
    createEnwikiTipPlaceholders,
    normalizeEnwikiTitleValue,
    extractEnwikiTitleFromUrl,
    buildWikidataSearchUrl,
    buildMetacriticUrl,
    buildMetacriticSearchUrl,
    buildOpenCriticUrl,
    buildOpenCriticSearchUrl,
    buildSteamUrl,
    buildSteamSearchUrl,
    buildGoogleSiteSearchUrl,
    replaceFormValues,
    getHistoryEntryForm,
    applyCitationPatches,
    applyCategoryPatches,
    applyNavboxPatches,
    syncGeneratedNameNoteTaRow,
    regenerateNoteTaRows,
    ensureNoteTaRows,
    isBlankNoteTaRow,
    ensureNavboxRows,
    createRedirectRow,
    isBlankRedirectRow,
    markCategoryRowsFixed,
    markCategoryRowsUnfixed,
    syncCategoryRowFixedState,
    isCategoryRowFixed,
    setRedirectRowTitle,
    isRedirectRowFixed,
    ensureRedirectRows,
    hasPreparedNavboxRows,
    createNavboxRow,
    isBlankNavboxRow,
    setNavboxRowText,
    isNavboxRowFixed,
    shouldSkipFixedRows,
    getNavboxTitle,
    createCitationRow,
    createCitationParamRow,
    sortManagedCitationParams,
    getCitationParamRows,
    getCitationParamTableRows,
    getCitationTabsKey,
    getMetadataFieldTableRows,
    getCitationTabName,
    getCitationTabLabel,
    getCodeMirrorLoader,
    findTextareaElement,
    getCodeMirrorText,
    setCodeMirrorText,
    cloneValue,
    openDialog,
} from "#stub/form/helpers.ts";
import { wikitext } from "#shared";
const { splitFieldValues } = wikitext;

/**
 * Selects a lazily evaluated value for a condition.
 *
 * @param condition - Condition to evaluate.
 * @param trueBranch - Branch used when the condition is
 * true.
 * @param falseBranch - Branch used when the condition is
 * false.
 * @returns Value returned by the selected branch.
 */
function selectValue(
    condition: unknown,
    trueBranch: (...args: any[]) => any,
    falseBranch: (...args: any[]) => any,
): any {
    if (condition) {
        return trueBranch();
    }

    return falseBranch();
}
