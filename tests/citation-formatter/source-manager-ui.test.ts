/** Integration tests for source-manager draft actions. */

import assert from "node:assert/strict";
import test from "node:test";

import type {
    ExistingSource,
    SourceDraft,
} from "citation-formatter/domain/source-manager.ts";
import {
    openCitationFormatterDialog,
    type SourceManagerOptions,
} from "citation-formatter/ui/source-manager.ts";
import type {
    CodexComponents,
    ResourceLoaderRequire,
    ToastController,
    VueModule,
} from "citation-formatter/ui/codex.ts";
import type { editBox } from "@mediawiki-gadgets/shared";

interface MountedManager extends Record<string, unknown> {
    draft: { value: SourceDraft | null };
    draftCs1Checking: { value: boolean };
    existingSources: { value: ExistingSource[] };
    parameterAliasDialogDirectives: { value: string[] };
    sourceAnalysis: {
        value: {
            findings: Array<{
                occurrences: Array<{ selected: boolean }>;
            }>;
        };
    };
    toolPopup: { value: string | null };
}

const CS1_ERROR_HTML = [
    '<div id="citation-formatter-cs1-check-0">',
    '<span class="cs1-visible-error citation-comment">',
    "Unknown parameter <code>&#124;bad=</code> ignored",
    "</span></div>",
].join("");
const CS1_OK_HTML = '<div id="citation-formatter-cs1-check-0">No issues</div>';

// eslint-disable-next-line max-lines-per-function
test("toasts on duplicate and rechecks only CS1 Apply", async () => {
    const recheck = createDeferred<unknown>();
    const harness = installSourceManagerHarness([
        { parse: { categories: [], text: CS1_ERROR_HTML } },
        recheck.promise,
    ]);
    try {
        const initialText =
            '<ref name="Example">{{cite web|title=Example|bad=value}}</ref>';
        const editor = createMemoryEditor(initialText);
        await openCitationFormatterDialog(editor, {} as SourceManagerOptions);
        const manager = harness.getManager();
        const sourceId = manager.existingSources.value[0]?.id;
        assert.ok(sourceId);

        callAction(manager, "editListedSource", sourceId);
        callAction(manager, "duplicateDraft");
        assert.ok(
            harness.successMessages.includes("Citation source duplicated."),
        );
        callAction(manager, "closeDraftPopup");

        await callAsyncAction(manager, "openCs1Tool");
        callAction(manager, "reviewCs1Source", sourceId);
        const draft = manager.draft.value;
        assert.ok(draft);
        const badRowIndex = draft.rows.findIndex((row) => row.name === "bad");
        assert.notEqual(badRowIndex, -1);
        draft.rows.splice(badRowIndex, 1);
        const titleRow = draft.rows.find((row) => row.name === "title");
        assert.ok(titleRow);
        draft.rows.splice(draft.rows.indexOf(titleRow), 1);
        draft.rows.push(titleRow);
        const applyPromise = callAsyncAction(manager, "applyDraft");
        assert.equal(manager.draftCs1Checking.value, true);
        recheck.resolve({ parse: { categories: [], text: CS1_OK_HTML } });
        await applyPromise;
        assert.equal(manager.draftCs1Checking.value, false);
        assert.ok(
            draft.rows.findIndex((row) => row.name === "title") <
                draft.rows.findIndex((row) => row.name === "url"),
        );
        assert.equal(harness.apiCallCount(), 2);
        assert.ok(harness.successMessages.includes("No CS1 issues found."));
        assert.ok(
            harness.successMessages.includes(
                "Citation changes applied: removed bad.",
            ),
        );

        callAction(manager, "saveDraft");
        assert.equal(harness.apiCallCount(), 2);
        callAction(manager, "cancelAllChanges");
        assert.equal(editor.read(), initialText);
        await Promise.resolve();
    } finally {
        harness.restore();
    }
});

function createDeferred<T>(): {
    promise: Promise<T>;
    resolve: (value: T) => void;
} {
    let resolve: (value: T) => void = () => {};
    const promise = new Promise<T>((complete) => {
        resolve = complete;
    });
    return { promise, resolve };
}

