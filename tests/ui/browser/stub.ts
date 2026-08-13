/** Production VG Stub Creator dialog stories. */

import { registerCodexComponents } from "vg-stub-creator/ui/codex.ts";
import { createDialogComponent } from "vg-stub-creator/ui/form/index.ts";
import { createFormValues } from "vg-stub-creator/ui/form/form-model.ts";
import { addDialogStyles } from "vg-stub-creator/ui/styles.ts";
import { getCodex, getVue, installStoryHost, mountComponent } from "./host.ts";
import { UI_STORIES, type UiStory } from "./registry.ts";

const stories = UI_STORIES.filter(
    (story) => story.gadget === "vg-stub-creator",
);
addDialogStyles();
installStoryHost("vg-stub-creator", stories, renderStory);

function renderStory(story: UiStory) {
    const component = createDialogComponent(getVue(), createOptions());
    const mounted = mountComponent(component, function register(app) {
        registerCodexComponents(app, getCodex());
    });
    prepareStory(mounted.proxy, story);
    return mounted;
}

function createOptions(): any {
    return {
        ...createBaseOptions(),
        ...createWorkflowOptions(),
    };
}

function createBaseOptions(): any {
    return {
        citationPrefetchDelay: 0,
        createReviewLinkSession: () => ({ claim: () => true }),
        currentPageExists: false,
        currentTitle: "Draft:Example game with a long working title",
        defaultName: "Example game with a long working title",
        getFieldPlaceholder: () => "Deterministic field placeholder",
        getFieldPreview: () => "{{Preview|long deterministic value}}",
        getHistoryEntries: createHistoryEntries,
        getPageUrl: (title: string) => `/wiki/${encodeURIComponent(title)}`,
        getProseSinographs: () => 128,
        getProseWikitext: () => "A deterministic article introduction.",
        initialEnwikiLookup: false,
        initialForm: createInitialForm(),
        initialOpen: true,
        onActivate() {},
        onClearHistory() {},
        onCreateCategoryRow: () => ({ category: "", enabled: true }),
        onDeleteHistoryEntry() {},
        onFormChange() {},
        onMoveTarget() {},
        onSourceUrlChange() {},
        onSubmitHistory() {},
    };
}

function createWorkflowOptions(): any {
    return {
        ...createLookupOptions(),
        ...createPreviewOptions(),
    };
}

function createLookupOptions(): any {
    return {
        async onCategoryRowsRefresh() {
            return createCategoryRows();
        },
        async onCheckPageTitle(title: string) {
            return { exists: false, title };
        },
        async onCheckRedirectRows(rows: any[]) {
            return rows;
        },
        async onEnwikiTitleChange() {
            return {};
        },
        async onPrepareCitations() {
            return [];
        },
        async onPrepareCompanyCategory() {
            return "{{Category source}}";
        },
        async onPrepareRedirectRows() {
            return [];
        },
        async onPrepareReview() {
            return [];
        },
    };
}

function createPreviewOptions(): any {
    return {
        async onFetchPageText() {
            return "{{Deterministic source}}";
        },
        async onParseArticlePreview() {
            return "<p>A deterministic rendered article preview.</p>";
        },
        async onParsePreview() {
            return "<p>A deterministic rendered page preview.</p>";
        },
        async onPreSavePrepare() {
            return [];
        },
        async onPreview() {},
        async onSteamNamesFetch() {
            return [];
        },
        async onSubmit() {},
        onUpdateCategoryRowCategory(row: any, category: string) {
            return { ...row, category };
        },
    };
}

function createInitialForm(): any {
    const form = createFormValues();
    Object.assign(form, {
        additionalProse:
            "A long deterministic description that wraps on mobile screens.",
        developers: "Example Development Studio",
        englishName: "Example Game: A Deliberately Long Subtitle",
        enwikiTitle: "Example Game (video game)",
        genres: "Action role-playing game, strategy game",
        name: "示例遊戲：一個很長的副標題",
        originalName: "サンプルゲーム・ロングサブタイトル",
        pageName: "示例遊戲",
        platforms: "Windows, PlayStation 5, Nintendo Switch",
        publishers: "Example Interactive Entertainment",
        series: "Example series",
        year: "2026",
    });
    form.categoryRows = createCategoryRows();
    form.localizedNames[0] = {
        ...form.localizedNames[0],
        hant: true,
        name: "範例遊戲：完整版名稱",
        official: true,
        sourceUrl: "https://example.test/localized-name",
    };
    return form;
}

