/** Migration contracts for Stub Creator source decomposition. */

import assert from "node:assert/strict";
import test from "node:test";

// eslint-disable-next-line max-len
import type { PendingSaveDraft } from "vg-stub-creator/contracts/application.ts";
import type { PreSaveAction } from "vg-stub-creator/domain/models.ts";

import {
    getPendingSaveData,
    getPreviewFormData,
    PENDING_SAVE_STORAGE_KEY,
    setPendingSaveOperationStatus,
    storePendingSaveData,
} from "vg-stub-creator/adapters/storage/session.ts";
// eslint-disable-next-line max-len
import { initializeSaveProgress } from "vg-stub-creator/adapters/storage/save-progress-controller.ts";
import {
    readSaveProgress,
    SAVE_PROGRESS_STORAGE_KEY,
    storeSaveProgress,
} from "vg-stub-creator/adapters/storage/save-progress.ts";
import { runSelectedActions } from "vg-stub-creator/workflows/pre-save.ts";
// eslint-disable-next-line max-len
import { preparePendingSaveResume } from "vg-stub-creator/workflows/pre-save-checkpoint.ts";
// eslint-disable-next-line max-len
import { saveReviewedArticle } from "vg-stub-creator/workflows/pre-save-write.ts";
import {
    addTalkPageBanner,
    connectWikidataSitelink,
    createRedirect,
    movePage,
    savePageEdit,
} from "vg-stub-creator/adapters/mediawiki/wiki-writes.ts";
// eslint-disable-next-line max-len
import { saveCompanyCategory } from "vg-stub-creator/adapters/mediawiki/category-pages.ts";

const PREVIEW_FORM_STORAGE_KEY = "vg-stub-creator-preview-form";

test("keeps the package root browser-independent and private", async () => {
    const api = await import("vg-stub-creator");

    assert.deepEqual(Object.keys(api), []);
});

async function testReviewedWriteOrder(): Promise<void> {
    const trace: string[] = [];
    const result = await runSelectedActions(
        createReviewedActions(),
        createActionOptions(trace),
    );

    assert.deepEqual(trace, [
        "start:page-edit:Appendix",
        "local:edit:Appendix",
        "complete:page-edit:Appendix",
        "start:category:Games",
        "category:Category:Games:English Games",
        "complete:category:Games",
        "before-wikidata:page-edit:Appendix,category:Games",
        "start:interwiki",
        "wikidata:wbsetsitelink:Q1",
        "complete:interwiki",
    ]);
    assert.deepEqual(
        result.completed.map((action: { id: string }) => action.id),
        ["page-edit:Appendix", "category:Games", "interwiki"],
    );
    assert.deepEqual(result.failed, []);
    assert.equal(result.title, "Example");
}
test(
    "executes reviewed local writes before the Wikidata boundary",
    testReviewedWriteOrder,
);

test("save progress round trips and corrupt storage is discarded", () => {
    const storage = createMemoryStorage();
    const progress = {
        completed: ["article"],
        title: "Example",
        version: 1,
    };

    storeSaveProgress(progress, storage);
    assert.deepEqual(readSaveProgress(storage), progress);

    storage.setItem(SAVE_PROGRESS_STORAGE_KEY, "{broken");
    assert.equal(readSaveProgress(storage), undefined);
    assert.equal(storage.getItem(SAVE_PROGRESS_STORAGE_KEY), null);
});

test("session recovery matches titles without consuming data", () => {
    const storage = createMemoryStorage({
        [PENDING_SAVE_STORAGE_KEY]: JSON.stringify({
            actions: ["redirect"],
            move: { enabled: false },
            operations: { save: "confirmed" },
            title: "Example_Game",
            version: 1,
        }),
        [PREVIEW_FORM_STORAGE_KEY]: JSON.stringify({
            form: { name: "Example" },
            title: "Example_Game",
        }),
    });

    assert.deepEqual(getPendingSaveData(" Example Game ", storage), {
        actions: ["redirect"],
        move: { enabled: false },
        operations: { save: "confirmed" },
        title: "Example_Game",
        version: 1,
    });
    assert.deepEqual(getPreviewFormData("Example Game", storage), {
        form: { name: "Example" },
        title: "Example_Game",
    });
    assert.equal(getPendingSaveData("Other", storage), undefined);
    assert.notEqual(storage.getItem(PENDING_SAVE_STORAGE_KEY), null);
});

