/** Integration tests for source-manager draft actions. */

import assert from "node:assert/strict";
import test from "node:test";

import type {
    SourceAnalysisCell,
    SourceAnalysisFindingCategory,
} from "citation-formatter/domain/source-analysis.ts";
import type {
    ExistingSource,
    SourceDraft,
} from "citation-formatter/domain/source-manager.ts";
// eslint-disable-next-line max-len
import type { CitationTemplateDataMap } from "citation-formatter/domain/types.ts";
import {
    createOpenCitationFormatterDialog,
    type SourceManagerOptions,
} from "citation-formatter/ui/source-manager.ts";
import {
    buildCs1CheckWikitext,
    requestCs1WikitextCheck,
    splitCs1CheckHtml,
} from "citation-formatter/infra/cs1-check.ts";
// eslint-disable-next-line max-len
import { createCs1ReviewWorkflow } from "citation-formatter/workflows/cs1-review.ts";
import type {
    CodexComponents,
    ResourceLoaderRequire,
    ToastController,
    VueModule,
} from "citation-formatter/ui/codex.ts";
import * as editBox from "@mediawiki-gadgets/shared/edit-box";
import * as templateNames from "citation-formatter/domain/templates.ts";
import { cdxIconMerge, type Icon } from "@wikimedia/codex-icons";

const executionTimerFinishes: string[] = [];
const executionTimerStarts: string[] = [];
const templateDataRequests: string[][] = [];
let templateDataResponse:
    CitationTemplateDataMap | Promise<CitationTemplateDataMap> = {};
const sourceManagerDependencies = {
    cs1Review: createCs1ReviewWorkflow({
        buildCheckWikitext: buildCs1CheckWikitext,
        requestCheck: requestCs1WikitextCheck,
        splitCheckHtml: splitCs1CheckHtml,
    }),
    async fetchAvailableArchive() {
        return null;
    },
    async loadCitationTemplateData(names: string[]) {
        templateDataRequests.push(names);
        return await templateDataResponse;
    },
    async loadTemplateNameContext() {
        return templateNames.DEFAULT_TEMPLATE_NAME_CONTEXT;
    },
    async resolveSourceMetadata(
        sourceInput: string,
        archiveSeed: { archiveDate: string; archiveUrl: string } | null,
    ) {
        return {
            archiveDate: archiveSeed?.archiveDate ?? "",
            archiveError: "",
            archiveUrl: archiveSeed?.archiveUrl ?? "",
            citeTemplate: `{{Cite web | url = ${sourceInput}}}`,
            metadataError: "",
            originalUrl: sourceInput,
        };
    },
    async resolveWikiLink(value: string) {
        return value;
    },
    startExecutionTimer(label: string) {
        executionTimerStarts.push(label);
        let finished = false;
        return function finishExecutionTimer() {
            if (!finished) {
                executionTimerFinishes.push(label);
                finished = true;
            }
        };
    },
};
const openCitationFormatterDialog = createOpenCitationFormatterDialog(
    sourceManagerDependencies,
);

test("loads MediaWiki API before resolving namespace siteinfo", async () => {
    const harness = installSourceManagerHarness([]);
    try {
        let loaderReady = false;
        const runtimeMw = globalThis.mw as unknown as {
            loader: { using(): Promise<ResourceLoaderRequire> };
        };
        const using = runtimeMw.loader.using.bind(runtimeMw.loader);
        runtimeMw.loader.using = async function loadModules() {
            const require = await using();
            loaderReady = true;
            return require;
        };
        const openWithSiteinfo = createOpenCitationFormatterDialog({
            ...sourceManagerDependencies,
            async loadTemplateNameContext() {
                assert.equal(loaderReady, true);
                return templateNames.DEFAULT_TEMPLATE_NAME_CONTEXT;
            },
        });

        await openWithSiteinfo(createMemoryEditor(""));
        assert.equal(loaderReady, true);
    } finally {
        harness.restore();
    }
});

interface MountedAnalysisFinding {
    category: SourceAnalysisFindingCategory;
    occurrences: Array<{ selected: boolean }>;
}

interface MountedAnalysisTab {
    appliedFindings: Array<{ finding: MountedAnalysisFinding }>;
    findings: MountedAnalysisFinding[];
    label: string;
    name: SourceAnalysisCell;
}

