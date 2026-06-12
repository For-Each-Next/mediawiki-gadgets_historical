/* eslint-disable */

/**
 * Mounts the create-vg-stub gadget and builds generated article wikitext.
 */

import {
    createManualCategoryRow,
    updateCategoryRowCategory,
} from "./handlers/categories.js";
import {
    buildStubFromForm as buildArticleStubFromForm,
    buildStubText as buildArticleStubText,
    flushArticleData as createArticleData,
    getArticleFieldPlaceholder,
    getArticleFieldPreview,
    getFormProseSinographs as countFormProseSinographs,
    prepareCategoryRows,
    prepareNavboxRows,
} from "./workflow/article.js";
import { createCategoryCacheStore } from "./handlers/category-cache.js";
import {
    prepareCompanyCategoryText,
    saveCategoryPage,
    saveCompanyCategory,
} from "./handlers/category-pages.js";
import {
    addDialogStyles,
    createDialogComponent,
    trimFieldValue,
} from "./interface/form.js";
import {
    clearFormHistory,
    deleteFormHistoryEntry,
    readFormDraftEntry,
    readFormDraftForPage,
    readFormHistory,
    saveFormDraft,
    saveFormHistory,
} from "./interface/history.js";
import { fetchEnwikiMetadata } from "./sources/crosswiki.js";
import {
    clearMovedEdit,
    clearPendingSaveData,
    getMovedEdit,
    getPendingSaveData,
    normalizePageTitle,
    storeMovedEdit,
    storePendingSaveData,
} from "./editing/session.js";
import {
    submitEditForm,
    writeEditSummary,
    writeEditText,
} from "./editing/editor.js";
import { buildEditSummary } from "./editing/summary.js";
import {
    buildPreSaveActions,
    buildRedirectTitles,
    buildTitleFix,
    fetchExistingPageTitles,
    runSelectedActions,
} from "./editing/pre-save.js";
import { saveNavboxTemplate } from "./handlers/navbox-pages.js";
import { addMissingPageEditTrigger } from "./interface/page-trigger.js";
import {
    failSaveProgress,
    renderStoredSaveProgress,
    setSaveProgressStep,
    startSaveProgress,
} from "./save/controller.js";
import { SAVE_PROGRESS_STORAGE_KEY } from "./save/progress.js";
import { createCitationStore } from "./sources/source-references.js";
import { fetchSteamNameRows } from "./sources/steam-names.js";

const CITATION_PREFETCH_DELAY = 800;

export { submitEditForm };

/**
 * Checks whether the current view is editing a missing page.
 *
 * @returns {boolean} Whether the current view is a new-page edit form.
 */
function isNewPageEdit() {
    return (
        isEditAction(mw.config.get("wgAction")) &&
        mw.config.get("wgArticleId") === 0
    );
}

/**
 * Checks whether the current view displays a missing page.
 *
 * @returns {boolean} Whether the current action views an uncreated page.
 */
function isMissingPageView() {
    return (
        mw.config.get("wgAction") === "view" &&
        mw.config.get("wgArticleId") === 0
    );
}

/**
 * Checks whether an action can show a new-page edit form.
 *
 * @param {string} action - MediaWiki action.
 * @returns {boolean} Whether the action edits or submits page text.
 */
function isEditAction(action) {
    return action === "edit" || action === "submit";
}

/**
 * Builds the Chinese Wikipedia video game stub article text.
 *
 * @param {object} params - Normalized article parameters.
 * @param {string} params.aggScoresText - Aggregate review score sentence.
 * @param {string} params.additionalProseText - User-entered appended prose.
 * @param {object} params.companyMetadata - Company text and metadata.
 * @param {string} params.defaultSortText - DEFAULTSORT wikitext.
 * @param {string} params.infoboxText - Infobox wikitext.
 * @param {string} params.leadNameText - Lead article name text.
 * @param {string} params.noteTaText - NoteTA-lite wikitext.
 * @param {object} params.platformSeriesMetadata - Platform and series text and metadata.
 * @param {Array<object>} params.sourceReferences - Named source references.
 * @param {object} params.yearGenreMetadata - Year/genre text and metadata.
 * @returns {string} Generated Chinese wikitext.
 */
export function buildStubText(params) {
    return buildArticleStubText(params);
}

/**
 * Creates the DOM host used by the Vue application.
 *
 * @returns {HTMLElement} Element appended to the document body.
 */
function createHost() {
    const host = document.createElement("div");

    document.body.append(host);

    return host;
}

