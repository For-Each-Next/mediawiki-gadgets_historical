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
    get(params: Record<string, string>): PromiseLike<unknown>;
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

export interface PendingSaveSession {
    actions: PreSaveAction[];
    move: Record<string, unknown>;
    progressGroups?: unknown[];
    registration?: { enabled?: boolean };
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
    runSelectedActions(
        actions: PreSaveAction[],
        options: unknown,
    ): Promise<PreSaveExecutionResult>;
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
    storeMovedEdit(pending: MovedEditSession, storage?: Storage): void;
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
    editing: EditingAdapterPorts;
    saveProgress: SaveProgressAdapterPorts;
    sources: SourceAdapterPorts;
    workflows: BrowserWorkflowPorts;
}

export interface BrowserApplication {
    start(): void;
}
