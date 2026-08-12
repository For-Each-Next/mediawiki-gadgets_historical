/**
 * Composes the browser UI with article and pre-save workflows.
 */

import {
    buildCategoryRows,
    buildFallbackCategoryRows,
    createManualCategoryRow,
    updateCategoryRowCategory,
} from "#gadget/adapters/mediawiki/categories.ts";
import * as categoryCache from "#gadget/adapters/storage/category-cache.ts";
import {
    prepareCompanyCategoryText,
    saveCategoryPage,
    saveCompanyCategory,
} from "#gadget/adapters/mediawiki/category-pages.ts";
import {
    NEW_PAGE_LIST_TITLE,
    registerNewPage,
} from "#gadget/adapters/mediawiki/new-page-list.ts";
import {
    addTalkPageBanner,
    connectWikidataSitelink,
    createRedirect,
    movePage,
    savePageEdit,
} from "#gadget/adapters/mediawiki/wiki-writes.ts";
import {
    resolveNavboxTitles,
    resolveReviewedNavboxRows,
} from "#gadget/adapters/mediawiki/navboxes.ts";
import {
    clearMovedEdit,
    clearPendingSaveData,
    clearPreviewFormData,
    getMovedEdit,
    getPendingSaveData,
    getPreviewFormData,
    normalizePageTitle,
    setPendingSaveOperationStatus,
    storeMovedEdit,
    storePendingSaveData,
    storePreviewFormData,
} from "#gadget/adapters/storage/session.ts";
// eslint-disable-next-line max-len
import { createFormHistoryStore } from "#gadget/adapters/storage/form-history.ts";
// eslint-disable-next-line max-len
import { createReviewLinkSession } from "#gadget/adapters/storage/review-link-session.ts";
import {
    interceptEditSave,
    readEditSummary,
    readEditText,
    shouldPreserveEditor,
    submitPreviewForm,
    writeEditSummary,
    writeEditText,
} from "#gadget/adapters/browser/editor.ts";
// eslint-disable-next-line max-len
import { createPreviewController } from "#gadget/adapters/mediawiki/preview.ts";
import { buildEditSummary } from "#gadget/domain/edit-summary.ts";
import { updateMovedTitleText } from "#gadget/domain/title-move.ts";
import {
    clearSaveProgress,
    failSaveProgress,
    initializeSaveProgress,
    reportSaveProgressError,
    setSaveProgressStep,
} from "#gadget/adapters/storage/save-progress-controller.ts";
import { fetchEnwikiMetadata } from "#gadget/adapters/network/crosswiki.ts";
import {
    createCitationStore,
    fetchSourceReferences,
    prepareManagedCitationRows,
} from "#gadget/adapters/network/index.ts";
import { fetchSteamNameRows } from "#gadget/adapters/network/steam-names.ts";
import {
    ZHWIKI_API_URL,
    buildZhwikiCreationUrl,
    readZhwikiActivationForm,
    resolveZhwikiCreationTitle,
} from "#gadget/adapters/network/zhwiki-activation.ts";
import type {
    BrowserApplicationPorts,
    CategoryAdapterPorts,
    EditingAdapterPorts,
    MediaWikiClientPorts,
    PreviewAdapterPorts,
    ReviewLinkAdapterPorts,
    SaveProgressAdapterPorts,
    SourceAdapterPorts,
} from "#gadget/contracts/application.ts";
import {
    createArticleWorkflow,
    flushArticleData,
    getArticleFieldPreview,
    getFormProseSinographs,
} from "#gadget/workflows/article.ts";
import {
    buildPreSaveActions,
    buildRedirectRows,
    buildRedirectRowsFromTitles,
    buildRedirectTitles,
    fetchExistingPageTitles,
    getRedirectTitleCheckTitles,
    runSelectedActions,
    type PreSaveMessageId,
} from "#gadget/workflows/pre-save.ts";
// eslint-disable-next-line max-len
import { preparePendingSaveResume } from "#gadget/workflows/pre-save-checkpoint.ts";
import { saveReviewedArticle } from "#gadget/workflows/pre-save-write.ts";
import { createBrowserApplication } from "#gadget/ui/app.ts";
import { msg } from "#gadget/i18n/index.ts";
import { createLogger, type Logger } from "#shared/logging";
import { createActionNotifier } from "#shared/mediawiki/notifications";