/**
 * Gets the default article name from the current page title.
 *
 * @returns {string} Page title without a trailing disambiguation suffix.
 */
function getDefaultName() {
    return String(mw.config.get("wgTitle") || "").replace(/ \(.+?\)$/u, "");
}

/**
 * Builds a category page URL.
 *
 * @param {string} category - Category title without namespace.
 * @returns {string} Category page URL.
 */
const getCategoryPageUrl = (category) =>
    mw.util.getUrl(`Category:${category}`);

/**
 * Builds a template page URL.
 *
 * @param {string} template - Template title without namespace.
 * @param {boolean} edit - Whether to open the edit form.
 * @returns {string} Template page URL.
 */
const getTemplatePageUrl = (template, edit = false) =>
    mw.util.getUrl(`Template:${template}`, edit ? { action: "edit" } : {});

/**
 * Counts generated prose from current form values.
 *
 * @param {object} form - Dialog form values.
 * @returns {number} Hanzi-equivalent sinograph count.
 */
const getFormProseSinographs = (form) =>
    countFormProseSinographs(form, {
        defaultName: getDefaultNameFallback(),
    });

/**
 * Gets placeholder text for one form field.
 *
 * @param {object} form - Dialog form values.
 * @param {object} field - Dialog field definition.
 * @param {string} field.key - Form key for the field.
 * @returns {string|undefined} Placeholder text.
 */
function getFieldPlaceholder(form, field) {
    return getArticleFieldPlaceholder(form, field, {
        defaultName: getDefaultName(),
    });
}

/**
 * Builds a small live wikitext preview for one dialog field.
 *
 * @param {object} form - Dialog form values.
 * @param {string} previewKey - Shared preview group key.
 * @returns {string} Preview wikitext, or an empty string.
 */
function getFieldPreview(form, previewKey) {
    return getArticleFieldPreview(form, previewKey, {
        defaultName: getDefaultNameFallback(),
    });
}

/**
 * Builds reusable article parameters from raw form values.
 *
 * @param {object} form - Dialog form values.
 * @param {string} form.developers - Developer names.
 * @param {string} form.genres - Game genre text.
 * @param {string} form.name - Game title.
 * @param {string} form.platforms - Platform names.
 * @param {string} form.publishers - Publisher names.
 * @param {string} form.series - Series name.
 * @param {Array<object>} [form.sourceReferences] - Named source refs.
 * @param {string} form.year - Release year.
 * @returns {object} Normalized article parameters.
 */
export function createArticleParams(form) {
    return createArticleData(form, {
        defaultName: getDefaultNameFallback(),
    });
}

/**
 * Gets the current page title when MediaWiki globals are available.
 *
 * @returns {string} Default article title, or an empty string.
 */
function getDefaultNameFallback() {
    if (typeof mw === "undefined") {
        return "";
    }

    return getDefaultName();
}

/**
 * Generates wikitext and fills the MediaWiki edit form without submitting it.
 *
 * @param {object} form - Dialog form values.
 * @param {object} sourceFetchState - Source fetch status state.
 * @param {Function} closeDialog - Dialog close callback.
 * @param {object} citationStore - Citation fetch/cache store.
 * @returns {Promise<void>} Resolves after generated text is inserted.
 */
async function fillForm(form, sourceFetchState, closeDialog, citationStore) {
    sourceFetchState.error = "";
    sourceFetchState.loading = true;

    try {
        await writeGeneratedStub(form, citationStore);
        clearPendingSaveData();
        closeDialog();
    } catch (error) {
        sourceFetchState.error = error.message;
    } finally {
        sourceFetchState.loading = false;
    }
}

/**
 * Generates wikitext and submits the MediaWiki edit form.
 *
 * @param {object} form - Dialog form values.
 * @param {object} sourceFetchState - Source fetch status state.
 * @param {Function} closeDialog - Dialog close callback.
 * @param {object} preSave - Configured pre-save fixes.
 * @param {object} citationStore - Citation fetch/cache store.
 * @returns {Promise<void>} Resolves after save submission starts.
 */
