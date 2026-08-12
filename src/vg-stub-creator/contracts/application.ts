/**
 * Declares the browser UI's composition ports.
 */

import type {
    ArticleForm,
    ArticleProcessorOptions,
    PreSaveAction,
    PreSaveExecutionResult,
    ProcessedArticleData,
    SaveProgressStatus,
} from "#gadget/domain/models.ts";
import type { Logger } from "#shared/logging";
import type { ActionNotifier } from "#shared/mediawiki/notifications";

export interface ApplicationFeedbackPorts {
    logger: Logger;
    notifyAction: ActionNotifier;
}

export interface CategoryReviewRow {
    category?: string;
    company?: string;
    enabled?: boolean;
    pendingCreation?: {
        englishName?: string;
        wikidataId?: string;
    };
    [field: string]: unknown;
}

export interface RedirectReviewRow {
    exists?: boolean;
    title: string;
    [field: string]: unknown;
}

export interface PageTitleMatch {
    exists: boolean;
    title: string;
}

export interface PageLookupPort {
    get(params: Record<string, unknown>): PromiseLike<any>;
}

export interface MediaWikiApiPort extends PageLookupPort {
    post(params: Record<string, unknown>): PromiseLike<any>;
    postWithToken(
        token: string,
        params: Record<string, unknown>,
    ): PromiseLike<any>;
}

export interface MediaWikiClientPorts {
    createLocalApi(): mw.Api;
    createWikidataApi(): mw.ForeignApi;
}

export interface ArticleFieldPort {
    key: string;
    [field: string]: unknown;
}

export interface GeneratedArticleStub {
    articleData: ProcessedArticleData;
    text: string;
}

export interface EditSummaryMetadata {
    displayName?: string;
    enwikiTitle?: string;
    proseSinographs?: number;
    wikidataId?: string;
    year?: string;
}

export type PendingSaveOperationStatus =
    "confirmed" | "pending" | "running" | "uncertain";

export interface PendingSaveDraft {
    actions: PreSaveAction[];
    move: {
        enabled?: boolean;
        leaveRedirect?: boolean;
        to?: unknown;
    };
    progressGroups?: unknown[];
    registration?: { enabled?: boolean };
    title: string;
}

export interface PendingSaveSession {
    actions: PreSaveAction[];
    move: PendingSaveDraft["move"];
    operations: Record<string, PendingSaveOperationStatus>;
    progressGroups?: unknown[];
    registration?: { enabled?: boolean };
    title: string;
    version: 1;
}

export interface PendingSaveResume {
    actions: PreSaveAction[];
    confirmedActions: PreSaveAction[];
    blockedOperationIds: string[];
    move: PendingSaveDraft["move"];
    registration: { enabled?: boolean };
    title: string;
}

export interface ReviewedArticleSave {
    exists: boolean;
    summary: string;
    text: string;
    title: string;
}

export interface MovedEditSession {
    form: ArticleForm;
    preview?: boolean;
    summary?: string;
    summaryMetadata?: EditSummaryMetadata;
    text: string;
    title: string;
}

export interface PreviewFormSession {
    form: ArticleForm;
    title: string;
}

export interface SaveProgressState {
    error: string;
    open?: boolean;
    steps: Array<{
        id: string;
        status: SaveProgressStatus;
        [field: string]: unknown;
    }>;
    title?: string;
    version?: 1;
}

export interface EnwikiMetadata {
    metacriticId: string;
    openCriticId: string;
    pageExists: boolean | null;
    steamId: string;
    title: string;
    wikidataId: string;
}

export interface SteamNameRow {
    label: string;
    markets: string[];
    name: string;
    official: boolean;
    previewOnly: boolean;
    sourceUrl: string;
}

export interface CategoryCacheStorePort {
    cache: Record<string, unknown>;
    clear(): void;
    save(): void;
}

export interface CitationStorePort {
    fetch(url: string): Promise<string>;
    prefetch(url: string): void;
    refetch(url: string): Promise<string>;
}

export interface PreviewAdapterPorts {
    fetchPageText(title: string): Promise<string>;
    parseArticlePreviewText(text: string, form: ArticleForm): Promise<string>;
    parsePreviewText(text: string, title?: string): Promise<string>;
}

export interface FormHistoryAdapterPorts {
    clearFormHistory(): void;
    deleteFormHistoryEntry(id: string): void;
    readFormDraftEntry(): any | undefined;
    readFormDraftForPage(page: string): any | undefined;
    readFormHistory(): Array<any>;
    saveFormDraft(form: any, page?: string): void;
    saveFormHistory(form: any, page: string, citations?: any): void;
}

export interface ReviewLinkSession {
    claim(): boolean;
}

export interface ReviewLinkAdapterPorts {
    createSession(): ReviewLinkSession;
}