interface MountedManager extends Record<string, unknown> {
    activeAnalysisTab: { value: SourceAnalysisCell };
    activeLookupTab: { value: string };
    analysisTabs: { readonly value: MountedAnalysisTab[] };
    countSelectedAnalysisReplacements: () => number;
    cs1ToolSources: {
        value: Array<{
            severity: "error" | "maintenance";
            source: ExistingSource;
        }>;
    };
    cs1ToolStatus: {
        value: "checking" | "complete" | "idle" | "unavailable";
    };
    draft: { value: SourceDraft | null };
    draftCellErrors: {
        readonly value: Map<
            number,
            { alias?: string; name?: string; value?: string }
        >;
    };
    draftCs1Checking: { value: boolean };
    existingSources: { value: ExistingSource[] };
    formatArticleDisabled: { readonly value: boolean };
    formatScriptTitles: { value: boolean };
    getOpenableDraftUrl: (value: string) => string | null | undefined;
    isUrlDraftParameter: (name: string) => boolean;
    joinAuthorIcon: Icon;
    nonCs1Sources: { readonly value: ExistingSource[] };
    parameterAliasDialogDirectives: { value: string[] };
    splitAuthorIcon: Icon;
    sourceAnalysis: {
        value: {
            findings: MountedAnalysisFinding[];
        };
    };
    templateOptions: {
        readonly value: Array<{ label: string; value: string }>;
    };
    toolPopup: { value: string | null };
}

const CS1_ERROR_HTML = [
    '<div id="citation-formatter-cs1-check-0">',
    '<span class="cs1-visible-error citation-comment">',
    "Unknown parameter <code>&#124;bad=</code> ignored",
    "</span></div>",
].join("");
const CS1_COLLISION_ERROR_HTML = [
    '<div id="citation-formatter-cs1-check-0">',
    '<span class="cs1-visible-error citation-comment">',
    "Unknown parameter <code>&#124;magazine-a=</code> ignored",
    "</span></div>",
].join("");
const CS1_COLLISION_VALUE_ERROR_HTML = [
    CS1_COLLISION_ERROR_HTML,
    '<span class="cs1-visible-error citation-comment">',
    "Invalid value for parameter <code>&#124;magazine-a=</code>",
    "</span>",
].join("");
const CS1_UNSUPPORTED_PARAMETER_CATEGORIES = [
    { category: "CS1 errors: unsupported parameter" },
];
const CS1_OK_HTML = '<div id="citation-formatter-cs1-check-0">No issues</div>';
const CONSISTENCY_TEXT = [
    '<ref name="A">{{cite web|author=Jane Doe',
    "<!-- # Doe, Jane -->|title=A|url=https://example.test/a|",
    "website=Example}}</ref>",
    '<ref name="B">{{cite web|author=[[Jane Doe]]',
    "<!-- # Jane Doe -->|title=B|url=https://example.test/b|",
    "website=[[Example]]}}</ref>",
].join("\n");
const ALIAS_ONLY_CONSISTENCY_TEXT = [
    '<ref name="A">{{cite web|author=Jane Doe',
    "<!-- # Doe, Jane -->|title=A|url=https://one.test/a}}</ref>",
    '<ref name="B">{{cite web|author=Jane Doe',
    "<!-- # Jane Doe -->|title=B|url=https://two.test/b}}</ref>",
].join("\n");

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

test("rechecks the current article with checking progress", async () => {
    const recheck = createDeferred<unknown>();
    const harness = installSourceManagerHarness([
        { parse: { categories: [], text: CS1_ERROR_HTML } },
        recheck.promise,
    ]);
    try {
        const editor = createMemoryEditor(
            "<ref>{{cite web|title=Before|bad=value}}</ref>",
        );
        await openCitationFormatterDialog(editor);
        const manager = harness.getManager();
        await callAsyncAction(manager, "openCs1Tool");
        assert.equal(manager.cs1ToolSources.value[0]?.source.title, "Before");

        editor.write("<ref>{{cite web|title=After}}</ref>");
        const recheckPromise = callAsyncAction(manager, "recheckCs1Tool");
        assert.equal(manager.cs1ToolStatus.value, "checking");
        assert.equal(manager.existingSources.value[0]?.title, "After");
        assert.equal(harness.apiCallCount(), 2);
        await callAsyncAction(manager, "recheckCs1Tool");
        assert.equal(harness.apiCallCount(), 2);

        recheck.resolve({ parse: { categories: [], text: CS1_OK_HTML } });
        await recheckPromise;
        assert.equal(manager.cs1ToolStatus.value, "complete");
        assert.deepEqual(manager.cs1ToolSources.value, []);

        callAction(manager, "close");
        await Promise.resolve();
    } finally {
        harness.restore();
    }
});

test(
    "keeps CS1 errors before maintenance after apply and review sync",
    testCs1SeverityOrder,
);

