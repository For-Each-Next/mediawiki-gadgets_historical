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
} from "./workflow.js";
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
    clearPreviewFormData,
    getMovedEdit,
    getPendingSaveData,
    getPreviewFormData,
    normalizePageTitle,
    storeMovedEdit,
    storePreviewFormData,
} from "./editing/session.js";
import {
    interceptEditSave,
    readEditSummary,
    readEditText,
    shouldPreserveEditor,
    submitEditForm,
    submitPreviewForm,
    writeEditSummary,
    writeEditText,
} from "./editing/editor.js";
import { buildEditSummary } from "./editing/summary.js";
import { updateMovedTitleText } from "./editing/title-move.js";
import {
    buildPreSaveActions,
    buildRedirectRows,
    buildRedirectRowsFromTitles,
    buildRedirectTitles,
    fetchExistingPageTitles,
    getRedirectTitleCheckTitles,
    runSelectedActions,
} from "./editing/pre-save.js";
import { registerNewPage } from "./handlers/new-page-list.js";
import {
    addEnwikiCreateTrigger,
    addMissingPageEditTrigger,
    addViewPageTrigger,
} from "./interface/page-trigger.js";
import {
    failSaveProgress,
    reportSaveProgressError,
    setSaveProgressStep,
} from "./save/controller.js";
import { SAVE_PROGRESS_STORAGE_KEY } from "./save/progress.js";
import {
    createCitationStore,
    prepareManagedCitationRows,
} from "./sources/source-references.js";
import { fetchSteamNameRows } from "./sources/steam-names.js";
import {
    ZHWIKI_API_URL,
    buildZhwikiCreationUrl,
    readZhwikiActivationForm,
    resolveZhwikiCreationTitle,
} from "./sources/zhwiki-activation.js";

const CITATION_PREFETCH_DELAY = 800;

export { submitEditForm };

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
 * Checks whether the current page is an English Wikipedia article view.
 *
 * @returns {boolean} Whether the enwiki launcher should be shown.
 */
function isEnwikiArticleView() {
    return (
        mw.config.get("wgDBname") === "enwiki" &&
        mw.config.get("wgAction") === "view" &&
        mw.config.get("wgNamespaceNumber") === 0 &&
        mw.config.get("wgArticleId") !== 0
    );
}

/**
 * Checks whether the gadget is running on Chinese Wikipedia.
 *
 * @returns {boolean} Whether the full creation dialog can run.
 */