async function submitForm(
    form,
    sourceFetchState,
    closeDialog,
    preSave,
    citationStore,
) {
    sourceFetchState.error = "";
    sourceFetchState.loading = true;

    try {
        const moveTitle = trimFieldValue(preSave?.move?.to);
        const shouldMove =
            preSave?.move?.enabled === true &&
            moveTitle !== "" &&
            normalizePageTitle(moveTitle) !==
                normalizePageTitle(getPageName());
        const submittedForm = shouldMove
            ? {
                  ...form,
                  name: moveTitle,
              }
            : form;
        const stub = await buildStubFromForm(submittedForm, citationStore);
        const summary = buildEditSummary(
            createEditSummaryMetadata(submittedForm, stub),
        );
        const pending = {
            actions: preSave.actions,
            move: shouldMove
                ? {
                      ...preSave.move,
                      to: moveTitle,
                  }
                : {
                      enabled: false,
                  },
        };

        storePendingSaveData(submittedForm, getPageName(), {
            actions: pending.actions,
            move: pending.move,
        });
        startSaveProgress(getPageName(), pending);

        if (document.getElementById("editform") == null) {
            const params = {
                action: "edit",
                createonly: true,
                summary,
                text: stub.text,
                title: getPageName(),
            };

            await new mw.Api().postWithToken("csrf", params);
            setSaveProgressStep("save", "complete");
            window.location.href = mw.util.getUrl(getPageName());
        } else {
            writeEditText(stub.text);
            writeEditSummary(summary);
            submitEditForm();
        }

        closeDialog();
    } catch (error) {
        failSaveProgress(error);
        sourceFetchState.error = error.message;
    } finally {
        sourceFetchState.loading = false;
    }
}

/**
 * Generates and writes article text and its edit summary.
 *
 * @param {object} form - Dialog form values.
 * @param {object} citationStore - Citation fetch/cache store.
 * @returns {Promise<void>} Resolves after the editor is filled.
 */
async function writeGeneratedStub(form, citationStore) {
    const stub = await buildStubFromForm(form, citationStore);

    writeEditText(stub.text);
    writeEditSummary(buildEditSummary(createEditSummaryMetadata(form, stub)));
}

/**
 * Builds generated wikitext and metadata from dialog form values.
 *
 * @param {object} form - Dialog form values.
 * @param {object} citationStore - Citation fetch/cache store.
 * @returns {Promise<object>} Generated stub text and article parameters.
 */
async function buildStubFromForm(form, citationStore) {
    return buildArticleStubFromForm(form, citationStore, {
        defaultName: getDefaultNameFallback(),
    });
}

/**
 * Creates edit summary metadata from dialog form values.
 *
 * @param {object} form - Dialog form values.
 * @param {string} form.englishName - English game title.
 * @param {string} form.enwikiTitle - English Wikipedia page title.
 * @param {string} form.originalName - Original game title.
 * @param {string} form.wikidataId - Wikidata entity ID.
 * @param {string} form.year - Release year.
 * @param {object} stub - Generated stub data.
 * @param {object} stub.articleData - Article metadata.
 * @returns {object} Edit summary metadata.
 */
function createEditSummaryMetadata(form, stub) {
    return {
        displayName: getEditSummaryDisplayName(form),
        enwikiTitle: trimFieldValue(form.enwikiTitle),
        proseSinographs: stub.articleData.prose.sinographs,
        wikidataId: trimFieldValue(form.wikidataId),
        year: trimFieldValue(form.year),
    };
}

/**
 * Gets the title shown in the edit summary name text.
 *
 * @param {object} form - Dialog form values.
 * @param {string} form.englishName - English game title.
 * @param {string} form.originalName - Original game title.
 * @returns {string} Summary display title.
 */
function getEditSummaryDisplayName(form) {
    return (
        trimFieldValue(form.originalName) || trimFieldValue(form.englishName)
    );
}

/**
 * Refreshes reviewed category rows from current generated metadata.
 *
 * @param {object} form - Dialog form values.
 * @param {object} categoryState - Category refresh status state.
 * @param {object} categoryCache - Category resolution cache.
 * @returns {Promise<void>} Resolves after category rows are refreshed.
 */
async function refreshFormCategoryRows(
    form,
    categoryState,
    categoryStore,
    options = {},
) {
    categoryState.error = "";
    categoryState.loading = true;

    try {
        if (options.bypassCache) {
            categoryStore.clear();
        }

        const articleOptions = {
            defaultName: getDefaultNameFallback(),
        };
        const categoryOptions = {
            bypassCache: options.bypassCache,
            cache: categoryStore.cache,
        };
        const rows = await prepareCategoryRows(form, form.categoryRows, {
            article: articleOptions,
            categories: categoryOptions,
        });
        form.categoryRows.splice(
            0,
            form.categoryRows.length,
            ...rows.map((row, index) => {
                const current = form.categoryRows[index];

                if (current == null) {
                    return row;
                }

                Object.assign(current, row);
                return current;
            }),
        );
        categoryStore.save();
    } catch (error) {
        categoryState.error = error.message;
    } finally {
        categoryState.loading = false;
    }
}