// eslint-disable-next-line max-lines-per-function
async function testCs1SeverityOrder(): Promise<void> {
    const maintenanceA = '<span class="citation-comment">Maintenance A</span>';
    const errorB =
        '<span class="cs1-visible-error citation-comment">Error B</span>';
    const maintenanceC = '<span class="citation-comment">Maintenance C</span>';
    const batchHtml = [maintenanceA, errorB, maintenanceC]
        .map(
            (html, index) =>
                `<div id="citation-formatter-cs1-check-${index}">` +
                `${html}</div>`,
        )
        .join("");
    const recheckedA =
        '<div id="citation-formatter-cs1-check-0">' + `${maintenanceA}</div>`;
    const harness = installSourceManagerHarness([
        { parse: { categories: [], text: batchHtml } },
        { parse: { categories: [], text: recheckedA } },
    ]);
    try {
        const editor = createMemoryEditor(
            [
                "<ref>{{cite web|title=Maintenance A}}</ref>",
                "<ref>{{cite web|title=Error B}}</ref>",
                "<ref>{{cite web|title=Maintenance C}}</ref>",
            ].join("\n"),
        );
        await openCitationFormatterDialog(editor);
        const manager = harness.getManager();
        await callAsyncAction(manager, "openCs1Tool");
        assertCs1SourceOrder(manager, [
            ["Error B", "error"],
            ["Maintenance A", "maintenance"],
            ["Maintenance C", "maintenance"],
        ]);

        const maintenanceSource = manager.cs1ToolSources.value.find(
            (result) => result.source.title === "Maintenance A",
        )?.source;
        assert.ok(maintenanceSource);
        callAction(manager, "reviewCs1Source", maintenanceSource.id);
        await callAsyncAction(manager, "applyDraft");
        assertCs1SourceOrder(manager, [
            ["Error B", "error"],
            ["Maintenance A", "maintenance"],
            ["Maintenance C", "maintenance"],
        ]);

        await callAsyncAction(manager, "saveDraft");
        assertCs1SourceOrder(manager, [
            ["Error B", "error"],
            ["Maintenance C", "maintenance"],
        ]);
    } finally {
        harness.restore();
    }
}

test("edits Cite comic without sending it through live CS1", async () => {
    const harness = installSourceManagerHarness([]);
    try {
        const editor = createMemoryEditor(
            "<ref>{{cite comic|writer=Example|title=Issue}}</ref>",
        );
        await openCitationFormatterDialog(editor);
        const manager = harness.getManager();
        const source = manager.existingSources.value[0];
        assert.equal(source?.status, "metadata-free");
        assert.ok(source);
        assert.deepEqual(manager.nonCs1Sources.value, []);

        callAction(manager, "editListedSource", source.id);
        assert.equal(manager.draft.value?.template, "Cite comic");
        assert.equal(manager.templateOptions.value[0]?.value, "Cite comic");

        await callAsyncAction(manager, "openCs1Tool");
        assert.equal(harness.apiCallCount(), 0);
        assert.equal(manager.cs1ToolStatus.value, "complete");
    } finally {
        harness.restore();
    }
});

test("preserves position while formatting citations", async () => {
    const harness = installSourceManagerHarness([]);
    try {
        const beforeText = [
            "Lead.",
            "<ref>{{cite web|url=https://example.test|title=Example}}</ref>",
            "Tail.",
        ].join("\n");
        const textarea = createNativeTextarea(beforeText);
        const cursor = beforeText.indexOf("Tail.");
        textarea.selectionStart = cursor;
        textarea.selectionEnd = cursor;
        textarea.scrollLeft = 6;
        textarea.scrollTop = 240;
        const editor = editBox.createEditBox(textarea);

        await openCitationFormatterDialog(editor);
        const manager = harness.getManager();
        callAction(manager, "formatArticle");

        assert.notEqual(textarea.value, beforeText);
        assert.equal(textarea.selectionStart, cursor);
        assert.equal(textarea.selectionEnd, cursor);
        assert.equal(textarea.scrollLeft, 6);
        assert.equal(textarea.scrollTop, 240);
        assert.equal(manager.formatArticleDisabled.value, true);

        textarea.value += "\nChanged.";
        textarea.dispatchEvent(new Event("input"));
        assert.equal(manager.formatArticleDisabled.value, false);

        callAction(manager, "close");
        await Promise.resolve();
    } finally {
        harness.restore();
    }
});