test("persists a versioned checkpoint before the first reviewed write", () => {
    const storage = createMemoryStorage();
    const draft = createPendingDraft();
    draft.actions = new Proxy(draft.actions, {});
    const checkpoint = storePendingSaveData(draft, storage);

    assert.equal(checkpoint.version, 1);
    assert.deepEqual(checkpoint.operations, {
        "category:Games": "pending",
        interwiki: "pending",
        "new-page-list": "pending",
        "page-edit:Appendix": "pending",
        save: "pending",
    });
    assert.deepEqual(
        JSON.parse(storage.getItem(PENDING_SAVE_STORAGE_KEY) ?? "null"),
        checkpoint,
    );

    const progress = initializeSaveProgress(checkpoint, storage);
    assert.equal(progress.version, 1);
    assert.equal(progress.steps[0]?.id, "save");
    assert.equal(progress.steps[0]?.status, "pending");
});

test("rejects duplicate IDs before persistence or writes", async (context) => {
    for (const type of ["page-edit", "category"] as const) {
        await context.test(type, async () => {
            const actions = createDuplicateActionPair(type);
            const storage = createMemoryStorage();
            const draft = { ...createPendingDraft(), actions };

            assert.throws(
                () => storePendingSaveData(draft, storage),
                /must have unique, non-reserved IDs.*Conflicting IDs/u,
            );
            assert.equal(storage.getItem(PENDING_SAVE_STORAGE_KEY), null);

            const trace: string[] = [];
            await assert.rejects(
                runSelectedActions(actions, createActionOptions(trace)),
                /must have unique, non-reserved IDs/u,
            );
            assert.deepEqual(trace, []);
        });
    }
});

test("resumes only operations not confirmed by the save checkpoint", () => {
    const storage = createMemoryStorage();
    storePendingSaveData(createPendingDraft(), storage);
    setPendingSaveOperationStatus("save", "confirmed", storage);
    setPendingSaveOperationStatus("interwiki", "confirmed", storage);
    setPendingSaveOperationStatus("page-edit:Appendix", "running", storage);
    const pending = getPendingSaveData("Example", storage);

    assert.ok(pending);
    const resume = preparePendingSaveResume(pending);
    assert.deepEqual(
        resume.actions.map((action) => action.id),
        ["category:Games"],
    );
    assert.deepEqual(
        resume.confirmedActions.map((action) => action.id),
        ["interwiki"],
    );
    assert.deepEqual(resume.blockedOperationIds, ["page-edit:Appendix"]);
});

test("does not retry an ambiguous follow-up write", async () => {
    const storage = createMemoryStorage();
    storePendingSaveData(createPendingDraft(), storage);
    let attempts = 0;
    const action = createReviewedActions()[1];
    const options = createActionOptions([]);
    options.onActionStart = function markRunning() {
        setPendingSaveOperationStatus(
            "page-edit:Appendix",
            "running",
            storage,
        );
    };
    options.onActionFailed = function markUncertain() {
        setPendingSaveOperationStatus(
            "page-edit:Appendix",
            "uncertain",
            storage,
        );
    };
    const writes = options.writes as Record<string, unknown>;
    writes.savePageEdit = async function failWrite() {
        attempts += 1;
        throw new Error("connection closed after dispatch");
    };

    const result = await runSelectedActions([action], options);

    assert.equal(attempts, 1);
    assert.deepEqual(
        result.failed.map((failed: { id: string }) => failed.id),
        ["page-edit:Appendix"],
    );
    assert.equal(
        getPendingSaveData("Example", storage)?.operations[
            "page-edit:Appendix"
        ],
        "uncertain",
    );
});