function createCategoryRows(): any[] {
    return [
        {
            category: "Example games with a very long category",
            company: "Example Studio",
            enabled: true,
            source: "generated",
            status: "Not exists",
        },
    ];
}

function createHistoryEntries(): any[] {
    return [
        {
            form: createInitialForm(),
            id: "history-one",
            metadata: {
                page: "Draft:Example game with a long working title",
                savedAt: "2026-08-13 10:30:00",
                temporary: false,
            },
        },
        {
            form: createInitialForm(),
            id: "history-two",
            metadata: {
                page: "User:Example/Sandbox/Another long title",
                savedAt: "2026-08-12 09:15:00",
                temporary: true,
            },
        },
    ];
}

function prepareStory(proxy: Record<string, any>, story: UiStory): void {
    proxy.open = story.dialog === "main";
    if (story.dialog === "main") {
        proxy.activeTab = story.variant;
        return;
    }
    const preparers: Record<string, () => void> = {
        "category-view": () => prepareCategoryView(proxy),
        "company-category": () => prepareCompanyCategory(proxy),
        "history": () => {
            proxy.historyOpen = true;
        },
        "history-json": () => prepareHistoryJson(proxy),
        "move": () => prepareMove(proxy),
        "page-edit": () => preparePageEdit(proxy),
        "pre-save": () => {
            proxy.preSaveOpen = true;
        },
        "preview": () => preparePreview(proxy),
    };
    preparers[story.dialog]?.();
}

function prepareCompanyCategory(proxy: Record<string, any>): void {
    Object.assign(proxy.companyCategoryState, {
        category: "Example Studio games",
        company: "Example Studio",
        englishName: "Example Studio",
        pending: true,
        text: "{{Cat main|Example Studio}}\n[[Category:Video game companies]]",
        wikidataId: "Q123456789",
    });
    proxy.companyCategoryOpen = true;
}

function prepareCategoryView(proxy: Record<string, any>): void {
    Object.assign(proxy.categoryViewState, {
        title: "Category:Example games with an exceptionally long title",
        url: "about:blank",
    });
    proxy.categoryViewOpen = true;
}

function preparePageEdit(proxy: Record<string, any>): void {
    Object.assign(proxy.pageEditState, {
        create: true,
        englishName: "Example navbox",
        html: "<p>Rendered deterministic related-page preview.</p>",
        kind: "navbox",
        pending: true,
        text: [
            "{{Navbox source}}",
            "A long deterministic source line for wrapping.",
        ].join("\n"),
        title: "Template:Example video game series navbox",
    });
    proxy.pageEditOpen = true;
}

function prepareMove(proxy: Record<string, any>): void {
    proxy.moveTarget = "Example game with a long final article title";
    proxy.movePreviewConfirmation = true;
    proxy.moveOpen = true;
}

function preparePreview(proxy: Record<string, any>): void {
    proxy.previewHtml = [
        "<h2>Example Game</h2>",
        "<p>A rendered article preview with enough content to wrap.</p>",
    ].join("");
    proxy.previewSummary = "Create a translated video-game article stub";
    proxy.previewText = [
        "{{Infobox video game|title=Example Game}}",
        "A deterministic article introduction with a long sentence.",
        "[[Category:Example games]]",
    ].join("\n");
    proxy.previewOpen = true;
}

function prepareHistoryJson(proxy: Record<string, any>): void {
    proxy.historyJsonEditable = true;
    proxy.historyJsonText = JSON.stringify(createHistoryEntries()[0], null, 2);
    proxy.historyJsonOpen = true;
}