test("summarizes one formatting attempt without switching tabs", async () => {
    const harness = installSourceManagerHarness([]);
    try {
        const beforeText =
            "<ref>{{cite web|url=https://example.test|title=Example}}</ref>";
        let writeCount = 0;
        const editor = createMemoryEditor(beforeText, () => {
            writeCount += 1;
        });

        await openCitationFormatterDialog(editor);
        const manager = harness.getManager();
        assert.equal(manager.activeLookupTab.value, "add");
        callAction(manager, "formatArticle");

        const formattedText = editor.read();
        assert.notEqual(formattedText, beforeText);
        assert.equal(writeCount, 1);
        assert.deepEqual(harness.successMessages, [
            "Formatted 1 citation; renamed 1 <ref> tag.",
        ]);
        assert.equal(manager.formatArticleDisabled.value, true);
        assert.equal(manager.activeLookupTab.value, "add");

        callAction(manager, "formatArticle");

        assert.equal(editor.read(), formattedText);
        assert.equal(writeCount, 1);
        assert.equal(harness.successMessages.length, 1);
        assert.deepEqual(harness.executionTimerStarts, ["format action"]);
        assert.deepEqual(harness.executionTimerFinishes, ["format action"]);

        callAction(manager, "setBlockCitations", true);
        assert.equal(manager.formatArticleDisabled.value, false);
        callAction(manager, "setBlockCitations", false);
        assert.equal(manager.formatArticleDisabled.value, true);
        callAction(manager, "close");
        await Promise.resolve();
    } finally {
        harness.restore();
    }
});

test("toggles script-title formatting between attempts", async () => {
    const harness = installSourceManagerHarness([]);
    try {
        const editor = createMemoryEditor(
            "<ref>{{cite web|script-title=en-US:TGS 2008|" +
                "language=en-US|url=https://example.test}}</ref>",
        );
        await openCitationFormatterDialog(editor);
        const manager = harness.getManager();

        assert.equal(manager.formatScriptTitles.value, true);
        callAction(manager, "setFormatScriptTitles", false);
        assert.equal(manager.formatScriptTitles.value, false);
        callAction(manager, "formatArticle");

        assert.match(editor.read(), /\| script-title = en-US:TGS 2008/u);
        assert.equal(manager.formatArticleDisabled.value, true);

        callAction(manager, "setFormatScriptTitles", true);
        assert.equal(manager.formatScriptTitles.value, true);
        assert.equal(manager.formatArticleDisabled.value, false);
        callAction(manager, "formatArticle");

        assert.match(editor.read(), /\| script-title = en:TGS 2008/u);
        assert.equal(manager.formatArticleDisabled.value, true);
        callAction(manager, "close");
        await Promise.resolve();
    } finally {
        harness.restore();
    }
});

test("summarizes skipped references once", async () => {
    const harness = installSourceManagerHarness([]);
    try {
        let writeCount = 0;
        const editor = createMemoryEditor("<ref>Plain text</ref>", () => {
            writeCount += 1;
        });

        await openCitationFormatterDialog(editor);
        const manager = harness.getManager();
        callAction(manager, "formatArticle");

        assert.equal(writeCount, 1);
        assert.deepEqual(harness.warningMessages, [
            "Formatted 0 citations; skipped 1 reference not in a supported " +
                "standard {{Cite …}} format; renamed 1 <ref> tag.",
        ]);
        assert.equal(manager.formatArticleDisabled.value, true);

        callAction(manager, "formatArticle");

        assert.equal(writeCount, 1);
        assert.equal(harness.warningMessages.length, 1);
        callAction(manager, "close");
        await Promise.resolve();
    } finally {
        harness.restore();
    }
});

test("warns while formatting deliberate repeated parameters", async () => {
    const harness = installSourceManagerHarness([]);
    try {
        const editor = createMemoryEditor(
            "<ref>{{cite journal|title=日本|language=ja|journal=J1|" +
                "journal=J2}}</ref>",
        );
        await openCitationFormatterDialog(editor);
        const manager = harness.getManager();

        callAction(manager, "formatArticle");

        assert.match(editor.read(), /\| journal = J1\s+\| journal-a = J2/u);
        assert.match(editor.read(), /\| script-title = ja:日本/u);
        assert.deepEqual(harness.warningMessages, [
            "Formatted 1 citation; renamed 1 <ref> tag. Also marked 1 " +
                "repeated parameter with an invalid suffix for CS1 review.",
        ]);
        assert.deepEqual(harness.successMessages, []);
        callAction(manager, "close");
        await Promise.resolve();
    } finally {
        harness.restore();
    }
});

const fanGuideTemplateData: CitationTemplateDataMap = {
    "Cite Fan Guide": {
        aliases: {
            issue: [],
            title: ["name"],
            writer: ["Writer"],
        },
        canonicalName: "Cite Fan Guide",
        paramOrder: ["title", "writer", "issue"],
    },
};