export interface BrowserWorkflowPorts {
    buildArticleStubFromForm(
        form: ArticleForm,
        citationStore: CitationStorePort,
        options?: ArticleProcessorOptions,
    ): Promise<GeneratedArticleStub>;
    buildPreSaveActions(
        selection: {
            finalTitle?: string;
            form: ArticleForm;
            title: string;
        },
        existingRedirectTitles?: Array<PageTitleMatch | string>,
    ): PreSaveAction[];
    buildRedirectRows(
        form: ArticleForm,
        articleTitle: string,
        existingRedirectTitles?: Array<PageTitleMatch | string>,
    ): RedirectReviewRow[];
    buildRedirectRowsFromTitles(
        titles: string[],
        articleTitle: string,
        existingRedirectTitles?: Array<PageTitleMatch | string>,
    ): RedirectReviewRow[];
    buildRedirectTitles(form: ArticleForm, articleTitle: string): string[];
    countFormProseSinographs(
        form: ArticleForm,
        options?: ArticleProcessorOptions,
    ): number;
    createArticleData(
        form: ArticleForm,
        options?: ArticleProcessorOptions,
    ): ProcessedArticleData;
    fetchExistingPageTitles(
        api: PageLookupPort,
        titles: string[],
    ): Promise<PageTitleMatch[]>;
    getArticleFieldPlaceholder(
        form: ArticleForm,
        field: ArticleFieldPort,
        options?: ArticleProcessorOptions,
    ): string | undefined;
    getArticleFieldPreview(
        form: ArticleForm,
        previewKey: string,
        options?: ArticleProcessorOptions,
    ): string;
    getRedirectTitleCheckTitles(titles: string[]): string[];
    prepareCategoryRows(
        form: ArticleForm,
        previousRows?: CategoryReviewRow[],
        options?: unknown,
    ): Promise<CategoryReviewRow[]>;
    prepareNavboxRows(
        form: ArticleForm,
        rebuild: boolean,
    ): Promise<Array<Record<string, unknown>>>;
    preparePendingSaveResume(pending: PendingSaveSession): PendingSaveResume;
    runSelectedActions(
        actions: PreSaveAction[],
        options: unknown,
    ): Promise<PreSaveExecutionResult>;
    saveReviewedArticle(api: mw.Api, save: ReviewedArticleSave): Promise<void>;
}

export interface CategoryAdapterPorts {
    createCategoryCacheStore(page: string): CategoryCacheStorePort;
    createManualCategoryRow(): CategoryReviewRow;
    prepareCompanyCategoryText(
        row: CategoryReviewRow,
        api?: unknown,
    ): Promise<string>;
    registerNewPage(
        api: unknown,
        articleTitle: string,
        companyCategories?: string[],
        date?: Date,
    ): Promise<void>;
    saveCategoryPage(
        category: string,
        text: string,
        summary?: string,
        api?: unknown,
    ): Promise<void>;
    saveCompanyCategory(
        category: string,
        text: string,
        englishCategory?: string,
        options?: unknown,
    ): Promise<void>;
    updateCategoryRowCategory(
        row: CategoryReviewRow,
        category: string,
    ): CategoryReviewRow;
}

export interface EditingAdapterPorts {
    buildEditSummary(metadata: EditSummaryMetadata): string;
    clearMovedEdit(storage?: Storage): void;
    clearPendingSaveData(storage?: Storage): void;
    clearPreviewFormData(storage?: Storage): void;
    getMovedEdit(
        page: string,
        storage?: Storage,
    ): MovedEditSession | undefined;
    getPendingSaveData(
        page: string,
        storage?: Storage,
    ): PendingSaveSession | undefined;
    getPreviewFormData(
        page: string,
        storage?: Storage,
    ): PreviewFormSession | undefined;
    interceptEditSave(onSubmit: () => unknown): () => void;
    normalizePageTitle(title: unknown): string;
    readEditSummary(): string;
    readEditText(): string;
    shouldPreserveEditor(): boolean;
    setPendingSaveOperationStatus(
        id: string,
        status: PendingSaveOperationStatus,
        storage?: Storage,
    ): PendingSaveSession | undefined;
    storeMovedEdit(pending: MovedEditSession, storage?: Storage): void;
    storePendingSaveData(
        pending: PendingSaveDraft,
        storage?: Storage,
    ): PendingSaveSession;
    storePreviewFormData(
        form: ArticleForm,
        title: string,
        storage?: Storage,
    ): void;
    submitPreviewForm(): void;
    updateMovedTitleText(
        text: string,
        current: ProcessedArticleData,
        target: ProcessedArticleData,
    ): string;
    writeEditSummary(summary: string): void;
    writeEditText(text: string): void;
}

export interface SaveProgressAdapterPorts {
    clearSaveProgress(): void;
    failSaveProgress(error: Error): SaveProgressState | undefined;
    initializeSaveProgress(pending: PendingSaveSession): SaveProgressState;
    reportSaveProgressError(
        error: Error | string,
    ): SaveProgressState | undefined;
    setSaveProgressStep(
        id: string,
        status: SaveProgressStatus,
    ): SaveProgressState | undefined;
}

export interface SourceAdapterPorts {
    buildZhwikiCreationUrl(enwikiTitle: string, targetTitle?: string): string;
    createCitationStore(): CitationStorePort;
    createZhwikiApiClient(): PageLookupPort;
    fetchEnwikiMetadata(
        title: string,
        options?: { fetcher?: typeof fetch },
    ): Promise<EnwikiMetadata>;
    fetchSteamNameRows(
        sourceUrl: string,
        citationStore: CitationStorePort,
        options?: { includeJapanese?: boolean },
    ): Promise<SteamNameRow[]>;
    prepareManagedCitationRows(
        form: ArticleForm,
        citationStore: CitationStorePort,
        options?: { refetchSourceUrls?: string[] },
    ): Promise<Array<Record<string, unknown>>>;
    readZhwikiActivationForm(
        search: string | URLSearchParams,
    ): Pick<ArticleForm, "enwikiTitle"> | null;
    resolveZhwikiCreationTitle(
        enwikiTitle: string,
        api: PageLookupPort,
    ): Promise<string>;
}

export interface BrowserApplicationPorts {
    categories: CategoryAdapterPorts;
    clients: MediaWikiClientPorts;
    editing: EditingAdapterPorts;
    feedback: ApplicationFeedbackPorts;
    history: FormHistoryAdapterPorts;
    preview: PreviewAdapterPorts;
    reviewLinks: ReviewLinkAdapterPorts;
    saveProgress: SaveProgressAdapterPorts;
    sources: SourceAdapterPorts;
    workflows: BrowserWorkflowPorts;
}

export interface BrowserApplication {
    start(): void;
}
