/**
 * Describes the index module.
 *
 * Mounts the vg-stub-creator gadget and builds generated article
 * wikitext.
 */

import { createDialogComponent } from "#gadget/ui/form/index.ts";
import { getBasePageTitle } from "#gadget/ui/form/external-links.ts";
import { addDialogStyles } from "#gadget/ui/styles.ts";
import {
    buildWhatLinksHerePageTitle,
    selectArticleSubmissionTitle,
} from "#gadget/ui/navigation.ts";
import {
    clearFormHistory,
    deleteFormHistoryEntry,
    readFormDraftEntry,
    readFormDraftForPage,
    readFormHistory,
    saveFormDraft,
    saveFormHistory,
} from "#gadget/ui/history.ts";
import {
    addEnwikiCreateTrigger,
    addMissingPageEditTrigger,
    addViewPageTrigger,
    canShowZhwikiLauncher,
} from "#gadget/ui/page-trigger.ts";
import type {
    BrowserApplication,
    BrowserApplicationPorts,
    CategoryCacheStorePort,
    CategoryReviewRow,
    CitationStorePort,
} from "#gadget/ui/ports.ts";
import { createPreviewController } from "#gadget/ui/preview-controller.ts";
import type {
    ArticleForm,
    SaveProgressStatus,
} from "#gadget/domain/models.ts";
import { msg } from "#gadget/i18n/index.ts";
import { getErrorMessage, toError } from "#gadget/support/errors.ts";
import { wikitext } from "#shared/citation";
import { formatNamespaceTitle } from "#shared/wikitext";
const { trimValue } = wikitext;

const CITATION_PREFETCH_DELAY = 800;
const WIKIDATA_API_URL = "https://www.wikidata.org/w/api.php";

/**
 * Creates an isolated browser application bound to explicit ports.
 *
 * @param ports - Workflow and adapter implementations.
 * @returns Startable browser application.
 */