function isZhwiki() {
    return mw.config.get("wgDBname") === "zhwiki";
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
 * Builds a page URL.
 *
 * @param {string} title - Page title.
 * @returns {string} Page URL.
 */
const getPageUrl = (title) => mw.util.getUrl(title);

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
 * Builds generated prose wikitext from current form values.
 *
 * @param {object} form - Dialog form values.
 * @returns {string} Generated prose wikitext.
 */
const getFormProseWikitext = (form) =>
    createArticleData(form, {
        defaultName: getDefaultNameFallback(),
    }).prose.text;

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
 * Generates wikitext for an editable in-dialog preview.
 *
 * @param {object} form - Dialog form values.
 * @param {object} sourceFetchState - Source fetch status state.
 * @param {object} citationStore - Citation fetch/cache store.
 * @returns {Promise<object|undefined>} Generated preview text, summary, and HTML.
 */
async function previewForm(form, sourceFetchState, citationStore) {
    sourceFetchState.error = "";
    sourceFetchState.loading = true;

    try {
        const stub = await buildStubFromForm(form, citationStore);

        const text = stub.text;

        return {
            html: await parsePreviewText(text),
            summary: buildEditSummary(createEditSummaryMetadata(form, stub)),
            text,
        };
    } catch (error) {
        sourceFetchState.error = error.message;
        return undefined;
    } finally {
        sourceFetchState.loading = false;
    }
}

/**
 * Parses generated wikitext through MediaWiki.
 *
 * @param {string} text - Wikitext to parse.
 * @returns {Promise<string>} Parsed preview HTML.
 */
async function parsePreviewText(text, title = getPageName()) {
    const response = await new mw.Api().post({
        action: "parse",
        contentmodel: "wikitext",
        disableeditsection: true,
        formatversion: 2,
        prop: "text",
        text,
        title,
    });

    return response?.parse?.text || "";
}

/**
 * Fetches the current source for one wiki page.
 *
 * @param {string} title - Full page title.
 * @returns {Promise<string>} Page source text.
 */
async function fetchPageText(title) {
    const response = await new mw.Api().get({
        action: "query",
        formatversion: "2",
        prop: "revisions",
        rvprop: "content",
        rvslots: "main",
        titles: title,
    });
    const pages = response?.query?.pages || [];
    const page = Array.isArray(pages) ? pages[0] : Object.values(pages)[0];
    const revision = page?.revisions?.[0];

    if (page == null || page.missing != null || revision == null) {
        throw new Error(`Unable to read ${title}.`);
    }

    return (
        revision.slots?.main?.content ??
        revision.slots?.main?.["*"] ??
        revision["*"] ??
        ""
    );
}

/**
 * Generates wikitext and submits the MediaWiki edit form.
 *
 * @param {object} form - Dialog form values.
 * @param {object} sourceFetchState - Source fetch status state.
 * @param {Function} closeDialog - Dialog close callback.
 * @param {object} preSave - Configured pre-save fixes.
 * @param {object} citationStore - Citation fetch/cache store.
 * @param {object} [preview] - User-reviewed preview text.
 * @param {string} [preview.summary] - User-reviewed edit summary.
 * @param {string} [preview.text] - User-reviewed wikitext.
 * @returns {Promise<void>} Resolves after save submission starts.
 */
async function submitForm(
    form,
    sourceFetchState,
    closeDialog,
    preSave,
    citationStore,
    preview,
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
        const previewText =
            typeof preview?.text === "string" ? preview.text : undefined;
        const preserveEditor = previewText == null && shouldPreserveEditor();
        const stub =
            previewText != null || preserveEditor
                ? null
                : await buildStubFromForm(submittedForm, citationStore);
        const summary =
            typeof preview?.summary === "string"
                ? preview.summary
                : stub != null
                  ? buildEditSummary(
                        createEditSummaryMetadata(submittedForm, stub),
                    )
                  : readEditSummary();
        const text = previewText ?? stub?.text ?? readEditText();
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
            progressGroups: preSave.progressGroups,
            registration: preSave.registration,
        };
        const api = new mw.Api();

        preSave.progress?.start(getPageName(), pending);
        await saveSubmittedArticle(api, getPageName(), text, summary);
        preSave.progress?.set("save", "complete");

        const result = await runSubmittedFollowUpActions(
            api,
            pending,
            getPageName(),
            preSave.progress,
        );

        if (result.failed.length > 0) {
            preSave.progress?.report(
                formatPendingActionFailures(result.failed),
            );
            return;
        }

        window.location.href = mw.util.getUrl(result.title);
    } catch (error) {
        preSave.progress?.fail(error);
        sourceFetchState.error = error.message;
    } finally {
        sourceFetchState.loading = false;
    }
}

/**
 * Saves the submitted article text through the API.
 *
 * @param {object} api - MediaWiki API client.
 * @param {string} title - Submitted page title.
 * @param {string} text - Submitted article wikitext.
 * @param {string} summary - Edit summary.
 * @returns {Promise<void>} Resolves after the article is saved.
 */
async function saveSubmittedArticle(api, title, text, summary) {
    const params = {
        action: "edit",
        summary,
        text,
        title,
    };

    if (mw.config.get("wgArticleId") === 0) {
        params.createonly = true;
    }

    await api.postWithToken("csrf", params);
}

/**
 * Runs follow-up actions for an article saved from the pre-save dialog.
 *
 * @param {object} api - MediaWiki API client.
 * @param {object} pending - Pending follow-up actions.
 * @param {string} title - Submitted article title.
 * @param {object} [progress] - In-dialog progress reporter.
 * @returns {Promise<object>} Follow-up action result.
 */