test(
    "formats unknown Cite templates " + "without reporting them as skipped",
    async () => {
        const harness = installSourceManagerHarness([], fanGuideTemplateData);
        try {
            const editor = createMemoryEditor(
                "Guide.<ref>{{cite Fan Guide|issue=|Writer=First|" +
                    "name=Guide}}</ref>",
            );

            await openCitationFormatterDialog(editor);
            const manager = harness.getManager();
            await callAsyncAction(manager, "formatArticle");

            assert.deepEqual(harness.warningMessages, []);
            assert.deepEqual(harness.successMessages, [
                "Formatted 1 citation; renamed 1 <ref> tag.",
            ]);
            assert.ok(
                editor
                    .read()
                    .includes(
                        "{{Cite Fan Guide | title = Guide | " +
                            "writer = First | issue = }}",
                    ),
            );
            assert.deepEqual(harness.templateDataRequests, [
                ["Cite Fan Guide"],
            ]);
            callAction(manager, "close");
            await Promise.resolve();
        } finally {
            harness.restore();
        }
    },
);

test(
    "guards repeated formatting " + "while generic TemplateData loads",
    async () => {
        const templateData = createDeferred<CitationTemplateDataMap>();
        const harness = installSourceManagerHarness([], templateData.promise);
        try {
            const editor = createMemoryEditor(
                "<ref>{{Cite fan guide|title=Example}}</ref>",
            );
            await openCitationFormatterDialog(editor);
            const manager = harness.getManager();
            const action = manager.formatArticle as () => Promise<void>;

            const first = action();
            const repeated = action();

            assert.equal(manager.formatArticleDisabled.value, true);
            assert.deepEqual(harness.templateDataRequests, [
                ["Cite fan guide"],
            ]);
            editor.replaceSelection(
                "\n<ref>{{Cite New Guide|title=New}}</ref>",
            );
            templateData.resolve({});
            await Promise.all([first, repeated]);

            assert.equal(harness.successMessages.length, 1);
            assert.ok(editor.read().includes("{{Cite New Guide"));
            assert.deepEqual(harness.templateDataRequests, [
                ["Cite fan guide"],
                ["Cite New Guide"],
            ]);
            assert.deepEqual(harness.executionTimerStarts, ["format action"]);
            assert.deepEqual(harness.executionTimerFinishes, [
                "format action",
            ]);
            callAction(manager, "close");
            await Promise.resolve();
        } finally {
            harness.restore();
        }
    },
);

test(
    "cancels a pending format action " + "when its dialog is replaced",
    async () => {
        const templateData = createDeferred<CitationTemplateDataMap>();
        const harness = installSourceManagerHarness([], templateData.promise);
        try {
            let firstWrites = 0;
            const firstEditor = createMemoryEditor(
                "<ref>{{Cite First Guide|title=First}}</ref>",
                () => {
                    firstWrites += 1;
                },
            );
            await openCitationFormatterDialog(firstEditor);
            const pending = callAsyncAction(
                harness.getManager(),
                "formatArticle",
            );

            const secondEditor = createMemoryEditor("Second editor.");
            await openCitationFormatterDialog(secondEditor);
            templateData.resolve({});
            await pending;

            assert.equal(firstWrites, 0);
            assert.equal(harness.successMessages.length, 0);
            callAction(harness.getManager(), "close");
            await Promise.resolve();
        } finally {
            harness.restore();
        }
    },
);

test("uses one neutral toast for an initially formatted article", async () => {
    const harness = installSourceManagerHarness([]);
    try {
        const editor = createMemoryEditor(
            "<ref>{{cite web|url=https://example.test|title=Example}}</ref>",
        );

        await openCitationFormatterDialog(editor);
        callAction(harness.getManager(), "formatArticle");
        callAction(harness.getManager(), "close");
        await Promise.resolve();
        harness.successMessages.length = 0;
        harness.warningMessages.length = 0;

        await openCitationFormatterDialog(editor);
        const manager = harness.getManager();
        callAction(manager, "formatArticle");

        assert.deepEqual(harness.infoMessages, [
            "No citation formatting changes were made.",
        ]);
        assert.deepEqual(harness.successMessages, []);
        assert.deepEqual(harness.warningMessages, []);
        assert.equal(manager.formatArticleDisabled.value, true);

        callAction(manager, "formatArticle");
        assert.equal(harness.infoMessages.length, 1);
        assert.deepEqual(harness.executionTimerStarts, [
            "format action",
            "format action",
        ]);
        assert.deepEqual(harness.executionTimerFinishes, [
            "format action",
            "format action",
        ]);
        callAction(manager, "close");
        await Promise.resolve();
    } finally {
        harness.restore();
    }
});

