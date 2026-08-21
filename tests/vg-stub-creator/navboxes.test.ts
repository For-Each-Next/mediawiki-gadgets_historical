/**
 * Tests configured and generated navboxes.
 */

import assert from "node:assert/strict";
import test from "node:test";

import {
    createArticleWorkflow,
    getConfiguredNavboxTitles,
} from "vg-stub-creator/workflows/article.ts";
import {
    buildCategoryRows,
    buildFallbackCategoryRows,
} from "vg-stub-creator/adapters/mediawiki/categories.ts";
import {
    resolveNavboxTitles,
    resolveReviewedNavboxRows,
} from "vg-stub-creator/adapters/mediawiki/navboxes.ts";
// eslint-disable-next-line max-len
import { fetchSourceReferences } from "vg-stub-creator/adapters/network/index.ts";
import { buildPreSaveActions } from "vg-stub-creator/workflows/pre-save.ts";
import { createDialogComponent } from "vg-stub-creator/ui/form/index.ts";
import {
    getNavboxTitle,
    normalizeEnglishCategoryTitle,
} from "vg-stub-creator/ui/form/form-model.ts";
import { wheelWorldEntry } from "./wheel-world.fixture.ts";

const ORIGINAL_TITLE = "Fantasy Life i: The Girl Who Steals Time";
const EDITED_TITLE = "奇幻生活i 轉圈圈的龍和偷取時間的少女";

const testCallbackA = () => {
    const titles = getConfiguredNavboxTitles(wheelWorldEntry.data.input);

    assert.deepEqual(titles, ["安納布爾納互動"]);
};
test(
    "configured navboxes are collected from terminology-backed parts",
    testCallbackA,
);

test("review titles recognize site-scoped namespace aliases", () => {
    assert.equal(getNavboxTitle("{{T:Example|value}}"), "Example");
    assert.equal(getNavboxTitle("{{樣板:Example}}"), "Example");
    assert.equal(
        normalizeEnglishCategoryTitle("Category:Games"),
        "Category:Games",
    );
    assert.equal(
        normalizeEnglishCategoryTitle("分類:Games"),
        "Category:分類:Games",
    );
});

const testCallback = async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = createExistingTemplateFetcher();

    try {
        const article = createArticleWorkflow(
            {
                buildCategoryRows,
                buildFallbackCategoryRows,
                fetchSourceReferences,
                resolveNavboxTitles,
                resolveReviewedNavboxRows,
            },
            { enterEnwikiTitle: "", noWikidataItem: "" },
        );
        const rows = await article.prepareNavboxRows(
            {
                ...wheelWorldEntry.data.input,
                navboxRows: [],
                series: "",
            },
            false,
        );

        assert.deepEqual(rows, [
            {
                enabled: true,
                status: "OK",
                text: "{{安納布爾納互動}}",
                title: "安納布爾納互動",
            },
        ]);
    } finally {
        globalThis.fetch = originalFetch;
    }
};
test("company navboxes work without a series", testCallback);

test("modified navbox summaries use the edited article title", async () => {
    const originalWindow = Object.getOwnPropertyDescriptor(
        globalThis,
        "window",
    );
    Object.defineProperty(globalThis, "window", {
        configurable: true,
        value: {},
        writable: true,
    });

    try {
        const component = createDialogComponent(
            createVueStub(),
            createDialogOptions(),
        );
        const bindings = component.setup();
        bindings.form.pageName = EDITED_TITLE;
        const row: {
            pendingEdit?: { summary: string };
            status: string;
            title: string;
        } = {
            status: "OK",
            title: "Fantasy Life",
        };

        await component.methods.openNavboxEdit(row);
        component.methods.stagePageEdit();

        assert.ok(row.pendingEdit);
        assert.equal(
            row.pendingEdit.summary,
            `add link to '[[${EDITED_TITLE}]]'`,
        );
    } finally {
        restoreWindow(originalWindow);
    }
});

test("pre-save refreshes modified and created navbox summaries", () => {
    const actions = buildPreSaveActions({
        finalTitle: EDITED_TITLE,
        form: createPreSaveForm({
            navboxRows: [
                createPendingEditRow(
                    "Template:Fantasy Life",
                    `add link to '[[${ORIGINAL_TITLE}]]'`,
                ),
                createPendingEditRow(
                    "Template:Level-5 games",
                    `create 'Template:Level-5 games', with link to ` +
                        `'[[${ORIGINAL_TITLE}]]'`,
                    true,
                ),
            ],
        }),
        title: ORIGINAL_TITLE,
    });

    assert.equal(
        getPageEditSummary(actions, "Template:Fantasy Life"),
        `add link to '[[${EDITED_TITLE}]]'`,
    );
    assert.equal(
        getPageEditSummary(actions, "Template:Level-5 games"),
        "create 'Template:Level-5 games', with link to " +
            `'[[${EDITED_TITLE}]]'`,
    );
});