async function runSubmittedFollowUpActions(api, pending, title, progress) {
    let currentTitle = title;
    const actionOptions = {
        api,
        move: pending.move,
        onActionComplete(action) {
            progress?.set(action.id, "complete");
        },
        onActionFailed(action) {
            progress?.set(action.id, "failed");
        },
        onActionRetry(action) {
            progress?.set(action.id, "retrying");
        },
        onActionSkipped(action) {
            progress?.set(action.id, "skipped");
        },
        onActionStart(action) {
            progress?.set(action.id, "running");
        },
        onMoveComplete(movedTitle) {
            currentTitle = movedTitle;
            progress?.set("move", "complete");
        },
        onMoveStart() {
            progress?.set("move", "running");
        },
        title: currentTitle,
        wikidataApi: new mw.ForeignApi("https://www.wikidata.org/w/api.php"),
        saveCategory: (category, text) =>
            saveCategoryPage(category, text, undefined, api),
        saveCompanyCategory: (category, text, englishName) =>
            saveCompanyCategory(category, text, englishName, {
                api,
                wikidataApi: new mw.ForeignApi(
                    "https://www.wikidata.org/w/api.php",
                ),
            }),
    };
    const result = await runSelectedActions(
        pending.actions || [],
        actionOptions,
    );

    if (pending.registration?.enabled === true) {
        progress?.set("new-page-list", "running");
        await registerNewPage(
            api,
            result.title,
            result.completed
                .filter(
                    (action) =>
                        action.type === "category" &&
                        trimFieldValue(action.company) !== "",
                )
                .map((action) => action.category),
        );
        progress?.set("new-page-list", "complete");
    }

    return result;
}

/**
 * Refreshes missing company-category Wikidata IDs before showing pre-save work.
 *
 * @param {object} form - Dialog form values.
 * @returns {Promise<void>} Resolves after category metadata is refreshed.
 */
async function refreshPreSaveCategoryWikidata(form) {
    const rows = Array.isArray(form.categoryRows) ? form.categoryRows : [];

    await Promise.all(
        rows
            .filter(
                (row) =>
                    row?.enabled !== false &&
                    row?.pendingCreation != null &&
                    trimFieldValue(row.pendingCreation.englishName) !== "" &&
                    trimFieldValue(row.pendingCreation.wikidataId) === "",
            )
            .map(async (row) => {
                try {
                    const metadata = await fetchEnwikiMetadata(
                        normalizeEnglishCategoryTitle(
                            row.pendingCreation.englishName,
                        ),
                    );

                    row.pendingCreation.wikidataId = trimFieldValue(
                        metadata.wikidataId,
                    );
                } catch (_error) {
                    row.pendingCreation.wikidataId = "";
                }
            }),
    );
}

/**
 * Normalizes an English Wikipedia category title for metadata lookup.
 *
 * @param {string} title - User-entered English category title.
 * @returns {string} Category title with namespace.
 */
function normalizeEnglishCategoryTitle(title) {
    const value = trimFieldValue(title);

    return value === "" || /^Category:/iu.test(value)
        ? value
        : `Category:${value}`;
}

/**
 * Creates an article submit callback with the citation cache bound.
 *
 * @param {object} citationStore - Citation fetch/cache store.
 * @param {Function} [submit] - Submit implementation.
 * @returns {Function} Dialog submit callback.
 */
