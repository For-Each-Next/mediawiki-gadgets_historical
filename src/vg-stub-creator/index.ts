/**
 * Describes the index module.
 *
 * Mounts the vg-stub-creator gadget and builds generated article
 * wikitext.
 */

import {
    createManualCategoryRow,
    updateCategoryRowCategory,
} from "./handlers/categories.ts";
import {
    buildStubFromForm as buildArticleStubFromForm,
    flushArticleData as createArticleData,
    getArticleFieldPlaceholder,
    getArticleFieldPreview,
    getFormProseSinographs as countFormProseSinographs,
    prepareCategoryRows,
    prepareNavboxRows,
} from "./workflow.ts";
import { createCategoryCacheStore } from "./handlers/category-cache.ts";
import {
    prepareCompanyCategoryText,
    saveCategoryPage,
    saveCompanyCategory,
} from "./handlers/category-pages.ts";
import { createDialogComponent } from "./interface/form";
import { getBasePageTitle } from "./interface/form/helpers.ts";
import { addDialogStyles } from "./interface/styles.ts";
import { trimFieldValue } from "./shared/form-values.ts";
import {
    clearFormHistory,
    deleteFormHistoryEntry,
    readFormDraftEntry,
    readFormDraftForPage,
    readFormHistory,
    saveFormDraft,
    saveFormHistory,
} from "./interface/history.ts";
import { fetchEnwikiMetadata } from "./sources/crosswiki.ts";
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
} from "./editing/session.ts";
import {
    interceptEditSave,
    readEditSummary,
    readEditText,
    shouldPreserveEditor,
    submitEditForm,
    submitPreviewForm,
    writeEditSummary,
    writeEditText,
} from "./editing/editor.ts";
import { buildEditSummary } from "./editing/summary.ts";
import { updateMovedTitleText } from "./editing/title-move.ts";
import {
    buildPreSaveActions,
    buildRedirectRows,
    buildRedirectRowsFromTitles,
    buildRedirectTitles,
    fetchExistingPageTitles,
    getRedirectTitleCheckTitles,
    runSelectedActions,
} from "./editing/pre-save.ts";
import { registerNewPage } from "./handlers/new-page-list.ts";
import {
    addEnwikiCreateTrigger,
    addMissingPageEditTrigger,
    addViewPageTrigger,
} from "./interface/page-trigger.ts";
import { serializeElementContent } from "../shared/codex-html-template.ts";
import {
    failSaveProgress,
    reportSaveProgressError,
    setSaveProgressStep,
} from "./save/controller.ts";
import { SAVE_PROGRESS_STORAGE_KEY } from "./save/progress.ts";
import {
    createCitationStore,
    prepareManagedCitationRows,
} from "./sources/source-references.ts";
import { fetchSteamNameRows } from "./sources/steam-names.ts";
import {
    ZHWIKI_API_URL,
    buildZhwikiCreationUrl,
    readZhwikiActivationForm,
    resolveZhwikiCreationTitle,
} from "./sources/zhwiki-activation.ts";

const CITATION_PREFETCH_DELAY = 800;
const WIKIDATA_API_URL = "https://www.wikidata.org/w/api.php";

export { submitEditForm };


/**
 * Checks whether the current view displays a missing page.
 *
 * @returns Whether the current action views an uncreated
 * page.
 */
function isMissingPageView(): boolean {
    return (
        mw.config.get("wgAction") === "view" &&
        mw.config.get("wgArticleId") === 0
    );
}


/**
 * Checks whether an action can show a new-page edit form.
 *
 * @param action - MediaWiki action.
 * @returns Whether the action edits or submits page text.
 */
function isEditAction(action: string): boolean {
    return action === "edit" || action === "submit";
}


/**
 * Checks whether the current page is an English Wikipedia article view.
 *
 * @returns Whether the enwiki launcher should be shown.
 */
