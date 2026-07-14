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
    buildStubText as buildArticleStubText,
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
import { createDialogComponent } from "./interface/form/index.ts";
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
 * Builds the Chinese Wikipedia video game stub article text.
 *
 * @param params - Normalized article parameters.
 * @param params.aggScoresText - Aggregate review score
 * sentence.
 * @param params.additionalProseText - User-entered appended
 * prose.
 * @param params.companyMetadata - Company text and metadata.
 * @param params.defaultSortText - DEFAULTSORT wikitext.
 * @param params.infoboxText - Infobox wikitext.
 * @param params.leadNameText - Lead article name text.
 * @param params.noteTaText - NoteTA-lite wikitext.
 * @param params.platformSeriesMetadata - Platform and series
 * text and
 * metadata.
 * @param params.sourceReferences - Named source
 * references.
 * @param params.yearGenreMetadata - Year/genre text and
 * metadata.
 * @returns Generated Chinese wikitext.
 */
export function buildStubText(params: any): string {
    return buildArticleStubText(params);
}


/**
 * Creates the DOM host used by the Vue application.
 *
 * @returns Element appended to the document body.
 */
function createHost(): HTMLElement {
    const host = document.createElement("div");

    document.body.append(host);

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
 * Builds reusable article parameters from raw form values.
 *
 * @param form - Dialog form values.
 * @param form.developers - Developer names.
 * @param form.genres - Game genre text.
 * @param form.name - Game title.
 * @param form.platforms - Platform names.
 * @param form.publishers - Publisher names.
 * @param form.series - Series name.
 * @param form.sourceReferences - Named source refs.
 * @param form.year - Release year.
 * @returns Normalized article parameters.
 */
export function createArticleParams(form: any): any {
    return createArticleData(form, {
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

    return (parserOutput || preview).innerHTML;
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
 * @param form - Dialog form values.
 * @param sourceFetchState - Source fetch status state.
 * @param closeDialog - Dialog close callback.
 * @param preSave - Configured pre-save fixes.
 * @param citationStore - Citation fetch/cache store.
 * @param preview - User-reviewed preview text.
 * @param preview.summary - User-reviewed edit summary.
 * @param preview.text - User-reviewed wikitext.
 * @returns Resolves after save submission starts.
 */
async function submitForm(
    form: any,
    sourceFetchState: any,
    closeDialog: (...args: any[]) => any,
    preSave: any,
    citationStore: any,
    preview: any,
): Promise<void> {
    sourceFetchState.error = "";
    sourceFetchState.loading = true;

    try {
        const moveTitle = trimFieldValue(preSave?.move?.to);
        const shouldMove =
            preSave?.move?.enabled === true &&
            moveTitle !== "" &&
            normalizePageTitle(moveTitle) !==
                normalizePageTitle(getPageName());
        const submittedForm = selectValue(
            shouldMove,
            function trueBranch() {
                return {
                    ...form,
                    name: moveTitle,
                };
            },
            function falseBranch() {
                return form;
            },
        );
        const previewText =
            typeof preview?.text === "string" ? preview.text : undefined;
        const preserveEditor = previewText == null && shouldPreserveEditor();
        const stub = await selectValue(
            previewText != null || preserveEditor,
            async function trueBranch() {
                return null;
            },
            async function falseBranch() {
                return await buildStubFromForm(submittedForm, citationStore);
            },
        );
        const editSummaryMetadata = selectValue(
            stub == null,
            function trueBranch() {
                return null;
            },
            function falseBranch() {
                return createEditSummaryMetadata(submittedForm, stub);
            },
        );
        const generatedSummary = selectValue(
            editSummaryMetadata == null,
            function trueBranch() {
                return readEditSummary();
            },
            function falseBranch() {
                return buildEditSummary(editSummaryMetadata);
            },
        );
        const summary = selectValue(
            typeof preview?.summary === "string",
            function trueBranch() {
                return preview.summary;
            },
            function falseBranch() {
                return generatedSummary;
            },
        );
        const text = previewText ?? stub?.text ?? readEditText();
        const pending = {
            actions: preSave.actions,
            move: selectValue(
                shouldMove,
                function trueBranch() {
                    return {
                        ...preSave.move,
                        to: moveTitle,
                    };
                },
                function falseBranch() {
                    return {
                        enabled: false,
                    };
                },
            ),
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
        onBeforeWikidataActions: function callback(result) {
            return registerPendingNewPage(
                api,
                pending,
                result,
                function callback(id, status) {
                    progress?.set(id, status);
                },
            );
        },
        title: currentTitle,
        wikidataApi: new mw.ForeignApi(WIKIDATA_API_URL),
        saveCategory: function callback(category, text) {
            return saveCategoryPage(category, text, undefined, api);
        },
        saveCompanyCategory: function callback(category, text, englishName) {
            return saveCompanyCategory(category, text, englishName, {
                api,
                wikidataApi: new mw.ForeignApi(WIKIDATA_API_URL),
            });
        },
    };
    const result = await runSelectedActions(
        pending.actions || [],
        actionOptions,
    );

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
    return function callback(
        form,
        sourceFetchState,
        closeDialog,
        preSave,
        preview,
    ) {
        return submit(
            form,
            sourceFetchState,
            closeDialog,
            preSave,
            citationStore,
            preview,
        );
    };
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

        const articleOptions = {
            defaultName: getFormDefaultName(form),
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
            ...rows.map(function callback(row, index) {
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
    window.vgStubCreatorDialog.open();
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
        const targetForm = {
            ...form,
            pageName: targetTitle,
        };
        const preserveEditor = shouldPreserveEditor();
        const [currentStub, stub] = await selectValue(
            preserveEditor,
            async function trueBranch() {
                return await Promise.all([
                    buildStubFromForm(form, citationStore),
                    buildStubFromForm(targetForm, citationStore),
                ]);
            },
            async function falseBranch() {
                return [
                    null,
                    await buildStubFromForm(targetForm, citationStore),
                ];
            },
        );
        const summaryMetadata = createEditSummaryMetadata(targetForm, stub);
        const text = selectValue(
            preserveEditor,
            function trueBranch() {
                return updateMovedTitleText(
                    readEditText(),
                    currentStub.articleData,
                    stub.articleData,
                );
            },
            function falseBranch() {
                return stub.text;
            },
        );

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


/**
 * Adds the English Wikipedia launcher that starts zhwiki creation.
 *
 * @returns */
function initEnwikiLauncher(): void {
    const enwikiTitle = getPageName();
    const fallbackUrl = buildZhwikiCreationUrl(enwikiTitle);
    let pending = false;

    addEnwikiCreateTrigger(
        mw.util,
        async function callback(event) {
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
        },
        fallbackUrl,
    );
}


/**
 * Mounts the Codex dialog and registers the toolbox trigger.
 *
 * @param require - ResourceLoader module resolver.
 * @returns */
function init(require: (...args: any[]) => any): void {
    const Vue = require("vue");
    const Codex = require("@wikimedia/codex");
    const currentPageName = getPageName();
    const categoryStore = createCategoryCacheStore(currentPageName);
    const citationStore = createCitationStore();
    const defaultName = getDefaultName();
    const movedEdit = getMovedEdit(currentPageName);
    const previewFormData = selectValue(
        mw.config.get("wgAction") === "submit",
        function trueBranch() {
            return getPreviewFormData(currentPageName);
        },
        function falseBranch() {
            return undefined;
        },
    );
    const activationForm = readZhwikiActivationForm(window.location.search);
    let saveInterceptorActive = false;

    const activateTool = function callback() {
        if (saveInterceptorActive) {
            return;
        }

        interceptEditSave(() => window.vgStubCreatorDialog.submit());
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
        onCategoryRowsRefresh: function callback(
            form,
            categoryState,
            refreshOptions,
        ) {
            return refreshFormCategoryRows(
                form,
                categoryState,
                categoryStore,
                refreshOptions,
            );
        },
        onClearHistory: clearFormHistory,
        onCreateCategoryRow: createManualCategoryRow,
        onDeleteHistoryEntry: deleteFormHistoryEntry,
        onEnwikiTitleChange: fetchEnwikiMetadata,
        onParseArticlePreview: parseArticlePreviewText,
        onParsePreview: parsePreviewText,
        onPreview: function callback(form, sourceFetchState) {
            return previewForm(form, sourceFetchState, citationStore);
        },
        onFormChange: (form) => saveFormDraft(form, currentPageName),
        onFetchPageText: fetchPageText,
        onMoveTarget: function callback(form, title, sourceFetchState) {
            return openTargetPage(
                form,
                title,
                sourceFetchState,
                citationStore,
            );
        },
        async onCheckPageTitle(title) {
            const [match] = await fetchExistingPageTitles(new mw.Api(), [
                title,
            ]);

            return {
                exists: match?.exists === true,
                title: match?.title || title,
            };
        },
        onPrepareCompanyCategory: prepareCompanyCategoryText,
        onPrepareCitations: function callback(form, options) {
            return prepareManagedCitationRows(form, citationStore, options);
        },
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
            const redirectTitles = selectValue(
                Array.isArray(form.redirectRows),
                function trueBranch() {
                    return form.redirectRows.map((row) => row.title);
                },
                function falseBranch() {
                    return buildRedirectTitles(form, title);
                },
            );
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
        onSteamNamesFetch: function callback(url, options) {
            return fetchSteamNameRows(url, citationStore, options);
        },
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
    app.component("CdxMessage", Codex.CdxMessage);
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
 * @returns */
async function runPendingSaveActions(): Promise<void> {
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
            onBeforeWikidataActions: function callback(result) {
                return registerPendingNewPage(
                    api,
                    pending,
                    result,
                    function callback(id, status) {
                        setSaveProgressStep(id, status);
                    },
                );
            },
            title: currentTitle,
            wikidataApi: new mw.ForeignApi(WIKIDATA_API_URL),
            saveCategory: function callback(category, text) {
                return saveCategoryPage(category, text, undefined, api);
            },
            saveCompanyCategory: function callback(
                category,
                text,
                englishName,
            ) {
                return saveCompanyCategory(category, text, englishName, {
                    api,
                    wikidataApi: new mw.ForeignApi(WIKIDATA_API_URL),
                });
            },
        };
        const result = await runSelectedActions(
            pending.actions || [],
            actionOptions,
        );

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