const WIKIDATA_API_URL = "https://www.wikidata.org/w/api.php";

/**
 * Starts the composed VG Stub Creator application.
 */
export function start(): void {
    const logger = createLogger("vg-stub-creator");
    const ports = createBrowserPorts(logger.child("ui"));
    const application = createBrowserApplication(ports);

    try {
        application.start();
    } catch (error) {
        logger.error("startup.failed", error);
        throw error;
    }
}

/**
 * Composes every browser-facing port.
 *
 * @returns Browser application ports.
 */
function createBrowserPorts(logger: Logger): BrowserApplicationPorts {
    const clients = createMediaWikiClientPorts();
    return {
        categories: createCategoryPorts(),
        clients,
        editing: createEditingPorts(),
        feedback: {
            logger,
            notifyAction: createActionNotifier("vg-stub-creator"),
        },
        history: createFormHistoryPorts(),
        preview: createPreviewPorts(clients),
        reviewLinks: createReviewLinkPorts(),
        saveProgress: createSaveProgressPorts(),
        sources: createSourcePorts(),
        workflows: createWorkflowPorts(),
    };
}

/** Creates MediaWiki API clients at the application boundary. */
function createMediaWikiClientPorts(): MediaWikiClientPorts {
    return {
        createLocalApi: () => new mw.Api(),
        createWikidataApi: () => new mw.ForeignApi(WIKIDATA_API_URL),
    };
}

/** Creates form-history operations bound to local browser storage. */
function createFormHistoryPorts() {
    return createFormHistoryStore(getLocalStorage, {
        temporaryDraft: msg("history.temporaryDraft"),
        untitled: msg("history.untitled"),
    });
}

/** Gets local storage without making availability a startup risk. */
function getLocalStorage(): Storage | undefined {
    try {
        return typeof localStorage === "undefined" ? undefined : localStorage;
    } catch {
        return undefined;
    }
}

/** Creates MediaWiki preview operations with translated failures. */
function createPreviewPorts(
    clients: MediaWikiClientPorts,
): PreviewAdapterPorts {
    return createPreviewController({
        createApi: clients.createLocalApi,
        getPageName: getConfiguredPageName,
        messages: {
            previewHttp: (status) => msg("errors.previewHttp", { status }),
            previewMissing: msg("errors.previewMissing"),
            unableRead: (title) => msg("errors.unableRead", { title }),
        },
    });
}

/** Reads the current normalized page name for preview context. */
function getConfiguredPageName(): string {
    return mw.config.get("wgPageName").replace(/_/gu, " ");
}

/** Creates tab-scoped review-link sessions. */
function createReviewLinkPorts(): ReviewLinkAdapterPorts {
    return {
        createSession: () =>
            createReviewLinkSession(function getSessionStorage() {
                return sessionStorage;
            }),
    };
}

/**
 * Composes category adapter ports.
 *
 * @returns Category adapter ports.
 */
function createCategoryPorts(): CategoryAdapterPorts {
    return {
        createCategoryCacheStore: categoryCache.createCategoryCacheStore,
        createManualCategoryRow,
        prepareCompanyCategoryText,
        registerNewPage(api, articleTitle, companyCategories, date) {
            return registerNewPage(
                api,
                articleTitle,
                companyCategories,
                date,
                msg("errors.unableRead", { title: NEW_PAGE_LIST_TITLE }),
            );
        },
        saveCategoryPage,
        saveCompanyCategory,
        updateCategoryRowCategory,
    };
}

/**
 * Composes editing adapter ports.
 *
 * @returns Editing adapter ports.
 */