/**
 * Saves the current form data with a target page title.
 *
 * @param {object} form - Dialog form values.
 * @param {string} page - Target page title.
 * @returns {void}
 */
function saveCurrentFormHistory(form, page) {
    saveFormHistory(
        {
            ...form,
            name: page,
        },
        page,
    );
}

/**
 * Reads explicit history entries plus the temporary draft.
 *
 * @returns {Array<object>} Form history manager entries.
 */
function readFormHistoryEntries() {
    return [readFormDraftEntry(), ...readFormHistory()].filter(Boolean);
}

/**
 * Opens the dialog from the toolbox link click.
 *
 * @param {*} event - Browser event from the toolbox link.
 * @returns {void}
 */
function handleToolboxClick(event) {
    event.preventDefault();
    window.createVgStubDialog.open();
}

/**
 * Adds the dialog trigger link to the MediaWiki toolbox.
 *
 * @returns {void}
 */
function addToolboxLink() {
    const link = mw.util.addPortletLink(
        "p-tb",
        "#",
        "Create VG stub",
        "t-create-vg-stub",
    );

    link.addEventListener("click", handleToolboxClick);

    if (isMissingPageView()) {
        addMissingPageEditTrigger(document, mw.util, handleToolboxClick);
    }
}

/**
 * Generates current form data and opens it in a target new-page edit form.
 *
 * @param {object} form - Dialog form values.
 * @param {string} title - Target page title.
 * @param {object} sourceFetchState - Source fetch status state.
 * @param {object} citationStore - Citation fetch/cache store.
 * @returns {Promise<void>} Resolves after generated text is stored.
 */
async function openTargetPage(form, title, sourceFetchState, citationStore) {
    sourceFetchState.error = "";
    const targetTitle = trimFieldValue(title);

    if (targetTitle === "") {
        return;
    }

    sourceFetchState.loading = true;

    try {
        const targetForm = { ...form, name: targetTitle };
        const stub = await buildStubFromForm(targetForm, citationStore);

        storeMovedEdit({
            form: targetForm,
            text: stub.text,
            summaryMetadata: createEditSummaryMetadata(targetForm, stub),
            title: targetTitle,
        });
        window.location.href = mw.util.getUrl(targetTitle, {
            action: "edit",
            redlink: "1",
        });
    } catch (error) {
        sourceFetchState.error = error.message;
        sourceFetchState.loading = false;
    }
}

/**
 * Restores moved stub text into the target new-page editor.
 *
 * @returns {void}
 */
function restoreMovedEditText() {
    const pending = getMovedEdit(getPageName());

    if (pending == null) {
        return;
    }

    writeEditText(pending.text);
    writeEditSummary(buildEditSummary(pending.summaryMetadata || {}));
    clearMovedEdit();
}

/**
 * Gets the current full page name.
 *
 * @returns {string} Current full page name.
 */
function getPageName() {
    return mw.config.get("wgPageName").replace(/_/gu, " ");
}

/**
 * Mounts the Codex dialog and registers the toolbox trigger.
 *
 * @param {Function} require - ResourceLoader module resolver.
 * @returns {void}
 */