// The factory keeps legacy callbacks bound to one port instance.
// eslint-disable-next-line max-lines-per-function
export function createBrowserApplication(
    ports: BrowserApplicationPorts,
): BrowserApplication {
    const {
        createCategoryCacheStore,
        createManualCategoryRow,
        prepareCompanyCategoryText,
        registerNewPage,
        saveCategoryPage,
        saveCompanyCategory,
        updateCategoryRowCategory,
    } = ports.categories;
    const {
        buildEditSummary,
        clearMovedEdit,
        clearPendingSaveData,
        clearPreviewFormData,
        getMovedEdit,
        getPendingSaveData,
        getPreviewFormData,
        interceptEditSave,
        normalizePageTitle,
        readEditSummary,
        readEditText,
        shouldPreserveEditor,
        storeMovedEdit,
        storePreviewFormData,
        submitPreviewForm,
        updateMovedTitleText,
        writeEditSummary,
        writeEditText,
    } = ports.editing;
    const {
        clearSaveProgress,
        failSaveProgress,
        reportSaveProgressError,
        setSaveProgressStep,
    } = ports.saveProgress;
    const {
        buildZhwikiCreationUrl,
        createCitationStore,
        createZhwikiApiClient,
        fetchEnwikiMetadata,
        fetchSteamNameRows,
        prepareManagedCitationRows,
        readZhwikiActivationForm,
        resolveZhwikiCreationTitle,
    } = ports.sources;
    const {
        buildArticleStubFromForm,
        buildPreSaveActions,
        buildRedirectRows,
        buildRedirectRowsFromTitles,
        buildRedirectTitles,
        countFormProseSinographs,
        createArticleData,
        fetchExistingPageTitles,
        getArticleFieldPlaceholder,
        getArticleFieldPreview,
        getRedirectTitleCheckTitles,
        prepareCategoryRows,
        prepareNavboxRows,
        runSelectedActions,
    } = ports.workflows;
    const { fetchPageText, parseArticlePreviewText, parsePreviewText } =
        createPreviewController(getPageName);

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
     * Checks whether the page is an English Wikipedia article view.
     *
     * @returns Whether the enwiki launcher should be shown.
     */
    function isEnwikiArticleView(): boolean {
        if (mw.config.get("wgDBname") !== "enwiki") {
            return false;
        }

        if (mw.config.get("wgAction") !== "view") {
            return false;
        }

        return (
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
     * Checks whether the Chinese Wikipedia launcher supports this page.
     *
     * @returns Whether the page is an article, draft, or the current
     * user's own user-space page.
     */
    function isZhwikiLauncherPage(): boolean {
        return canShowZhwikiLauncher({
            namespaceNumber: mw.config.get("wgNamespaceNumber"),
            pageTitle: mw.config.get("wgTitle") || "",
            userName: mw.config.get("wgUserName"),
        });
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
        const configValue = mw.config.get("wgTitle") || "";
        return String(configValue).replace(/ \(.+?\)$/u, "");
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

    const getFormProseSinographs = function callback(form: ArticleForm) {
        const formDefaultNameResultE = {
            defaultName: getFormDefaultName(form),
        };
        const result = countFormProseSinographs(form, formDefaultNameResultE);
        return result;
    };

    const getFormProseWikitext = function callback(form: ArticleForm) {
        const formDefaultNameResultD = {
            defaultName: getFormDefaultName(form),
        };
        const result = createArticleData(form, formDefaultNameResultD).prose
            .text;
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
        const formDefaultNameResultC = {
            defaultName: getFormDefaultName(form),
        };
        const result = getArticleFieldPlaceholder(
            form,
            field,
            formDefaultNameResultC,
        );
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
        const formDefaultNameResultB = {
            defaultName: getFormDefaultName(form),
        };
        const result = getArticleFieldPreview(
            form,
            previewKey,
            formDefaultNameResultB,
        );
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
            const editSummaryMetadataResultA = createEditSummaryMetadata(
                form,
                stub,
            );
            const summary = buildEditSummary(editSummaryMetadataResultA);

            const result = {
                html: await parseArticlePreviewText(text, form),
                summary,
                text,
            };
            return result;
        } catch (error) {
            sourceFetchState.error = getErrorMessage(error);
            return undefined;
        } finally {
            sourceFetchState.loading = false;
        }
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
            sourceFetchState.error = getErrorMessage(error);
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
        const pending = createPendingSubmission(
            preSave,
            shouldMove,
            moveTitle,
        );
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
     * @param shouldMove - Whether a page move follows the save.
     * @returns Submission page title.
     */
    function getSubmissionTitle(context: any, shouldMove: boolean): string {
        const pageNameResultC = {
            currentPageExists: context.currentPageExists === true,
            currentTitle: getPageName(),
            enteredTitle: trimValue(context.form?.pageName),
            shouldMove,
        };
        const result = selectArticleSubmissionTitle(pageNameResultC);
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
        if (preSave?.move?.enabled !== true || moveTitle === "") {
            return false;
        }

        const currentPage = getPageName();
        return (
            normalizePageTitle(moveTitle) !== normalizePageTitle(currentPage)
        );
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

        const editSummaryMetadataResult = createEditSummaryMetadata(
            form,
            stub,
        );
        return buildEditSummary(editSummaryMetadataResult);
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
        let move: { enabled: boolean; leaveRedirect?: boolean; to?: string } =
            {
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
            const progress = preSave.progress;

            if (progress?.report != null) {
                const failureMessage = formatPendingActionFailures(
                    result.failed,
                );
                progress.report(failureMessage);
            }
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
    async function saveSubmittedArticle(
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
     * Runs follow-up actions after saving an article.
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
        setProgress: ProgressCallback,
    ): unknown {
        const wikidataApi = new mw.ForeignApi(WIKIDATA_API_URL);
        const actionProgress = createActionProgressCallbacks(setProgress);
        const moveProgress = createMoveProgressCallbacks(setProgress);
        const result = {
            api,
            move: pending.move,
            onBeforeWikidataActions: registerBeforeWikidataActions.bind(
                null,
                api,
                pending,
                setProgress,
            ),
            saveCategory: saveCategoryWithApi.bind(null, api),
            saveCompanyCategory: saveCompanyCategoryWithApi.bind(null, api),
            title,
            wikidataApi,
            ...actionProgress,
            ...moveProgress,
        };
        return result;
    }

    /**
     * Binds progress callbacks for individual follow-up actions.
     *
     * @param setProgress - Progress update callback.
     * @returns Bound action callbacks.
     */
    function createActionProgressCallbacks(setProgress: ProgressCallback) {
        return {
            onActionComplete: setActionProgress.bind(
                null,
                setProgress,
                "complete",
            ),
            onActionFailed: setActionProgress.bind(
                null,
                setProgress,
                "failed",
            ),
            onActionRetry: setActionProgress.bind(
                null,
                setProgress,
                "retrying",
            ),
            onActionSkipped: setActionProgress.bind(
                null,
                setProgress,
                "skipped",
            ),
            onActionStart: setActionProgress.bind(
                null,
                setProgress,
                "running",
            ),
        };
    }

    /**
     * Binds progress callbacks for the optional page move.
     *
     * @param setProgress - Progress update callback.
     * @returns Bound move callbacks.
     */
    function createMoveProgressCallbacks(setProgress: ProgressCallback) {
        return {
            onMoveComplete: setMoveProgress.bind(
                null,
                setProgress,
                "complete",
            ),
            onMoveStart: setMoveProgress.bind(null, setProgress, "running"),
        };
    }

    /**
     * Reports a follow-up action's progress state.
     */
    type ProgressCallback = (
        id: string,
        status: SaveProgressStatus,
    ) => unknown;

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
        setProgress: ProgressCallback,
        status: SaveProgressStatus,
        action: { id: string },
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
        setProgress: ProgressCallback,
        status: SaveProgressStatus,
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
     * Registers the article and completed company categories locally.
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
        const companyCategoryActionsResult = getCompanyCategoryActions(
            result.completed,
        );
        await registerNewPage(api, result.title, companyCategoryActionsResult);
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

        const mappedValues = pendingRows.map(refreshCategoryWikidata);
        await Promise.all(mappedValues);
    }

    /**
     * Checks whether a staged company category needs Wikidata metadata.
     *
     * @param row - Category review row.
     * @returns Whether Wikidata should be refreshed.
     */
    function shouldRefreshCategoryWikidata(row: any): boolean {
        if (row?.enabled === false || row?.pendingCreation == null) {
            return false;
        }

        if (trimValue(row.pendingCreation.englishName) === "") {
            return false;
        }

        return trimValue(row.pendingCreation.wikidataId) === "";
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
     * Normalizes an English category title for metadata lookup.
     *
     * @param title - User-entered English category title.
     * @returns Category title with namespace.
     */
    function normalizeEnglishCategoryTitle(title: string): string {
        const value = trimValue(title);

        return value === ""
            ? value
            : formatNamespaceTitle(value, "enwiki", 14);
    }

    /**
     * Creates an article submit callback with the citation cache bound.
     *
     * @param citationStore - Citation fetch/cache store.
     * @param submit - Submit implementation.
     * @param currentPageExists - Whether the current article exists.
     * @returns Dialog submit callback.
     */
    function createSubmitHandler(
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
    async function buildStubFromForm(
        form: any,
        citationStore: any,
    ): Promise<any> {
        const formDefaultNameResultA = {
            defaultName: getFormDefaultName(form),
        };
        const result = buildArticleStubFromForm(
            form,
            citationStore,
            formDefaultNameResultA,
        );
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
        form: ArticleForm & { categoryRows: CategoryReviewRow[] },
        categoryState: { error: string; loading: boolean },
        categoryStore: CategoryCacheStorePort,
        options: { bypassCache: boolean } = { bypassCache: false },
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
            categoryState.error = getErrorMessage(error);
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
        form: ArticleForm & { categoryRows: CategoryReviewRow[] },
        store: { cache: Record<string, unknown> },
        options: { bypassCache: boolean },
    ): Promise<CategoryReviewRow[]> {
        const formDefaultNameResult = {
            article: { defaultName: getFormDefaultName(form) },
            categories: {
                bypassCache: options.bypassCache,
                cache: store.cache,
            },
        };
        const result = await prepareCategoryRows(
            form,
            form.categoryRows,
            formDefaultNameResult,
        );
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
        const mapCallback = function callback(row: unknown, index: number) {
            const current = form.categoryRows[index];

            if (current == null) {
                return row;
            }

            Object.assign(current, row);
            return current;
        };
        const merged = rows.map(mapCallback);
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
     * Generates form data and opens it in a target new-page edit form.
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
            sourceFetchState.error = getErrorMessage(error);
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
        citationStore: CitationStorePort,
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
            const readEditTextResult = readEditText();
            text = updateMovedTitleText(
                readEditTextResult,
                stubs.current.articleData,
                stubs.target.articleData,
            );
        }
        const result = {
            form: targetForm,
            preview: options.preview,
            summary: preserveEditor ? readEditSummary() : undefined,
            summaryMetadata: createEditSummaryMetadata(
                targetForm,
                stubs.target,
            ),
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
        const pageNameResultB = getPageName();
        const pending = getMovedEdit(pageNameResultB);

        if (pending == null) {
            return;
        }

        writeEditText(pending.text);
        const editSummaryResult =
            pending.summary ?? buildEditSummary(pending.summaryMetadata || {});
        writeEditSummary(editSummaryResult);
        clearMovedEdit();

        if (pending.preview === true) {
            const pageNameResultA = getPageName();
            storePreviewFormData(pending.form, pageNameResultA);
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
        const callback = handleEnwikiLaunch.bind(
            null,
            enwikiTitle,
            fallbackUrl,
        );
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
            const api = createZhwikiApiClient();
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
    function openResolvedZhwikiTarget(tab: Window | null, url: string): void {
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
        const hostResult = createHost();
        app.mount(hostResult);
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
        categoryStore: CategoryCacheStorePort;
        citationStore: CitationStorePort;
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
            categoryStore: createCategoryCacheStore(currentPageName),
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

        const interceptEditSaveCallback = function submitDialog() {
            return (window as any).vgStubCreatorDialog.submit();
        };
        interceptEditSave(interceptEditSaveCallback);
        saveInterceptorActive = true;
    }

    /**
     * Creates the complete dialog option object.
     *
     * @param context - Operation context.
     * @returns The complete dialog option object.
     */
    function createDialogOptions(
        context: InitContext,
    ): Record<string, unknown> {
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
        categoryStore: CategoryCacheStorePort;
        citationStore: CitationStorePort;
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
        citationStore: CitationStorePort;
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
        citationStore: CitationStorePort;
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
        let result = context.activationForm;

        if (!result) {
            result = context.previewFormData?.form;
        }

        if (!result) {
            result = context.movedEdit?.form;
        }

        if (!result) {
            result = readFormDraftForPage(context.currentPageName);
        }
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
        return movedEdit != null && movedEdit.preview !== true;
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
        store: CategoryCacheStorePort,
        form: ArticleForm & { categoryRows: CategoryReviewRow[] },
        state: { error: string; loading: boolean },
        refreshOptions: { bypassCache?: boolean },
    ) {
        return refreshFormCategoryRows(form, state, store, {
            bypassCache: refreshOptions.bypassCache === true,
        });
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
        const api = new mw.Api();
        const [match] = await fetchExistingPageTitles(api, [title]);
        const result = {
            exists: Boolean(match?.exists),
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
        form: ArticleForm,
        title: string,
    ): Promise<unknown[]> {
        const redirectTitles = buildRedirectTitles(form, title);
        const redirectTitleCheckTitlesResulB =
            getRedirectTitleCheckTitles(redirectTitles);
        const api = new mw.Api();
        const existing = await fetchExistingPageTitles(
            api,
            redirectTitleCheckTitlesResulB,
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
        const redirectTitleCheckTitlesResulA =
            getRedirectTitleCheckTitles(redirectTitles);
        const api = new mw.Api();
        const existing = await fetchExistingPageTitles(
            api,
            redirectTitleCheckTitlesResulA,
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
        store: CitationStorePort,
        form: ArticleForm,
        options: { refetchSourceUrls?: string[] },
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
        const redirectTitleCheckTitlesResult =
            getRedirectTitleCheckTitles(redirectTitles);
        const api = new mw.Api();
        const existing = await fetchExistingPageTitles(
            api,
            redirectTitleCheckTitlesResult,
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
        store: CitationStorePort,
        url: string,
        options: { includeJapanese?: boolean },
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
     * Runs preselected follow-up actions on the new article.
     *
     * @returns Result when the function
     *   runs the preselected follow-up actions on the
     *   newly created article.
     */
    async function runPendingSaveActions(): Promise<void> {
        const pageNameResult = getPageName();
        const pending = getPendingSaveData(pageNameResult);

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
            failSaveProgress(toError(error));
        }
    }

    /**
     * Completes or reports restored follow-up action progress.
     *
     * @param result - Operation result.
     */
    function completePendingSaveProgress(result: { failed: unknown[] }): void {
        if (result.failed.length > 0) {
            const pendingActionFailuresResult = formatPendingActionFailures(
                result.failed,
            );
            reportSaveProgressError(pendingActionFailuresResult);
            return;
        }

        clearSaveProgress();
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
     * Formats a report for follow-up actions skipped after retries.
     *
     * @param actions - Failed follow-up actions.
     * @returns Failure report.
     */
    function formatPendingActionFailures(actions: Array<any>): string {
        const filterCallback = (label: unknown) => trimValue(label) !== "";
        const labels = actions
            .map((action) => action.label || action.id)
            .filter(filterCallback);

        if (labels.length === 0) {
            return msg("errors.followUpFailed");
        }

        const joinedText = {
            actions: labels.join("; "),
        };
        const result = msg("errors.followUpFailedDetails", joinedText);
        return result;
    }

    /**
     * Checks whether the current page has deferred save actions.
     *
     * @param action - Current MediaWiki action.
     * @returns Whether deferred save actions should resume.
     */
    function hasPendingSaveForCurrentPage(action: string): boolean {
        if (!isZhwiki() || action !== "view") {
            return false;
        }

        if (mw.config.get("wgArticleId") === 0) {
            return false;
        }

        const pageName = getPageName();
        return getPendingSaveData(pageName) != null;
    }

    /**
     * Starts the browser UI using this application's bound ports.
     */
    function startBrowserApplication(): void {
        const currentAction = mw.config.get("wgAction");
        const hasPendingSave = hasPendingSaveForCurrentPage(currentAction);

        if (isEnwikiArticleView()) {
            mw.loader
                .using(["mediawiki.ForeignApi", "mediawiki.util"])
                .then(initEnwikiLauncher);
        } else if (hasPendingSave) {
            mw.loader
                .using([
                    "mediawiki.api",
                    "mediawiki.ForeignApi",
                    "mediawiki.util",
                ])
                .then(runPendingSaveActions);
        } else if (
            isZhwiki() &&
            isZhwikiLauncherPage() &&
            (isEditAction(currentAction) || isMissingPageView())
        ) {
            loadDialogApplication();
        }
    }

    /**
     * Loads the editor dialog's ResourceLoader dependencies.
     */
    function loadDialogApplication(): void {
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

    return {
        start: startBrowserApplication,
    };
}
