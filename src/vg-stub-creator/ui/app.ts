/**
 * Describes the index module.
 *
 * Mounts the vg-stub-creator gadget and builds generated article
 * wikitext.
 */

import {
    createManualCategoryRow,
    updateCategoryRowCategory,
} from "#me/infra/handlers/categories.ts";
import {
    buildStubFromForm as buildArticleStubFromForm,
    flushArticleData as createArticleData,
    getArticleFieldPlaceholder,
    getArticleFieldPreview,
    getFormProseSinographs as countFormProseSinographs,
    prepareCategoryRows,
    prepareNavboxRows,
} from "#me/app/workflow.ts";
import * as categoryCache from "#me/infra/handlers/category-cache.ts";
import {
    prepareCompanyCategoryText,
    saveCategoryPage,
    saveCompanyCategory,
} from "#me/infra/handlers/category-pages.ts";
import { createDialogComponent } from "#me/ui/form/index.ts";
import { getBasePageTitle } from "#me/ui/form/helpers.ts";
import { addDialogStyles } from "#me/ui/styles.ts";
import {
    buildWhatLinksHerePageTitle,
    selectArticleSubmissionTitle,
} from "#me/ui/navigation.ts";
import {
    clearFormHistory,
    deleteFormHistoryEntry,
    readFormDraftEntry,
    readFormDraftForPage,
    readFormHistory,
    saveFormDraft,
    saveFormHistory,
} from "#me/ui/history.ts";
import { fetchEnwikiMetadata } from "#me/infra/sources/crosswiki.ts";
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
} from "#me/infra/editing/session.ts";
import {
    interceptEditSave,
    readEditSummary,
    readEditText,
    shouldPreserveEditor,
    submitEditForm,
    submitPreviewForm,
    writeEditSummary,
    writeEditText,
} from "#me/infra/editing/editor.ts";
import { buildEditSummary } from "#me/infra/editing/summary.ts";
import { updateMovedTitleText } from "#me/infra/editing/title-move.ts";
import {
    buildPreSaveActions,
    buildRedirectRows,
    buildRedirectRowsFromTitles,
    buildRedirectTitles,
    fetchExistingPageTitles,
    getRedirectTitleCheckTitles,
    runSelectedActions,
} from "#me/infra/editing/pre-save.ts";
import { registerNewPage } from "#me/infra/handlers/new-page-list.ts";
import {
    addEnwikiCreateTrigger,
    addMissingPageEditTrigger,
    addViewPageTrigger,
} from "#me/ui/page-trigger.ts";
import {
    failSaveProgress,
    reportSaveProgressError,
    setSaveProgressStep,
} from "#me/infra/save/controller.ts";
import { SAVE_PROGRESS_STORAGE_KEY } from "#me/infra/save/progress.ts";
import {
    CitationStore,
    createCitationStore,
    prepareManagedCitationRows,
} from "#me/infra/sources/index.ts";
import { fetchSteamNameRows } from "#me/infra/sources/steam-names.ts";
import {
    ZHWIKI_API_URL,
    buildZhwikiCreationUrl,
    readZhwikiActivationForm,
    resolveZhwikiCreationTitle,
} from "#me/infra/sources/zhwiki-activation.ts";
import { msg } from "#me/i18n/index.ts";
import { html, wikitext } from "#shared";
const { serializeElementContent } = html;
const { trimValue } = wikitext;

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
    const result =
        mw.config.get("wgAction") === "view" &&
        mw.config.get("wgArticleId") === 0;
    return result;
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
    const result =
        mw.config.get("wgDBname") === "enwiki" &&
        mw.config.get("wgAction") === "view" &&
        mw.config.get("wgNamespaceNumber") === 0 &&
        mw.config.get("wgArticleId") !== 0;
    return result;
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

/**
 * Builds the local wiki URL for a page title.
 *
 * @param title - Page title.
 * @returns Local wiki page URL.
 */
function getPageUrl(title: string): string {
    return mw.util.getUrl(title);
}

const getFormProseSinographs = function callback(form: unknown) {
    const result = countFormProseSinographs(form, {
        defaultName: getFormDefaultName(form),
    });
    return result;
};