async function testUncertainCompanyCategory(): Promise<void> {
    const storage = createMemoryStorage();
    const action = createCategoryAction({
        category: "Games by Example Company",
        company: "Example Company",
        englishName: "Category:Games by Example Company",
        id: "category:Games by Example Company",
        wikidataId: "Q1",
    });
    storeReviewedActions([action], storage);
    const parentStatesDuringSubwrites: string[] = [];
    const localPosts: Array<Record<string, unknown>> = [];
    const options = createCompanyCategoryFailureOptions({
        action,
        localPosts,
        parentStatesDuringSubwrites,
        storage,
    });
    const result = await runSelectedActions([action], options);
    const checkpoint = getPendingSaveData("Example", storage);
    assert.equal(localPosts.length, 1);
    assert.deepEqual(parentStatesDuringSubwrites, ["running", "running"]);
    assert.deepEqual(result.completed, []);
    assert.deepEqual(
        result.failed.map((failed: { id: string }) => failed.id),
        [action.id],
    );
    assert.equal(checkpoint?.operations[action.id], "uncertain");
    assert.ok(checkpoint);
    const resume = preparePendingSaveResume(checkpoint);
    assert.deepEqual(resume.actions, []);
    assert.deepEqual(resume.confirmedActions, []);
    assert.deepEqual(resume.blockedOperationIds, [action.id]);
}
test(
    "keeps a company category uncertain after a bundled write fails",
    testUncertainCompanyCategory,
);

async function testBundledProgressIdentity(): Promise<void> {
    const storage = createMemoryStorage();
    const companyAction = createCategoryAction({
        category: "Games",
        company: "Example Company",
        id: "category:Games",
        wikidataId: "Q1",
    });
    const collidingAction = createCategoryAction({
        category: "Games:wikidata",
        id: "category:Games:wikidata",
    });
    const actions = [companyAction, collidingAction];
    storeReviewedActions(actions, storage);
    const bundledStates: string[] = [];
    const options = createBundledProgressOptions(
        collidingAction.id,
        storage,
        bundledStates,
    );
    await runSelectedActions(actions, options);
    assert.deepEqual(bundledStates, ["pending", "pending"]);
    assert.equal(
        readPendingOperation(collidingAction.id, storage),
        "confirmed",
    );
}
test(
    "keeps bundled category progress outside checkpoint action IDs",
    testBundledProgressIdentity,
);

test("guards primary article creation and existing-page edits", async () => {
    const created = createGuardedArticleApi(false);
    await saveReviewedArticle(created.api, {
        exists: false,
        summary: "Reviewed creation",
        text: "Reviewed new text",
        title: "New article",
    });
    assert.equal(created.posts[0]?.createonly, true);
    assert.equal(created.posts[0]?.starttimestamp, "query-time");
    assert.equal(created.posts[0]?.nocreate, undefined);

    const edited = createGuardedArticleApi(true);
    await saveReviewedArticle(edited.api, {
        exists: true,
        summary: "Reviewed update",
        text: "Reviewed existing text",
        title: "Existing article",
    });
    assert.equal(edited.posts[0]?.basetimestamp, "base-time");
    assert.equal(edited.posts[0]?.nocreate, true);
    assert.equal(edited.posts[0]?.starttimestamp, "query-time");
    assert.equal(edited.posts[0]?.createonly, undefined);

    const changed = createGuardedArticleApi(true);
    await assert.rejects(
        saveReviewedArticle(changed.api, {
            exists: false,
            summary: "Reviewed creation",
            text: "Reviewed new text",
            title: "Changed article",
        }),
        /already exists/,
    );
    assert.equal(changed.posts.length, 0);
});

function createPendingDraft(): PendingSaveDraft {
    return {
        actions: createReviewedActions(),
        move: { enabled: false },
        progressGroups: [],
        registration: { enabled: true },
        title: "Example",
    };
}