export function createSubmitHandler(citationStore, submit = submitForm) {
    return (form, sourceFetchState, closeDialog, preSave, preview) =>
        submit(
            form,
            sourceFetchState,
            closeDialog,
            preSave,
            citationStore,
            preview,
        );
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
 * @param {string} form.name - Main page title.
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
        trimFieldValue(form.originalName) ||
        trimFieldValue(form.englishName) ||
        trimFieldValue(form.name)
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
    if (isMissingPageView()) {
        addMissingPageEditTrigger(mw.util, handleToolboxClick);
        return;
    }

    addViewPageTrigger(mw.util, handleToolboxClick);
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
async function openTargetPage(
    form,
    title,
    sourceFetchState,
    citationStore,
    options = {},
) {
    sourceFetchState.error = "";
    const targetTitle = trimFieldValue(title);

    if (targetTitle === "") {
        return;
    }

    sourceFetchState.loading = true;

    try {
        const targetForm = { ...form, name: targetTitle };
        const preserveEditor = shouldPreserveEditor();
        const [currentStub, stub] = preserveEditor
            ? await Promise.all([
                  buildStubFromForm(form, citationStore),
                  buildStubFromForm(targetForm, citationStore),
              ])
            : [null, await buildStubFromForm(targetForm, citationStore)];
        const summaryMetadata = createEditSummaryMetadata(targetForm, stub);
        const text = preserveEditor
            ? updateMovedTitleText(
                  readEditText(),
                  currentStub.articleData,
                  stub.articleData,
              )
            : stub.text;

        storeMovedEdit({
            form: targetForm,
            preview: options.preview === true,
            summary: preserveEditor ? readEditSummary() : undefined,
            summaryMetadata,
            text,
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
    writeEditSummary(
        pending.summary ?? buildEditSummary(pending.summaryMetadata || {}),
    );
    clearMovedEdit();

    if (pending.preview === true) {
        storePreviewFormData(pending.form, getPageName());
        submitPreviewForm();
    }
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
 * Adds the English Wikipedia launcher that starts zhwiki creation.
 *
 * @returns {void}
 */
function initEnwikiLauncher() {
    const enwikiTitle = getPageName();
    const fallbackUrl = buildZhwikiCreationUrl(enwikiTitle);
    let pending = false;

    addEnwikiCreateTrigger(mw.util, async (event) => {
        event.preventDefault();

        if (pending) {
            return;
        }

        pending = true;
        const tab = window.open(fallbackUrl, "_blank");

        try {
            const api = new mw.ForeignApi(ZHWIKI_API_URL);
            const targetTitle = await resolveZhwikiCreationTitle(
                enwikiTitle,
                api,
            );
            const url = buildZhwikiCreationUrl(enwikiTitle, targetTitle);

            if (tab != null) {
                tab.location.href = url;
            } else {
                window.open(url, "_blank", "noopener");
            }
        } catch (_error) {
            if (tab == null) {
                window.open(fallbackUrl, "_blank", "noopener");
            }
        } finally {
            pending = false;
        }
    }, fallbackUrl);
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
    const currentPageName = getPageName();
    const categoryStore = createCategoryCacheStore(currentPageName);
    const citationStore = createCitationStore();
    const defaultName = getDefaultName();
    const movedEdit = getMovedEdit(currentPageName);
    const previewFormData =
        mw.config.get("wgAction") === "submit"
            ? getPreviewFormData(currentPageName)
            : undefined;
    const activationForm = readZhwikiActivationForm(window.location.search);
    let saveInterceptorActive = false;

    const activateTool = () => {
        if (saveInterceptorActive) {
            return;
        }

        interceptEditSave(() => window.createVgStubDialog.submit());
        saveInterceptorActive = true;
    };

    addDialogStyles();

    const dialogOptions = {
        citationPrefetchDelay: CITATION_PREFETCH_DELAY,
        currentTitle: currentPageName,
        defaultName,
        getPageUrl,
        getHistoryEntries: readFormHistoryEntries,
        getFieldPlaceholder,
        getFieldPreview,
        getProseSinographs: getFormProseSinographs,
        getProseWikitext: getFormProseWikitext,
        initialForm:
            activationForm ||
            previewFormData?.form ||
            movedEdit?.form ||
            readFormDraftForPage(currentPageName),
        initialOpen:
            activationForm != null ||
            previewFormData != null ||
            (movedEdit != null && movedEdit.preview !== true),
        initialEnwikiLookup: activationForm != null,
        onActivate: activateTool,
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
        onParsePreview: parsePreviewText,
        onPreview: (...args) => previewForm(...args, citationStore),
        onFormChange: (form) => saveFormDraft(form, currentPageName),
        onFetchPageText: fetchPageText,
        onMoveTarget: (...args) => openTargetPage(...args, citationStore),
        onPrepareCompanyCategory: prepareCompanyCategoryText,
        onPrepareCitations: (form) =>
            prepareManagedCitationRows(form, citationStore),
        async onPrepareRedirectRows(form, title) {
            const redirectTitles = buildRedirectTitles(form, title);
            const existingRedirectTitles = await fetchExistingPageTitles(
                new mw.Api(),
                getRedirectTitleCheckTitles(redirectTitles),
            );

            return buildRedirectRows(form, title, existingRedirectTitles);
        },
        async onCheckRedirectRows(rows, title) {
            const redirectTitles = rows.map((row) => row.title);
            const existingRedirectTitles = await fetchExistingPageTitles(
                new mw.Api(),
                getRedirectTitleCheckTitles(redirectTitles),
            );

            return buildRedirectRowsFromTitles(
                redirectTitles,
                title,
                existingRedirectTitles,
            );
        },
        onPrepareReview: prepareNavboxRows,
        async onPreSavePrepare(form, title) {
            await refreshPreSaveCategoryWikidata(form);
            const redirectTitles = Array.isArray(form.redirectRows)
                ? form.redirectRows.map((row) => row.title)
                : buildRedirectTitles(form, title);
            const existingRedirectTitles = await fetchExistingPageTitles(
                new mw.Api(),
                getRedirectTitleCheckTitles(redirectTitles),
            );
            const metadata = { finalTitle: title, form, title };
            const actions = buildPreSaveActions(
                metadata,
                existingRedirectTitles,
            );

            return { actions, move: { enabled: false, to: title } };
        },
        onSourceUrlChange: (url) => citationStore.prefetch(url),
        onSteamNamesFetch: (url, options) =>
            fetchSteamNameRows(url, citationStore, options),
        onSubmit: createSubmitHandler(citationStore),
        onSubmitHistory: saveCurrentFormHistory,
        onUpdateCategoryRowCategory: updateCategoryRowCategory,
    };
    const app = Vue.createMwApp(createDialogComponent(Vue, dialogOptions));

    app.component("CdxDialog", Codex.CdxDialog);
    app.component("CdxButton", Codex.CdxButton);
    app.component("CdxButtonGroup", Codex.CdxButtonGroup);
    app.component("CdxCard", Codex.CdxCard);
    app.component("CdxCheckbox", Codex.CdxCheckbox);
    app.component("CdxField", Codex.CdxField);
    app.component("CdxIcon", Codex.CdxIcon);
    app.component("CdxInfoChip", Codex.CdxInfoChip);
    app.component("CdxMenuButton", Codex.CdxMenuButton);
    app.component("CdxProgressBar", Codex.CdxProgressBar);
    app.component("CdxProgressIndicator", Codex.CdxProgressIndicator);
    app.component("CdxSelect", Codex.CdxSelect);
    app.component("CdxTab", Codex.CdxTab);
    app.component("CdxTabs", Codex.CdxTabs);
    app.component("CdxTable", Codex.CdxTable);
    app.component("CdxTextArea", Codex.CdxTextArea);
    app.component("CdxTextInput", Codex.CdxTextInput);
    app.mount(createHost());

    if (previewFormData != null) {
        clearPreviewFormData();
    }

    if (movedEdit != null) {
        activateTool();
    }

    addToolboxLink();
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
            onActionFailed(action) {
                setSaveProgressStep(action.id, "failed");
            },
            onActionRetry(action) {
                setSaveProgressStep(action.id, "retrying");
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
            saveCategory: (category, text) =>
                saveCategoryPage(category, text, undefined, api),
            saveCompanyCategory: (category, text, englishName) =>
                saveCompanyCategory(category, text, englishName, {
                    api,
                    wikidataApi: new mw.ForeignApi(
                        "https://www.wikidata.org/w/api.php",
                    ),
                }),
        };
        const result = await runSelectedActions(
            pending.actions || [],
            actionOptions,
        );

        if (pending.registration?.enabled === true) {
            setSaveProgressStep("new-page-list", "running");
            await registerNewPage(
                api,
                result.title,
                result.completed
                    .filter(
                        (action) =>
                            action.type === "category" &&
                            trimFieldValue(action.company) !== "",
                    )
                    .map((action) => action.category),
            );
            setSaveProgressStep("new-page-list", "complete");
        }

        clearPendingSaveData();

        if (result.failed.length > 0) {
            reportSaveProgressError(
                formatPendingActionFailures(result.failed),
            );
        } else {
            sessionStorage.removeItem(SAVE_PROGRESS_STORAGE_KEY);
        }

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

/**
 * Formats a final report for follow-up actions skipped after retries.
 *
 * @param {Array<object>} actions - Failed follow-up actions.
 * @returns {string} Failure report.
 */
function formatPendingActionFailures(actions) {
    const labels = actions
        .map((action) => action.label || action.id)
        .filter((label) => trimFieldValue(label) !== "");

    if (labels.length === 0) {
        return "Some follow-up actions failed after 3 attempts.";
    }

    return `Failed after 3 attempts: ${labels.join("; ")}`;
}

const currentAction = mw.config.get("wgAction");
const hasPendingSave =
    isZhwiki() &&
    currentAction === "view" &&
    mw.config.get("wgArticleId") !== 0 &&
    getPendingSaveData(getPageName()) != null;

if (isEnwikiArticleView()) {
    mw.loader
        .using(["mediawiki.ForeignApi", "mediawiki.util"])
        .then(initEnwikiLauncher);
} else if (hasPendingSave) {
    mw.loader
        .using(["mediawiki.api", "mediawiki.ForeignApi", "mediawiki.util"])
        .then(runPendingSaveActions);
} else if (isZhwiki() && (isEditAction(currentAction) || isMissingPageView())) {
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
}
