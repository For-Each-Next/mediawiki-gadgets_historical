/**
 * Composes the browser UI with article and pre-save workflows.
 */

import {
    createManualCategoryRow,
    updateCategoryRowCategory,
} from "#gadget/infra/handlers/categories.ts";
import * as categoryCache from "#gadget/infra/handlers/category-cache.ts";
import {
    prepareCompanyCategoryText,
    saveCategoryPage,
    saveCompanyCategory,
} from "#gadget/infra/handlers/category-pages.ts";
import { registerNewPage } from "#gadget/infra/handlers/new-page-list.ts";
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
} from "#gadget/infra/editing/session.ts";
import {
    interceptEditSave,
    readEditSummary,
    readEditText,
    shouldPreserveEditor,
    submitPreviewForm,
    writeEditSummary,
    writeEditText,
} from "#gadget/infra/editing/editor.ts";
import { buildEditSummary } from "#gadget/infra/editing/summary.ts";
import { updateMovedTitleText } from "#gadget/infra/editing/title-move.ts";
import {
    clearSaveProgress,
    failSaveProgress,
    reportSaveProgressError,
    setSaveProgressStep,
} from "#gadget/infra/save/controller.ts";
import { fetchEnwikiMetadata } from "#gadget/infra/sources/crosswiki.ts";
import {
    createCitationStore,
    prepareManagedCitationRows,
} from "#gadget/infra/sources/index.ts";
import { fetchSteamNameRows } from "#gadget/infra/sources/steam-names.ts";
import {
    ZHWIKI_API_URL,
    buildZhwikiCreationUrl,
    readZhwikiActivationForm,
    resolveZhwikiCreationTitle,
} from "#gadget/infra/sources/zhwiki-activation.ts";
import type {
    BrowserApplicationPorts,
    CategoryAdapterPorts,
    EditingAdapterPorts,
    SaveProgressAdapterPorts,
    SourceAdapterPorts,
} from "#gadget/ui/ports.ts";
import {
    buildStubFromForm,
    flushArticleData,
    getArticleFieldPlaceholder,
    getArticleFieldPreview,
    getFormProseSinographs,
    prepareCategoryRows,
    prepareNavboxRows,
} from "#gadget/workflows/article.ts";
import {
    buildPreSaveActions,
    buildRedirectRows,
    buildRedirectRowsFromTitles,
    buildRedirectTitles,
    fetchExistingPageTitles,
    getRedirectTitleCheckTitles,
    runSelectedActions,
} from "#gadget/workflows/pre-save.ts";
import { createBrowserApplication } from "#gadget/ui/app.ts";

/**
 * Starts the composed VG Stub Creator application.
 */
export function start(): void {
    const application = createBrowserApplication(createBrowserPorts());
    application.start();
}

/**
 * Composes every browser-facing port.
 *
 * @returns Browser application ports.
 */
function createBrowserPorts(): BrowserApplicationPorts {
    return {
        categories: createCategoryPorts(),
        editing: createEditingPorts(),
        saveProgress: createSaveProgressPorts(),
        sources: createSourcePorts(),
        workflows: createWorkflowPorts(),
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
        registerNewPage,
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
        shouldPreserveEditor,
        storeMovedEdit,
        storePreviewFormData,
        submitPreviewForm,
        updateMovedTitleText,
        writeEditSummary,
        writeEditText,
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
        fetchSteamNameRows,
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
    return {
        buildArticleStubFromForm: buildStubFromForm,
        buildPreSaveActions,
        buildRedirectRows,
        buildRedirectRowsFromTitles,
        buildRedirectTitles,
        countFormProseSinographs: getFormProseSinographs,
        createArticleData: flushArticleData,
        fetchExistingPageTitles,
        getArticleFieldPlaceholder,
        getArticleFieldPreview,
        getRedirectTitleCheckTitles,
        prepareCategoryRows,
        prepareNavboxRows,
        runSelectedActions,
    };
}

/**
 * Creates the zhwiki API client after ResourceLoader is available.
 *
 * @returns Cross-wiki MediaWiki client.
 */
function createZhwikiApiClient(): mw.ForeignApi {
    return new mw.ForeignApi(ZHWIKI_API_URL);
}