function createGuardedArticleApi(exists: boolean): {
    api: mw.Api;
    posts: Array<Record<string, unknown>>;
} {
    const posts: Array<Record<string, unknown>> = [];
    const page = exists
        ? { revisions: [{ timestamp: "base-time" }], title: "Article" }
        : { missing: true, title: "Article" };
    const api = {
        async get() {
            return {
                curtimestamp: "query-time",
                query: { pages: [page] },
            };
        },
        async postWithToken(_token: string, params: Record<string, unknown>) {
            posts.push(params);
            return { edit: { result: "Success" } };
        },
    } as unknown as mw.Api;
    return { api, posts };
}

function createReviewedActions(): PreSaveAction[] {
    return [
        {
            displayLabel: "Wikidata interwiki",
            id: "interwiki",
            label: "Wikidata interwiki",
            pageTitle: "Example",
            selected: true,
            type: "interwiki",
            wikidataId: "Q1",
        },
        {
            create: true,
            displayLabel: "Appendix",
            id: "page-edit:Appendix",
            label: "Appendix",
            pageTitle: "Appendix",
            selected: true,
            summary: "Create reviewed appendix",
            text: "Reviewed appendix text",
            title: "Appendix",
            type: "page-edit",
        },
        {
            category: "Category:Games",
            company: "",
            displayLabel: "Games category",
            englishName: "English Games",
            id: "category:Games",
            label: "Games category",
            pageTitle: "Category:Games",
            selected: true,
            text: "Reviewed category text",
            type: "category",
            wikidataId: "",
        },
    ];
}

function createDuplicateActionPair(
    type: "category" | "page-edit",
): PreSaveAction[] {
    const actionIndex = type === "page-edit" ? 1 : 2;
    const action = createReviewedActions()[actionIndex];
    assert.ok(action);
    return [action, { ...action, displayLabel: `Duplicate ${type}` }];
}

function createCategoryAction(
    values: Partial<Extract<PreSaveAction, { type: "category" }>> & {
        category: string;
        id: string;
    },
): Extract<PreSaveAction, { type: "category" }> {
    return {
        category: values.category,
        company: values.company ?? "",
        displayLabel: values.category,
        englishName: values.englishName ?? "",
        id: values.id,
        label: values.category,
        pageTitle: `Category:${values.category}`,
        selected: true,
        text: "Reviewed category text",
        type: "category",
        wikidataId: values.wikidataId ?? "",
    };
}

function createCheckpointActionCallback(
    storage: Storage,
    status: "confirmed" | "running",
): (action: { id: string }) => void {
    return function updateCheckpoint(action) {
        setPendingSaveOperationStatus(action.id, status, storage);
    };
}

function storeReviewedActions(
    actions: PreSaveAction[],
    storage: Storage,
): void {
    storePendingSaveData(
        {
            actions,
            move: { enabled: false },
            registration: { enabled: false },
            title: "Example",
        },
        storage,
    );
    setPendingSaveOperationStatus("save", "confirmed", storage);
}

function createCompanyCategoryFailureOptions(context: {
    action: PreSaveAction;
    localPosts: Array<Record<string, unknown>>;
    parentStatesDuringSubwrites: string[];
    storage: Storage;
}): Record<string, unknown> {
    const options = createActionOptions([]);
    options.onActionStart = createCheckpointActionCallback(
        context.storage,
        "running",
    );
    options.onActionFailed = createUncertainActionCallback(context.storage);
    options.saveCompanyCategory = createFailingCompanyCategorySave(context);
    return options;
}

function createUncertainActionCallback(
    storage: Storage,
): (action: { id: string }) => void {
    return function markUncertain(action) {
        setPendingSaveOperationStatus(action.id, "uncertain", storage);
    };
}

function createFailingCompanyCategorySave(context: {
    action: PreSaveAction;
    localPosts: Array<Record<string, unknown>>;
    parentStatesDuringSubwrites: string[];
    storage: Storage;
}) {
    return async function saveWithFailure(
        category: string,
        text: string,
        englishName: string,
        progress: { onProgress(operation: string, status: string): void },
    ) {
        await assert.rejects(
            saveCompanyCategory(category, text, englishName, {
                api: createRecordingApi(context.localPosts),
                async fetchMetadata() {
                    return { pageExists: true, wikidataId: "Q1" };
                },
                onProgress(operation: string, status: string) {
                    progress.onProgress(operation, status);
                    observeParentCategoryStatus(operation, status, context);
                },
                wikidataApi: createFailingWriteApi(),
            }),
            /connection closed after dispatch/u,
        );
        throw new Error("company category bundle failed");
    };
}