function init(require) {
    const Vue = require("vue");
    const Codex = require("@wikimedia/codex");
    const categoryStore = createCategoryCacheStore(getPageName());
    const citationStore = createCitationStore();
    const defaultName = getDefaultName();
    const movedEdit = getMovedEdit(getPageName());

    addDialogStyles();

    const dialogOptions = {
        citationPrefetchDelay: CITATION_PREFETCH_DELAY,
        defaultName,
        getCategoryPageUrl,
        getTemplatePageUrl,
        getHistoryEntries: readFormHistoryEntries,
        getFieldPlaceholder,
        getFieldPreview,
        getProseSinographs: getFormProseSinographs,
        initialForm: movedEdit?.form || readFormDraftForPage(defaultName),
        initialOpen: movedEdit != null,
        onCategoryRowsRefresh: (form, categoryState, refreshOptions) =>
            refreshFormCategoryRows(
                form,
                categoryState,
                categoryStore,
                refreshOptions,
            ),
        onClearHistory: clearFormHistory,
        onCreateCategoryRow: createManualCategoryRow,
        onDeleteHistoryEntry: deleteFormHistoryEntry,
        onEnwikiTitleChange: fetchEnwikiMetadata,
        onFill: isMissingPageView()
            ? (form, sourceFetchState) =>
                  openTargetPage(
                      form,
                      getPageName(),
                      sourceFetchState,
                      citationStore,
                  )
            : (...args) => fillForm(...args, citationStore),
        onFormChange: saveFormDraft,
        onMoveTarget: (...args) => openTargetPage(...args, citationStore),
        onPrepareCompanyCategory: prepareCompanyCategoryText,
        onPrepareReview: prepareNavboxRows,
        async onPreSavePrepare(form, title) {
            const redirectTitles = buildRedirectTitles(form, title);
            const existingRedirectTitles = await fetchExistingPageTitles(
                new mw.Api(),
                redirectTitles,
            );
            const metadata = { form, title };
            const actions = buildPreSaveActions(
                metadata,
                existingRedirectTitles,
            );
            const move = buildTitleFix(form, title);

            return { actions, move };
        },
        onSaveCategory: saveCategoryPage,
        onSaveCompanyCategory: saveCompanyCategory,
        onSaveNavbox: saveNavboxTemplate,
        onSourceUrlChange: (url) => citationStore.prefetch(url),
        onSteamNamesFetch: (url) => fetchSteamNameRows(url, citationStore),
        onSubmit: (...args) => submitForm(...args, citationStore),
        onSubmitHistory: saveCurrentFormHistory,
        onUpdateCategoryRowCategory: updateCategoryRowCategory,
    };
    const app = Vue.createMwApp(createDialogComponent(Vue, dialogOptions));

    app.component("CdxDialog", Codex.CdxDialog);
    app.component("CdxButton", Codex.CdxButton);
    app.component("CdxCheckbox", Codex.CdxCheckbox);
    app.component("CdxField", Codex.CdxField);
    app.component("CdxTab", Codex.CdxTab);
    app.component("CdxTabs", Codex.CdxTabs);
    app.component("CdxTextArea", Codex.CdxTextArea);
    app.component("CdxTextInput", Codex.CdxTextInput);
    app.mount(createHost());
    addToolboxLink();
    renderStoredSaveProgress();
    restoreMovedEditText();
}

/**
 * Runs the preselected follow-up actions on the newly created article.
 *
 * @param {Function} require - ResourceLoader module resolver.
 * @returns {void}
 */
async function runPendingSaveActions(require) {
    const pending = getPendingSaveData(getPageName());

    if (pending == null) {
        return;
    }

    setSaveProgressStep("save", "complete");

    try {
        const api = new mw.Api();
        let currentTitle = pending.title;
        const actionOptions = {
            api,
            move: pending.move,
            onActionComplete(action) {
                setSaveProgressStep(action.id, "complete");
            },
            onActionSkipped(action) {
                setSaveProgressStep(action.id, "skipped");
            },
            onActionStart(action) {
                setSaveProgressStep(action.id, "running");
            },
            onMoveComplete(title) {
                currentTitle = title;
                setSaveProgressStep("move", "complete");
            },
            onMoveStart() {
                setSaveProgressStep("move", "running");
            },
            title: currentTitle,
            wikidataApi: new mw.ForeignApi(
                "https://www.wikidata.org/w/api.php",
            ),
        };
        const result = await runSelectedActions(
            pending.actions || [],
            actionOptions,
        );

        clearPendingSaveData();
        sessionStorage.removeItem(SAVE_PROGRESS_STORAGE_KEY);

        if (
            normalizePageTitle(result.title) !==
            normalizePageTitle(getPageName())
        ) {
            window.location.href = mw.util.getUrl(result.title);
        } else {
            window.location.reload();
        }
    } catch (error) {
        failSaveProgress(error);
    }
}

if (isNewPageEdit() || isMissingPageView()) {
    mw.loader
        .using([
            "mediawiki.api",
            "mediawiki.ForeignApi",
            "mediawiki.util",
            "jquery.textSelection",
            "vue",
            "@wikimedia/codex",
        ])
        .then(init);
} else if (
    mw.config.get("wgAction") === "view" &&
    mw.config.get("wgArticleId") !== 0 &&
    getPendingSaveData(getPageName()) != null
) {
    mw.loader
        .using(["mediawiki.api", "mediawiki.ForeignApi", "mediawiki.util"])
        .then(runPendingSaveActions);
}