function createEditingPorts(): EditingAdapterPorts {
    return {
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
        setPendingSaveOperationStatus,
        shouldPreserveEditor,
        storeMovedEdit,
        storePendingSaveData,
        storePreviewFormData,
        submitPreviewForm() {
            submitPreviewForm(msg("errors.previewFormUnavailable"));
        },
        updateMovedTitleText,
        writeEditSummary,
        writeEditText(text) {
            writeEditText(text, msg("errors.editorUnavailable"));
        },
    };
}

/**
 * Composes persistent save-progress adapter ports.
 *
 * @returns Save-progress adapter ports.
 */
function createSaveProgressPorts(): SaveProgressAdapterPorts {
    return {
        clearSaveProgress,
        failSaveProgress,
        initializeSaveProgress,
        reportSaveProgressError,
        setSaveProgressStep,
    };
}

/**
 * Composes external source adapter ports.
 *
 * @returns Source adapter ports.
 */
function createSourcePorts(): SourceAdapterPorts {
    return {
        buildZhwikiCreationUrl,
        createCitationStore,
        createZhwikiApiClient,
        fetchEnwikiMetadata,
        fetchSteamNameRows(sourceUrl, citationStore, options) {
            return fetchSteamNameRows(sourceUrl, citationStore, {
                ...options,
                invalidUrlMessage: msg("errors.steamUrl"),
                labels: {
                    japanese: msg("names.japanese"),
                    simplified: msg("names.simplifiedFull"),
                    traditional: msg("names.traditionalFull"),
                },
            });
        },
        prepareManagedCitationRows,
        readZhwikiActivationForm,
        resolveZhwikiCreationTitle,
    };
}

/**
 * Composes article and pre-save workflow ports.
 *
 * @returns Workflow ports.
 */
function createWorkflowPorts(): BrowserApplicationPorts["workflows"] {
    const article = createComposedArticleWorkflow();
    return {
        buildArticleStubFromForm: article.buildStubFromForm,
        buildPreSaveActions(selection, existingRedirectTitles) {
            return buildPreSaveActions(
                selection,
                existingRedirectTitles,
                formatPreSaveMessage,
            );
        },
        buildRedirectRows,
        buildRedirectRowsFromTitles,
        buildRedirectTitles,
        countFormProseSinographs: getFormProseSinographs,
        createArticleData: flushArticleData,
        fetchExistingPageTitles,
        getArticleFieldPlaceholder: article.getArticleFieldPlaceholder,
        getArticleFieldPreview,
        getRedirectTitleCheckTitles,
        prepareCategoryRows: article.prepareCategoryRows,
        prepareNavboxRows: article.prepareNavboxRows,
        preparePendingSaveResume,
        runSelectedActions: runComposedSelectedActions,
        saveReviewedArticle,
    };
}

function createComposedArticleWorkflow() {
    return createArticleWorkflow(
        {
            buildCategoryRows,
            buildFallbackCategoryRows,
            fetchSourceReferences,
            resolveNavboxTitles,
            resolveReviewedNavboxRows,
        },
        {
            enterEnwikiTitle: msg("metadata.enterEnwikiTitle"),
            noWikidataItem: msg("metadata.noWikidataItem"),
        },
    );
}

function runComposedSelectedActions(
    actions: Parameters<typeof runSelectedActions>[0],
    options: unknown,
) {
    return runSelectedActions(actions, {
        ...(options as Record<string, unknown>),
        categoryUnavailableMessage: msg("errors.categorySaveUnavailable"),
        writes: {
            addTalkPageBanner,
            connectWikidataSitelink,
            createRedirect,
            movePage,
            savePageEdit,
        },
    } as Parameters<typeof runSelectedActions>[1]);
}

function formatPreSaveMessage(
    id: PreSaveMessageId,
    values?: Record<string, string | number>,
): string {
    return msg(id, values);
}

/**
 * Creates the zhwiki API client after ResourceLoader is available.
 *
 * @returns Cross-wiki MediaWiki client.
 */
function createZhwikiApiClient(): mw.ForeignApi {
    return new mw.ForeignApi(ZHWIKI_API_URL);
}