function observeParentCategoryStatus(
    operation: string,
    status: string,
    context: {
        action: PreSaveAction;
        parentStatesDuringSubwrites: string[];
        storage: Storage;
    },
): void {
    const observed =
        (operation === "create" && status === "complete") ||
        (operation === "wikidata" && status === "failed");
    if (observed) {
        context.parentStatesDuringSubwrites.push(
            readPendingOperation(context.action.id, context.storage),
        );
    }
}

function createBundledProgressOptions(
    collidingId: string,
    storage: Storage,
    bundledStates: string[],
): Record<string, unknown> {
    const options = createActionOptions([]);
    options.onActionStart = createCheckpointActionCallback(storage, "running");
    options.onActionComplete = createCheckpointActionCallback(
        storage,
        "confirmed",
    );
    options.onBundledActionProgress = function observe(action: {
        id: string;
    }) {
        assert.equal(action.id, collidingId);
        bundledStates.push(readPendingOperation(collidingId, storage));
    };
    options.saveCompanyCategory = reportBundledCompanyCategoryProgress;
    return options;
}

async function reportBundledCompanyCategoryProgress(
    _category: string,
    _text: string,
    _englishName: string,
    progress: { onProgress(operation: string, status: string): void },
): Promise<void> {
    progress.onProgress("wikidata", "running");
    progress.onProgress("wikidata", "complete");
}

function createActionOptions(trace: string[]): Record<string, unknown> {
    return {
        api: createWriteApi(trace, "local"),
        move: { enabled: false, leaveRedirect: true, to: "" },
        onActionComplete(action: { id: string }) {
            trace.push(`complete:${action.id}`);
        },
        onActionStart(action: { id: string }) {
            trace.push(`start:${action.id}`);
        },
        onBeforeWikidataActions(state: { completed: Array<{ id: string }> }) {
            const ids = state.completed.map((action) => action.id);
            trace.push(`before-wikidata:${ids.join(",")}`);
        },
        async saveCategory(
            category: string,
            _text: string,
            englishName: string,
        ) {
            trace.push(`category:${category}:${englishName}`);
        },
        title: "Example",
        wikidataApi: createWriteApi(trace, "wikidata"),
        writes: {
            addTalkPageBanner,
            connectWikidataSitelink,
            createRedirect,
            movePage,
            savePageEdit,
        },
    };
}

function createWriteApi(trace: string[], name: string): mw.Api {
    return {
        async postWithToken(
            _token: string,
            params: Record<string, unknown>,
        ): Promise<unknown> {
            const target = String(params.title ?? params.id ?? "");
            trace.push(`${name}:${String(params.action)}:${target}`);
            return {};
        },
    } as unknown as mw.Api;
}

function createRecordingApi(posts: Array<Record<string, unknown>>): mw.Api {
    return {
        async postWithToken(
            _token: string,
            params: Record<string, unknown>,
        ): Promise<unknown> {
            posts.push(params);
            return {};
        },
    } as unknown as mw.Api;
}

function createFailingWriteApi(): mw.ForeignApi {
    return {
        async postWithToken(): Promise<never> {
            throw new Error("connection closed after dispatch");
        },
    } as unknown as mw.ForeignApi;
}

function readPendingOperation(id: string, storage: Storage): string {
    return getPendingSaveData("Example", storage)?.operations[id] ?? "missing";
}

function createMemoryStorage(initial: Record<string, string> = {}): Storage {
    const values = new Map(Object.entries(initial));

    return {
        clear() {
            values.clear();
        },
        getItem(key) {
            return values.get(key) ?? null;
        },
        key(index) {
            return [...values.keys()][index] ?? null;
        },
        get length() {
            return values.size;
        },
        removeItem(key) {
            values.delete(key);
        },
        setItem(key, value) {
            values.set(key, value);
        },
    };
}
