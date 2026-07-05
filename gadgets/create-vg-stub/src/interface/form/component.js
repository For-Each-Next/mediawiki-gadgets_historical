/* eslint-disable */

/**
 * Builds the create-vg-stub dialog form component.
 */

import {
    formatArticleFormField,
    isArticleListField,
} from "../../article/index.js";
import {
    hasFirstLevelFieldSeparator,
    parsePrefixedValue,
    trimFieldValue,
} from "../../shared/form-values.js";
import { splitFieldValues } from "../../shared/utils.js";
import {
    createSaveProgress,
    getSaveProgressGroups,
    isSaveProgressComplete,
    updateSaveProgress,
} from "../../save/progress.js";
import { sortNoteTaEntries } from "../../wikitext/note-ta.js";
import {
    createPreSaveGroups,
    serializePreSaveProgressGroups,
} from "../pre-save.js";
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
} from "./constants.js";
import { createDialogTemplate } from "./template.js";

/**
 * Creates the Vue component definition for the Codex dialog.
 *
 * @param {object} Vue - ResourceLoader Vue module.
 * @param {object} options - Dialog options.
 * @param {string} options.currentTitle - Current page title.
 * @param {string} options.defaultName - Default article display title.
 * @param {Function} options.getFieldPlaceholder - Field placeholder builder.
 * @param {Function} options.getProseSinographs - Prose length calculator.
 * @param {Function} options.getProseWikitext - Prose wikitext preview builder.
 * @param {object} [options.initialForm] - Initial form values.
 * @param {boolean} [options.initialEnwikiLookup] - Whether to lookup the initial enwiki title.
 * @param {number} [options.citationPrefetchDelay] - Citation prefetch debounce delay.
 * @param {Function} [options.getFieldPreview] - Field wikitext preview builder.
 * @param {Function} options.getHistoryEntries - Form history entry provider.
 * @param {Function} options.onActivate - Tool activation handler.
 * @param {Function} options.onCategoryRowsRefresh - Category refresh handler.
 * @param {Function} options.onClearHistory - Form history clear handler.
 * @param {Function} options.onCreateCategoryRow - Category row factory.
 * @param {Function} options.onDeleteHistoryEntry - Form history delete handler.
 * @param {Function} options.onFormChange - Form change handler.
 * @param {Function} options.onMoveTarget - New-page target opener.
 * @param {Function} options.onCheckRedirectRows - Redirect review row checker.
 * @param {Function} options.onPrepareCompanyCategory - Company category text builder.
 * @param {Function} options.onPrepareRedirectRows - Redirect review row builder.
 * @param {Function} options.onPrepareReview - Review report builder.
 * @param {Function} options.onFetchPageText - Existing page source fetcher.
 * @param {Function} options.onEnwikiTitleChange - Enwiki metadata lookup handler.
 * @param {Function} options.onParsePreview - Wikitext preview parser.
 * @param {Function} options.onPreview - Editor preview handler.
 * @param {Function} options.onPreSavePrepare - Follow-up action builder.
 * @param {Function} [options.onSourceUrlChange] - Source URL change handler.
 * @param {Function} options.onSubmit - Submit handler.
 * @param {Function} options.onSubmitHistory - Form history submit handler.
 * @param {Function} options.onUpdateCategoryRowCategory - Category title update handler.
 * @returns {object} Vue component options.
 */