function isEnwikiArticleView(): boolean {
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
 * @returns Whether the full creation dialog can run.
 */
function isZhwiki(): boolean {
    return mw.config.get("wgDBname") === "zhwiki";
}


/**
 * Creates the DOM host used by the Vue application.
 *
 * @returns Element appended to the document body.
 */
function createHost(): HTMLElement {
    const host = document.createElement("div");

    document.getElementsByTagName("body")[0].append(host);

    return host;
}


/**
 * Gets the default article name from the current page title.
 *
 * @returns Page title without a trailing disambiguation
 * suffix.
 */
function getDefaultName(): string {
    return String(mw.config.get("wgTitle") || "").replace(/ \(.+?\)$/u, "");
}


const getPageUrl = (title) => mw.util.getUrl(title);

const getFormProseSinographs = function callback(form) {
    return countFormProseSinographs(form, {
        defaultName: getFormDefaultName(form),
    });
};

const getFormProseWikitext = function callback(form) {
    return createArticleData(form, {
        defaultName: getFormDefaultName(form),
    }).prose.text;
};


/**
 * Gets placeholder text for one form field.
 *
 * @param form - Dialog form values.
 * @param field - Dialog field definition.
 * @param field.key - Form key for the field.
 * @returns Placeholder text.
 */
function getFieldPlaceholder(form: any, field: any): string | undefined {
    return getArticleFieldPlaceholder(form, field, {
        defaultName: getFormDefaultName(form),
    });
}


/**
 * Builds a small live wikitext preview for one dialog field.
 *
 * @param form - Dialog form values.
 * @param previewKey - Shared preview group key.
 * @returns Preview wikitext, or an empty string.
 */
function getFieldPreview(form: any, previewKey: string): string {
    return getArticleFieldPreview(form, previewKey, {
        defaultName: getFormDefaultName(form),
    });
}


/**
 * Gets the current page title when MediaWiki globals are available.
 *
 * @returns Default article title, or an empty string.
 */
function getDefaultNameFallback(): string {
    if (typeof mw === "undefined") {
        return "";
    }

    return getDefaultName();
}


/**
 * Gets the default display title for current form values.
 *
 * @param form - Dialog form values.
 * @returns Default display title.
 */
function getFormDefaultName(form: any): string {
    return getBasePageTitle(form?.pageName) || getDefaultNameFallback();
}


/**
 * Generates wikitext for an editable in-dialog preview.
 *
 * @param form - Dialog form values.
 * @param sourceFetchState - Source fetch status state.
 * @param citationStore - Citation fetch/cache store.
 * @returns Generated preview text, summary,
 * and
 * HTML.
 */
async function previewForm(
    form: any,
    sourceFetchState: any,
    citationStore: any,
): Promise<any | undefined> {
    sourceFetchState.error = "";
    sourceFetchState.loading = true;

    try {
        const stub = await buildStubFromForm(form, citationStore);
        const text = stub.text;
        const summary = buildEditSummary(
            createEditSummaryMetadata(form, stub),
        );

        return {
            html: await parseArticlePreviewText(text, form),
            summary,
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
 * Parses article wikitext through MediaWiki's native edit preview.
 *
 * @param text - Generated article wikitext.
 * @param form - Dialog form values.
 * @returns Parsed preview HTML.
 */
async function parseArticlePreviewText(
    text: string,
    form: any,
): Promise<string> {
    return parseNativePreviewText(buildNativePreviewText(text, form));
}


/**
 * Handles build native preview text.
 *
 * Adds preview-only source that gives source-reading modules a page
 * heading.
 *
 * @param text - Generated article wikitext.
 * @param form - Dialog form values.
 * @returns Wikitext submitted only to the native preview
 * renderer.
 *
 */
function buildNativePreviewText(text: string, form: any): string {
    const title = trimFieldValue(form?.pageName) || getPageName();

    return `= ${title} =\n${text}`;
}


/**
 * Requests MediaWiki's native edit preview without navigating away.
 *
 * @param text - Wikitext submitted to the native preview
 * renderer.
 * @param title - Preview page title.
 * @returns Parsed preview HTML.
 */
async function parseNativePreviewText(
    text: string,
    title: string = getPageName(),
): Promise<string> {
    const response = await fetch(
        mw.util.getUrl(title, {
            action: "submit",
        }),
        {
            body: buildNativePreviewFormData(text),
            credentials: "same-origin",
            method: "POST",
        },
    );

    if (!response.ok) {
        throw new Error(`MediaWiki preview failed: HTTP ${response.status}`);
    }

    return extractNativePreviewHtml(await response.text());
}


/**
 * Builds a form payload compatible with MediaWiki's edit preview.
 *
 * @param text - Wikitext submitted to the native preview
 * renderer.
 * @returns Preview form data.
 */
function buildNativePreviewFormData(text: string): FormData {
    const editForm = document.getElementById(
        "editform",
    ) as HTMLFormElement | null;
    const formData =
        editForm == null ? new FormData() : new FormData(editForm);
    const previewButton = document.getElementById(
        "wpPreview",
    ) as HTMLInputElement | null;

    formData.set("wpTextbox1", text);
    formData.set("wpPreview", previewButton?.value || "Show preview");
    formData.delete("wpSave");
    formData.delete("wpDiff");

    return formData;
}


/**
 * Handles extract native preview html.
 *
 * Extracts the rendered preview pane from a MediaWiki edit-preview
 * response.
 *
 * @param html - Native preview response document.
 * @returns Rendered preview HTML.
 *
 */
function extractNativePreviewHtml(html: string): string {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const preview = doc.querySelector("#wikiPreview");

    if (preview == null) {
        throw new Error("MediaWiki preview output was not found.");
    }

    const parserOutput = selectValue(
        preview.matches(".mw-parser-output"),
        function trueBranch() {
            return preview;
        },
        function falseBranch() {
            return preview.querySelector(".mw-parser-output");
        },
    );

    return serializeElementContent(parserOutput || preview);
}


/**
 * Parses generated wikitext through MediaWiki.
 *
 * @param text - Wikitext to parse.
 * @param title - Page title used as the parse context.
 * @returns Parsed preview HTML.
 */
async function parsePreviewText(
    text: string,
    title = getPageName(),
): Promise<string> {
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
 * @param title - Full page title.
 * @returns Page source text.
 */
async function fetchPageText(title: string): Promise<string> {
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
 * @param context - Submit dependencies and values.
 * @param context.form - Dialog form values.
 * @param context.sourceFetchState - Source fetch status state.
 * @param context.closeDialog - Dialog close callback.
 * @param context.preSave - Configured pre-save fixes.
 * @param context.citationStore - Citation fetch/cache store.
 * @param context.preview - User-reviewed preview text.
 * @param context.preview.summary - User-reviewed edit summary.
 * @param context.preview.text - User-reviewed wikitext.
 * @returns Resolves after save submission starts.
 */
async function submitForm(context: any): Promise<void> {
    const { sourceFetchState, preSave } = context;
    sourceFetchState.error = "";
    sourceFetchState.loading = true;

    try {
        const submission = await prepareFormSubmission(context);
        const api = new mw.Api();

        preSave.progress?.start(getPageName(), submission.pending);
        await saveSubmittedArticle(
            api,
            getPageName(),
            submission.text,
            submission.summary,
        );
        preSave.progress?.set("save", "complete");
        await completeSubmittedFollowUpActions(
            api,
            submission.pending,
            preSave,
        );
    } catch (error) {
        preSave.progress?.fail(error);
        sourceFetchState.error = error.message;
    } finally {
        sourceFetchState.loading = false;
    }
}

/** Prepares generated text, summary, and follow-up actions. */
async function prepareFormSubmission(context: any): Promise<any> {
    const { form, citationStore, preSave, preview } = context;
    const moveTitle = trimFieldValue(preSave?.move?.to);
    const shouldMove = shouldMoveSubmission(preSave, moveTitle);
    const submittedForm = shouldMove ? { ...form, name: moveTitle } : form;
    let previewText;

    if (typeof preview?.text === "string") {
        previewText = preview.text;
    }
    const preserveEditor = previewText == null && shouldPreserveEditor();
    let stub = null;

    if (previewText == null && !preserveEditor) {
        stub = await buildStubFromForm(submittedForm, citationStore);
    }
    let summary = getGeneratedEditSummary(submittedForm, stub);

    if (typeof preview?.summary === "string") {
        summary = preview.summary;
    }
    const text = previewText ?? stub?.text ?? readEditText();
    const pending = createPendingSubmission(preSave, shouldMove, moveTitle);

    return { pending, summary, text };
}

/** Checks whether submission includes a page move. */
function shouldMoveSubmission(preSave: any, moveTitle: string): boolean {
    return preSave?.move?.enabled === true && moveTitle !== "" &&
        normalizePageTitle(moveTitle) !== normalizePageTitle(getPageName());
}

/** Gets the generated or preserved edit summary. */
function getGeneratedEditSummary(form: any, stub: any): string {
    if (stub == null) {
        return readEditSummary();
    }

    return buildEditSummary(createEditSummaryMetadata(form, stub));
}

/** Creates follow-up state for a submitted article. */
function createPendingSubmission(preSave, shouldMove, moveTitle): any {
    let move = { enabled: false };

    if (shouldMove) {
        move = { ...preSave.move, to: moveTitle };
    }
    return {
        actions: preSave.actions,
        move,
        progressGroups: preSave.progressGroups,
        registration: preSave.registration,
    };
}

/** Runs follow-up actions and navigates after a successful save. */
async function completeSubmittedFollowUpActions(api, pending, preSave) {
    const result = await runSubmittedFollowUpActions(
        api,
        pending,
        getPageName(),
        preSave.progress,
    );

    if (result.failed.length > 0) {
        preSave.progress?.report(formatPendingActionFailures(result.failed));
        return;
    }

    window.location.href = mw.util.getUrl(result.title);
}


/**
 * Saves the submitted article text through the API.
 *
 * @param api - MediaWiki API client.
 * @param title - Submitted page title.
 * @param text - Submitted article wikitext.
 * @param summary - Edit summary.
 * @returns Resolves after the article is saved.
 */
export async function saveSubmittedArticle(
    api: any,
    title: string,
    text: string,
    summary: string,
): Promise<void> {
    await api.postWithToken("csrf", {
        action: "edit",
        summary,
        text,
        title,
    });
}


/**
 * Runs follow-up actions for an article saved from the pre-save dialog.
 *
 * @param api - MediaWiki API client.
 * @param pending - Pending follow-up actions.
 * @param title - Submitted article title.
 * @param progress - In-dialog progress reporter.
 * @returns Follow-up action result.
 */
async function runSubmittedFollowUpActions(
    api: any,
    pending: any,
    title: string,
    progress: any,
): Promise<any> {
    const setProgress = (id, status) => progress?.set(id, status);
    const actionOptions = createFollowUpActionOptions(
        api,
        pending,
        title,
        setProgress,
    );
    const actions = pending.actions || [];
    const result = await runSelectedActions(actions, actionOptions);

    return result;
}

/** Creates shared options for running post-save actions. */
function createFollowUpActionOptions(api, pending, title, setProgress): any {
    const wikidataApi = new mw.ForeignApi(WIKIDATA_API_URL);
    return {
        api,
        move: pending.move,
        onActionComplete: setActionProgress.bind(
            null,
            setProgress,
            "complete",
        ),
        onActionFailed: setActionProgress.bind(null, setProgress, "failed"),
        onActionRetry: setActionProgress.bind(null, setProgress, "retrying"),
        onActionSkipped: setActionProgress.bind(null, setProgress, "skipped"),
        onActionStart: setActionProgress.bind(null, setProgress, "running"),
        onMoveComplete: setMoveProgress.bind(null, setProgress, "complete"),
        onMoveStart: setMoveProgress.bind(null, setProgress, "running"),
        onBeforeWikidataActions: registerBeforeWikidataActions.bind(
            null,
            api,
            pending,
            setProgress,
        ),
        title,
        wikidataApi,
        saveCategory: saveCategoryWithApi.bind(null, api),
        saveCompanyCategory: saveCompanyCategoryWithApi.bind(null, api),
    };
}

/** Updates one action progress status. */
function setActionProgress(setProgress, status, action): void {
    setProgress(action.id, status);
}

/** Updates move progress status. */
function setMoveProgress(setProgress, status): void {
    setProgress("move", status);
}

/** Registers pending pages before Wikidata actions run. */
function registerBeforeWikidataActions(api, pending, setProgress, result) {
    return registerPendingNewPage(api, pending, result, setProgress);
}

/** Saves a category with a bound API client. */
function saveCategoryWithApi(api, category, text): Promise<void> {
    return saveCategoryPage(category, text, undefined, api);
}

/** Saves a company category with bound API clients. */
function saveCompanyCategoryWithApi(api, category, text, englishName) {
    const wikidataApi = new mw.ForeignApi(WIKIDATA_API_URL);
    return saveCompanyCategory(category, text, englishName, {
        api,
        wikidataApi,
    });
}


/**
 * Registers the saved article and completed company categories locally.
 *
 * @param api - MediaWiki API client.
 * @param pending - Pending follow-up actions.
 * @param result - Completed action result state.
 * @param setProgress - Progress update callback.
 * @returns Resolves after registration finishes.
 */
async function registerPendingNewPage(
    api: any,
    pending: any,
    result: any,
    setProgress: (...args: any[]) => any,
): Promise<void> {
    if (pending.registration?.enabled !== true) {
        return;
    }

    setProgress("new-page-list", "running");
    await registerNewPage(
        api,
        result.title,
        getCompanyCategoryActions(result.completed),
    );
    setProgress("new-page-list", "complete");
}


/**
 * Handles refresh pre save category wikidata.
 *
 * Refreshes missing company-category Wikidata IDs before showing
 * pre-save work.
 *
 * @param form - Dialog form values.
 * @returns Resolves after category metadata is
 * refreshed.
 *
 */
async function refreshPreSaveCategoryWikidata(form: any): Promise<void> {
    const rows = Array.isArray(form.categoryRows) ? form.categoryRows : [];
    const pendingRows = rows.filter(shouldRefreshCategoryWikidata);

    await Promise.all(pendingRows.map(refreshCategoryWikidata));
}


/**
 * Checks whether a staged company category needs Wikidata metadata.
 *
 * @param row - Category review row.
 * @returns Whether Wikidata should be refreshed.
 */
function shouldRefreshCategoryWikidata(row: any): boolean {
    return (
        row?.enabled !== false &&
        row?.pendingCreation != null &&
        trimFieldValue(row.pendingCreation.englishName) !== "" &&
        trimFieldValue(row.pendingCreation.wikidataId) === ""
    );
}


/**
 * Refreshes the Wikidata ID for one staged company category.
 *
 * @param row - Category review row.
 * @returns Resolves after the row is updated.
 */
async function refreshCategoryWikidata(row: any): Promise<void> {
    try {
        const title = normalizeEnglishCategoryTitle(
            row.pendingCreation.englishName,
        );
        const metadata = await fetchEnwikiMetadata(title);

        row.pendingCreation.wikidataId = trimFieldValue(metadata.wikidataId);
    } catch (_error) {
        row.pendingCreation.wikidataId = "";
    }
}


/**
 * Handles get company category actions.
 *
 * Gets completed company-category action titles for page-list
 * registration.
 *
 * @param actions - Completed follow-up actions.
 * @returns Category titles.
 *
 */
function getCompanyCategoryActions(actions: Array<any>): Array<string> {
    return actions
        .filter(isCompanyCategoryAction)
        .map(function callback(action) {
            return action.category;
        });
}


/**
 * Checks whether an action represents a company-category creation.
 *
 * @param action - Completed follow-up action.
 * @returns Whether the action should register a new page.
 */
function isCompanyCategoryAction(action: any): boolean {
    return action.type === "category" && trimFieldValue(action.company) !== "";
}


/**
 * Normalizes an English Wikipedia category title for metadata lookup.
 *
 * @param title - User-entered English category title.
 * @returns Category title with namespace.
 */
function normalizeEnglishCategoryTitle(title: string): string {
    const value = trimFieldValue(title);

    return selectValue(
        value === "" || /^Category:/iu.test(value),
        function trueBranch() {
            return value;
        },
        function falseBranch() {
            return `Category:${value}`;
        },
    );
}


/**
 * Creates an article submit callback with the citation cache bound.
 *
 * @param citationStore - Citation fetch/cache store.
 * @param submit - Submit implementation.
 * @returns Dialog submit callback.
 */
export function createSubmitHandler(
    citationStore: any,
    submit: (...args: any[]) => any = submitForm,
): (...args: any[]) => any {
    const binding = { citationStore, submit };
    return invokeSubmitHandler.bind(null, binding);
}

/** Invokes the internal or injected submit implementation. */
function invokeSubmitHandler(binding, ...args): any {
    const [form, sourceFetchState, closeDialog, preSave, preview] = args;
    const context = {
        citationStore: binding.citationStore,
        closeDialog,
        form,
        preSave,
        preview,
        sourceFetchState,
    };

    if (binding.submit === submitForm) {
        return binding.submit(context);
    }

    const result = binding.submit(
        form,
        sourceFetchState,
        closeDialog,
        preSave,
        binding.citationStore,
        preview,
    );
    return result;
}


/**
 * Builds generated wikitext and metadata from dialog form values.
 *
 * @param form - Dialog form values.
 * @param citationStore - Citation fetch/cache store.
 * @returns Generated stub text and article
 * parameters.
 */
async function buildStubFromForm(form: any, citationStore: any): Promise<any> {
    return buildArticleStubFromForm(form, citationStore, {
        defaultName: getFormDefaultName(form),
    });
}


/**
 * Creates edit summary metadata from dialog form values.
 *
 * @param form - Dialog form values.
 * @param form.englishName - English game title.
 * @param form.enwikiTitle - English Wikipedia page title.
 * @param form.name - Main page title.
 * @param form.originalName - Original game title.
 * @param form.wikidataId - Wikidata entity ID.
 * @param form.year - Release year.
 * @param stub - Generated stub data.
 * @param stub.articleData - Article metadata.
 * @returns Edit summary metadata.
 */
function createEditSummaryMetadata(form: any, stub: any): any {
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
 * @param form - Dialog form values.
 * @param form.englishName - English game title.
 * @param form.originalName - Original game title.
 * @returns Summary display title.
 */
function getEditSummaryDisplayName(form: any): string {
    return (
        trimFieldValue(form.originalName) ||
        trimFieldValue(form.englishName) ||
        trimFieldValue(form.name)
    );
}


/**
 * Refreshes reviewed category rows from current generated metadata.
 *
 * @param form - Dialog form values.
 * @param categoryState - Category refresh status state.
 * @param categoryStore - Category resolution store.
 * @param options - Category refresh options.
 * @returns Resolves after category rows are refreshed.
 */
async function refreshFormCategoryRows(
    form: any,
    categoryState: any,
    categoryStore,
    options: any = {},
): Promise<void> {
    categoryState.error = "";
    categoryState.loading = true;

    try {
        if (options.bypassCache) {
            categoryStore.clear();
        }

        const rows = await buildRefreshedCategoryRows(
            form,
            categoryStore,
            options,
        );
        mergeRefreshedCategoryRows(form, rows);
        categoryStore.save();
    } catch (error) {
        categoryState.error = error.message;
    } finally {
        categoryState.loading = false;
    }
}

/** Builds category rows using current cache options. */
async function buildRefreshedCategoryRows(
    form,
    store,
    options,
): Promise<any[]> {
    return await prepareCategoryRows(form, form.categoryRows, {
        article: { defaultName: getFormDefaultName(form) },
        categories: {
            bypassCache: options.bypassCache,
            cache: store.cache,
        },
    });
}

/** Merges refreshed rows into the reactive category array. */
function mergeRefreshedCategoryRows(form, rows): void {
    const merged = rows.map(function callback(row, index) {
        const current = form.categoryRows[index];

        if (current == null) {
            return row;
        }

        Object.assign(current, row);
        return current;
    });
    form.categoryRows.splice(0, form.categoryRows.length, ...merged);
}


/**
 * Saves the current form data with a target page title.
 *
 * @param form - Dialog form values.
 * @param page - Target page title.
 * @returns */
function saveCurrentFormHistory(form: any, page: string): void {
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
 * @returns Form history manager entries.
 */
function readFormHistoryEntries(): Array<any> {
    return [readFormDraftEntry(), ...readFormHistory()].filter(Boolean);
}


/**
 * Opens the dialog from the toolbox link click.
 *
 * @param event - Browser event from the toolbox link.
 * @returns */
function handleToolboxClick(event: any): void {
    event.preventDefault();
    (window as any).vgStubCreatorDialog.open();
}


/**
 * Adds the dialog trigger link to the MediaWiki toolbox.
 *
 * @returns */
function addToolboxLink(): void {
    if (isMissingPageView()) {
        addMissingPageEditTrigger(mw.util, handleToolboxClick);
        return;
    }

    addViewPageTrigger(mw.util, handleToolboxClick);
}


/**
 * Handles open target page.
 *
 * Generates current form data and opens it in a target new-page edit
 * form.
 *
 * @param form - Dialog form values.
 * @param title - Target page title.
 * @param sourceFetchState - Source fetch status state.
 * @param citationStore - Citation fetch/cache store.
 * @param options - Target-page opening options.
 * @returns Resolves after generated text is stored.
 *
 */
async function openTargetPage(
    form: any,
    title: string,
    sourceFetchState: any,
    citationStore: any,
    options: any = {},
): Promise<void> {
    sourceFetchState.error = "";
    const targetTitle = trimFieldValue(title);

    if (targetTitle === "") {
        return;
    }

    sourceFetchState.loading = true;

    try {
        const pending = await prepareMovedEdit(
            form,
            targetTitle,
            citationStore,
            options,
        );
        storeMovedEdit(pending);
        navigateToTargetEditor(targetTitle);
    } catch (error) {
        sourceFetchState.error = error.message;
        sourceFetchState.loading = false;
    }
}

/** Prepares moved article text and metadata for a target editor. */
async function prepareMovedEdit(form, title, citationStore, options) {
    const targetForm = { ...form, pageName: title };
    const preserveEditor = shouldPreserveEditor();
    const stubs = await buildMovedEditStubs(
        form,
        targetForm,
        citationStore,
        preserveEditor,
    );
    let text = stubs.target.text;

    if (preserveEditor) {
        text = updateMovedTitleText(
            readEditText(),
            stubs.current.articleData,
            stubs.target.articleData,
        );
    }
    return {
        form: targetForm,
        preview: options.preview === true,
        summary: preserveEditor ? readEditSummary() : undefined,
        summaryMetadata: createEditSummaryMetadata(targetForm, stubs.target),
        text,
        title,
    };
}

/** Builds target and optional current-title stubs for a move. */
async function buildMovedEditStubs(form, targetForm, store, preserve) {
    if (!preserve) {
        const target = await buildStubFromForm(targetForm, store);
        return { current: null, target };
    }

    const [current, target] = await Promise.all([
        buildStubFromForm(form, store),
        buildStubFromForm(targetForm, store),
    ]);
    return { current, target };
}

/** Navigates to the target page editor. */
function navigateToTargetEditor(title: string): void {
    window.location.href = mw.util.getUrl(title, {
        action: "edit",
        redlink: "1",
    });
}


/**
 * Restores moved stub text into the target new-page editor.
 *
 * @returns */
function restoreMovedEditText(): void {
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
 * @returns Current full page name.
 */
function getPageName(): string {
    return mw.config.get("wgPageName").replace(/_/gu, " ");
}


/** Tracks whether an English Wikipedia launch is already resolving. */
let enwikiLaunchPending = false;

/** Adds the English Wikipedia launcher that starts zhwiki creation. */
function initEnwikiLauncher(): void {
    const enwikiTitle = getPageName();
    const fallbackUrl = buildZhwikiCreationUrl(enwikiTitle);
    const callback = handleEnwikiLaunch.bind(null, enwikiTitle, fallbackUrl);
    addEnwikiCreateTrigger(mw.util, callback, fallbackUrl);
}

/** Resolves and opens the Chinese Wikipedia creation target. */
async function handleEnwikiLaunch(enwikiTitle, fallbackUrl, event) {
    event.preventDefault();

    if (enwikiLaunchPending) {
        return;
    }

    enwikiLaunchPending = true;
    const tab = window.open(fallbackUrl, "_blank");

    try {
        const api = new mw.ForeignApi(ZHWIKI_API_URL);
        const target = await resolveZhwikiCreationTitle(enwikiTitle, api);
        const url = buildZhwikiCreationUrl(enwikiTitle, target);
        openResolvedZhwikiTarget(tab, url);
    } catch (_error) {
        if (tab == null) {
            window.open(fallbackUrl, "_blank", "noopener");
        }
    } finally {
        enwikiLaunchPending = false;
    }
}

/** Updates a pre-opened tab or opens the resolved target. */
function openResolvedZhwikiTarget(tab, url): void {
    if (tab != null) {
        tab.location.href = url;
        return;
    }

    window.open(url, "_blank", "noopener");
}


/**
 * Mounts the Codex dialog and registers the toolbox trigger.
 *
 * @param require - ResourceLoader module resolver.
 * @returns */
function init(require: (...args: any[]) => any): void {
    const context = createInitContext(require);
    addDialogStyles();
    const dialogOptions = createDialogOptions(context);
    const component = createDialogComponent(context.Vue, dialogOptions);
    const app = context.Vue.createMwApp(component);

    registerCodexComponents(app, context.Codex);
    app.mount(createHost());
    finishInitialization(context);
}

let saveInterceptorActive = false;

/** Creates shared initialization dependencies and restored state. */
function createInitContext(require): any {
    const currentPageName = getPageName();
    let previewFormData;

    if (mw.config.get("wgAction") === "submit") {
        previewFormData = getPreviewFormData(currentPageName);
    }
    saveInterceptorActive = false;
    return {
        Codex: require("@wikimedia/codex"),
        Vue: require("vue"),
        activationForm: readZhwikiActivationForm(window.location.search),
        categoryStore: createCategoryCacheStore(currentPageName),
        citationStore: createCitationStore(),
        currentPageName,
        defaultName: getDefaultName(),
        movedEdit: getMovedEdit(currentPageName),
        previewFormData,
    };
}

/** Activates edit-save interception once. */
function activateTool(): void {
    if (saveInterceptorActive) {
        return;
    }

    interceptEditSave(() => (window as any).vgStubCreatorDialog.submit());
    saveInterceptorActive = true;
}

/** Creates the complete dialog option object. */
function createDialogOptions(context): any {
    return {
        ...createBaseDialogOptions(context),
        ...createCategoryDialogOptions(context),
        ...createReviewDialogOptions(context),
        ...createSourceDialogOptions(context),
    };
}

/** Creates basic form and history dialog options. */
function createBaseDialogOptions(context): any {
    return {
        citationPrefetchDelay: CITATION_PREFETCH_DELAY,
        currentTitle: context.currentPageName,
        defaultName: context.defaultName,
        getPageUrl,
        getHistoryEntries: readFormHistoryEntries,
        getFieldPlaceholder,
        getFieldPreview,
        getProseSinographs: getFormProseSinographs,
        getProseWikitext: getFormProseWikitext,
        initialForm: getInitialDialogForm(context),
        initialOpen: shouldInitiallyOpenDialog(context),
        initialEnwikiLookup: context.activationForm != null,
        onActivate: activateTool,
        onClearHistory: clearFormHistory,
        onCreateCategoryRow: createManualCategoryRow,
        onDeleteHistoryEntry: deleteFormHistoryEntry,
        onFormChange: saveDraftForPage.bind(null, context.currentPageName),
        onSubmitHistory: saveCurrentFormHistory,
    };
}

/** Creates category and page movement dialog options. */
function createCategoryDialogOptions(context): any {
    return {
        onCategoryRowsRefresh: refreshCategoryRowsForDialog.bind(
            null,
            context.categoryStore,
        ),
        onMoveTarget: openTargetPageForDialog.bind(
            null,
            context.citationStore,
        ),
        onPrepareCompanyCategory: prepareCompanyCategoryText,
        onUpdateCategoryRowCategory: updateCategoryRowCategory,
    };
}

/** Creates preview and review dialog options. */
function createReviewDialogOptions(context): any {
    return {
        onCheckPageTitle: checkDialogPageTitle,
        onCheckRedirectRows: checkDialogRedirectRows,
        onFetchPageText: fetchPageText,
        onParseArticlePreview: parseArticlePreviewText,
        onParsePreview: parsePreviewText,
        onPrepareRedirectRows: prepareDialogRedirectRows,
        onPrepareReview: prepareNavboxRows,
        onPreview: previewFormForDialog.bind(null, context.citationStore),
    };
}

/** Creates citation, metadata, and submit dialog options. */
function createSourceDialogOptions(context): any {
    return {
        onEnwikiTitleChange: fetchEnwikiMetadata,
        onPrepareCitations: prepareDialogCitations.bind(
            null,
            context.citationStore,
        ),
        onPreSavePrepare: prepareDialogPreSave,
        onSourceUrlChange: context.citationStore.prefetch.bind(
            context.citationStore,
        ),
        onSteamNamesFetch: fetchDialogSteamNames.bind(
            null,
            context.citationStore,
        ),
        onSubmit: createSubmitHandler(context.citationStore),
    };
}

/** Gets the highest-priority restored form. */
function getInitialDialogForm(context): any {
    return context.activationForm ||
        context.previewFormData?.form ||
        context.movedEdit?.form ||
        readFormDraftForPage(context.currentPageName);
}

/** Checks whether restored state should open the dialog. */
function shouldInitiallyOpenDialog(context): boolean {
    const hasInitialForm = Boolean(context.activationForm);
    const hasPreview = Boolean(context.previewFormData);
    const hasMovedEdit = hasRestoredMovedEdit(context.movedEdit);
    return hasInitialForm || hasPreview || hasMovedEdit;
}

/** Checks whether a moved edit should restore the dialog. */
function hasRestoredMovedEdit(movedEdit): boolean {
    return Boolean(movedEdit) && movedEdit.preview !== true;
}

/** Persists a form draft for one bound page. */
function saveDraftForPage(page: string, form): void {
    saveFormDraft(form, page);
}

/** Refreshes dialog category rows with the bound cache store. */
function refreshCategoryRowsForDialog(store, form, state, refreshOptions) {
    return refreshFormCategoryRows(form, state, store, refreshOptions);
}

/** Opens a dialog target page with the bound citation store. */
function openTargetPageForDialog(store, form, title, state) {
    return openTargetPage(form, title, state, store);
}

/** Checks one proposed page title for existence and conversion. */
async function checkDialogPageTitle(title: string): Promise<any> {
    const [match] = await fetchExistingPageTitles(new mw.Api(), [title]);
    return {
        exists: match?.exists === true,
        title: match?.title || title,
    };
}

/** Prepares generated redirect rows for the dialog. */
async function prepareDialogRedirectRows(form, title): Promise<any[]> {
    const redirectTitles = buildRedirectTitles(form, title);
    const existing = await fetchExistingPageTitles(
        new mw.Api(),
        getRedirectTitleCheckTitles(redirectTitles),
    );
    return buildRedirectRows(form, title, existing);
}

/** Rechecks edited redirect rows for the dialog. */
async function checkDialogRedirectRows(rows, title): Promise<any[]> {
    const redirectTitles = rows.map((row) => row.title);
    const existing = await fetchExistingPageTitles(
        new mw.Api(),
        getRedirectTitleCheckTitles(redirectTitles),
    );
    return buildRedirectRowsFromTitles(redirectTitles, title, existing);
}

/** Builds a dialog preview with the bound citation store. */
function previewFormForDialog(store, form, state): Promise<any> {
    return previewForm(form, state, store);
}

/** Prepares managed citations with the bound citation store. */
function prepareDialogCitations(store, form, options): Promise<any[]> {
    return prepareManagedCitationRows(form, store, options);
}

/** Prepares the final reviewed follow-up action list. */
async function prepareDialogPreSave(form, title): Promise<any> {
    await refreshPreSaveCategoryWikidata(form);
    let redirectTitles = buildRedirectTitles(form, title);

    if (Array.isArray(form.redirectRows)) {
        redirectTitles = form.redirectRows.map((row) => row.title);
    }
    const existing = await fetchExistingPageTitles(
        new mw.Api(),
        getRedirectTitleCheckTitles(redirectTitles),
    );
    const metadata = { finalTitle: title, form, title };
    const actions = buildPreSaveActions(metadata, existing);
    return { actions, move: { enabled: false, to: title } };
}

/** Fetches Steam name rows with the bound citation store. */
function fetchDialogSteamNames(store, url, options): Promise<any[]> {
    return fetchSteamNameRows(url, store, options);
}

/** Registers Codex components used by the dialog template. */
function registerCodexComponents(app, Codex): void {
    app.component("CdxDialog", Codex.CdxDialog);
    app.component("CdxButton", Codex.CdxButton);
    app.component("CdxButtonGroup", Codex.CdxButtonGroup);
    app.component("CdxCard", Codex.CdxCard);
    app.component("CdxCheckbox", Codex.CdxCheckbox);
    app.component("CdxField", Codex.CdxField);
    app.component("CdxIcon", Codex.CdxIcon);
    app.component("CdxInfoChip", Codex.CdxInfoChip);
    app.component("CdxMenuButton", Codex.CdxMenuButton);
    app.component("CdxMessage", Codex.CdxMessage);
    app.component("CdxProgressBar", Codex.CdxProgressBar);
    app.component("CdxProgressIndicator", Codex.CdxProgressIndicator);
    app.component("CdxSelect", Codex.CdxSelect);
    app.component("CdxTab", Codex.CdxTab);
    app.component("CdxTabs", Codex.CdxTabs);
    app.component("CdxTable", Codex.CdxTable);
    app.component("CdxTextArea", Codex.CdxTextArea);
    app.component("CdxTextInput", Codex.CdxTextInput);
}

/** Clears restored state and registers page triggers. */
function finishInitialization(context): void {
    if (context.previewFormData != null) {
        clearPreviewFormData();
    }

    if (context.movedEdit != null) {
        activateTool();
    }

    addToolboxLink();
    restoreMovedEditText();
}


/**
 * Runs the preselected follow-up actions on the newly created article.
 *
 * @returns */
async function runPendingSaveActions(): Promise<void> {
    const pending = getPendingSaveData(getPageName());

    if (pending == null) {
        return;
    }

    setSaveProgressStep("save", "complete");

    try {
        const api = new mw.Api();
        const options = createFollowUpActionOptions(
            api,
            pending,
            pending.title,
            setSaveProgressStep,
        );
        const actions = pending.actions || [];
        const result = await runSelectedActions(actions, options);

        clearPendingSaveData();
        completePendingSaveProgress(result);
        reloadAfterPendingSave(result.title);
    } catch (error) {
        failSaveProgress(error);
    }
}

/** Completes or reports restored follow-up action progress. */
function completePendingSaveProgress(result): void {
    if (result.failed.length > 0) {
        reportSaveProgressError(formatPendingActionFailures(result.failed));
        return;
    }

    sessionStorage.removeItem(SAVE_PROGRESS_STORAGE_KEY);
}

/** Reloads the completed page or navigates to its moved title. */
function reloadAfterPendingSave(title: string): void {
    if (normalizePageTitle(title) !== normalizePageTitle(getPageName())) {
        window.location.href = mw.util.getUrl(title);
        return;
    }

    window.location.reload();
}


/**
 * Formats a final report for follow-up actions skipped after retries.
 *
 * @param actions - Failed follow-up actions.
 * @returns Failure report.
 */
function formatPendingActionFailures(actions: Array<any>): string {
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
} else if (
    isZhwiki() &&
    (isEditAction(currentAction) || isMissingPageView())
) {
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