test("edits directives without discarding unknown tags", async () => {
    const harness = installSourceManagerHarness([]);
    try {
        const editor = createMemoryEditor(
            "<ref>{{cite web|title=Example<!-- !keep !no-author # Name -->}}" +
                "</ref>",
        );
        await openCitationFormatterDialog(editor);
        const manager = harness.getManager();
        const sourceId = manager.existingSources.value[0]?.id;
        assert.ok(sourceId);
        callAction(manager, "editListedSource", sourceId);
        const draft = manager.draft.value;
        assert.ok(draft);
        const titleIndex = draft.rows.findIndex((row) => row.name === "title");

        callAction(manager, "openParameterAliasDialog", titleIndex);
        assert.deepEqual(manager.parameterAliasDialogDirectives.value, [
            "!no-author",
        ]);
        manager.parameterAliasDialogDirectives.value = [
            "!no-date",
            "!no-part",
        ];
        callAction(manager, "applyParameterAlias");

        assert.equal(
            draft.rows[titleIndex]?.directive,
            "!no-date !no-part !keep",
        );
        callAction(manager, "close");
        await Promise.resolve();
    } finally {
        harness.restore();
    }
});

test("gates a new source with CS1 before consistency analysis", async () => {
    const harness = installSourceManagerHarness([
        { parse: { categories: [], text: CS1_ERROR_HTML } },
        { parse: { categories: [], text: CS1_OK_HTML } },
    ]);
    try {
        const editor = createMemoryEditor("Lead.");
        await openCitationFormatterDialog(editor);
        const manager = harness.getManager();
        callAction(manager, "createManualSource");
        const draft = manager.draft.value;
        assert.ok(draft);
        const title = draft.rows.find((row) => row.name === "title");
        assert.ok(title);
        title.value = "Example";

        await callAsyncAction(manager, "saveDraft");
        assert.equal(harness.apiCallCount(), 1);
        assert.equal(editor.read(), "Lead.");

        await callAsyncAction(manager, "saveDraft");
        assert.equal(harness.apiCallCount(), 2);
        assert.match(editor.read(), /<ref>\{\{Cite magazine/u);
        assert.equal(manager.toolPopup.value, "analysis");

        callAction(manager, "cancelAllChanges");
        assert.equal(editor.read(), "Lead.");
        await Promise.resolve();
    } finally {
        harness.restore();
    }
});

test("selects all consistency occurrences by default", async () => {
    const harness = installSourceManagerHarness([]);
    try {
        const editor = createMemoryEditor(
            '<ref name="A">{{cite web|url=https://example.com/a|' +
                "title=A|website=Example}}</ref>\n" +
                '<ref name="B">{{cite web|url=https://example.com/b|' +
                "title=B|website=EXAMPLE}}</ref>",
        );
        await openCitationFormatterDialog(editor);
        const manager = harness.getManager();
        callAction(manager, "openAnalysisTool");
        const finding = manager.sourceAnalysis.value.findings[0];
        assert.ok(finding);
        assert.ok(
            finding.occurrences.every((occurrence) => occurrence.selected),
        );

        for (const occurrence of finding.occurrences) {
            occurrence.selected = false;
        }
        callAction(manager, "selectAllAnalysisOccurrences", finding);
        assert.ok(
            finding.occurrences.every((occurrence) => occurrence.selected),
        );
        callAction(manager, "close");
        await Promise.resolve();
    } finally {
        harness.restore();
    }
});

function callAction(
    manager: MountedManager,
    name: string,
    argument?: unknown,
): void {
    const action = manager[name] as ((value?: unknown) => void) | undefined;
    assert.ok(action, `Missing ${name} action`);
    action(argument);
}

async function callAsyncAction(
    manager: MountedManager,
    name: string,
): Promise<void> {
    const action = manager[name] as (() => Promise<void>) | undefined;
    assert.ok(action, `Missing ${name} action`);
    await action();
}

function createMemoryEditor(initialText: string): editBox.EditBox {
    let text = initialText;
    return {
        element: null,
        focus() {},
        read() {
            return text;
        },
        replaceSelection(value) {
            text += value;
        },
        write(value) {
            text = value;
        },
    };
}

function installSourceManagerHarness(responses: unknown[]) {
    const globals = globalThis as unknown as Record<string, unknown>;
    const original = snapshotGlobals(globals, [
        "DOMParser",
        "document",
        "mw",
        "requestAnimationFrame",
    ]);
    const successMessages: string[] = [];
    let manager: MountedManager | null = null;
    let apiCalls = 0;
    const toast = createToastController(successMessages);
    const Vue = createVueModule((mounted) => {
        manager = mounted;
    });
    const Codex = createCodexComponents(toast);
    installBrowserGlobals(globals, Vue, Codex, responses, () => {
        apiCalls += 1;
        return apiCalls;
    });
    return {
        apiCallCount: () => apiCalls,
        getManager(): MountedManager {
            assert.ok(manager);
            return manager;
        },
        restore() {
            restoreGlobals(globals, original);
        },
        successMessages,
    };
}

function createVueModule(
    onMount: (manager: MountedManager) => void,
): VueModule {
    return {
        computed<T>(getter: () => T) {
            return {
                get value(): T {
                    return getter();
                },
            };
        },
        createMwApp(component: unknown) {
            return {
                component() {},
                directive() {},
                mount() {
                    const definition = component as {
                        setup: () => MountedManager;
                    };
                    onMount(definition.setup());
                },
                unmount() {},
            };
        },
        defineComponent(component: unknown) {
            return component;
        },
        ref<T>(value: T) {
            return { value };
        },
    };
}

function createCodexComponents(toast: ToastController): CodexComponents {
    return {
        CdxButton: null,
        CdxCard: null,
        CdxCheckbox: null,
        CdxCombobox: null,
        CdxDialog: null,
        CdxField: null,
        CdxIcon: null,
        CdxMessage: null,
        CdxProgressBar: null,
        CdxRadio: null,
        CdxSelect: null,
        CdxTab: null,
        CdxTable: null,
        CdxTabs: null,
        CdxTextArea: null,
        CdxTextInput: null,
        CdxToastContainer: null,
        CdxTooltip: null,
        useToast: () => toast,
    };
}

function createToastController(successMessages: string[]): ToastController {
    return {
        error() {},
        info() {},
        success(message) {
            successMessages.push(message);
        },
        warning() {},
    };
}

function installBrowserGlobals(
    globals: Record<string, unknown>,
    Vue: VueModule,
    Codex: CodexComponents,
    responses: unknown[],
    nextApiCall: () => number,
): void {
    const require = ((module: string) =>
        module === "vue" ? Vue : Codex) as ResourceLoaderRequire;
    globals.DOMParser = FakeDomParser;
    globals.document = createFakeDocument();
    globals.requestAnimationFrame = (callback: () => void) => {
        callback();
        return 0;
    };
    globals.mw = createMediaWikiGlobal(require, responses, nextApiCall);
}

function createMediaWikiGlobal(
    require: ResourceLoaderRequire,
    responses: unknown[],
    nextApiCall: () => number,
) {
    return {
        Api: class {
            public async post(): Promise<unknown> {
                const call = nextApiCall();
                return responses[call - 1];
            }
        },
        config: {
            get(name: string) {
                if (name === "wgDBname") {
                    return "enwiki";
                }
                if (name === "wgPageName") {
                    return "Example";
                }
                return "en";
            },
        },
        loader: {
            async using() {
                return require;
            },
        },
        util: { addCSS() {} },
    };
}

function createFakeDocument(): Document {
    const host = { id: "", remove() {} };
    return {
        createElement: () => host,
        documentElement: { append() {} },
        querySelector: () => null,
        querySelectorAll: () => [],
    } as unknown as Document;
}

class FakeDomParser {
    public parseFromString(markup: string): Document {
        return {
            getElementById(id: string) {
                const escaped = id.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
                const match = new RegExp(
                    `<div id="${escaped}">([\\s\\S]*?)</div>`,
                    "u",
                ).exec(markup);
                return match == null ? null : { innerHTML: match[1] };
            },
        } as unknown as Document;
    }
}

function snapshotGlobals(
    globals: Record<string, unknown>,
    names: string[],
): Map<string, unknown> {
    return new Map(names.map((name) => [name, globals[name]]));
}

function restoreGlobals(
    globals: Record<string, unknown>,
    original: Map<string, unknown>,
): void {
    for (const [name, value] of original) {
        if (value === undefined) {
            delete globals[name];
        } else {
            globals[name] = value;
        }
    }
}