export function createDialogComponent(Vue, options) {
    const currentTitle =
        trimFieldValue(options.currentTitle) || options.defaultName;
    const activeTab = Vue.ref(ARTICLE_PARAMETER_GROUPS[0].key);
    const form = Vue.reactive(createFormValues());
    const categoryState = Vue.reactive({
        error: "",
        loading: false,
    });
    const citationState = Vue.reactive({
        error: "",
        loading: false,
    });
    const reviewState = Vue.reactive({
        error: "",
        loading: false,
    });
    const companyCategoryOpen = Vue.ref(false);
    const companyCategoryState = Vue.reactive({
        category: "",
        company: "",
        englishName: "",
        error: "",
        loading: false,
        pending: false,
        text: "",
        wikidataId: "",
    });
    const companyCategoryLookupLoading = Vue.ref(false);
    const companyCategoryLookupSerial = Vue.ref(0);
    const pageEditOpen = Vue.ref(false);
    const pageEditState = Vue.reactive({
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
    });
    const categoryViewOpen = Vue.ref(false);
    const categoryViewState = Vue.reactive({
        title: "",
        url: "",
    });
    const historyEntries = Vue.ref(options.getHistoryEntries());
    const historyJsonError = Vue.ref("");
    const historyJsonEditable = Vue.ref(false);
    const historyJsonOpen = Vue.ref(false);
    const historyJsonText = Vue.ref("");
    const historyLoading = Vue.ref(false);
    const historyOpen = Vue.ref(false);
    const mainActionMenuSelection = Vue.ref(null);
    const moveTarget = Vue.ref(currentTitle);
    const moveTargetState = Vue.reactive({
        checkedTitle: "",
        exists: false,
        loading: false,
    });
    const moveOpen = Vue.ref(false);
    const movePreviewConfirmation = Vue.ref(false);
    const previewWithoutMoveTitle = Vue.ref("");
    const activeCitationTab = Vue.ref("");
    const preSaveMoveEnabled = Vue.ref(false);
    const preSaveMoveTitle = Vue.ref(currentTitle);
    const preSaveOpen = Vue.ref(false);
    const preSaveActions = Vue.reactive([]);
    const preSaveGroups = Vue.computed(() =>
        createPreSaveGroups(preSaveActions, form),
    );
    const preSaveProgress = Vue.ref(null);
    const preSaveProgressGroups = Vue.computed(() =>
        getSaveProgressGroups(preSaveProgress.value),
    );
    const stubTagRows = Vue.computed(() => form.stubTagRows || []);
    const previewOpen = Vue.ref(false);
    const previewTextArea = Vue.ref(null);
    const previewText = Vue.ref("");
    const previewSummary = Vue.ref("");
    const previewHtml = Vue.ref("");
    const previewLoading = Vue.ref(false);
    const previewLoadingMessage = Vue.ref("Preparing preview");
    const previewSubmitted = Vue.ref(false);
    const pageEditTextArea = Vue.ref(null);
    const enwikiLookupLoading = Vue.ref(false);
    const enwikiLookupSerial = Vue.ref(0);
    const enwikiMetadata = Vue.reactive(createBlankEnwikiMetadata());
    const fetchedSteamNameRows = Vue.ref([]);
    const steamUrl = Vue.ref("");
    const sourceFetchState = Vue.reactive({
        error: "",
        loading: false,
    });
    const tableActionTooltip = Vue.reactive({
        label: "",
        style: {
            left: "0",
            top: "0",
        },
        visible: false,
    });
    const tableActionTooltipRef = Vue.ref(null);
    const open = Vue.ref(options.initialOpen === true);
    const initialForm = options.initialForm;
    const sourceEditors = new Map();
    const sourceEditorLoads = new Set();
    let componentMounted = true;

    if (initialForm != null) {
        replaceFormValues(form, initialForm);
    }
    syncPageNameFields();
    syncGeneratedNameNoteTaRow(form);

    if (options.initialOpen === true) {
        options.onActivate();
    }

    let navboxRowsPrepared = hasPreparedNavboxRows(form);
    const queueCitationPrefetch = createCitationPrefetchQueue(options);

    Vue.watch(
        form,
        (currentForm) => {
            syncGeneratedNameNoteTaRow(currentForm);
            options.onFormChange(currentForm);
            queueCitationPrefetch(currentForm);
        },
        {
            deep: true,
        },
    );
    queueCitationPrefetch(form);
    Vue.watch(activeTab, (tab) => {
        if (tab === "review") {
            refreshReview();
        }

        if (tab === "references") {
            refreshCitationRows();
        }
    });
    Vue.watch(previewOpen, (isOpen) => {
        if (isOpen) {
            queueSourceEditor("preview", previewTextArea, previewText);
        } else {
            destroySourceEditor("preview");
        }
    });
    Vue.watch(pageEditOpen, (isOpen) => {
        if (isOpen) {
            queueSourceEditor("pageEdit", pageEditTextArea, {
                get value() {
                    return pageEditState.text;
                },
                set value(text) {
                    pageEditState.text = text;
                },
            });
        } else {
            destroySourceEditor("pageEdit");
        }
    });

    if (typeof Vue.onBeforeUnmount === "function") {
        Vue.onBeforeUnmount(() => {
            componentMounted = false;

            for (const key of [...sourceEditors.keys()]) {
                destroySourceEditor(key);
            }
        });
    }

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

    window.createVgStubDialog = {
        open() {
            options.onActivate();
            openDialog(open);
        },
        async submit() {
            open.value = true;
            await openPreSave();
        },
    };

    /**
     * Creates the running save-progress state for a submit attempt.
     *
     * @param {string} title - Current page title.
     * @param {object} pending - Pending follow-up actions.
     * @returns {object} Running save progress state.
     */
    function createRunningSaveProgress(title, pending) {
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
     * @returns {object} Progress reporter callbacks.
     */
    function createPreSaveProgressReporter() {
        return {
            fail(error) {
                if (preSaveProgress.value == null) {
                    return;
                }

                const running = preSaveProgress.value.steps.find(
                    (step) => step.status === "running",
                );

                preSaveProgress.value = {
                    ...preSaveProgress.value,
                    error: error.message || String(error),
                };

                if (running != null) {
                    setPreSaveProgressStep(running.id, "failed");
                }
            },
            report(error) {
                if (preSaveProgress.value == null) {
                    return;
                }

                preSaveProgress.value = {
                    ...preSaveProgress.value,
                    error: error.message || String(error),
                };
            },
            set(id, status) {
                setPreSaveProgressStep(id, status);
            },
            start(title, pending) {
                preSaveProgress.value = createRunningSaveProgress(
                    title,
                    pending,
                );
            },
        };
    }

    /**
     * Updates one in-dialog progress step.
     *
     * @param {string} id - Progress step ID.
     * @param {string} status - New status.
     * @returns {void}
     */
    function setPreSaveProgressStep(id, status) {
        if (preSaveProgress.value == null) {
            return;
        }

        preSaveProgress.value = updateSaveProgress(
            preSaveProgress.value,
            id,
            status,
        );
    }

    if (
        options.initialEnwikiLookup === true &&
        trimFieldValue(form.enwikiTitle) !== ""
    ) {
        refreshEnwikiMetadata();
    }

    /**
     * Creates the pending follow-up action payload for a reviewed submit.
     *
     * @returns {object} Pending submit payload.
     */
    function createReviewedSubmitPending() {
        return {
            actions: preSaveActions,
            move: {
                enabled: false,
                to: getCurrentTitle(),
            },
            progressGroups: serializePreSaveProgressGroups(
                preSaveGroups.value,
            ),
            progress: createPreSaveProgressReporter(),
            registration: {
                enabled: form.registerNewPage !== false,
            },
        };
    }

    /**
     * Finds the category row being edited in the company-category dialog.
     *
     * @returns {object|undefined} Matching category row.
     */
    function findCompanyCategoryRow() {
        return form.categoryRows.find(isCurrentCompanyCategoryRow);
    }

    /**
     * Checks whether a category row matches the company-category dialog.
     *
     * @param {object} row - Category review row.
     * @returns {boolean} Whether the row matches.
     */
    function isCurrentCompanyCategoryRow(row) {
        return trimFieldValue(row.category) === companyCategoryState.category;
    }

    /**
     * Creates the staged company-category creation payload.
     *
     * @param {object} row - Category review row.
     * @returns {object} Pending creation payload.
     */
    function createPendingCompanyCategory(row) {
        return {
            englishName: trimFieldValue(companyCategoryState.englishName),
            previousStatus: row.pendingCreation?.previousStatus || row.status,
            text: companyCategoryState.text,
            wikidataId: trimFieldValue(companyCategoryState.wikidataId),
        };
    }

    const methods = {
        /**
         * Closes the Codex dialog without writing text.
         *
         * @returns {void}
         */
        closeDialog() {
            open.value = false;
        },

        /**
         * Gets the main dialog title.
         *
         * @returns {string} Main dialog title.
         */
        getDialogTitle() {
            return `Create a stub for ${getCurrentTitle()}`;
        },

        /**
         * Clears all form and helper data across every tab.
         *
         * @returns {void}
         */
        clearForm() {
            clearFormState();
        },

        /**
         * Handles a selected main action menu item.
         *
         * @param {string} value - Selected menu item value.
         * @returns {Promise<void>} Resolves after the action finishes.
         */
        async handleMainActionSelect(value) {
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
         * @returns {Promise<void>} Resolves after refreshes complete.
         */
        async reloadForm() {
            await refreshEnwikiMetadata();
            await refreshCitationRows();
            await refreshReview({
                recheck: true,
            });
        },

        /**
         * Opens an editable generated wikitext preview after review.
         *
         * @returns {Promise<void>} Resolves after preview text is ready.
         */
        async previewForm() {
            previewLoading.value = true;
            previewLoadingMessage.value = "Preparing citations";

            try {
                await refreshCitationRows();
                previewLoadingMessage.value = "Checking follow-up pages";
                await refreshReview();
                previewLoadingMessage.value = "Building preview";
                options.onSubmitHistory(form, getCurrentTitle());
                historyEntries.value = options.getHistoryEntries();
                const preview = await options.onPreview(
                    form,
                    sourceFetchState,
                );

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
                previewLoadingMessage.value = "Preparing preview";
            }
        },

        /**
         * Refreshes the parsed HTML preview from the editable wikitext.
         *
         * @returns {Promise<void>} Resolves after parsed HTML is refreshed.
         */
        async refreshParsedPreview() {
            syncSourceEditorText("preview", previewText);
            sourceFetchState.error = "";
            sourceFetchState.loading = true;

            try {
                previewHtml.value = await options.onParsePreview(
                    previewText.value,
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
         * @returns {void}
         */
        closePreviewDialog() {
            destroySourceEditor("preview");
            previewOpen.value = false;
            clearPreviewState();
        },

        /**
         * Opens pre-save checks for the edited preview text.
         *
         * @returns {Promise<void>} Resolves after checklist preparation.
         */
        async submitPreviewText() {
            syncSourceEditorText("preview", previewText);
            previewSubmitted.value = true;
            destroySourceEditor("preview");
            previewOpen.value = false;
            await openPreSave();
        },

        /**
         * Opens the editable preview before final submission.
         *
         * @returns {Promise<void>} Resolves after preview text is ready.
         */
        async submitForm() {
            if (this.shouldConfirmPageNameMove()) {
                this.openMovePreviewConfirmation();
                return;
            }

            await this.previewForm();
        },

        /**
         * Saves the article after confirming the pre-save fixes.
         *
         * @returns {Promise<void>} Resolves after save submission starts.
         */
        async confirmSubmit() {
            syncSourceEditorText("preview", previewText);
            options.onSubmitHistory(form, getCurrentTitle());
            historyEntries.value = options.getHistoryEntries();

            const moveTitle = trimFieldValue(preSaveMoveTitle.value);

            if (
                preSaveMoveEnabled.value &&
                moveTitle !== "" &&
                moveTitle !== getCurrentTitle()
            ) {
                await options.onMoveTarget(form, moveTitle, sourceFetchState);

                if (sourceFetchState.error === "") {
                    preSaveOpen.value = false;
                }

                return;
            }

            const reviewedPreview = previewSubmitted.value
                ? {
                      summary: previewSummary.value,
                      text: previewText.value,
                  }
                : undefined;

            await options.onSubmit(
                form,
                sourceFetchState,
                this.closeDialog,
                createReviewedSubmitPending(),
                reviewedPreview,
            );

            if (sourceFetchState.error === "") {
                previewSubmitted.value = false;
            }
        },

        /**
         * Opens the form history dialog.
         *
         * @returns {void}
         */
        openHistoryDialog() {
            historyEntries.value = options.getHistoryEntries();
            historyOpen.value = true;
        },

        /**
         * Gets the label for the currently running pre-save step.
         *
         * @returns {string} Running step label.
         */
        getPreSaveCurrentStepLabel() {
            const step = preSaveProgress.value?.steps.find(
                (item) =>
                    item.status === "running" || item.status === "retrying",
            );

            return step == null ? "Saving" : step.label;
        },

        /**
         * Gets the icon used for a pre-save progress status.
         *
         * @param {string} status - Progress status.
         * @returns {object} Codex icon definition.
         */
        getPreSaveStatusIcon(status) {
            return (
                PRE_SAVE_STATUS_ICONS[status] || PRE_SAVE_STATUS_ICONS.pending
            );
        },

        /**
         * Gets the status icon CSS class for one progress row.
         *
         * @param {string} status - Progress status.
         * @returns {string} CSS class list.
         */
        getPreSaveStatusIconClass(status) {
            const normalized = PRE_SAVE_STATUS_ICONS[status]
                ? status
                : "pending";

            return `create-vg-stub-pre-save-status-icon create-vg-stub-pre-save-status-icon--${normalized}`;
        },

        /**
         * Gets the CSS class for one progress row.
         *
         * @param {object} step - Progress step.
         * @returns {string} CSS class list.
         */
        getPreSaveProgressRowClass(step) {
            if (step == null) {
                return "";
            }

            const status = trimFieldValue(step?.status);
            const active = ["failed", "retrying", "running"].includes(status);

            return active
                ? `create-vg-stub-pre-save-progress-row create-vg-stub-pre-save-progress-row--${status}`
                : "create-vg-stub-pre-save-progress-row";
        },

        /**
         * Gets the groups currently shown in the pre-save dialog.
         *
         * @returns {Array<object>} Checkbox or progress groups.
         */
        getVisiblePreSaveGroups() {
            if (preSaveProgress.value == null) {
                return preSaveGroups.value;
            }

            return preSaveProgressGroups.value.map((group) => ({
                key: group.targetPage,
                rows: group.steps.map((step) => ({
                    key: step.id,
                    label: step.label,
                    step,
                    type: "progress",
                })),
                title: group.targetPage,
            }));
        },

        /**
         * Checks whether the pre-save progress is still running.
         *
         * @returns {boolean} Whether progress has active work.
         */
        isPreSaveProgressRunning() {
            return (
                preSaveProgress.value != null &&
                !isSaveProgressComplete(preSaveProgress.value)
            );
        },

        /**
         * Checks whether a checked missing category row should stand out.
         *
         * @param {object} row - Category review row.
         * @returns {boolean} Whether the row should be highlighted.
         */
        isCategoryAddReviewRow(row) {
            return (
                row?.enabled !== false &&
                trimFieldValue(row?.category) !== "" &&
                (row?.pendingCreation != null ||
                    row?.status === "Not exists" ||
                    row?.status === "Pending creation")
            );
        },

        /**
         * Checks whether a checked missing navbox row should stand out.
         *
         * @param {object} row - Navbox review row.
         * @returns {boolean} Whether the row should be highlighted.
         */
        isNavboxAddReviewRow(row) {
            return (
                row?.enabled !== false &&
                trimFieldValue(row?.text) !== "" &&
                (row?.pendingCreation != null ||
                    row?.status === "Not exists" ||
                    row?.status === "Missing" ||
                    row?.status === "Pending creation")
            );
        },

        /**
         * Checks whether a checked missing stub-tag row should stand out.
         *
         * @param {object} row - Stub-tag review row.
         * @returns {boolean} Whether the row should be highlighted.
         */
        isStubTagAddReviewRow(row) {
            return (
                row?.enabled !== false &&
                trimStubTagValue(row?.stubTag) !== "" &&
                (row?.pendingCreation != null ||
                    row?.status === "Not exists" ||
                    row?.status === "Missing" ||
                    row?.status === "Pending creation")
            );
        },

        /**
         * Checks whether a checked redirect row targets an existing page.
         *
         * @param {object} row - Redirect review row.
         * @returns {boolean} Whether the row should be highlighted.
         */
        isRedirectConflictReviewRow(row) {
            return (
                row?.enabled !== false &&
                trimFieldValue(row?.title) !== "" &&
                row?.exists === true
            );
        },

        /**
         * Closes the form history dialog.
         *
         * @returns {void}
         */
        closeHistoryDialog() {
            historyOpen.value = false;
        },

        /**
         * Formats one history entry page label for display.
         *
         * @param {object} entry - History entry.
         * @returns {string} Display page label.
         */
        formatHistoryEntryPage(entry) {
            const page = trimFieldValue(entry.metadata?.page);

            if (entry.metadata?.temporary === true) {
                return `${page || "Untitled"} (temporary draft)`;
            }

            return page || "(untitled)";
        },

        /**
         * Fills the current form from a history entry.
         *
         * @param {object} entry - History entry.
         * @returns {Promise<void>} Resolves after the restored form is refreshed.
         */
        async fillHistoryEntry(entry) {
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
         * @param {object} entry - History entry.
         * @returns {void}
         */
        openHistoryJsonDialog(entry) {
            historyJsonError.value = "";
            historyJsonEditable.value = entry.metadata?.temporary === true;
            historyJsonText.value = JSON.stringify(entry, null, 2);
            historyJsonOpen.value = true;
        },

        /**
         * Opens the history JSON dialog for importing values.
         *
         * @returns {void}
         */
        openHistoryImportDialog() {
            historyJsonError.value = "";
            historyJsonEditable.value = true;
            historyJsonText.value = "";
            historyJsonOpen.value = true;
        },

        /**
         * Closes the history JSON dialog.
         *
         * @returns {void}
         */
        closeHistoryJsonDialog() {
            historyJsonOpen.value = false;
            historyJsonText.value = "";
        },

        /**
         * Imports form values from the history JSON dialog.
         *
         * @returns {void}
         */
        async importHistoryJson() {
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
         * @param {string} id - History entry ID.
         * @returns {void}
         */
        deleteHistoryEntry(id) {
            options.onDeleteHistoryEntry(id);
            historyEntries.value = options.getHistoryEntries();
        },

        /**
         * Shows the shared table-action tooltip near one icon button.
         *
         * @param {Event} event - Focus or mouse event from the action button.
         * @returns {void}
         */
        showTableActionTooltip(event) {
            const target = event.currentTarget;
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
         * @returns {void}
         */
        hideTableActionTooltip() {
            tableActionTooltip.visible = false;
        },

        /**
         * Updates the temporary draft row from current form values.
         *
         * @returns {void}
         */
        updateTemporaryHistoryEntry() {
            options.onFormChange(form);
            historyEntries.value = options.getHistoryEntries();
        },

        /**
         * Clears all form history entries.
         *
         * @returns {void}
         */
        clearHistory() {
            options.onClearHistory();
            historyEntries.value = options.getHistoryEntries();
        },

        /**
         * Opens the move target dialog.
         *
         * @returns {void}
         */
        openMoveDialog() {
            moveTarget.value = getCurrentTitle();
            movePreviewConfirmation.value = false;
            moveOpen.value = true;
            this.checkMoveTarget();
        },

        /**
         * Opens the move target dialog before previewing a renamed page.
         *
         * @returns {void}
         */
        openMovePreviewConfirmation() {
            moveTarget.value = getCurrentTitle();
            movePreviewConfirmation.value = true;
            moveOpen.value = true;
            this.checkMoveTarget();
        },

        /**
         * Closes the move target dialog.
         *
         * @returns {void}
         */
        closeMoveDialog() {
            moveOpen.value = false;
            movePreviewConfirmation.value = false;
        },

        /**
         * Updates the move target title from live input.
         *
         * @param {string} value - Raw input value.
         * @returns {void}
         */
        updateMoveTarget(value) {
            moveTarget.value = trimFieldValue(value);
            moveTargetState.checkedTitle = "";
            moveTargetState.exists = false;
        },

        /**
         * Checks whether the current move target page exists.
         *
         * @returns {Promise<void>} Resolves after status is refreshed.
         */
        async checkMoveTarget() {
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
         * Checks whether the entered page name differs from the current page.
         *
         * @returns {boolean} Whether the move action should be shown.
         */
        canMovePageName() {
            return (
                trimFieldValue(form.pageName) !== "" &&
                trimFieldValue(form.pageName) !== currentTitle
            );
        },

        /**
         * Checks whether preview needs an explicit move decision first.
         *
         * @returns {boolean} Whether to prompt before previewing.
         */
        shouldConfirmPageNameMove() {
            const title = trimFieldValue(form.pageName);

            return (
                title !== "" &&
                title !== currentTitle &&
                title !== previewWithoutMoveTitle.value
            );
        },

        /**
         * Continues previewing after the user chooses not to move.
         *
         * @returns {Promise<void>} Resolves after preview text is ready.
         */
        async previewWithoutMoving() {
            previewWithoutMoveTitle.value = trimFieldValue(form.pageName);
            moveOpen.value = false;
            movePreviewConfirmation.value = false;
            await this.previewForm();
        },

        /**
         * Generates current data and opens it in the target page editor.
         *
         * @returns {Promise<void>} Resolves after navigation starts.
         */
        async submitMoveTarget() {
            await this.checkMoveTarget();
            await refreshCategoryRows();
            form.pageName = trimFieldValue(moveTarget.value);
            movePreviewConfirmation.value = false;
            options.onSubmitHistory(form, getCurrentTitle());
            historyEntries.value = options.getHistoryEntries();
            await options.onMoveTarget(
                form,
                getCurrentTitle(),
                sourceFetchState,
            );
        },

        /**
         * Normalizes multiline article field values.
         *
         * @param {object} field - Article parameter field.
         * @param {string} field.key - Form key for the field.
         * @returns {void}
         */
        normalizeFieldValue(field) {
            const value =
                field.key === "enwikiTitle"
                    ? normalizeEnwikiTitleValue(form[field.key])
                    : form[field.key];

            form[field.key] = formatArticleFormField(form, field.key, value);
        },

        /**
         * Trims pasted source URL field values.
         *
         * @param {object} field - Source reference field.
         * @param {string} field.sourceKey - Form key for the source URL.
         * @returns {void}
         */
        trimSourceValue(field) {
            form[field.sourceKey] = trimFieldValue(form[field.sourceKey]);
        },

        /**
         * Updates one article field from live input.
         *
         * @param {object} field - Article parameter field.
         * @param {string} value - Raw input value.
         * @returns {void}
         */
        updateFieldValue(field, value) {
            const completedValue = completeWikiLinkBrackets(
                field.key,
                value,
                form[field.key],
            );
            const normalizedValue =
                field.key === "enwikiTitle"
                    ? normalizeEnwikiTitleValue(completedValue)
                    : completedValue;

            form[field.key] = formatArticleFormField(
                form,
                field.key,
                normalizedValue,
            );

            if (
                field.key === "pageName" &&
                trimFieldValue(form.pageName) !== previewWithoutMoveTitle.value
            ) {
                previewWithoutMoveTitle.value = "";
            }

            if (field.key === "enwikiTitle") {
                refreshEnwikiMetadata();
            }

            if (field.key === "series") {
                navboxRowsPrepared = false;
            }

            markCategoryRowsUnfixed(form.categoryRows);
        },

        /**
         * Updates one source URL field from live input.
         *
         * @param {object} field - Source reference field.
         * @param {string} value - Raw input value.
         * @returns {void}
         */
        updateSourceValue(field, value) {
            form[field.sourceKey] = trimFieldValue(value);
        },

        /**
         * Updates one managed citation parameter value.
         *
         * @param {number} citationIndex - Citation row index.
         * @param {number} paramIndex - Parameter row index.
         * @param {string} field - Parameter field key.
         * @param {string} value - Raw input value.
         * @returns {void}
         */
        updateCitationParam(citationIndex, paramIndex, field, value) {
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
         * @param {number} citationIndex - Citation row index.
         * @returns {void}
         */
        sortCitation(citationIndex) {
            const citation = form.citationRows[citationIndex];

            if (citation == null) {
                return;
            }

            citation.params = sortManagedCitationParams(citation.params);
        },

        /**
         * Appends a blank parameter row to one managed citation.
         *
         * @param {number} citationIndex - Citation row index.
         * @returns {void}
         */
        addCitationParam(citationIndex) {
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
         * @param {number} citationIndex - Citation row index.
         * @returns {void}
         */
        cleanCitationParams(citationIndex) {
            const citation = form.citationRows[citationIndex];

            if (citation == null) {
                return;
            }

            citation.params = (citation.params || []).filter(
                (param) => trimFieldValue(param?.value) !== "",
            );
            citation.modified = true;
        },

        /**
         * Removes one managed citation parameter row.
         *
         * @param {number} citationIndex - Citation row index.
         * @param {number} paramIndex - Parameter row index.
         * @returns {void}
         */
        removeCitationParam(citationIndex, paramIndex) {
            const citation = form.citationRows[citationIndex];

            if (citation == null) {
                return;
            }

            citation.params.splice(paramIndex, 1);
            citation.modified = true;
        },

        /**
         * Resets one managed citation parameter row to its generated value.
         *
         * @param {number} citationIndex - Citation row index.
         * @param {number} paramIndex - Parameter row index.
         * @returns {void}
         */
        resetCitationParam(citationIndex, paramIndex) {
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

            citation.params = sortManagedCitationParams(citation.params);
            citation.modified = !areCitationParamsEqual(
                citation.params,
                citation.generatedParams,
            );
        },

        /**
         * Resets one managed citation to its generated parameters.
         *
         * @param {number} citationIndex - Citation row index.
         * @returns {void}
         */
        resetCitation(citationIndex) {
            const citation = form.citationRows[citationIndex];

            if (citation == null) {
                return;
            }

            citation.params = cloneValue(citation.generatedParams || []);
            citation.modified = false;
        },

        /**
         * Re-fetches one managed citation and overwrites edited parameters.
         *
         * @param {number} citationIndex - Citation row index.
         * @returns {Promise<void>} Resolves after the citation is refreshed.
         */
        async refetchCitation(citationIndex) {
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
                const refreshed = rows
                    .map(createCitationRow)
                    .find(
                        (row) =>
                            trimFieldValue(row.sourceUrl) ===
                            trimFieldValue(citation.sourceUrl),
                    );

                if (refreshed != null) {
                    form.citationRows.splice(citationIndex, 1, {
                        ...refreshed,
                        modified: false,
                        params: cloneValue(refreshed.generatedParams || []),
                    });
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
         * @param {string} key - Form value key.
         * @returns {void}
         */
        trimFormValue(key) {
            form[key] = trimFieldValue(form[key]);
        },

        /**
         * Updates one form value by key from live input.
         *
         * @param {string} key - Form value key.
         * @param {string} value - Raw input value.
         * @returns {void}
         */
        updateFormValue(key, value) {
            form[key] = trimFieldValue(value);
            markCategoryRowsUnfixed(form.categoryRows);
        },

        /**
         * Refreshes English Wikipedia metadata after the enwiki title changes.
         *
         * @returns {Promise<void>} Resolves after metadata is refreshed.
         */
        async updateEnwikiTitle() {
            await refreshEnwikiMetadata();
        },

        /**
         * Normalizes pasted multiline article field values.
         *
         * @param {object} field - Article parameter field.
         * @param {string} field.key - Form key for the field.
         * @param {*} event - Clipboard paste event.
         * @returns {void}
         */
        normalizePastedFieldValue(field, event) {
            const clipboardData =
                event.clipboardData || event.originalEvent.clipboardData;
            const text = clipboardData.getData("text");

            if (field.key === "enwikiTitle") {
                const title = extractEnwikiTitleFromUrl(text);

                if (title === "") {
                    return;
                }

                event.preventDefault();
                form[field.key] = formatArticleFormField(
                    form,
                    field.key,
                    title,
                );
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
            form[field.key] = formatArticleFormField(form, field.key, text);
            markCategoryRowsUnfixed(form.categoryRows);
        },

        /**
         * Trims a localized name row value.
         *
         * @param {string} key - Localized name group key.
         * @param {number} index - Row index.
         * @param {string} field - Row field key.
         * @returns {void}
         */
        updateNameRow(key, index, field) {
            form[key][index][field] = trimFieldValue(form[key][index][field]);
            ensureTrailingNameRow(form[key]);
            syncGeneratedNameNoteTaRow(form);
        },

        /**
         * Updates a localized name row value from live input.
         *
         * @param {string} key - Localized name group key.
         * @param {number} index - Row index.
         * @param {string} field - Row field key.
         * @param {string} value - Raw input value.
         * @returns {void}
         */
        updateNameRowValue(key, index, field, value) {
            form[key][index][field] = trimFieldValue(value);
            ensureTrailingNameRow(form[key]);
            syncGeneratedNameNoteTaRow(form);
        },

        /**
         * Updates whether a localized name row is official.
         *
         * @param {string} key - Localized name group key.
         * @param {number} index - Row index.
         * @param {boolean} value - Whether the row is official.
         * @returns {void}
         */
        updateNameOfficial(key, index, value) {
            form[key][index].official = Boolean(value);
            ensureTrailingNameRow(form[key]);
            syncGeneratedNameNoteTaRow(form);
        },

        /**
         * Updates one localized name row region.
         *
         * @param {string} key - Localized name group key.
         * @param {number} index - Row index.
         * @param {string} market - Region key.
         * @param {boolean} value - Whether the region is selected.
         * @returns {void}
         */
        updateNameMarket(key, index, market, value) {
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
         * @param {string} key - Localized name group key.
         * @returns {void}
         */
        addNameRow(key) {
            form[key].push(createNameRow());
        },

        /**
         * Removes one localized name row.
         *
         * @param {string} key - Localized name group key.
         * @param {number} index - Row index.
         * @returns {void}
         */
        removeNameRow(key, index) {
            form[key].splice(index, 1);
            ensureTrailingNameRow(form[key]);
            syncGeneratedNameNoteTaRow(form);
        },

        /**
         * Updates the Steam helper URL.
         *
         * @param {string} value - Raw Steam URL.
         * @returns {void}
         */
        updateSteamUrl(value) {
            steamUrl.value = trimFieldValue(value);
            fetchedSteamNameRows.value = [];
        },

        /**
         * Fetches Steam names and stores them as helper suggestions.
         *
         * @returns {Promise<void>} Resolves after rows are fetched.
         */
        async addSteamNames() {
            await fetchSteamNames();
        },

        /**
         * Applies one Steam name helper suggestion choice.
         *
         * @param {string} choice - Steam helper choice key.
         * @returns {void}
         */
        applySteamNameChoice(choice) {
            if (!choice) {
                return;
            }

            removeSteamAppliedNameRows();
            buildSteamNameChoiceRows(fetchedSteamNameRows.value, choice)
                .map(createNameRowFromValues)
                .forEach((row) => {
                    markSteamNameHelperRow(row);
                    form.localizedNames.push(row);
                });
            ensureTrailingNameRow(form.localizedNames);
            syncGeneratedNameNoteTaRow(form);
        },

        /**
         * Clears all localized name rows.
         *
         * @param {string} key - Localized name group key.
         * @returns {void}
         */
        clearNameRows(key) {
            form[key] = [createNameRow()];
            syncGeneratedNameNoteTaRow(form);
        },

        /**
         * Refreshes generated category rows.
         *
         * @returns {Promise<void>} Resolves after category rows are refreshed.
         */
        async refreshCategoryRows() {
            await refreshCategoryRows();
        },

        /**
         * Rebuilds category rows, bypassing the stored category query cache.
         *
         * @returns {Promise<void>} Resolves after category rows are rebuilt.
         */
        async rebuildCategoryRows() {
            form.stubTagRows = null;
            await refreshCategoryRows({
                bypassCache: true,
                recheck: true,
            });
        },

        /**
         * Adds one manual category row.
         *
         * @returns {void}
         */
        addCategoryRow() {
            form.categoryRows.push(options.onCreateCategoryRow());
            ensureTrailingCategoryRow(form, options.onCreateCategoryRow);
        },

        /**
         * Removes one category row.
         *
         * @param {number} index - Category row index.
         * @returns {void}
         */
        removeCategoryRow(index) {
            form.categoryRows.splice(index, 1);
            ensureTrailingCategoryRow(form, options.onCreateCategoryRow);
        },

        /**
         * Removes surplus blank category rows.
         *
         * @returns {void}
         */
        cleanCategoryRows() {
            form.categoryRows = cleanEditableRows(
                form.categoryRows,
                isBlankCategoryRow,
                () => options.onCreateCategoryRow(),
            );
        },

        /**
         * Appends a blank stub-tag row.
         *
         * @returns {void}
         */
        addStubTagRow() {
            ensureStubTagRows(form).push(createStubTagRow());
            ensureTrailingStubTagRow(form);
        },

        /**
         * Resets stub-tag rows from current category metadata.
         *
         * @returns {void}
         */
        resetStubTagRows() {
            form.stubTagRows = buildStubTagRowsFromCategories(
                form.categoryRows,
            );
            ensureTrailingStubTagRow(form);
        },

        /**
         * Updates one stub-tag row.
         *
         * @param {number} index - Stub-tag row index.
         * @param {string} stubTag - Stub template name.
         * @returns {void}
         */
        updateStubTagRow(index, stubTag) {
            const row = ensureStubTagRows(form)[index];

            if (row != null) {
                row.stubTag = trimStubTagValue(stubTag);
                ensureTrailingStubTagRow(form);
            }
        },

        /**
         * Removes one stub-tag row.
         *
         * @param {number} index - Stub-tag row index.
         * @returns {void}
         */
        removeStubTagRow(index) {
            ensureStubTagRows(form).splice(index, 1);
            ensureTrailingStubTagRow(form);
        },

        /**
         * Removes surplus blank stub-tag rows.
         *
         * @returns {void}
         */
        cleanStubTagRows() {
            form.stubTagRows = cleanEditableRows(
                ensureStubTagRows(form),
                isBlankStubTagRow,
                createStubTagRow,
            );
        },

        /**
         * Appends a blank redirect row.
         *
         * @returns {void}
         */
        addRedirectRow() {
            ensureRedirectRows(form).push(createRedirectRow());
            ensureTrailingRedirectRow(form);
        },

        /**
         * Resets generated redirect rows.
         *
         * @returns {Promise<void>} Resolves after rows are refreshed.
         */
        async rebuildRedirectRows() {
            form.redirectRows = null;
            await refreshRedirectRows({
                recheck: true,
            });
        },

        /**
         * Updates one redirect row title from live input.
         *
         * @param {number} index - Redirect row index.
         * @param {string} value - Raw title input.
         * @returns {void}
         */
        updateRedirectRowTitle(index, value) {
            const row = form.redirectRows?.[index];

            if (row != null) {
                setRedirectRowTitle(row, value);
                ensureTrailingRedirectRow(form);
            }
        },

        /**
         * Removes one redirect row.
         *
         * @param {number} index - Redirect row index.
         * @returns {void}
         */
        removeRedirectRow(index) {
            ensureRedirectRows(form).splice(index, 1);
            ensureTrailingRedirectRow(form);
        },

        /**
         * Removes surplus blank redirect rows.
         *
         * @returns {void}
         */
        cleanRedirectRows() {
            form.redirectRows = cleanEditableRows(
                ensureRedirectRows(form),
                isBlankRedirectRow,
                createRedirectRow,
            );
        },

        /**
         * Appends a blank navbox row.
         *
         * @returns {void}
         */
        addNavboxRow() {
            ensureNavboxRows(form).push(createNavboxRow());
            ensureTrailingNavboxRow(form);
            navboxRowsPrepared = true;
        },

        /**
         * Removes surplus blank navbox rows.
         *
         * @returns {void}
         */
        cleanNavboxRows() {
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
         * @returns {void}
         */
        addNoteTaRow() {
            ensureNoteTaRows(form).push(createNoteTaRow());
        },

        /**
         * Removes one NoteTA row.
         *
         * @param {number} index - NoteTA row index.
         * @returns {void}
         */
        removeNoteTaRow(index) {
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
         * @returns {void}
         */
        cleanNoteTaRows() {
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
         * @param {number} index - NoteTA row index.
         * @param {string} field - Row field key.
         * @param {string} value - Raw input value.
         * @returns {void}
         */
        updateNoteTaRow(index, field, value) {
            const row = ensureNoteTaRows(form)[index];

            row[field] = trimFieldValue(value);

            if (row.source === NOTE_TA_NAMES_SOURCE) {
                row.modified = true;
            }
        },

        /**
         * Sorts NoteTA rows by output source order.
         *
         * @returns {void}
         */
        sortNoteTaRows() {
            const rows = ensureNoteTaRows(form);

            rows.splice(0, rows.length, ...sortNoteTaEntries(rows));
        },

        /**
         * Rebuilds generated NoteTA rows and preserves manual extras.
         *
         * @returns {void}
         */
        regenerateNoteTaRows() {
            regenerateNoteTaRows(form);
        },

        /**
         * Updates one navbox row.
         *
         * @param {number} index - Navbox row index.
         * @param {string} navbox - Navbox wikitext.
         * @returns {void}
         */
        updateNavboxRow(index, navbox) {
            const row = ensureNavboxRows(form)[index];

            setNavboxRowText(row, navbox);
            row.title = getNavboxTitle(navbox);
            row.status = "";
            ensureTrailingNavboxRow(form);
        },

        /**
         * Removes one navbox row.
         *
         * @param {number} index - Navbox row index.
         * @returns {void}
         */
        removeNavboxRow(index) {
            ensureNavboxRows(form).splice(index, 1);
            ensureTrailingNavboxRow(form);
        },

        /**
         * Regenerates navbox rows from the current series field.
         *
         * @returns {Promise<void>} Resolves after suggestions are refreshed.
         */
        async rebuildNavboxRows() {
            await refreshNavboxRows(true, true);
        },

        /**
         * Checks the current navbox rows.
         *
         * @returns {Promise<void>} Resolves after statuses are refreshed.
         */
        async checkNavboxRows() {
            await refreshNavboxRows(true, false);
        },

        /**
         * Refreshes generated redirect rows.
         *
         * @returns {Promise<void>} Resolves after redirect rows are refreshed.
         */
        async refreshRedirectRows() {
            await refreshRedirectRows();
        },

        /**
         * Checks the current redirect rows.
         *
         * @returns {Promise<void>} Resolves after redirect rows are fixed.
         */
        async checkRedirectRows() {
            await checkRedirectRows();
        },

        /**
         * Checks one edited redirect row after its textbox loses focus.
         *
         * @param {number} index - Redirect row index.
         * @param {Event} event - Text input blur event.
         * @returns {Promise<void>} Resolves after the row is fixed.
         */
        async checkRedirectRow(index, event) {
            const value = event?.target?.value;

            if (value != null && form.redirectRows?.[index] != null) {
                setRedirectRowTitle(form.redirectRows[index], value);
                ensureTrailingRedirectRow(form);
            }

            await this.checkRedirectRows();
        },

        /**
         * Checks one edited navbox row after its textbox loses focus.
         *
         * @param {number} index - Navbox row index.
         * @param {Event} event - Text input blur event.
         * @returns {Promise<void>} Resolves after the textbox is updated.
         */
        async checkNavboxRow(index, event) {
            const value = event?.target?.value;

            if (value != null) {
                this.updateNavboxRow(index, value);
            }

            await this.checkNavboxRows();
        },

        /**
         * Opens an editable navbox template source preview.
         *
         * @param {object} row - Navbox review row.
         * @returns {Promise<void>} Resolves after the editor is ready.
         */
        async openNavboxEdit(row) {
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
         * @param {object} row - Redirect review row.
         * @returns {Promise<void>} Resolves after the editor is ready.
         */
        async openRedirectEdit(row) {
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
         * @param {object} row - Stub-tag review row.
         * @returns {Promise<void>} Resolves after the editor is ready.
         */
        async openStubTagEdit(row) {
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
         * @param {number} index - Category row index.
         * @param {string} category - New category title.
         * @returns {void}
         */
        updateCategoryRowCategory(index, category) {
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
         * @param {number} index - Category row index.
         * @param {Event} event - Text input blur event.
         * @returns {Promise<void>} Resolves after the textbox is updated.
         */
        async checkCategoryRow(index, event) {
            const value = event?.target?.value;

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
         * @param {object} row - Category review row.
         * @returns {Promise<void>} Resolves after the category text is prepared.
         */
        async openCategoryCreate(row) {
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
         * @returns {void}
         */
        closeCompanyCategory() {
            companyCategoryOpen.value = false;
        },

        /**
         * Cancels the staged category creation.
         *
         * @returns {void}
         */
        cancelCompanyCategoryCreation() {
            const row = form.categoryRows.find(
                (item) =>
                    trimFieldValue(item.category) ===
                    companyCategoryState.category,
            );

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
         * @returns {Promise<void>} Resolves after the category is staged.
         */
        async saveCompanyCategory() {
            companyCategoryState.error = "";
            companyCategoryState.loading = true;

            try {
                const row = findCompanyCategoryRow();

                if (row == null) {
                    throw new Error("Category row is unavailable.");
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
         * @param {object} row - Category review row.
         * @returns {boolean} Whether the helper should be shown.
         */
        canCreateCompanyCategory(row) {
            return trimFieldValue(row.company) !== "" && row.status !== "OK";
        },

        /**
         * Refreshes metadata for the company-category English title.
         *
         * @returns {Promise<void>} Resolves after lookup state is updated.
         */
        async refreshCompanyCategoryMetadata() {
            await refreshCompanyCategoryMetadata();
        },

        /**
         * Gets the Wikidata URL for the staged company category.
         *
         * @returns {string} Wikidata entity URL.
         */
        getCompanyCategoryWikidataUrl() {
            const id = trimFieldValue(companyCategoryState.wikidataId);

            return id === ""
                ? ""
                : `https://www.wikidata.org/wiki/${encodeURIComponent(id)}`;
        },

        /**
         * Checks whether a category row can be created.
         *
         * @param {object} row - Category review row.
         * @returns {boolean} Whether the category editor should be shown.
         */
        canCreateCategory(row) {
            return (
                trimFieldValue(row.category) !== "" &&
                row.status !== "OK" &&
                row.pendingCreation == null
            );
        },

        /**
         * Opens an editable category source preview.
         *
         * @param {object} row - Category review row.
         * @returns {Promise<void>} Resolves after the editor is ready.
         */
        async openCategoryEdit(row) {
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
         * @returns {void}
         */
        closeCategoryView() {
            categoryViewOpen.value = false;
        },

        /**
         * Refreshes the edited page source preview.
         *
         * @returns {Promise<void>} Resolves after the preview is refreshed.
         */
        async refreshPageEditPreview() {
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
         * @returns {void}
         */
        closePageEditDialog() {
            destroySourceEditor("pageEdit");
            pageEditOpen.value = false;
            clearPageEditState();
        },

        /**
         * Cancels staged source changes for the current review row.
         *
         * @returns {void}
         */
        resetPageEdit() {
            resetPageEdit();
        },

        /**
         * Stages the edited page source for final submission.
         *
         * @returns {void}
         */
        stagePageEdit() {
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
         * @param {string} source - Category row source.
         * @returns {string} Compact source label.
         */
        formatCategorySourceLabel(source) {
            return formatCategorySourceLabel(source);
        },

        /**
         * Formats a category row source tooltip.
         *
         * @param {string} source - Category row source.
         * @returns {string} Source tooltip.
         */
        formatCategorySourceTitle(source) {
            return formatCategorySourceTitle(source);
        },

        /**
         * Formats a category review row status as a compact badge.
         *
         * @param {object} row - Category review row.
         * @returns {string} Compact status label.
         */
        formatCategoryStatusLabel(row) {
            return formatReviewRowStatusLabel(row, isBlankCategoryRow);
        },

        /**
         * Formats a category review row status tooltip.
         *
         * @param {object} row - Category review row.
         * @returns {string} Status tooltip.
         */
        formatCategoryStatusTitle(row) {
            const sourceTitle = formatCategorySourceTitle(row?.source);
            const label = formatReviewRowStatusLabel(row, isBlankCategoryRow);

            return sourceTitle === "" ? label : `${label} (${sourceTitle})`;
        },

        /**
         * Gets the InfoChip status for a category row.
         *
         * @param {object} row - Category review row.
         * @returns {string} Codex InfoChip status.
         */
        getCategoryStatusChipStatus(row) {
            return getReviewRowStatusChipStatus(row, isBlankCategoryRow);
        },

        /**
         * Formats a stub template name for display.
         *
         * @param {string} stubTag - Stub template name.
         * @returns {string} Template call label.
         */
        formatStubTagLabel(stubTag) {
            return `{{${trimStubTagValue(stubTag)}}}`;
        },

        /**
         * Formats a stub-tag row status as a compact badge.
         *
         * @param {object} row - Stub-tag review row.
         * @returns {string} Compact status label.
         */
        formatStubTagStatusLabel(row) {
            return isBlankStubTagRow(row)
                ? "empty"
                : formatReviewRowStatusLabel(row, isBlankStubTagRow);
        },

        /**
         * Gets the InfoChip status for a stub-tag row.
         *
         * @param {object} row - Stub-tag review row.
         * @returns {string} Codex InfoChip status.
         */
        getStubTagStatusChipStatus(row) {
            return getReviewRowStatusChipStatus(row, isBlankStubTagRow);
        },

        /**
         * Gets a category page URL for a review row.
         *
         * @param {object} row - Category review row.
         * @returns {string} Category page URL.
         */
        getCategoryPageUrl(row) {
            const category = trimFieldValue(row?.category);

            return category === ""
                ? ""
                : options.getPageUrl(`Category:${category}`);
        },

        /**
         * Gets a redirect page URL for a review row.
         *
         * @param {object} row - Redirect review row.
         * @returns {string} Redirect page URL.
         */
        getRedirectPageUrl(row) {
            const title = trimFieldValue(row?.title);

            return title === "" ? "" : options.getPageUrl(title);
        },

        /**
         * Gets a navbox template page URL for a review row.
         *
         * @param {object} row - Navbox review row.
         * @returns {string} Navbox template page URL.
         */
        getNavboxPageUrl(row) {
            const title = trimFieldValue(row?.title);

            return title === "" ? "" : options.getPageUrl(`Template:${title}`);
        },

        /**
         * Gets a stub template page URL for a review row.
         *
         * @param {object} row - Stub-tag review row.
         * @returns {string} Stub template page URL.
         */
        getStubTagPageUrl(row) {
            const stubTag = trimStubTagValue(row?.stubTag);

            return stubTag === ""
                ? ""
                : options.getPageUrl(`Template:${stubTag}`);
        },

        /**
         * Formats a Check-tab Page action label.
         *
         * @param {object} row - Review row.
         * @param {boolean} exists - Whether the target page exists.
         * @returns {string} Lowercase action label.
         */
        getReviewPageActionLabel(row, exists) {
            if (
                row?.pendingEdit != null ||
                row?.pendingCreation != null ||
                String(row?.status || "").startsWith("Pending")
            ) {
                return "pending";
            }

            return exists ? "edit" : "create";
        },

        /**
         * Formats a navbox existence status as a compact badge.
         *
         * @param {object|string} row - Navbox review row or existence status.
         * @returns {string} Compact status label.
         */
        formatNavboxStatusLabel(row) {
            return formatReviewRowStatusLabel(row, isBlankNavboxRow);
        },

        /**
         * Gets the InfoChip status for a navbox existence state.
         *
         * @param {object|string} row - Navbox review row or existence status.
         * @returns {string} Codex InfoChip status.
         */
        getNavboxStatusChipStatus(row) {
            return getReviewRowStatusChipStatus(row, isBlankNavboxRow);
        },

        /**
         * Formats a redirect existence status as a compact badge.
         *
         * @param {object|string} row - Redirect review row or existence status.
         * @returns {string} Compact status label.
         */
        formatRedirectStatusLabel(row) {
            if (
                typeof row === "object" &&
                row != null &&
                isBlankRedirectRow(row)
            ) {
                return "empty";
            }

            const status =
                typeof row === "object" && row != null ? row.status : row;

            if (
                typeof row === "object" &&
                row != null &&
                !isRedirectRowFixed(row)
            ) {
                return "Unchecked";
            }

            return (
                {
                    Exists: "Overwrite",
                    Missing: "OK",
                }[status] || "Unchecked"
            );
        },

        /**
         * Gets the InfoChip status for a redirect existence state.
         *
         * @param {object|string} row - Redirect review row or existence status.
         * @returns {string} Codex InfoChip status.
         */
        getRedirectStatusChipStatus(row) {
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
         * @returns {number} Hanzi-equivalent sinograph count.
         */
        getProseSinographs() {
            return options.getProseSinographs(form);
        },

        /**
         * Gets the current generated prose wikitext.
         *
         * @returns {string} Generated prose wikitext.
         */
        getProseWikitext() {
            return options.getProseWikitext(form);
        },

        /**
         * Gets the metadata table field label, including list item counts.
         *
         * @param {object} field - Article parameter field.
         * @param {string} field.key - Form field key.
         * @param {string} field.label - Field display label.
         * @returns {string} Field label for metadata table display.
         */
        getMetadataFieldLabel(field) {
            const label = field?.label || "";

            if (!isArticleListField(field?.key)) {
                return label;
            }

            const count = splitFieldValues(form[field.key]).length;

            return `${label} (${count})`;
        },

        /**
         * Checks whether a localized name row came from the Steam helper.
         *
         * @param {object} row - Localized name row.
         * @returns {boolean} Whether the row was helper-generated.
         */
        isSteamNameHelperRow(row) {
            return row?.[STEAM_NAME_HELPER_ROW] === true;
        },
    };

    return {
        methods,
        /**
         * Exposes dialog state and actions to the template.
         *
         * @returns {object} Component state consumed by the template.
         */
        setup() {
            return {
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
                getFieldPlaceholder: options.getFieldPlaceholder.bind(
                    null,
                    form,
                ),
                getFieldPreview,
                getGroupPreview,
                getNameSearchRows,
                getEnwikiTipLinks,
                getWikidataText,
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
        },
        template: createDialogTemplate(),
    };

    /**
     * Positions the shared table-action tooltip inside the viewport.
     *
     * @param {DOMRect} rect - Trigger button bounds.
     * @returns {void}
     */
    function positionTableActionTooltip(rect) {
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
        const left =
            width > 0 && maxLeft >= minLeft
                ? Math.min(Math.max(centered, minLeft), maxLeft)
                : centered;

        tableActionTooltip.style = {
            left: `${left}px`,
            top: `${rect.bottom + 6}px`,
        };
    }

    /**
     * Queues source editor initialization after Vue has rendered the textarea.
     *
     * @param {string} key - Editor instance key.
     * @param {object} textareaRef - Vue template ref.
     * @param {object} textRef - Mutable text ref.
     * @returns {void}
     */
    function queueSourceEditor(key, textareaRef, textRef) {
        if (typeof Vue.nextTick === "function") {
            Vue.nextTick(() => {
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
     * Initializes MediaWiki CodeMirror for a source textarea when available.
     *
     * @param {string} key - Editor instance key.
     * @param {object} textareaRef - Vue template ref.
     * @param {object} textRef - Mutable text ref.
     * @returns {Promise<void>} Resolves after enhancement attempt.
     */
    async function initializeSourceEditor(key, textareaRef, textRef) {
        const textarea = findTextareaElement(textareaRef.value);

        if (
            textarea == null ||
            sourceEditors.has(key) ||
            sourceEditorLoads.has(key)
        ) {
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
            const currentTextarea = findTextareaElement(textareaRef.value);

            if (
                !isSourceEditorOpen(key) ||
                currentTextarea == null ||
                currentTextarea !== textarea
            ) {
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

            sourceEditors.set(key, {
                editor,
                textRef,
                textarea,
            });
        } catch (_error) {
            sourceEditors.delete(key);
        } finally {
            sourceEditorLoads.delete(key);
        }
    }

    /**
     * Destroys one source editor instance.
     *
     * @param {string} key - Editor instance key.
     * @returns {void}
     */
    function destroySourceEditor(key) {
        const state = sourceEditors.get(key);

        if (state == null) {
            return;
        }

        syncSourceEditorText(key);

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
     * @param {string} key - Editor instance key.
     * @returns {boolean} Whether the backing dialog is open.
     */
    function isSourceEditorOpen(key) {
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
     * @param {object} editor - CodeMirror instance.
     * @returns {void}
     */
    function destroyLoadedSourceEditor(editor) {
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
     * @returns {void}
     */
    function clearPreviewState() {
        previewText.value = "";
        previewSummary.value = "";
        previewHtml.value = "";
    }

    /**
     * Releases fetched page edit text and parsed HTML after dismissal.
     *
     * @returns {void}
     */
    function clearPageEditState() {
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
     * @param {string} key - Editor instance key.
     * @param {object} [textRef] - Mutable text ref.
     * @returns {void}
     */
    function syncSourceEditorText(key, textRef) {
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
     * @param {string} key - Editor instance key.
     * @param {string} text - Source text.
     * @returns {void}
     */
    function setSourceEditorText(key, text) {
        const state = sourceEditors.get(key);

        if (state == null) {
            return;
        }

        setCodeMirrorText(state.editor, state.textarea, text);
    }

    /**
     * Refreshes category rows through the owning module.
     *
     * @returns {Promise<void>} Resolves after rows are refreshed.
     */
    async function refreshCategoryRows(refreshOptions = {}) {
        if (
            shouldSkipFixedRows(
                refreshOptions,
                form.categoryRows.filter((row) => !isBlankCategoryRow(row)),
                isCategoryRowFixed,
            )
        ) {
            return;
        }

        await options.onCategoryRowsRefresh(
            form,
            categoryState,
            refreshOptions,
        );
        applyCategoryPatches(
            form.categoryRows,
            form.historyPatches?.categories,
        );
        markCategoryRowsFixed(form.categoryRows);
        ensureTrailingCategoryRow(form, options.onCreateCategoryRow);
        initializeStubTagRows(form);
    }

    /**
     * Gets category refresh options for a review refresh.
     *
     * @param {object} refreshOptions - Requested refresh options.
     * @returns {object} Category refresh options.
     */
    function getCategoryRefreshOptions(refreshOptions) {
        if (refreshOptions.recheck !== true) {
            return refreshOptions;
        }

        return {
            ...refreshOptions,
            bypassCache: true,
        };
    }

    /**
     * Refreshes categories and generated review details.
     *
     * @returns {Promise<void>} Resolves after review data is refreshed.
     */
    async function refreshReview(refreshOptions = {}) {
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
     * @returns {Promise<void>} Resolves after citation rows are ready.
     */
    async function refreshCitationRows() {
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

            form.citationRows.splice(
                0,
                form.citationRows.length,
                ...patchedRows,
            );
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
     * @returns {void}
     */
    function syncActiveCitationTab() {
        const names = form.citationRows.map(getCitationTabName);

        activeCitationTab.value = names.includes(activeCitationTab.value)
            ? activeCitationTab.value
            : names[0] || "";
    }

    /**
     * Merges a refreshed navbox row with the current editable row.
     *
     * @param {object} row - Refreshed navbox row.
     * @param {number} index - Row index.
     * @returns {object} Merged row.
     */
    function updatePreparedNavboxRow(row, index) {
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
     * @param {boolean} force - Whether to replace reviewed rows.
     * @returns {Promise<void>} Resolves after navbox rows are refreshed.
     */
    async function refreshNavboxRows(
        force,
        rebuild = false,
        refreshOptions = {},
    ) {
        if (!force && navboxRowsPrepared) {
            return;
        }

        if (
            force &&
            !rebuild &&
            shouldSkipFixedRows(
                refreshOptions,
                (form.navboxRows || []).filter(
                    (row) => !isBlankNavboxRow(row),
                ),
                isNavboxRowFixed,
            )
        ) {
            navboxRowsPrepared = true;
            return;
        }

        const rows = applyNavboxPatches(
            (await options.onPrepareReview(form, rebuild)).map((row) =>
                createNavboxRow(row, true),
            ),
            form.historyPatches?.navboxes,
        );

        if (!rebuild && Array.isArray(form.navboxRows)) {
            form.navboxRows.splice(
                0,
                form.navboxRows.length,
                ...rows.map(updatePreparedNavboxRow),
            );
            ensureTrailingNavboxRow(form);
            navboxRowsPrepared = true;
            return;
        }

        form.navboxRows = rows;
        ensureTrailingNavboxRow(form);
        navboxRowsPrepared = true;
    }

    /**
     * Refreshes generated redirect review rows.
     *
     * @returns {Promise<void>} Resolves after redirect rows are refreshed.
     */
    async function refreshRedirectRows(refreshOptions = {}) {
        if (options.onPrepareRedirectRows == null) {
            return;
        }

        if (Array.isArray(form.redirectRows)) {
            await checkRedirectRows(refreshOptions);
            return;
        }

        const currentRows = Array.isArray(form.redirectRows)
            ? form.redirectRows
            : [];
        const rows = (
            await options.onPrepareRedirectRows(form, getCurrentTitle())
        ).map((row) => createRedirectRow(row, true));

        form.redirectRows = rows.map((row) => {
            const current = currentRows.find(
                (item) =>
                    normalizeTitleKey(item.title) ===
                    normalizeTitleKey(row.title),
            );

            if (current == null) {
                return row;
            }

            row.enabled = !row.exists;
            return row;
        });
        ensureTrailingRedirectRow(form);
    }

    /**
     * Checks current redirect review rows in place.
     *
     * @returns {Promise<void>} Resolves after redirect rows are fixed.
     */
    async function checkRedirectRows(refreshOptions = {}) {
        if (options.onCheckRedirectRows == null) {
            return;
        }

        const currentRows = Array.isArray(form.redirectRows)
            ? form.redirectRows
            : [];
        const rowsToCheck = currentRows.filter(
            (row) => !isBlankRedirectRow(row),
        );

        if (
            shouldSkipFixedRows(
                refreshOptions,
                rowsToCheck,
                isRedirectRowFixed,
            )
        ) {
            return;
        }

        const rows = (
            await options.onCheckRedirectRows(rowsToCheck, getCurrentTitle())
        ).map((row) => createRedirectRow(row, true));

        form.redirectRows = rows.map((row, index) => {
            const current = currentRows[index];

            if (current == null) {
                return row;
            }

            row.enabled = !row.exists;
            return row;
        });
        ensureTrailingRedirectRow(form);
    }

    /**
     * Opens a source editor for a page action staged at final submit.
     *
     * @param {object} params - Page edit parameters.
     * @param {boolean} params.create - Whether the page is missing.
     * @param {string} params.kind - Edited row kind.
     * @param {object} params.row - Review row to update.
     * @param {string} params.title - Full page title.
     * @returns {Promise<void>} Resolves after the editor is populated.
     */
    async function openPageEdit(params) {
        Object.assign(pageEditState, {
            create: params.create,
            company:
                params.kind === "category"
                    ? trimFieldValue(params.row.company)
                    : "",
            englishName: trimFieldValue(
                params.row.pendingEdit?.englishName ||
                    params.row.pendingCreation?.englishName,
            ),
            error: "",
            html: "",
            kind: params.kind,
            loading: true,
            pending: params.row.pendingEdit != null,
            previousStatus:
                params.row.pendingEdit?.previousStatus || params.row.status,
            row: params.row,
            text: "",
            title: params.title,
        });
        pageEditOpen.value = true;
        queueSourceEditor("pageEdit", pageEditTextArea, {
            get value() {
                return pageEditState.text;
            },
            set value(text) {
                pageEditState.text = text;
            },
        });

        try {
            pageEditState.text =
                getStagedPageText(params.row, params.kind) ??
                (params.create
                    ? await getNewPageEditText(params)
                    : await options.onFetchPageText(params.title));
            setSourceEditorText("pageEdit", pageEditState.text);
            pageEditState.html = await options.onParsePreview(
                pageEditState.text,
                params.title,
            );
        } catch (error) {
            pageEditState.error = error.message || String(error);
        } finally {
            pageEditState.loading = false;
        }
    }

    /**
     * Gets already staged source text for a review row.
     *
     * @param {object} row - Review row.
     * @param {string} kind - Review row kind.
     * @returns {string|undefined} Staged source text.
     */
    function getStagedPageText(row, kind) {
        if (kind === "category" && row.pendingCreation != null) {
            return String(row.pendingCreation.text || "");
        }

        if (row.pendingEdit != null) {
            return String(row.pendingEdit.text || "");
        }

        return undefined;
    }

    /**
     * Gets whether a review-row source editor should create or modify a page.
     *
     * @param {object} row - Review row.
     * @param {boolean} fallbackCreate - Status-derived create state.
     * @returns {boolean} Whether the editor should stage a create.
     */
    function getPageEditCreateState(row, fallbackCreate) {
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
     * @param {object} params - Page edit parameters.
     * @returns {Promise<string>} Initial source text.
     */
    async function getNewPageEditText(params) {
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
     * @returns {void}
     */
    function stagePageEdit() {
        const row = pageEditState.row;

        if (row == null) {
            return;
        }

        if (pageEditState.kind === "category" && pageEditState.create) {
            row.pendingCreation = {
                englishName: trimFieldValue(pageEditState.englishName),
                previousStatus:
                    row.pendingCreation?.previousStatus || row.status,
                text: pageEditState.text,
            };
            row.enabled = true;
            row.status = "Pending creation";
            destroySourceEditor("pageEdit");
            pageEditOpen.value = false;
            clearPageEditState();
            return;
        }

        row.pendingEdit = {
            create: pageEditState.create,
            ...(trimFieldValue(pageEditState.englishName) === ""
                ? {}
                : {
                      englishName: trimFieldValue(pageEditState.englishName),
                  }),
            previousStatus:
                row.pendingEdit?.previousStatus ||
                pageEditState.previousStatus,
            summary: buildPageEditSummary(pageEditState),
            text: pageEditState.text,
            title: pageEditState.title,
        };
        row.enabled = true;
        row.status = pageEditState.create
            ? "Pending creation"
            : "Pending edit";
        destroySourceEditor("pageEdit");
        pageEditOpen.value = false;
        clearPageEditState();
    }

    /**
     * Cancels staged source changes for the current review row.
     *
     * @returns {void}
     */
    function resetPageEdit() {
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
     * @param {object} state - Page edit state.
     * @returns {string} Edit summary text.
     */
    function buildPageEditSummary(state) {
        const action = state.create ? "create" : "modify";
        const suffix =
            state.kind === "navbox"
                ? `, with link to '[[${currentTitle}]]'`
                : "";

        return `${action} '${state.title}'${suffix}`;
    }

    /**
     * Gets the current page title.
     *
     * @returns {string} Current page title.
     */
    function getCurrentTitle() {
        return trimFieldValue(form.pageName) || currentTitle;
    }

    /**
     * Gets the editable article preview dialog title.
     *
     * @returns {string} Preview dialog title.
     */
    function getArticlePreviewTitle() {
        return `Create '${getCurrentTitle()}'`;
    }

    /**
     * Builds a small wikitext preview for one field.
     *
     * @param {object} field - Article parameter field.
     * @returns {string} Preview wikitext, or an empty string.
     */
    function getFieldPreview(field) {
        if (options.getFieldPreview == null) {
            return "";
        }

        return (
            options.getFieldPreview(form, field.previewKey || field.key) || ""
        );
    }

    /**
     * Builds a small wikitext preview for one group.
     *
     * @param {object} group - Article parameter group.
     * @returns {string} Preview wikitext, or an empty string.
     */
    function getGroupPreview(group) {
        if (options.getFieldPreview == null || !group.previewKey) {
            return "";
        }

        return options.getFieldPreview(form, group.previewKey) || "";
    }

    /**
     * Gets the Wikidata note text.
     *
     * @returns {string} Wikidata ID or lookup status text.
     */
    function getWikidataText() {
        return (
            form.wikidataId ||
            options.getFieldPlaceholder(form, {
                key: "wikidataId",
            }) ||
            ""
        );
    }

    /**
     * Gets external links discovered from the English Wikipedia title.
     *
     * @returns {Array<object>} Tip link definitions.
     */
    function getEnwikiTipLinks() {
        if (enwikiLookupLoading.value) {
            return createEnwikiTipPlaceholders("checking...");
        }

        const title = getBasePageTitle(form.enwikiTitle);

        return [
            {
                label: "Wikidata",
                value: form.wikidataId
                    ? form.wikidataId
                    : getWikidataLookupStatus(enwikiMetadata.pageExists),
                url: form.wikidataId
                    ? `https://www.wikidata.org/wiki/${encodeURIComponent(form.wikidataId)}`
                    : title
                      ? buildWikidataSearchUrl(title)
                      : "",
            },
            {
                label: "Metacritic",
                value: enwikiMetadata.metacriticId
                    ? enwikiMetadata.metacriticId
                    : title
                      ? "search"
                      : "not found",
                url: enwikiMetadata.metacriticId
                    ? buildMetacriticUrl(enwikiMetadata.metacriticId)
                    : title
                      ? buildMetacriticSearchUrl(title)
                      : "",
            },
            {
                label: "OpenCritic",
                value: enwikiMetadata.openCriticId
                    ? enwikiMetadata.openCriticId
                    : title
                      ? "search"
                      : "not found",
                url: enwikiMetadata.openCriticId
                    ? buildOpenCriticUrl(enwikiMetadata.openCriticId)
                    : title
                      ? buildOpenCriticSearchUrl(title)
                      : "",
            },
            {
                label: "Steam",
                value: enwikiMetadata.steamId
                    ? enwikiMetadata.steamId
                    : title
                      ? "search"
                      : "not found",
                url: enwikiMetadata.steamId
                    ? buildSteamUrl(enwikiMetadata.steamId)
                    : title
                      ? buildSteamSearchUrl(title)
                      : "",
            },
        ];
    }

    /**
     * Opens Metacritic and OpenCritic lookup links in new tabs.
     *
     * @returns {void}
     */
    function openEnwikiReviewLinks() {
        if (typeof window?.open !== "function") {
            return;
        }

        getEnwikiTipLinks()
            .filter((link) =>
                ["Metacritic", "OpenCritic"].includes(link.label),
            )
            .forEach((link) => {
                if (link.url) {
                    window.open(link.url, "_blank");
                }
            });
    }

    /**
     * Gets original and English title lookup rows.
     *
     * @returns {Array<object>} Search row definitions.
     */
    function getNameSearchRows() {
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

        return (rows.length === 0 ? [{ key: "blank", query: "" }] : rows).map(
            (row) => ({
                ...row,
                links: buildNameSearchLinks(row.query),
            }),
        );
    }

    /**
     * Builds title lookup links for one search query.
     *
     * @param {string} query - Search query title.
     * @returns {Array<object>} Search link definitions.
     */
    function buildNameSearchLinks(query) {
        return [
            {
                label: "CN domain",
                url: buildGoogleSiteSearchUrl(query, "*.cn"),
            },
            {
                label: "Bahamut",
                url: buildGoogleSiteSearchUrl(query, "gnn.gamer.com.tw"),
            },
            {
                label: "zhwp",
                url:
                    "https://cse.google.com.hk/cse?cx=25f8f2342cbfa4e46&q=" +
                    encodeURIComponent(`"${getBasePageTitle(query)}"`),
            },
        ];
    }

    /**
     * Gets the original-title lookup query.
     *
     * @returns {string} Search query title.
     */
    function getOriginalNameSearchQuery() {
        return getBasePageTitle(
            parsePrefixedValue(form.originalName, "").value,
        );
    }

    /**
     * Gets the English-title lookup query.
     *
     * @returns {string} Search query title.
     */
    function getEnglishNameSearchQuery() {
        return getBasePageTitle(form.englishName);
    }

    /**
     * Ensures page-name fields have current values after form replacement.
     *
     * @returns {void}
     */
    function syncPageNameFields() {
        if (trimFieldValue(form.pageName) === "") {
            form.pageName = currentTitle;
        }
    }

    /**
     * Fetches localized Steam names for the current helper URL.
     *
     * @returns {Promise<void>} Resolves after helper rows are updated.
     */
    async function fetchSteamNames() {
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
     * @returns {Promise<void>} Resolves after the lookup is handled.
     */
    async function refreshEnwikiMetadata() {
        const title = trimFieldValue(form.enwikiTitle);
        const serial = enwikiLookupSerial.value + 1;

        enwikiLookupSerial.value = serial;
        enwikiLookupLoading.value =
            title !== "" && options.onEnwikiTitleChange != null;
        form.wikidataId = "";
        Object.assign(enwikiMetadata, createBlankEnwikiMetadata());

        if (title === "" || options.onEnwikiTitleChange == null) {
            return;
        }

        let metadata;

        try {
            metadata = await options.onEnwikiTitleChange(title);
        } catch (_error) {
            metadata = {};
        }

        if (serial !== enwikiLookupSerial.value) {
            return;
        }

        Object.assign(enwikiMetadata, {
            metacriticId: trimFieldValue(metadata.metacriticId),
            openCriticId: trimFieldValue(metadata.openCriticId),
            pageExists:
                metadata.pageExists === true || metadata.pageExists === false
                    ? metadata.pageExists
                    : null,
            steamId: trimFieldValue(metadata.steamId),
        });
        form.wikidataId = trimFieldValue(metadata.wikidataId);

        if (trimFieldValue(form.englishName) === "") {
            form.englishName = getBasePageTitle(metadata.title);
        }

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

        const shouldFetchSteamNames =
            trimFieldValue(steamUrl.value) === "" && enwikiMetadata.steamId;

        if (shouldFetchSteamNames) {
            steamUrl.value = buildSteamUrl(enwikiMetadata.steamId);
            fetchedSteamNameRows.value = [];
        }

        enwikiLookupLoading.value = false;
        openEnwikiReviewLinks();

        if (shouldFetchSteamNames) {
            await fetchSteamNames();
        }
    }

    /**
     * Refreshes Wikidata metadata for the company-category English title.
     *
     * @returns {Promise<void>} Resolves after lookup state is updated.
     */
    async function refreshCompanyCategoryMetadata() {
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

        let metadata;

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
     * @param {object} values - Restored form values.
     * @returns {Promise<void>} Resolves after enwiki metadata is refreshed.
     */
    async function restoreHistoryForm(values) {
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
     * @returns {void}
     */
    function clearFormState() {
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
     * @returns {void}
     */
    function removeSteamAppliedNameRows() {
        form.localizedNames = form.localizedNames.filter(
            (row) =>
                row[STEAM_NAME_HELPER_ROW] !== true && hasAnyNameRowValue(row),
        );
    }
}

/**
 * Formats a review row status as a compact badge label.
 *
 * @param {object|string} row - Review row or raw status.
 * @param {Function} isBlank - Blank row checker.
 * @returns {string} Compact status label.
 */
function formatReviewRowStatusLabel(row, isBlank) {
    if (typeof row === "object" && row != null && isBlank(row)) {
        return "empty";
    }

    const status = typeof row === "object" && row != null ? row.status : row;

    return (
        {
            Exists: "OK",
            Missing: "Missing",
            "Not exists": "Missing",
            OK: "OK",
            "Pending creation": "Pending",
            "Pending edit": "Pending",
        }[status] || "Unchecked"
    );
}

/**
 * Gets the InfoChip status for a review row.
 *
 * @param {object|string} row - Review row or raw status.
 * @param {Function} isBlank - Blank row checker.
 * @returns {string} Codex InfoChip status.
 */
function getReviewRowStatusChipStatus(row, isBlank) {
    if (typeof row === "object" && row != null && isBlank(row)) {
        return "notice";
    }

    const status = typeof row === "object" && row != null ? row.status : row;

    return getReviewStatusChipStatus(status);
}

/**
 * Finds the generated parameter that should restore one citation row.
 *
 * @param {object} citation - Managed citation row.
 * @param {number} paramIndex - Editable parameter index.
 * @returns {object|undefined} Generated parameter row.
 */
function findGeneratedCitationParam(citation, paramIndex) {
    const param = citation.params[paramIndex];
    const name = trimFieldValue(param?.name);
    const generatedParams = citation.generatedParams || [];

    return (
        generatedParams.find((generated) => generated.name === name) ||
        generatedParams[paramIndex]
    );
}

/**
 * Checks whether two citation parameter lists have the same values.
 *
 * @param {Array<object>} first - First parameter list.
 * @param {Array<object>} second - Second parameter list.
 * @returns {boolean} Whether the parameter lists are equal.
 */
function areCitationParamsEqual(first = [], second = []) {
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
 * @param {string} key - Form field key.
 * @param {*} value - Current input value.
 * @param {*} previousValue - Previous stored field value.
 * @returns {string} Input value with the matching wiki-link brackets inserted.
 */
function completeWikiLinkBrackets(key, value, previousValue) {
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
 * @param {string} previousText - Previous text.
 * @param {string} text - Current text.
 * @returns {object|null} Inserted text and index, or null when not a simple insertion.
 */
function getInsertedText(previousText, text) {
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

    return {
        index: start,
        text: text.slice(start, textEnd),
    };
}

/**
 * Locates a completed marker touched by the current insertion.
 *
 * @param {string} text - Current text.
 * @param {object} insertion - Inserted text and index.
 * @param {string} marker - Marker to find.
 * @returns {number} Marker index, or -1 when the insertion did not complete it.
 */
function getInsertedMarkerIndex(text, insertion, marker) {
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
 * @param {string} text - Current input text.
 * @param {number} markerIndex - Index where "[[" was inserted.
 * @returns {string} Completed input text.
 */
function completeOpeningWikiLink(text, markerIndex) {
    const segmentEnd = findListSegmentEnd(text, markerIndex + 2);
    const segmentAfterMarker = text.slice(markerIndex + 2, segmentEnd);

    if (segmentAfterMarker.includes("]]")) {
        return text;
    }

    const trailingWhitespace = segmentAfterMarker.match(/\s*$/u)[0];
    const insertIndex = segmentEnd - trailingWhitespace.length;

    return `${text.slice(0, insertIndex)}]]${text.slice(insertIndex)}`;
}

/**
 * Completes a closing wiki-link marker by adding its open marker.
 *
 * @param {string} text - Current input text.
 * @param {number} markerIndex - Index where "]]" was inserted.
 * @returns {string} Completed input text.
 */
function completeClosingWikiLink(text, markerIndex) {
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

    return `${text.slice(0, insertIndex)}[[${text.slice(insertIndex)}`;
}

/**
 * Finds the start index of the current semicolon/newline-delimited item.
 *
 * @param {string} text - Current input text.
 * @param {number} index - Index inside the current item.
 * @returns {number} Segment start index.
 */
function findListSegmentStart(text, index) {
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
 * @param {string} text - Current input text.
 * @param {number} index - Index inside the current item.
 * @returns {number} Segment end index.
 */
function findListSegmentEnd(text, index) {
    const match = text.slice(index).match(/[;；\r\n]/u);

    return match == null ? text.length : index + match.index;
}
import * as formHelpers from "./helpers.js";

const {
    markSteamNameHelperRow,
    formatCategorySourceLabel,
    formatCategorySourceTitle,
    getCategorySourceDisplay,
    normalizeEnglishCategoryTitle,
    initializeStubTagRows,
    buildStubTagRowsFromCategories,
    ensureStubTagRows,
    cleanEditableRows,
    ensureTrailingEditableRow,
    ensureTrailingCategoryRow,
    ensureTrailingRedirectRow,
    ensureTrailingNavboxRow,
    ensureTrailingStubTagRow,
    isBlankCategoryRow,
    createBlankCategoryRow,
    isBlankStubTagRow,
    isManualStubTagRow,
    createStubTagRow,
    trimStubTagValue,
    createCitationPrefetchQueue,
    createFormValues,
    createNameRow,
    createNoteTaRow,
    createNameRowFromValues,
    getSteamNameSuggestions,
    formatSteamNameMarkets,
    formatSteamNameMarket,
    getOriginalNameLanguage,
    buildSteamNameChoiceRows,
    findSteamNameRow,
    mergeSteamNameRows,
    getNameRowSelectedMarkets,
    ensureTrailingNameRow,
    hasAnyNameRowValue,
    hasEnteredNameRowValue,
    getArticleFields,
    getArticleField,
    getReviewStatusChipStatus,
    getSourceReferenceField,
    getGroupFields,
    getEmptyFieldValue,
    getFieldValueKey,
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
    normalizeReceivedFormValues,
    getHistoryEntryForm,
    applyCitationPatches,
    applyCitationParamPatches,
    applyCategoryPatches,
    applyNavboxPatches,
    isCategoryPatchTarget,
    createCategoryPatchRow,
    syncGeneratedNameNoteTaRow,
    regenerateNoteTaRows,
    isManualNoteTaRow,
    getOfficialNameNoteTaRows,
    getGeneratedNameNoteTaInsertIndex,
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
    normalizeTitleKey,
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
    getCitationSourceDomain,
    getCodeMirrorLoader,
    findTextareaElement,
    getCodeMirrorText,
    setCodeMirrorText,
    cloneValue,
    openDialog,
} = formHelpers;