test("uses four-second toasts and clears them with the dialog", async () => {
    const harness = installSourceManagerHarness([]);
    try {
        const editor = createMemoryEditor(
            "<ref>{{cite web|url=https://example.test|" +
                "title=Example}}</ref>",
        );

        await openCitationFormatterDialog(editor);
        const manager = harness.getManager();
        callAction(manager, "formatArticle");

        assert.deepEqual(harness.toastAutoDismissValues, [4_000]);
        assert.deepEqual(harness.dismissedToastIds, []);

        await openCitationFormatterDialog(editor);

        assert.deepEqual(harness.dismissedToastIds, ["toast-0"]);

        const replacement = harness.getManager();
        callAction(replacement, "formatArticle");
        assert.deepEqual(harness.toastAutoDismissValues, [4_000, 4_000]);

        callAction(replacement, "close");
        await Promise.resolve();

        assert.deepEqual(harness.dismissedToastIds, ["toast-0", "toast-1"]);
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

function populateRepeatedMagazine(draft: SourceDraft): void {
    const title = draft.rows.find((row) => row.name === "title");
    const magazine = draft.rows.find((row) => row.name === "magazine");
    assert.ok(title);
    assert.ok(magazine);
    title.value = "Example";
    magazine.value = "First";
    draft.rows.push({
        alias: "",
        directive: "",
        main: false,
        name: "magazine",
        value: "Repeat",
    });
}

test("does not block a deliberate repeated-parameter CS1 report", async () => {
    const harness = installSourceManagerHarness([
        {
            parse: {
                categories: CS1_UNSUPPORTED_PARAMETER_CATEGORIES,
                text: CS1_COLLISION_ERROR_HTML,
            },
        },
    ]);
    try {
        const editor = createMemoryEditor("Lead.");
        await openCitationFormatterDialog(editor);
        const manager = harness.getManager();
        callAction(manager, "createManualSource");
        const draft = manager.draft.value;
        assert.ok(draft);
        populateRepeatedMagazine(draft);
        callAction(manager, "sortParameters");

        await callAsyncAction(manager, "saveDraft");

        assert.equal(harness.apiCallCount(), 1);
        assert.match(
            editor.read(),
            /\| magazine = First\s+\| magazine-a = Repeat/u,
        );
        assert.deepEqual(harness.warningMessages, [
            "Repeated or equivalent parameters: magazine. The first value " +
                "stays active; later values receive -a, -b, … suffixes so " +
                "CS1 flags them.",
        ]);
        assert.deepEqual(harness.successMessages, [
            "Citation parameters sorted.",
            "Citation source saved.",
        ]);
        callAction(manager, "cancelAllChanges");
        await Promise.resolve();
    } finally {
        harness.restore();
    }
});

test("keeps unrelated marker diagnostics blocking", async () => {
    const harness = installSourceManagerHarness([
        {
            parse: {
                categories: CS1_UNSUPPORTED_PARAMETER_CATEGORIES,
                text: CS1_COLLISION_VALUE_ERROR_HTML,
            },
        },
    ]);
    try {
        const editor = createMemoryEditor("Lead.");
        await openCitationFormatterDialog(editor);
        const manager = harness.getManager();
        callAction(manager, "createManualSource");
        const draft = manager.draft.value;
        assert.ok(draft);
        populateRepeatedMagazine(draft);
        callAction(manager, "sortParameters");

        await callAsyncAction(manager, "saveDraft");

        assert.equal(harness.apiCallCount(), 1);
        assert.equal(editor.read(), "Lead.");
        const messages = [...manager.draftCellErrors.value.values()].flatMap(
            (errors) => Object.values(errors),
        );
        assert.equal(
            messages.some((message) => message?.includes("Invalid value")),
            true,
        );
        callAction(manager, "close");
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

test(
    "groups consistency changes into scoped value and alias tabs",
    testScopedConsistencyTabs,
);

test("opens alias-only results on their populated tab", async () => {
    const harness = installSourceManagerHarness([]);
    try {
        const editor = createMemoryEditor(ALIAS_ONLY_CONSISTENCY_TEXT);
        await openCitationFormatterDialog(editor);
        const manager = harness.getManager();
        callAction(manager, "openAnalysisTool");

        assert.equal(manager.activeAnalysisTab.value, "alias");
        assert.deepEqual(manager.analysisTabs.value[0]?.findings, []);
        assert.ok((manager.analysisTabs.value[1]?.findings.length ?? 0) > 0);

        callAction(manager, "close");
        await Promise.resolve();
    } finally {
        harness.restore();
    }
});

async function testScopedConsistencyTabs(): Promise<void> {
    const harness = installSourceManagerHarness([]);
    try {
        const editor = createMemoryEditor(CONSISTENCY_TEXT);
        await openCitationFormatterDialog(editor);
        const manager = harness.getManager();
        callAction(manager, "openAnalysisTool");
        assertAnalysisTabGroups(manager);

        assert.equal(manager.countSelectedAnalysisReplacements(), 2);
        manager.activeAnalysisTab.value = "alias";
        assert.equal(manager.countSelectedAnalysisReplacements(), 1);
        callAction(manager, "applyAnalysisReplacements");
        assertScopedAliasApplication(manager, editor);

        callAction(manager, "cancelAllChanges");
        assert.equal(editor.read(), CONSISTENCY_TEXT);
        await Promise.resolve();
    } finally {
        harness.restore();
    }
}

test("exposes safe openable links for URL draft parameters", async () => {
    const harness = installSourceManagerHarness([]);
    try {
        const editor = createMemoryEditor("");
        await openCitationFormatterDialog(editor);
        const manager = harness.getManager();
        assertUrlDraftParameterRecognition(manager);
        assertOpenableDraftUrlSafety(manager);

        callAction(manager, "close");
        await Promise.resolve();
    } finally {
        harness.restore();
    }
});

test("uses the merge glyph for author join and split actions", async () => {
    const harness = installSourceManagerHarness([]);
    try {
        const editor = createMemoryEditor("");
        await openCitationFormatterDialog(editor);
        const manager = harness.getManager();

        assert.equal(manager.joinAuthorIcon, cdxIconMerge);
        assert.equal(manager.splitAuthorIcon, cdxIconMerge);

        callAction(manager, "close");
        await Promise.resolve();
    } finally {
        harness.restore();
    }
});

function assertAnalysisTabGroups(manager: MountedManager): void {
    assert.equal(manager.activeAnalysisTab.value, "value");
    const [valueTab, aliasTab] = manager.analysisTabs.value;
    assert.ok(valueTab);
    assert.ok(aliasTab);
    assert.deepEqual(
        manager.analysisTabs.value.map((tab) => tab.name),
        ["value", "alias"],
    );
    assert.ok(valueTab.label.length > 0);
    assert.ok(aliasTab.label.length > 0);
    assert.notEqual(valueTab.label, aliasTab.label);
    assert.ok(valueTab.findings.length > 0);
    assert.ok(
        valueTab.findings.every((finding) => finding.category !== "alias"),
    );
    assert.ok(aliasTab.findings.length > 0);
    assert.ok(
        aliasTab.findings.every((finding) => finding.category === "alias"),
    );
    assert.deepEqual(valueTab.appliedFindings, []);
    assert.deepEqual(aliasTab.appliedFindings, []);
}

function assertScopedAliasApplication(
    manager: MountedManager,
    editor: editBox.EditBox,
): void {
    assert.match(editor.read(), /website\s*=\s*\[\[Example\]\]/u);
    assert.match(editor.read(), /author\s*=\s*\[\[Jane Doe\]\]/u);
    assert.match(
        editor.read(),
        /author\s*=\s*\[\[Jane Doe\]\]\s*<!-- # Doe, Jane -->/u,
    );
    const refreshedTabs = manager.analysisTabs.value;
    assert.equal(refreshedTabs[0]?.appliedFindings.length, 0);
    assert.equal(refreshedTabs[1]?.appliedFindings.length, 1);
    assert.ok((refreshedTabs[0]?.findings.length ?? 0) > 0);
}

function assertUrlDraftParameterRecognition(manager: MountedManager): void {
    for (const parameter of [
        "url",
        " URL ",
        "archive-url",
        "archiveurl",
        "chapter-url",
        "conference-url",
        "conferenceurl",
        "contribution-url",
        "contributionurl",
        "eventurl",
        "layurl",
        "link",
        "mapurl",
        "section-url",
        "sectionurl",
        "transcript-url",
        "transcripturl",
    ]) {
        assert.equal(manager.isUrlDraftParameter(parameter), true);
    }
    for (const parameter of [
        "dead-url",
        "deadurl",
        "title",
        "url-access",
        "url-status",
        "urlaccess",
        "urlstatus",
        "website",
    ]) {
        assert.equal(manager.isUrlDraftParameter(parameter), false);
    }
}

function assertOpenableDraftUrlSafety(manager: MountedManager): void {
    const url = "https://example.test/path?q=value#section";
    assert.equal(manager.getOpenableDraftUrl(` ${url} `), url);
    const archiveUrl =
        "https://web.archive.org/web/20240203040506/" +
        "https://example.test/path";
    assert.equal(manager.getOpenableDraftUrl(archiveUrl), archiveUrl);
    for (const value of [
        "",
        "/relative",
        "not a URL",
        "data:text/html,unsafe",
        "javascript:alert(1)",
    ]) {
        assert.ok(!manager.getOpenableDraftUrl(value));
    }
}

function assertCs1SourceOrder(
    manager: MountedManager,
    expected: Array<[title: string, severity: "error" | "maintenance"]>,
): void {
    assert.deepEqual(
        manager.cs1ToolSources.value.map((result) => [
            result.source.title,
            result.severity,
        ]),
        expected,
    );
}

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

function createMemoryEditor(
    initialText: string,
    onWrite?: () => void,
): editBox.EditBox {
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
            onWrite?.();
            text = value;
        },
    };
}

function createNativeTextarea(value: string): HTMLTextAreaElement {
    const textarea = new EventTarget() as HTMLTextAreaElement;
    textarea.value = value;
    textarea.selectionDirection = "none";
    textarea.selectionEnd = 0;
    textarea.selectionStart = 0;
    textarea.scrollLeft = 0;
    textarea.scrollTop = 0;
    textarea.setSelectionRange = (start, end, direction) => {
        textarea.selectionStart = start ?? 0;
        textarea.selectionEnd = end ?? textarea.selectionStart;
        textarea.selectionDirection = direction ?? "none";
    };
    return textarea;
}

function installSourceManagerHarness(
    responses: unknown[],
    runtimeTemplateData:
        CitationTemplateDataMap | Promise<CitationTemplateDataMap> = {},
) {
    resetSourceManagerHarness(runtimeTemplateData);
    const globals = globalThis as unknown as Record<string, unknown>;
    const original = snapshotGlobals(globals, [
        "DOMParser",
        "document",
        "mw",
        "requestAnimationFrame",
    ]);
    const toastHarness = createToastHarness();
    let manager: MountedManager | null = null;
    let apiCalls = 0;
    const Vue = createVueModule((mounted) => {
        manager = mounted;
    });
    const Codex = createCodexComponents(toastHarness.toast);
    installBrowserGlobals(globals, Vue, Codex, responses, () => {
        apiCalls += 1;
        return apiCalls;
    });
    return {
        apiCallCount: () => apiCalls,
        executionTimerFinishes,
        executionTimerStarts,
        getManager(): MountedManager {
            assert.ok(manager);
            return manager;
        },
        restore() {
            restoreGlobals(globals, original);
        },
        templateDataRequests,
        ...toastHarness,
    };
}

function resetSourceManagerHarness(
    runtimeTemplateData:
        CitationTemplateDataMap | Promise<CitationTemplateDataMap>,
): void {
    executionTimerFinishes.length = 0;
    executionTimerStarts.length = 0;
    templateDataRequests.length = 0;
    templateDataResponse = runtimeTemplateData;
}

function createToastHarness() {
    const dismissedToastIds: string[] = [];
    const infoMessages: string[] = [];
    const successMessages: string[] = [];
    const toastAutoDismissValues: Array<boolean | number | undefined> = [];
    const warningMessages: string[] = [];
    return {
        dismissedToastIds,
        infoMessages,
        successMessages,
        toast: createToastController(
            infoMessages,
            successMessages,
            warningMessages,
            toastAutoDismissValues,
            dismissedToastIds,
        ),
        toastAutoDismissValues,
        warningMessages,
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
        useToast: () => toast,
    };
}

function createToastController(
    infoMessages: string[],
    successMessages: string[],
    warningMessages: string[],
    autoDismissValues: Array<boolean | number | undefined>,
    dismissedToastIds: string[],
): ToastController {
    let nextToastId = 0;
    const track = function track(
        autoDismiss: boolean | number | undefined,
    ): string {
        autoDismissValues.push(autoDismiss);
        return `toast-${nextToastId++}`;
    };
    return {
        clear() {},
        dismiss(id) {
            dismissedToastIds.push(id);
        },
        error(_message, options) {
            return track(options?.autoDismiss);
        },
        info(message, options) {
            infoMessages.push(message);
            return track(options?.autoDismiss);
        },
        success(message, options) {
            successMessages.push(message);
            return track(options?.autoDismiss);
        },
        warning(message, options) {
            warningMessages.push(message);
            return track(options?.autoDismiss);
        },
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
                return undefined;
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