test("pre-save navbox summaries fall back to the current title", () => {
    const actions = buildPreSaveActions({
        finalTitle: " ",
        form: createPreSaveForm({
            navboxRows: [
                createPendingEditRow(
                    "Template:Fantasy Life",
                    "stale navbox summary",
                ),
            ],
        }),
        title: ORIGINAL_TITLE,
    });

    assert.equal(
        getPageEditSummary(actions, "Template:Fantasy Life"),
        `add link to '[[${ORIGINAL_TITLE}]]'`,
    );
});

test("pre-save preserves custom non-navbox summaries", () => {
    const actions = buildPreSaveActions({
        finalTitle: EDITED_TITLE,
        form: createPreSaveForm({
            categoryRows: [
                createPendingEditRow(
                    "Category:Level-5 games",
                    "custom category summary",
                ),
            ],
            redirectRows: [
                createPendingEditRow(
                    "Fantasy Life redirect",
                    "custom redirect summary",
                ),
            ],
            stubTagRows: [
                createPendingEditRow(
                    "Template:Level-5-stub",
                    "custom stub summary",
                ),
            ],
        }),
        title: ORIGINAL_TITLE,
    });

    assert.equal(
        getPageEditSummary(actions, "Category:Level-5 games"),
        "custom category summary",
    );
    assert.equal(
        getPageEditSummary(actions, "Fantasy Life redirect"),
        "custom redirect summary",
    );
    assert.equal(
        getPageEditSummary(actions, "Template:Level-5-stub"),
        "custom stub summary",
    );
});

/**
 * Creates the minimal Vue surface used by the dialog component.
 *
 * @returns Vue-compatible reactive helpers.
 */
function createVueStub(): any {
    return {
        computed(getter: () => unknown) {
            return {
                get value() {
                    return getter();
                },
            };
        },
        onBeforeUnmount() {},
        reactive<T>(value: T): T {
            return value;
        },
        ref<T>(value: T): { value: T } {
            return { value };
        },
        watch() {},
    };
}

/**
 * Creates the dialog options needed to stage an existing navbox edit.
 *
 * @returns Minimal dialog options.
 */
function createDialogOptions(): any {
    return {
        createReviewLinkSession: () => ({ claim: () => true }),
        currentPageExists: true,
        currentTitle: ORIGINAL_TITLE,
        defaultName: ORIGINAL_TITLE,
        getFieldPlaceholder: () => "",
        getHistoryEntries: () => [],
        getProseSinographs: () => 0,
        getProseWikitext: () => "",
        initialEnwikiLookup: false,
        initialOpen: false,
        onActivate() {},
        async onFetchPageText() {
            return "{{Fantasy Life}}";
        },
        onFormChange() {},
        async onParsePreview() {
            return "";
        },
    };
}

/**
 * Creates complete page-edit collections for pre-save planning.
 *
 * @param values - Collection overrides.
 * @returns Pre-save form fixture.
 */
function createPreSaveForm(values: Record<string, unknown>): any {
    return {
        categoryRows: [],
        navboxRows: [],
        redirectRows: [],
        stubTagRows: [],
        wikidataId: "",
        ...values,
    };
}

/**
 * Creates an enabled review row with a staged page edit.
 *
 * @param title - Target page title.
 * @param summary - Staged edit summary.
 * @param create - Whether the page will be created.
 * @returns Review-row fixture.
 */
function createPendingEditRow(
    title: string,
    summary: string,
    create = false,
): any {
    return {
        enabled: true,
        pendingEdit: {
            create,
            summary,
            text: "reviewed source",
            title,
        },
    };
}

/**
 * Gets the summary for a staged page-edit action.
 *
 * @param actions - Prepared pre-save actions.
 * @param title - Target page title.
 * @returns Prepared summary.
 */
function getPageEditSummary(actions: Array<any>, title: string): string {
    const action = actions.find(
        (candidate) =>
            candidate.type === "page-edit" && candidate.title === title,
    );
    assert.ok(action, `Missing page-edit action for ${title}`);
    return action.summary;
}

/**
 * Restores the Node global window property after dialog setup.
 *
 * @param descriptor - Original window descriptor.
 */
function restoreWindow(descriptor?: PropertyDescriptor): void {
    if (descriptor == null) {
        Reflect.deleteProperty(globalThis, "window");
        return;
    }

    Object.defineProperty(globalThis, "window", descriptor);
}

/**
 * Creates a fetch implementation reporting templates as existing.
 *
 * @returns MediaWiki-compatible fetch implementation.
 */
function createExistingTemplateFetcher(): typeof fetch {
    return async function fetcher(input) {
        const inputText = String(input);
        const url = new URL(inputText, "https://example.test");
        const titles = url.searchParams.get("titles")?.split("|") || [];

        return {
            ok: true,
            async json() {
                return {
                    query: {
                        pages: titles.map((title) => ({ title })),
                    },
                };
            },
        } as Response;
    };
}