const getFormProseWikitext = function callback(form: unknown) {
    const result = createArticleData(form, {
        defaultName: getFormDefaultName(form),
    }).prose.text;
    return result;
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
    const result = getArticleFieldPlaceholder(form, field, {
        defaultName: getFormDefaultName(form),
    });
    return result;
}

/**
 * Builds a small live wikitext preview for one dialog field.
 *
 * @param form - Dialog form values.
 * @param previewKey - Shared preview group key.
 * @returns Preview wikitext, or an empty string.
 */
function getFieldPreview(form: any, previewKey: string): string {
    const result = getArticleFieldPreview(form, previewKey, {
        defaultName: getFormDefaultName(form),
    });
    return result;
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

        const result = {
            html: await parseArticlePreviewText(text, form),
            summary,
            text,
        };
        return result;
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
 */
function buildNativePreviewText(text: string, form: any): string {
    const title = trimValue(form?.pageName) || getPageName();

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
        throw new Error(
            msg("errors.previewHttp", { status: response.status }),
        );
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
 */
function extractNativePreviewHtml(html: string): string {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const preview = doc.querySelector("#wikiPreview");

    if (preview == null) {
        throw new Error(msg("errors.previewMissing"));
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
        throw new Error(msg("errors.unableRead", { title }));
    }

    const result =
        revision.slots?.main?.content ??
        revision.slots?.main?.["*"] ??
        revision["*"] ??
        "";
    return result;
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

        preSave.progress?.start(submission.title, submission.pending);
        await saveSubmittedArticle(
            api,
            submission.title,
            submission.text,
            submission.summary,
        );
        preSave.progress?.set("save", "complete");
        await completeSubmittedFollowUpActions(
            api,
            submission.pending,
            preSave,
            submission.title,
        );
    } catch (error) {
        preSave.progress?.fail(error);
        sourceFetchState.error = error.message;
    } finally {
        sourceFetchState.loading = false;
    }
}

/**
 * Prepares generated text, summary, and follow-up actions.
 *
 * @param context - Operation context.
 * @returns Result when the function
 *   prepares generated text, summary, and follow-up
 *   actions.
 */
async function prepareFormSubmission(context: any): Promise<any> {
    const { form, citationStore, preSave, preview } = context;
    const moveTitle = trimValue(preSave?.move?.to);
    const shouldMove = shouldMoveSubmission(preSave, moveTitle);
    const submittedForm = shouldMove ? { ...form, name: moveTitle } : form;
    let previewText: string | null = null;

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
    const title = getSubmissionTitle(context, shouldMove);

    return { pending, summary, text, title };
}

/**
 * Gets the page that receives the submitted article text.
 *
 * New articles can be saved directly under an entered free title.
 * Existing articles and explicit moves must start from the
 * current page.
 *
 * @param context - Submit context.
 * @param shouldMove - Whether an existing page move follows the save.
 * @returns Submission page title.
 */
function getSubmissionTitle(context: any, shouldMove: boolean): string {
    const result = selectArticleSubmissionTitle({
        currentPageExists: context.currentPageExists === true,
        currentTitle: getPageName(),
        enteredTitle: trimValue(context.form?.pageName),
        shouldMove,
    });
    return result;
}

/**
 * Checks whether submission includes a page move.
 *
 * @param preSave - Pre save value.
 * @param moveTitle - Move title value.
 * @returns Whether submission includes a page move.
 */
function shouldMoveSubmission(preSave: any, moveTitle: string): boolean {
    const result =
        preSave?.move?.enabled === true &&
        moveTitle !== "" &&
        normalizePageTitle(moveTitle) !== normalizePageTitle(getPageName());
    return result;
}

/**
 * Gets the generated or preserved edit summary.
 *
 * @param form - Form values.
 * @param stub - Stub value.
 * @returns The generated or preserved edit summary.
 */
function getGeneratedEditSummary(form: any, stub: any): string {
    if (stub == null) {
        return readEditSummary();
    }

    return buildEditSummary(createEditSummaryMetadata(form, stub));
}

/**
 * Creates follow-up state for a submitted article.
 *
 * @param preSave - Pre save value.
 * @param shouldMove - Whether should move.
 * @param moveTitle - Move title value.
 * @returns Follow-up state for a submitted article.
 */
function createPendingSubmission(
    preSave: {
        move: { enabled: boolean; leaveRedirect?: boolean };
        actions: unknown;
        progressGroups: unknown;
        registration: unknown;
    },
    shouldMove: boolean,
    moveTitle: string,
): unknown {
    let move: { enabled: boolean; leaveRedirect?: boolean; to?: string } = {
        enabled: false,
    };

    if (shouldMove) {
        move = { ...preSave.move, to: moveTitle };
    }
    const result = {
        actions: preSave.actions,
        move,
        progressGroups: preSave.progressGroups,
        registration: preSave.registration,
    };
    return result;
}

/**
 * Runs follow-up actions and navigates after a successful save.
 *
 * @param api - MediaWiki API client.
 * @param pending - Pending value.
 * @param preSave - Pre save value.
 * @param title - Article title that received the saved text.
 */
async function completeSubmittedFollowUpActions(
    api: mw.Api,
    pending: unknown,
    preSave: { progress: { report: (arg0: string) => void } },
    title: string,
) {
    const result = await runSubmittedFollowUpActions(
        api,
        pending,
        title,
        preSave.progress,
    );

    if (result.failed.length > 0) {
        preSave.progress?.report(formatPendingActionFailures(result.failed));
        return;
    }

    navigateToWhatLinksHere(result.title);
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
    const setProgress = progress?.set.bind(progress);
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

/**
 * Creates shared options for running post-save actions.
 *
 * @param api - MediaWiki API client.
 * @param pending - Pending value.
 * @param title - Page title.
 * @param setProgress - Progress update callback.
 * @returns Shared options for running post-save actions.
 */
function createFollowUpActionOptions(
    api: mw.Api,
    pending: { move: unknown },
    title: string,
    setProgress: {
        (id: unknown, status: unknown): unknown;
        (id: string, status: string): unknown | undefined;
    },
): unknown {
    const wikidataApi = new mw.ForeignApi(WIKIDATA_API_URL);
    const result = {
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
    return result;
}

/**
 * Reports a follow-up action's progress state.
 */
type ProgressCallback = (id: string, status: string) => unknown;

/**
 * Describes pending post-save work.
 */
interface PendingFollowUpActions {
    move: unknown;
    registration?: { enabled?: boolean };
}

/**
 * Describes a completed post-save action.
 */
interface CompletedFollowUpAction {
    category?: string;
    company?: string;
    id: string;
    type: string;
}

/**
 * Describes the result of running post-save actions.
 */
interface FollowUpActionResult {
    completed: CompletedFollowUpAction[];
    title: string;
}

/**
 * Updates one action progress status.
 *
 * @param setProgress - Set progress value.
 * @param status - Status value.
 * @param action - Action value.
 */
function setActionProgress(
    setProgress: (arg0: unknown, arg1: unknown) => void,
    status: unknown,
    action: { id: unknown },
): void {
    setProgress(action.id, status);
}

/**
 * Updates move progress status.
 *
 * @param setProgress - Set progress value.
 * @param status - Status value.
 */
function setMoveProgress(
    setProgress: (arg0: string, arg1: unknown) => void,
    status: unknown,
): void {
    setProgress("move", status);
}

/**
 * Registers pending pages before Wikidata actions run.
 *
 * @param api - MediaWiki API client.
 * @param pending - Pending value.
 * @param setProgress - Set progress value.
 * @param result - Operation result.
 * @returns Result when the function
 *   registers pending pages before wikidata actions
 *   run.
 */
function registerBeforeWikidataActions(
    api: mw.Api,
    pending: PendingFollowUpActions,
    setProgress: ProgressCallback,
    result: FollowUpActionResult,
): Promise<void> {
    return registerPendingNewPage(api, pending, result, setProgress);
}

/**
 * Saves a category with a bound API client.
 *
 * @param api - MediaWiki API client.
 * @param category - Category page title.
 * @param text - Category wikitext.
 * @returns Resolves after the category is saved.
 */
function saveCategoryWithApi(
    api: mw.Api,
    category: string,
    text: string,
): Promise<void> {
    return saveCategoryPage(category, text, undefined, api);
}

/**
 * Saves a company category with bound API clients.
 *
 * @param api - MediaWiki API client.
 * @param category - Company category page title.
 * @param text - Company category wikitext.
 * @param englishName - English company name.
 * @returns Resolves after the company category is saved.
 */
function saveCompanyCategoryWithApi(
    api: mw.Api,
    category: string,
    text: string,
    englishName: string,
) {
    const wikidataApi = new mw.ForeignApi(WIKIDATA_API_URL);
    const result = saveCompanyCategory(category, text, englishName, {
        api,
        wikidataApi,
    });
    return result;
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
    api: mw.Api,
    pending: PendingFollowUpActions,
    result: FollowUpActionResult,
    setProgress: ProgressCallback,
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
    const result =
        row?.enabled !== false &&
        row?.pendingCreation != null &&
        trimValue(row.pendingCreation.englishName) !== "" &&
        trimValue(row.pendingCreation.wikidataId) === "";
    return result;
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

        row.pendingCreation.wikidataId = trimValue(metadata.wikidataId);
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
 */
function getCompanyCategoryActions(actions: Array<any>): Array<string> {
    const result = actions
        .filter(isCompanyCategoryAction)
        .map(function callback(action) {
            return action.category;
        });
    return result;
}

/**
 * Checks whether an action represents a company-category creation.
 *
 * @param action - Completed follow-up action.
 * @returns Whether the action should register a new page.
 */
function isCompanyCategoryAction(action: any): boolean {
    return action.type === "category" && trimValue(action.company) !== "";
}

/**
 * Normalizes an English Wikipedia category title for metadata lookup.
 *
 * @param title - User-entered English category title.
 * @returns Category title with namespace.
 */
function normalizeEnglishCategoryTitle(title: string): string {
    const value = trimValue(title);

    const result = selectValue(
        value === "" || /^Category:/iu.test(value),
        function trueBranch() {
            return value;
        },
        function falseBranch() {
            return `Category:${value}`;
        },
    );
    return result;
}

/**
 * Creates an article submit callback with the citation cache bound.
 *
 * @param citationStore - Citation fetch/cache store.
 * @param submit - Submit implementation.
 * @param currentPageExists - Whether the current article exists.
 * @returns Dialog submit callback.
 */
export function createSubmitHandler(
    citationStore: any,
    submit: (...args: any[]) => any = submitForm,
    currentPageExists = true,
): (...args: any[]) => any {
    const binding = { citationStore, currentPageExists, submit };
    return invokeSubmitHandler.bind(null, binding);
}

/**
 * Invokes the internal or injected submit implementation.
 *
 * @param binding - Binding value.
 * @param {...unknown} args - Args value.
 * @returns Result when the function
 *   invokes the internal or injected submit
 *   implementation.
 */
function invokeSubmitHandler(
    binding: {
        citationStore: unknown;
        currentPageExists: boolean;
        submit: (...args: unknown[]) => unknown;
    },
    ...args: unknown[]
): unknown {
    const [form, sourceFetchState, closeDialog, preSave, preview] = args;
    const context = {
        citationStore: binding.citationStore,
        closeDialog,
        currentPageExists: binding.currentPageExists,
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
    const result = buildArticleStubFromForm(form, citationStore, {
        defaultName: getFormDefaultName(form),
    });
    return result;
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
    const result = {
        displayName: getEditSummaryDisplayName(form),
        enwikiTitle: trimValue(form.enwikiTitle),
        proseSinographs: stub.articleData.prose.sinographs,
        wikidataId: trimValue(form.wikidataId),
        year: trimValue(form.year),
    };
    return result;
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
    const result =
        trimValue(form.originalName) ||
        trimValue(form.englishName) ||
        trimValue(form.name);
    return result;
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
    categoryStore: { cache: unknown; clear: () => void; save: () => void },
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

/**
 * Builds category rows using current cache options.
 *
 * @param form - Form values.
 * @param store - Store value.
 * @param options - Operation options.
 * @returns Category rows using current cache options.
 */
async function buildRefreshedCategoryRows(
    form: { categoryRows: unknown[] },
    store: { cache: unknown },
    options: { bypassCache: unknown },
): Promise<any[]> {
    const result = await prepareCategoryRows(form, form.categoryRows, {
        article: { defaultName: getFormDefaultName(form) },
        categories: {
            bypassCache: options.bypassCache,
            cache: store.cache,
        },
    });
    return result;
}

/**
 * Merges refreshed rows into the reactive category array.
 *
 * @param form - Form values.
 * @param rows - Row values.
 */
function mergeRefreshedCategoryRows(
    form: { categoryRows: unknown[] },
    rows: unknown[],
): void {
    const merged = rows.map(function callback(
        row: unknown,
        index: string | number,
    ) {
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
 */
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
 * @returns Result when the function
 *   opens the dialog from the toolbox link click.
 */
function handleToolboxClick(event: any): void {
    event.preventDefault();
    (window as any).vgStubCreatorDialog.open();
}

/**
 * Adds the dialog trigger link to the MediaWiki toolbox.
 *
 * @returns Result when the function
 *   adds the dialog trigger link to the mediawiki
 *   toolbox.
 */
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
 */
async function openTargetPage(
    form: any,
    title: string,
    sourceFetchState: any,
    citationStore: any,
    options: any = {},
): Promise<void> {
    sourceFetchState.error = "";
    const targetTitle = trimValue(title);

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

/**
 * Prepares moved article text and metadata for a target editor.
 *
 * @param form - Form values.
 * @param title - Page title.
 * @param citationStore - Citation store value.
 * @param options - Operation options.
 * @returns Result when the function
 *   prepares moved article text and metadata for a
 *   target editor.
 */
async function prepareMovedEdit(
    form: Record<string, unknown>,
    title: string,
    citationStore: CitationStore,
    options: { preview: boolean },
) {
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
    const result = {
        form: targetForm,
        preview: options.preview === true,
        summary: preserveEditor ? readEditSummary() : undefined,
        summaryMetadata: createEditSummaryMetadata(targetForm, stubs.target),
        text,
        title,
    };
    return result;
}

/**
 * Builds target and optional current-title stubs for a move.
 *
 * @param form - Form values.
 * @param targetForm - Target form value.
 * @param store - Store value.
 * @param preserve - Preserve value.
 * @returns Target and optional current-title stubs for a move.
 */
async function buildMovedEditStubs(
    form: unknown,
    targetForm: unknown,
    store: unknown,
    preserve: boolean,
) {
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

/**
 * Navigates to the target page editor.
 *
 * @param title - Page title.
 */
function navigateToTargetEditor(title: string): void {
    window.location.href = mw.util.getUrl(title, {
        action: "edit",
        redlink: "1",
    });
}

/**
 * Restores moved stub text into the target new-page editor.
 *
 * @returns Result when the function
 *   restores moved stub text into the target new-page
 *   editor.
 */
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

/**
 * Tracks whether an English Wikipedia launch is already resolving.
 */
let enwikiLaunchPending = false;

/**
 * Adds the English Wikipedia launcher that starts zhwiki creation.
 */
function initEnwikiLauncher(): void {
    const enwikiTitle = getPageName();
    const fallbackUrl = buildZhwikiCreationUrl(enwikiTitle);
    const callback = handleEnwikiLaunch.bind(null, enwikiTitle, fallbackUrl);
    addEnwikiCreateTrigger(mw.util, callback, fallbackUrl);
}

/**
 * Resolves and opens the Chinese Wikipedia creation target.
 *
 * @param enwikiTitle - Enwiki title value.
 * @param fallbackUrl - Fallback url value.
 * @param event - DOM event.
 */
async function handleEnwikiLaunch(
    enwikiTitle: string,
    fallbackUrl: string | URL,
    event: { preventDefault: () => void },
) {
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

/**
 * Updates a pre-opened tab or opens the resolved target.
 *
 * @param tab - Tab value.
 * @param url - Request URL.
 */
function openResolvedZhwikiTarget(tab: Window, url: string): void {
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
 * @returns Result when the function
 *   mounts the codex dialog and registers the toolbox
 *   trigger.
 */
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

/**
 * Describes dialog initialization dependencies and restored state.
 */
interface InitContext {
    Codex: CodexComponents;
    Vue: {
        createMwApp: (component: unknown) => {
            component: (name: string, component: unknown) => void;
            mount: (host: HTMLElement) => void;
        };
    };
    activationForm?: unknown;
    categoryStore: ReturnType<typeof categoryCache.createCategoryCacheStore>;
    citationStore: CitationStore;
    currentPageExists: boolean;
    currentPageName: string;
    defaultName: string;
    movedEdit?: { form: unknown; preview?: boolean };
    previewFormData?: { form: unknown };
}

/**
 * Creates shared initialization dependencies and restored state.
 *
 * @param require - ResourceLoader module resolver.
 * @returns Shared initialization dependencies and restored state.
 */
function createInitContext(require: {
    (module: "@wikimedia/codex"): CodexComponents;
    (module: "vue"): InitContext["Vue"];
}): InitContext {
    const currentPageName = getPageName();
    let previewFormData: { form: unknown } | undefined;

    if (mw.config.get("wgAction") === "submit") {
        previewFormData = getPreviewFormData(currentPageName);
    }
    saveInterceptorActive = false;
    const result = {
        Codex: require("@wikimedia/codex"),
        Vue: require("vue"),
        activationForm: readZhwikiActivationForm(window.location.search),
        categoryStore: categoryCache.createCategoryCacheStore(currentPageName),
        citationStore: createCitationStore(),
        currentPageExists: mw.config.get("wgArticleId") !== 0,
        currentPageName,
        defaultName: getDefaultName(),
        movedEdit: getMovedEdit(currentPageName),
        previewFormData,
    };
    return result;
}

/**
 * Activates edit-save interception once.
 */
function activateTool(): void {
    if (saveInterceptorActive) {
        return;
    }

    interceptEditSave(() => (window as any).vgStubCreatorDialog.submit());
    saveInterceptorActive = true;
}

/**
 * Creates the complete dialog option object.
 *
 * @param context - Operation context.
 * @returns The complete dialog option object.
 */
function createDialogOptions(context: InitContext): Record<string, unknown> {
    const result = {
        ...createBaseDialogOptions(context),
        ...createCategoryDialogOptions(context),
        ...createReviewDialogOptions(context),
        ...createSourceDialogOptions(context),
    };
    return result;
}

/**
 * Creates basic form and history dialog options.
 *
 * @param context - Operation context.
 * @returns Basic form and history dialog options.
 */
function createBaseDialogOptions(context: {
    currentPageExists: boolean;
    currentPageName: string;
    defaultName: string;
    activationForm?: unknown;
    previewFormData?: { form: unknown };
    movedEdit?: { form: unknown; preview?: boolean };
}): Record<string, unknown> {
    const result = {
        citationPrefetchDelay: CITATION_PREFETCH_DELAY,
        currentPageExists: context.currentPageExists,
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
    return result;
}

/**
 * Creates category and page movement dialog options.
 *
 * @param context - Operation context.
 * @returns Category and page movement dialog options.
 */
function createCategoryDialogOptions(context: {
    categoryStore: ReturnType<typeof categoryCache.createCategoryCacheStore>;
    citationStore: CitationStore;
}): Record<string, unknown> {
    const result = {
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
    return result;
}

/**
 * Creates preview and review dialog options.
 *
 * @param context - Operation context.
 * @returns Preview and review dialog options.
 */
function createReviewDialogOptions(context: {
    citationStore: CitationStore;
}): Record<string, unknown> {
    const result = {
        onCheckPageTitle: checkDialogPageTitle,
        onCheckRedirectRows: checkDialogRedirectRows,
        onFetchPageText: fetchPageText,
        onParseArticlePreview: parseArticlePreviewText,
        onParsePreview: parsePreviewText,
        onPrepareRedirectRows: prepareDialogRedirectRows,
        onPrepareReview: prepareNavboxRows,
        onPreview: previewFormForDialog.bind(null, context.citationStore),
    };
    return result;
}

/**
 * Creates citation, metadata, and submit dialog options.
 *
 * @param context - Operation context.
 * @returns Citation, metadata, and submit dialog options.
 */
function createSourceDialogOptions(context: {
    citationStore: CitationStore;
    currentPageExists: boolean;
}): Record<string, unknown> {
    const result = {
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
        onSubmit: createSubmitHandler(
            context.citationStore,
            submitForm,
            context.currentPageExists,
        ),
    };
    return result;
}

/**
 * Gets the highest-priority restored form.
 *
 * @param context - Operation context.
 * @returns The highest-priority restored form.
 */
function getInitialDialogForm(context: {
    activationForm?: unknown;
    previewFormData?: { form: unknown };
    movedEdit?: { form: unknown };
    currentPageName: string;
}): unknown {
    const result =
        context.activationForm ||
        context.previewFormData?.form ||
        context.movedEdit?.form ||
        readFormDraftForPage(context.currentPageName);
    return result;
}

/**
 * Checks whether restored state should open the dialog.
 *
 * @param context - Operation context.
 * @returns Whether restored state should open the dialog.
 */
function shouldInitiallyOpenDialog(context: {
    activationForm?: unknown;
    previewFormData?: unknown;
    movedEdit?: { preview?: boolean };
}): boolean {
    const hasInitialForm = Boolean(context.activationForm);
    const hasPreview = Boolean(context.previewFormData);
    const hasMovedEdit = hasRestoredMovedEdit(context.movedEdit);
    return hasInitialForm || hasPreview || hasMovedEdit;
}

/**
 * Checks whether a moved edit should restore the dialog.
 *
 * @param movedEdit - Moved edit value.
 * @returns Whether a moved edit should restore the dialog.
 */
function hasRestoredMovedEdit(movedEdit?: { preview?: boolean }): boolean {
    return Boolean(movedEdit) && movedEdit.preview !== true;
}

/**
 * Persists a form draft for one bound page.
 *
 * @param page - Page value.
 * @param form - Form values.
 */
function saveDraftForPage(page: string, form: unknown): void {
    saveFormDraft(form, page);
}

/**
 * Refreshes dialog category rows with the bound cache store.
 *
 * @param store - Store value.
 * @param form - Form values.
 * @param state - Mutable operation state.
 * @param refreshOptions - Refresh options value.
 * @returns Result when the function
 *   refreshes dialog category rows with the bound
 *   cache store.
 */
function refreshCategoryRowsForDialog(
    store: ReturnType<typeof categoryCache.createCategoryCacheStore>,
    form: Record<string, unknown>,
    state: { error: string; loading: boolean },
    refreshOptions: { bypassCache?: boolean },
) {
    return refreshFormCategoryRows(form, state, store, refreshOptions);
}

/**
 * Opens a dialog target page with the bound citation store.
 *
 * @param store - Store value.
 * @param form - Form values.
 * @param title - Page title.
 * @param state - Mutable operation state.
 * @returns Result when the function
 *   opens a dialog target page with the bound citation
 *   store.
 */
function openTargetPageForDialog(
    store: unknown,
    form: unknown,
    title: string,
    state: unknown,
) {
    return openTargetPage(form, title, state, store);
}

/**
 * Checks one proposed page title for existence and conversion.
 *
 * @param title - Page title.
 * @returns Result when the function
 *   checks one proposed page title for existence and
 *   conversion.
 */
async function checkDialogPageTitle(title: string): Promise<any> {
    const [match] = await fetchExistingPageTitles(new mw.Api(), [title]);
    const result = {
        exists: match?.exists === true,
        title: match?.title || title,
    };
    return result;
}

/**
 * Prepares generated redirect rows for the dialog.
 *
 * @param form - Form values.
 * @param title - Page title.
 * @returns Result when the function
 *   prepares generated redirect rows for the dialog.
 */
async function prepareDialogRedirectRows(
    form: unknown,
    title: string,
): Promise<unknown[]> {
    const redirectTitles = buildRedirectTitles(form, title);
    const existing = await fetchExistingPageTitles(
        new mw.Api(),
        getRedirectTitleCheckTitles(redirectTitles),
    );
    return buildRedirectRows(form, title, existing);
}

/**
 * Rechecks edited redirect rows for the dialog.
 *
 * @param rows - Row values.
 * @param title - Page title.
 * @returns Result when the function
 *   rechecks edited redirect rows for the dialog.
 */
async function checkDialogRedirectRows(
    rows: Array<{ title: string }>,
    title: string,
): Promise<unknown[]> {
    const redirectTitles = rows.map((row) => row.title);
    const existing = await fetchExistingPageTitles(
        new mw.Api(),
        getRedirectTitleCheckTitles(redirectTitles),
    );
    return buildRedirectRowsFromTitles(redirectTitles, title, existing);
}

/**
 * Builds a dialog preview with the bound citation store.
 *
 * @param store - Store value.
 * @param form - Form values.
 * @param state - Mutable operation state.
 * @returns A dialog preview with the bound citation store.
 */
function previewFormForDialog(
    store: unknown,
    form: unknown,
    state: unknown,
): Promise<unknown> {
    return previewForm(form, state, store);
}

/**
 * Prepares managed citations with the bound citation store.
 *
 * @param store - Store value.
 * @param form - Form values.
 * @param options - Operation options.
 * @returns Result when the function
 *   prepares managed citations with the bound citation
 *   store.
 */
function prepareDialogCitations(
    store: CitationStore,
    form: unknown,
    options: unknown,
): Promise<unknown[]> {
    return prepareManagedCitationRows(form, store, options);
}

/**
 * Prepares the final reviewed follow-up action list.
 *
 * @param form - Form values.
 * @param title - Page title.
 * @returns Result when the function
 *   prepares the final reviewed follow-up action list.
 */
async function prepareDialogPreSave(
    form: { redirectRows: Array<{ title: string }> },
    title: string,
): Promise<unknown> {
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

/**
 * Fetches Steam name rows with the bound citation store.
 *
 * @param store - Store value.
 * @param url - Request URL.
 * @param options - Operation options.
 * @returns Steam name rows with the bound citation store.
 */
function fetchDialogSteamNames(
    store: unknown,
    url: string,
    options: unknown,
): Promise<unknown[]> {
    return fetchSteamNameRows(url, store, options);
}

/**
 * Registers Codex components used by the dialog template.
 *
 * @param app - App value.
 * @param Codex - Codex value.
 */
function registerCodexComponents(
    app: { component: (name: string, component: unknown) => void },
    Codex: CodexComponents,
): void {
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

/**
 * Lists the Codex components registered by the dialog.
 */
interface CodexComponents {
    CdxButton: unknown;
    CdxButtonGroup: unknown;
    CdxCard: unknown;
    CdxCheckbox: unknown;
    CdxDialog: unknown;
    CdxField: unknown;
    CdxIcon: unknown;
    CdxInfoChip: unknown;
    CdxMenuButton: unknown;
    CdxMessage: unknown;
    CdxProgressBar: unknown;
    CdxProgressIndicator: unknown;
    CdxSelect: unknown;
    CdxTab: unknown;
    CdxTable: unknown;
    CdxTabs: unknown;
    CdxTextArea: unknown;
    CdxTextInput: unknown;
}

/**
 * Clears restored state and registers page triggers.
 *
 * @param context - Operation context.
 */
function finishInitialization(context: {
    previewFormData?: { form: unknown };
    movedEdit?: { form: unknown; preview?: boolean };
}): void {
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
 * @returns Result when the function
 *   runs the preselected follow-up actions on the
 *   newly created article.
 */
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
        navigateToWhatLinksHere(result.title);
    } catch (error) {
        failSaveProgress(error);
    }
}

/**
 * Completes or reports restored follow-up action progress.
 *
 * @param result - Operation result.
 */
function completePendingSaveProgress(result: { failed: unknown[] }): void {
    if (result.failed.length > 0) {
        reportSaveProgressError(formatPendingActionFailures(result.failed));
        return;
    }

    sessionStorage.removeItem(SAVE_PROGRESS_STORAGE_KEY);
}

/**
 * Navigates to backlinks for the completed article.
 *
 * @param title - Page title.
 */
function navigateToWhatLinksHere(title: string): void {
    const page = buildWhatLinksHerePageTitle(title);
    window.location.href = mw.util.getUrl(page);
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
        .filter((label) => trimValue(label) !== "");

    if (labels.length === 0) {
        return msg("errors.followUpFailed");
    }

    const result = msg("errors.followUpFailedDetails", {
        actions: labels.join("; "),
    });
    return result;
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
