/**
 * Tests create-vg-stub dialog behavior.
 */

import assert from "node:assert/strict";
import test, { afterEach, beforeEach } from "node:test";

import {
    createDialogComponent,
    createPreSaveGroups,
} from "../src/interface/form/index.js";

const originalWindow = globalThis.window;
const originalMw = globalThis.mw;
beforeEach(() => {
    globalThis.window = {};
});

afterEach(() => {
    globalThis.window = originalWindow;
    globalThis.mw = originalMw;
    delete globalThis.__CREATE_VG_STUB_FIELD_DATA__;
});

test("moved editing sessions open the refilled form automatically", () => {
    let activationCount = 0;
    const component = createDialogComponent(
        createVueStub(),
        createOptionsStub({
            initialForm: {
                name: "中文名",
            },
            initialOpen: true,
            onActivate() {
                activationCount += 1;
            },
        }),
    );
    const { form, open } = component.setup();

    assert.equal(open.value, true);
    assert.equal(form.name, "中文名");
    assert.equal(activationCount, 1);
});

test("activation from enwiki opens and looks up the source title", async () => {
    const calls = [];
    const component = createDialogComponent(
        createVueStub(),
        createOptionsStub({
            initialEnwikiLookup: true,
            initialForm: {
                enwikiTitle: "Example Game (video game)",
            },
            initialOpen: true,
            async onEnwikiTitleChange(title) {
                calls.push(title);

                return {
                    title,
                    wikidataId: "Q123",
                };
            },
        }),
    );
    const { form, open } = component.setup();

    await Promise.resolve();

    assert.equal(open.value, true);
    assert.equal(form.enwikiTitle, "Example Game (video game)");
    assert.equal(form.wikidataId, "Q123");
    assert.deepEqual(calls, ["Example Game (video game)"]);
});

test("opening the tool activates submit handling", () => {
    let activationCount = 0;
    const component = createDialogComponent(
        createVueStub(),
        createOptionsStub({
            onActivate() {
                activationCount += 1;
            },
        }),
    );
    const { open } = component.setup();

    assert.equal(activationCount, 0);
    assert.equal(open.value, false);

    window.createVgStubDialog.open();

    assert.equal(activationCount, 1);
    assert.equal(open.value, true);
});

test("main dialog title includes the current page title", () => {
    const component = createDialogComponent(
        createVueStub(),
        createOptionsStub({
            currentTitle: "Example Game",
        }),
    );

    component.setup();

    assert.equal(
        component.template.includes('v-bind:title="getDialogTitle()"'),
        true,
    );
    assert.equal(
        component.methods.getDialogTitle(),
        "Create a stub for Example Game",
    );
});

test("history JSON can be copied, edited, and imported", async () => {
    const entry = {
        data: {
            input: {
                name: "Stored name",
                year: "2025",
            },
            patches: {},
            version: 1,
        },
        id: 1,
        metadata: {
            page: "Stored page",
            savedAt: "2026-06-13",
        },
    };
    const component = createDialogComponent(
        createVueStub(),
        createOptionsStub({
            getHistoryEntries() {
                return [entry];
            },
        }),
    );
    const {
        form,
        historyJsonEditable,
        historyJsonError,
        historyJsonOpen,
        historyJsonText,
        historyOpen,
    } = component.setup();

    component.methods.openHistoryDialog();
    component.methods.openHistoryJsonDialog(entry);

    assert.equal(historyJsonOpen.value, true);
    assert.equal(historyJsonEditable.value, false);
    assert.deepEqual(JSON.parse(historyJsonText.value), entry);
    assert.equal(
        component.template.includes("create-vg-stub-history-json-text"),
        true,
    );

    historyJsonText.value = JSON.stringify({
        data: {
            input: {
                name: "Imported name",
                year: "2026",
            },
            patches: {},
            version: 1,
        },
        metadata: {
            page: "Imported page",
            savedAt: "2026-06-28",
        },
        id: 2,
    });
    await component.methods.importHistoryJson();

    assert.equal(form.name, "Imported name");
    assert.equal(form.year, "2026");
    assert.equal(historyJsonError.value, "");
    assert.equal(historyJsonOpen.value, false);
    assert.equal(historyOpen.value, false);
    assert.equal(
        component.template.indexOf(">Load<") <
            component.template.indexOf(">Import<"),
        true,
    );
});

test("temporary history JSON remains editable", () => {
    const entry = {
        data: {
            input: {
                name: "Draft name",
            },
            patches: {},
            version: 1,
        },
        id: 0,
        metadata: {
            page: "Draft name",
            savedAt: "2026-06-28",
            temporary: true,
        },
    };
    const component = createDialogComponent(
        createVueStub(),
        createOptionsStub(),
    );
    const { historyJsonEditable } = component.setup();

    component.methods.openHistoryJsonDialog(entry);

    assert.equal(historyJsonEditable.value, true);
    assert.equal(
        component.methods.formatHistoryEntryPage(entry),
        "Draft name (temporary draft)",
    );
});

test("invalid history JSON stays open and preserves the form", async () => {
    const component = createDialogComponent(
        createVueStub(),
        createOptionsStub(),
    );
    const { form, historyJsonError, historyJsonOpen, historyJsonText } =
        component.setup();

    component.methods.openHistoryJsonDialog({
        form: {
            name: "Stored name",
        },
    });
    historyJsonText.value = "{";
    await component.methods.importHistoryJson();

    assert.equal(form.name, "");
    assert.equal(historyJsonOpen.value, true);
    assert.notEqual(historyJsonError.value, "");
});

test("old-shape history JSON is rejected", async () => {
    const component = createDialogComponent(
        createVueStub(),
        createOptionsStub(),
    );
    const { form, historyJsonError, historyJsonOpen, historyJsonText } =
        component.setup();

    component.methods.openHistoryJsonDialog({
        form: {
            name: "Stored name",
        },
    });
    await component.methods.importHistoryJson();

    assert.equal(form.name, "");
    assert.equal(historyJsonOpen.value, true);
    assert.equal(
        historyJsonError.value,
        "Paste history data exported by this tool.",
    );
    assert.equal(JSON.parse(historyJsonText.value).form.name, "Stored name");
});

test("structured history JSON regenerates rows and applies patches", async () => {
    const component = createDialogComponent(
        createVueStub(),
        createOptionsStub({
            async onPrepareCitations() {
                return [
                    {
                        generatedParams: [
                            {
                                name: "title",
                                value: "Generated title",
                            },
                            {
                                name: "language",
                                value: "en",
                            },
                            {
                                name: "website",
                                value: "Generated site",
                            },
                        ],
                        index: 1,
                        params: [
                            {
                                name: "title",
                                value: "Generated title",
                            },
                            {
                                name: "language",
                                value: "en",
                            },
                            {
                                name: "website",
                                value: "Generated site",
                            },
                        ],
                        sourceUrl: "https://example.test/source",
                        template: "cite web",
                    },
                ];
            },
            onCategoryRowsRefresh(form) {
                form.categoryRows.splice(0, form.categoryRows.length, {
                    category: "Generated games",
                    originalCategory: "Generated games",
                    source: "company",
                    stubTag: "vg-stub",
                    stubTagEnabled: true,
                });
            },
        }),
    );
    const { form, historyJsonOpen, historyJsonText } = component.setup();

    component.methods.openHistoryJsonDialog({
        data: {
            input: {
                developers: "Example Studio",
                developersSourceUrl: "https://example.test/source",
                name: "Imported name",
            },
            patches: {
                categories: [
                    {
                        category: "Patched games",
                        source: {
                            category: "Generated games",
                        },
                    },
                ],
                citations: [
                    {
                        sourceUrl: "https://example.test/source",
                        params: [
                            {
                                name: "language",
                                value: "zh-Hans",
                            },
                            {
                                name: "website",
                                value: null,
                            },
                        ],
                    },
                ],
            },
            version: 1,
        },
        metadata: {
            page: "Imported name",
            savedAt: "2026-06-28",
        },
        id: 3,
    });
    await component.methods.importHistoryJson();

    assert.equal(form.name, "Imported name");
    assert.equal(form.developers, "Example Studio");
    assert.equal(form.categoryRows[0].category, "Patched games");
    assert.equal(form.categoryRows[0].source, "company");
    assert.equal(form.citationRows[0].modified, true);
    assert.equal(
        form.citationRows[0].sourceUrl,
        "https://example.test/source",
    );
    assert.equal(
        form.citationRows[0].params.find((param) => param.name === "title")
            .value,
        "Generated title",
    );
    assert.equal(
        form.citationRows[0].params.find((param) => param.name === "language")
            .value,
        "zh-Hans",
    );
    assert.equal(
        form.citationRows[0].params.some((param) => param.name === "website"),
        false,
    );
    assert.equal(historyJsonOpen.value, false);
    assert.equal(JSON.parse(historyJsonText.value).data.version, 1);
});

test("live field updates trim values and normalize full dates to years", () => {
    const component = createDialogComponent(
        createVueStub(),
        createOptionsStub(),
    );
    const { form } = component.setup();

    assert.equal(form.name, "");

    component.methods.updateFieldValue({ key: "year" }, " May 2023 ");
    assert.equal(form.year, "2023");

    component.methods.updateFieldValue({ key: "year" }, " 5 February 2015 ");
    assert.equal(form.year, "2015");

    component.methods.updateFieldValue(
        { key: "pageName" },
        "Example (video game)",
    );
    assert.equal(form.pageName, "Example (video game)");
    assert.equal(form.name, "");
    assert.equal(
        component.methods.getDialogTitle(),
        "Create a stub for Example (video game)",
    );

    component.methods.updateFieldValue({ key: "englishName" }, " Example ");
    assert.equal(form.englishName, "Example");
});

test("live multi-item updates preserve standalone and", () => {
    const component = createDialogComponent(
        createVueStub(),
        createOptionsStub(),
    );
    const { form } = component.setup();

    component.methods.updateFieldValue({ key: "genres" }, " Hack and slash ");
    assert.equal(form.genres, "Hack and slash");

    component.methods.updateFieldValue(
        { key: "genres" },
        "Action, adventure, and puzzle",
    );
    assert.equal(form.genres, "Action, adventure, and puzzle");

    component.methods.updateFieldValue(
        { key: "developers" },
        "Foo Studio and Bar Studio",
    );
    assert.equal(form.developers, "Foo Studio and Bar Studio");

    component.methods.updateFieldValue(
        { key: "developers" },
        "Tom, Jerry and Mary; Spike Studio",
    );
    assert.equal(form.developers, "Tom, Jerry and Mary; Spike Studio");
});

test("metadata fields complete wiki-link brackets around list items", () => {
    const component = createDialogComponent(
        createVueStub(),
        createOptionsStub(),
    );
    const { form } = component.setup();

    form.series = "最终幻想系列; 节奏剧场系列";
    component.methods.updateFieldValue(
        { key: "series" },
        "最终幻想系列; 节奏剧场系列]]",
    );
    assert.equal(form.series, "最终幻想系列; [[节奏剧场系列]]");

    form.series = "最终幻想系列; 节奏剧场系列";
    component.methods.updateFieldValue(
        { key: "series" },
        "最终幻想系列; [[节奏剧场系列",
    );
    assert.equal(form.series, "最终幻想系列; [[节奏剧场系列]]");

    form.developers = "Halfbrick Studios]";
    component.methods.updateFieldValue(
        { key: "developers" },
        "Halfbrick Studios]]",
    );
    assert.equal(form.developers, "[[Halfbrick Studios]]");

    form.developers = "Halfbrick Studios]";
    component.methods.updateFieldValue(
        { key: "developers" },
        "Halfbrick Studios] ",
    );
    assert.equal(form.developers, "Halfbrick Studios]");

    form.developers = "[";
    component.methods.updateFieldValue(
        { key: "developers" },
        "[[Halfbrick Studios",
    );
    assert.equal(form.developers, "[[Halfbrick Studios]]");

    form.englishName = "Example";
    component.methods.updateFieldValue({ key: "englishName" }, "Example]]");
    assert.equal(form.englishName, "Example]]");
});

test("live source and name row updates trim values", () => {
    const component = createDialogComponent(
        createVueStub(),
        createOptionsStub(),
    );
    const { form, moveTarget } = component.setup();

    assert.equal(component.methods.canMovePageName(), false);

    component.methods.updateSourceValue(
        { sourceKey: "yearSourceUrl" },
        " https://example.test ",
    );
    component.methods.updateNameRowValue(
        "localizedNames",
        0,
        "name",
        " 簡体名 ",
    );
    component.methods.updateMoveTarget(" Target page ");

    assert.equal(form.yearSourceUrl, "https://example.test");
    assert.equal(form.localizedNames[0].name, "簡体名");
    assert.equal(moveTarget.value, "Target page");
    component.methods.updateFieldValue({ key: "pageName" }, "Target page");
    assert.equal(component.methods.canMovePageName(), true);
    component.methods.openMoveDialog();
    assert.equal(moveTarget.value, "Target page");
});

test("source-backed field URL values move to the source field", () => {
    const component = createDialogComponent(
        createVueStub(),
        createOptionsStub(),
    );
    const { form } = component.setup();
    const field = {
        key: "developers",
        sourceField: {
            sourceKey: "developersSourceUrl",
        },
    };

    component.methods.updateFieldValue(field, " https://example.test/dev ");

    assert.equal(form.developers, "");
    assert.equal(form.developersSourceUrl, "https://example.test/dev");

    component.methods.updateFieldValue(field, "http://example.test/second");

    assert.equal(form.developers, "");
    assert.equal(
        form.developersSourceUrl,
        "https://example.test/dev\nhttp://example.test/second",
    );
});

test("page-name move dialog checks whether the target page exists", async () => {
    let checkedTitle = "";
    const component = createDialogComponent(
        createVueStub(),
        createOptionsStub({
            async onCheckPageTitle(title) {
                checkedTitle = title;
                return {
                    exists: title === "Existing page",
                    title,
                };
            },
        }),
    );
    const { form, moveTarget, moveTargetState } = component.setup();

    component.methods.updateFieldValue({ key: "pageName" }, "Existing page");
    component.methods.openMoveDialog();
    await component.methods.checkMoveTarget();

    assert.equal(moveTarget.value, "Existing page");
    assert.equal(checkedTitle, "Existing page");
    assert.equal(moveTargetState.exists, true);
    assert.equal(moveTargetState.checkedTitle, "Existing page");
    assert.equal(form.name, "");
    assert.equal(component.template.includes("moveTargetState.exists"), true);
    assert.equal(
        component.template.includes('v-on:blur="checkMoveTarget"'),
        false,
    );
});

test("move dialog confirms changed target in one action", async () => {
    let checkedTitle = "";
    let movedTitle = "";
    const component = createDialogComponent(
        createVueStub(),
        createOptionsStub({
            async onCheckPageTitle(title) {
                checkedTitle = title;
                return {
                    exists: false,
                    title,
                };
            },
            onMoveTarget(form, title) {
                movedTitle = title;
            },
        }),
    );
    const { form, moveTargetState } = component.setup();

    component.methods.openMoveDialog();
    component.methods.updateMoveTarget(" Target page ");
    await component.methods.submitMoveTarget();

    assert.equal(checkedTitle, "Target page");
    assert.equal(movedTitle, "Target page");
    assert.equal(form.pageName, "Target page");
    assert.equal(moveTargetState.loading, false);
});

test("References tab manages editable citation parameters", async () => {
    globalThis.__CREATE_VG_STUB_FIELD_DATA__ = {
        "citation-template": {
            aliases: {
                "access-date": ["accessdate"],
                url: ["URL"],
            },
            paramOrder: ["url", "title", "date", "access-date"],
        },
    };

    const citationPrepareCalls = [];
    const component = createDialogComponent(
        createVueStub(),
        createOptionsStub({
            async onPrepareCitations(_form, options = {}) {
                citationPrepareCalls.push(options);
                const refetched =
                    options.refetchSourceUrls?.[0] ===
                    "https://example.test/source";

                return [
                    {
                        generatedParams: [
                            {
                                name: "title",
                                value: refetched
                                    ? "Refetched title"
                                    : "Generated title",
                            },
                            {
                                name: "url",
                                value: "https://example.test/source",
                            },
                        ],
                        index: 1,
                        params: [
                            {
                                name: "title",
                                value: "Generated title",
                            },
                            {
                                name: "url",
                                value: "https://example.test/source",
                            },
                        ],
                        sourceUrl: "https://example.test/source",
                        template: "cite web",
                    },
                ];
            },
            onPreview() {
                return {
                    html: "",
                    summary: "",
                    text: "Generated text",
                };
            },
        }),
    );
    const {
        activeCitationTab,
        citationTableColumns,
        form,
        getCitationParamRows,
        groups,
    } = component.setup();

    form.yearSourceUrl = "https://example.test/source";
    await component.methods.submitForm();

    assert.deepEqual(
        form.citationRows[0].params.map((param) => param.name),
        ["url", "title"],
    );
    assert.deepEqual(getCitationParamRows(form.citationRows[0]).at(-1), {
        name: "",
        value: "",
    });

    component.methods.updateCitationParam(0, 2, "name", "accessdate");
    component.methods.updateCitationParam(0, 2, "value", "2026-06-27");
    component.methods.sortCitation(0);

    assert.deepEqual(
        form.citationRows[0].params.map((param) => param.name),
        ["url", "title", "accessdate"],
    );

    component.methods.updateCitationParam(0, 1, "value", "Edited title");
    component.methods.resetCitationParam(0, 1);
    assert.equal(
        form.citationRows[0].params.find((param) => param.name === "title")
            .value,
        "Generated title",
    );

    component.methods.removeCitationParam(0, 1);
    assert.deepEqual(
        form.citationRows[0].params.map((param) => param.name),
        ["url", "accessdate"],
    );

    component.methods.resetCitation(0);
    assert.deepEqual(
        form.citationRows[0].params.map((param) => param.name),
        ["url", "title"],
    );
    assert.equal(form.citationRows[0].modified, false);
    component.methods.updateCitationParam(0, 1, "value", "Edited again");
    await component.methods.refetchCitation(0);
    assert.equal(
        citationPrepareCalls.at(-1).refetchSourceUrls[0],
        "https://example.test/source",
    );
    assert.deepEqual(
        form.citationRows[0].params.map((param) => [param.name, param.value]),
        [
            ["url", "https://example.test/source"],
            ["title", "Refetched title"],
        ],
    );
    assert.equal(form.citationRows[0].modified, false);
    assert.deepEqual(groups.map((group) => group.label).slice(-2), [
        "References",
        "Checks",
    ]);
    assert.equal(
        component.template.includes(
            'v-bind:caption="getCitationTabLabel(citation)"',
        ),
        true,
    );
    assert.equal(
        component.template.includes(
            'v-bind:label="getCitationTabLabel(citation)"',
        ),
        true,
    );
    assert.equal(
        component.template.includes('v-model:active="activeCitationTab"'),
        true,
    );
    assert.equal(
        component.template.includes(
            'v-bind:key="getCitationTabsKey(form.citationRows)"',
        ),
        true,
    );
    assert.equal(activeCitationTab.value, "citation-1");
    assert.equal(citationTableColumns[0].width, undefined);
    assert.equal(component.template.includes("<strong>Reference"), false);
    assert.equal(component.template.includes("Re-fetch"), true);
    assert.equal(component.template.includes("Remove empty rows"), true);
    assert.equal(component.template.includes("Add parameter"), true);
    assert.equal(component.template.includes("resetCitationParam"), true);
});

test("additional prose uses a textarea and source URL field", () => {
    const component = createDialogComponent(
        createVueStub(),
        createOptionsStub(),
    );
    const { form, getArticleField, groups } = component.setup();
    const field = getArticleField("additionalProse");

    assert.equal(form.additionalProse, "");
    assert.equal(form.additionalProseSourceUrl, "");
    assert.equal(field.multiline, true);
    assert.equal(field.sourceField.sourceKey, "additionalProseSourceUrl");
    assert.equal(field.placeholder, "Text appended after the generated prose");
    assert.equal(
        component.template.includes(
            '<cdx-text-area class="create-vg-stub-article-field-text" rows="1"',
        ),
        true,
    );
    assert.deepEqual(
        groups.map((group) => group.label),
        ["Metadata", "Titles", "Text", "References", "Checks"],
    );
    assert.equal(
        component.template.includes("create-vg-stub-prose-length"),
        false,
    );
    assert.equal(
        component.template.includes(
            "getProseSinographs() + ' equivalent sinographs'",
        ),
        true,
    );
    assert.equal(
        component.template.indexOf("{{ getProseWikitext() }}") >
            component.template.indexOf('v-for="field in group.fields"'),
        true,
    );
    assert.equal(
        component.template.indexOf("{{ getProseWikitext() }}") <
            component.template.indexOf('caption="NoteTA items"'),
        true,
    );
});

test("metadata source fields render in a table", () => {
    const component = createDialogComponent(
        createVueStub(),
        createOptionsStub(),
    );
    const {
        form,
        getMetadataFieldLabel,
        getMetadataFieldTableRows,
        groups,
        metadataTableColumns,
    } =
        component.setup();
    const metadataGroup = groups.find((group) => group.key === "metadata");

    assert.deepEqual(
        metadataGroup.fields.map((field) => field.key),
        [
            "enwikiTitle",
            "developers",
            "publishers",
            "series",
            "platforms",
            "year",
            "genres",
        ],
    );
    assert.equal(
        component.template.includes("create-vg-stub-metadata-table"),
        true,
    );
    assert.deepEqual(
        metadataTableColumns.map((column) => column.id),
        ["label", "value", "source"],
    );
    assert.deepEqual(
        getMetadataFieldTableRows(metadataGroup).map((row) => row.field.key),
        ["developers", "publishers", "series", "platforms", "year", "genres"],
    );
    assert.equal(
        component.template.includes(
            '<cdx-table class="create-vg-stub-metadata-table"',
        ),
        true,
    );
    assert.equal(
        component.template.includes(
            'v-bind:data="getMetadataFieldTableRows(group)"',
        ),
        true,
    );
    assert.equal(
        component.template.includes("{{ getMetadataFieldLabel(row.field) }}"),
        true,
    );
    assert.equal(
        component.template.includes("form[row.field.sourceField.sourceKey]"),
        true,
    );
    form.developers = "Foo Studio; Bar Games";
    assert.equal(
        getMetadataFieldLabel(
            metadataGroup.fields.find((field) => field.key === "developers"),
        ),
        "Developers (2)",
    );
    assert.equal(
        getMetadataFieldLabel(
            metadataGroup.fields.find((field) => field.key === "year"),
        ),
        "Release year",
    );
});

test("foreign title fields share one fieldset label", () => {
    const component = createDialogComponent(
        createVueStub(),
        createOptionsStub(),
    );
    const { groups } = component.setup();
    const titlesGroup = groups.find((group) => group.key === "titles");

    assert.equal(titlesGroup.fieldsetLabel, "Foreign titles");
    assert.deepEqual(
        titlesGroup.fields.map((field) => field.key),
        ["originalName", "englishName", "sortKey"],
    );
    assert.equal(
        component.template.includes("create-vg-stub-fieldset-fields"),
        true,
    );
    assert.equal(
        component.template.includes("{{ group.fieldsetLabel }}"),
        true,
    );
});

test("preview source uses MediaWiki CodeMirror and syncs before parsing", async () => {
    let parsedText = "";
    const codeMirror = installCodeMirrorStub();
    const component = createDialogComponent(
        createVueStub(),
        createOptionsStub({
            onPreview() {
                return {
                    html: "",
                    summary: "",
                    text: "Generated text",
                };
            },
            onParsePreview(text) {
                parsedText = text;
                return "<p>Parsed</p>";
            },
        }),
    );
    const state = component.setup();

    state.previewTextArea.value = createTextareaRef();
    await component.methods.previewForm();
    await Promise.resolve();

    assert.deepEqual(codeMirror.modules, [
        "ext.CodeMirror",
        "ext.CodeMirror.mode.mediawiki",
    ]);
    assert.equal(codeMirror.instances[0].value, "Generated text");

    codeMirror.instances[0].value = "Edited preview text";
    await component.methods.refreshParsedPreview();

    assert.equal(state.previewText.value, "Edited preview text");
    assert.equal(parsedText, "Edited preview text");
});

test("preview close cancels delayed CodeMirror load and clears source", async () => {
    const codeMirror = installDelayedCodeMirrorStub();
    const component = createDialogComponent(
        createVueStub(),
        createOptionsStub({
            onPreview() {
                return {
                    html: "<p>Generated parsed text</p>",
                    summary: "Create stub",
                    text: "Generated text",
                };
            },
        }),
    );
    const state = component.setup();

    state.previewTextArea.value = createTextareaRef();
    await component.methods.previewForm();
    component.methods.closePreviewDialog();
    codeMirror.resolve();
    await Promise.resolve();

    assert.equal(codeMirror.instances.length, 0);
    assert.equal(state.previewText.value, "");
    assert.equal(state.previewSummary.value, "");
    assert.equal(state.previewHtml.value, "");
});

test("page edit source syncs CodeMirror text before staging", async () => {
    const codeMirror = installCodeMirrorStub();
    const component = createDialogComponent(
        createVueStub(),
        createOptionsStub({
            async onFetchPageText() {
                return "{{Existing navbox}}";
            },
            onParsePreview() {
                return "<p>Parsed</p>";
            },
            async onPrepareReview(form) {
                return form.navboxRows || [];
            },
        }),
    );
    const state = component.setup();
    const row = {
        enabled: true,
        status: "OK",
        text: "{{Example series}}",
        title: "Example series",
    };

    state.pageEditTextArea.value = createTextareaRef();
    await component.methods.openNavboxEdit(row);
    await Promise.resolve();

    assert.equal(codeMirror.instances[0].value, "{{Existing navbox}}");

    codeMirror.instances[0].value = "{{Edited navbox}}";
    component.methods.stagePageEdit();

    assert.equal(row.pendingEdit.text, "{{Edited navbox}}");
});

test("page edit close cancels delayed CodeMirror load and clears source", async () => {
    const codeMirror = installDelayedCodeMirrorStub();
    const component = createDialogComponent(
        createVueStub(),
        createOptionsStub({
            async onFetchPageText() {
                return "{{Existing navbox}}";
            },
            onParsePreview() {
                return "<p>Parsed</p>";
            },
        }),
    );
    const state = component.setup();
    const row = {
        enabled: true,
        status: "OK",
        text: "{{Example series}}",
        title: "Example series",
    };

    state.pageEditTextArea.value = createTextareaRef();
    await component.methods.openNavboxEdit(row);
    component.methods.closePageEditDialog();
    codeMirror.resolve();
    await Promise.resolve();

    assert.equal(codeMirror.instances.length, 0);
    assert.equal(state.pageEditState.text, "");
    assert.equal(state.pageEditState.html, "");
    assert.equal(state.pageEditState.row, null);
});

test("localized name footer actions are hidden", () => {
    const component = createDialogComponent(
        createVueStub(),
        createOptionsStub(),
    );

    assert.equal(
        component.template.includes(
            'v-on:click.prevent="clearNameRows(group.nameGroupKey)"',
        ),
        false,
    );
    assert.equal(
        component.template.includes(
            'v-on:click.prevent="addNameRow(group.nameGroupKey)"',
        ),
        false,
    );
    assert.equal(
        component.template.indexOf('v-on:click="closeHistoryJsonDialog"') <
            component.template.indexOf('v-on:click="importHistoryJson"'),
        true,
    );
});

test("NoteTA tab lists generated title conversion and sorts rows", () => {
    const component = createDialogComponent(
        createVueStub(),
        createOptionsStub(),
    );
    const { form } = component.setup();

    form.localizedNames = [
        {
            cn: true,
            name: "简体名",
            official: true,
            sourceUrl: "",
        },
        {
            name: "繁體名",
            official: true,
            sourceUrl: "",
            tw: true,
        },
    ];
    component.methods.updateNameRowValue(
        "localizedNames",
        0,
        "name",
        "简体名",
    );

    assert.deepEqual(form.noteTaRows[1], {
        generatedValue: "zh-cn:简体名; zh-tw:繁體名;",
        key: "1",
        source: "names",
        value: "zh-cn:简体名; zh-tw:繁體名;",
    });

    form.noteTaRows.push(
        {
            key: "T",
            value: "zh-cn:手动; zh-tw:手動;",
        },
        {
            key: "",
            value: "zh-cn:无名; zh-tw:無名;",
        },
        {
            key: "4",
            value: "zh-cn:数字; zh-tw:數字;",
        },
    );
    component.methods.sortNoteTaRows();
    assert.deepEqual(
        form.noteTaRows.map((row) => row.key),
        ["T", "G1", "1", "4", ""],
    );

    const generatedIndex = form.noteTaRows.findIndex(
        (row) => row.source === "names",
    );

    component.methods.updateNoteTaRow(generatedIndex, "value", "manual");
    component.methods.updateNameRowValue(
        "localizedNames",
        0,
        "name",
        "简体名",
    );
    assert.equal(form.noteTaRows[generatedIndex].value, "manual");
    component.methods.updateNameRowValue(
        "localizedNames",
        1,
        "name",
        "台灣名",
    );
    assert.equal(
        form.noteTaRows[generatedIndex].value,
        "zh-cn:简体名; zh-tw:台灣名;",
    );
    assert.equal(
        form.noteTaRows[generatedIndex].generatedValue,
        "zh-cn:简体名; zh-tw:台灣名;",
    );
    assert.equal(form.noteTaRows[generatedIndex].modified, undefined);
    component.methods.regenerateNoteTaRows();
    assert.deepEqual(
        form.noteTaRows.map((row) => row.key),
        ["T", "G1", "1", "4", ""],
    );
    assert.deepEqual(
        form.noteTaRows.find((row) => row.source === "names"),
        {
            generatedValue: "zh-cn:简体名; zh-tw:台灣名;",
            key: "1",
            source: "names",
            value: "zh-cn:简体名; zh-tw:台灣名;",
        },
    );
    const regeneratedIndex = form.noteTaRows.findIndex(
        (row) => row.source === "names",
    );
    component.methods.removeNoteTaRow(regeneratedIndex);
    assert.equal(
        form.noteTaRows.some((row) => row.source === "names"),
        false,
    );
    component.methods.updateNameRowValue(
        "localizedNames",
        1,
        "name",
        "繁體名",
    );
    assert.equal(
        form.noteTaRows.some((row) => row.source === "names"),
        false,
    );
    component.methods.regenerateNoteTaRows();
    assert.equal(
        form.noteTaRows.some((row) => row.source === "names"),
        true,
    );
    component.methods.removeNoteTaRow(0);
    assert.equal(
        form.noteTaRows.some((row) => row.key === "T"),
        false,
    );
    assert.equal(component.template.includes('aria-label="Sort"'), true);
    assert.equal(component.template.includes('aria-label="Reset"'), true);
    assert.equal(
        component.template.includes('aria-label="Remove empty rows"'),
        true,
    );
    assert.equal(component.template.includes('aria-label="Add"'), true);
    assert.equal(component.template.includes('caption="NoteTA items"'), true);
    assert.equal(
        component.template.includes("<strong>NoteTA items</strong>"),
        false,
    );
    assert.equal(
        component.template.includes("!canRemoveNoteTaRow(row)"),
        false,
    );
});

test("review exposes editable navboxes and subtle prose length", async () => {
    let categoryRefreshCount = 0;
    let navboxCheckCount = 0;
    let redirectCheckCount = 0;
    const component = createDialogComponent(
        createVueStub(),
        createOptionsStub({
            getProseSinographs(form) {
                return form.additionalProse === "" ? 24 : 51;
            },
            getProseWikitext(form) {
                return form.additionalProse === ""
                    ? "《'''Example'''》是電子遊戲。"
                    : `《'''Example'''》是電子遊戲。${form.additionalProse}`;
            },
            onCategoryRowsRefresh(form) {
                categoryRefreshCount += 1;
                form.categoryRows.forEach((row) => {
                    row.status = "OK";
                });
            },
            onCreateCategoryRow() {
                return {
                    category: "Example games",
                    enabled: true,
                    source: "manual",
                };
            },
            onUpdateCategoryRowCategory(row, category) {
                return {
                    ...row,
                    category,
                };
            },
            async onPrepareReview(form) {
                navboxCheckCount += 1;
                return form.navboxRows?.length > 0
                    ? form.navboxRows
                    : ["{{Foo series}}"];
            },
            async onPrepareRedirectRows() {
                return [
                    {
                        enabled: true,
                        exists: false,
                        status: "Missing",
                        title: "Example redirect",
                    },
                    {
                        enabled: false,
                        exists: true,
                        status: "Exists",
                        title: "Existing redirect",
                    },
                ];
            },
            async onCheckRedirectRows(rows) {
                redirectCheckCount += 1;
                return rows.map((row) => ({
                    enabled: row.title !== "Existing redirect",
                    exists: row.title === "Existing redirect",
                    status:
                        row.title === "Existing redirect"
                            ? "Exists"
                            : "Missing",
                    title: row.title,
                }));
            },
        }),
    );
    const state = component.setup();
    const { form } = state;

    assert.equal(component.methods.getProseSinographs(), 24);
    assert.equal(
        component.methods.getProseWikitext(),
        "《'''Example'''》是電子遊戲。",
    );
    form.additionalProse = "補充文字";
    assert.equal(component.methods.getProseSinographs(), 51);
    assert.equal(
        component.methods.getProseWikitext(),
        "《'''Example'''》是電子遊戲。補充文字",
    );
    form.series = "Foo";
    form.navboxRows = [];

    await component.methods.previewForm();
    assert.equal(categoryRefreshCount, 1);
    assert.equal(navboxCheckCount, 1);
    assert.deepEqual(form.redirectRows, [
        {
            fixed: true,
            fixedTitle: "Example redirect",
            enabled: true,
            exists: false,
            status: "Missing",
            title: "Example redirect",
        },
        {
            fixed: true,
            fixedTitle: "Existing redirect",
            enabled: false,
            exists: true,
            status: "Exists",
            title: "Existing redirect",
        },
        {
            fixed: false,
            fixedTitle: "",
            enabled: true,
            exists: false,
            status: "Missing",
            title: "",
        },
    ]);
    assert.equal(component.methods.formatRedirectStatusLabel("Missing"), "OK");
    assert.equal(
        component.methods.getRedirectStatusChipStatus("Missing"),
        "success",
    );
    assert.equal(
        component.methods.getRedirectStatusChipStatus("Exists"),
        "warning",
    );
    assert.equal(
        component.methods.formatRedirectStatusLabel("Exists"),
        "Overwrite",
    );
    form.redirectRows[0].enabled = false;
    await component.methods.checkRedirectRows();
    assert.equal(redirectCheckCount, 0);
    assert.equal(form.redirectRows[0].enabled, false);
    component.methods.updateRedirectRowTitle(0, "Existing redirect");
    assert.equal(form.redirectRows[0].fixed, false);
    assert.equal(
        component.methods.formatRedirectStatusLabel(form.redirectRows[0]),
        "Unchecked",
    );
    assert.equal(
        component.methods.getRedirectStatusChipStatus(form.redirectRows[0]),
        "notice",
    );
    await component.methods.checkRedirectRow(0, {
        target: {
            value: "Existing redirect",
        },
    });
    assert.equal(redirectCheckCount, 1);
    assert.equal(form.redirectRows[0].fixed, true);
    assert.equal(form.redirectRows[0].fixedTitle, "Existing redirect");
    assert.equal(form.redirectRows[0].enabled, false);
    assert.equal(form.redirectRows[0].exists, true);
    component.methods.addRedirectRow();
    assert.equal(form.redirectRows.at(-1).enabled, true);
    component.methods.removeRedirectRow(form.redirectRows.length - 1);
    assert.equal(
        form.redirectRows.some((row) => row.title === ""),
        true,
    );
    component.methods.addCategoryRow();
    assert.equal(form.categoryRows.at(-1).category, "");
    assert.equal(
        form.categoryRows.some((row) => row.category === "Example games"),
        true,
    );
    await component.methods.refreshCategoryRows();
    assert.equal(categoryRefreshCount, 2);
    assert.equal(form.categoryRows[0].fixed, true);
    assert.equal(form.categoryRows[0].fixedCategory, "Example games");
    await component.methods.refreshCategoryRows();
    assert.equal(categoryRefreshCount, 2);
    component.methods.updateCategoryRowCategory(0, "Changed games");
    assert.equal(form.categoryRows[0].fixed, false);
    await component.methods.checkCategoryRow(0, {
        target: {
            value: "Changed games",
        },
    });
    assert.equal(categoryRefreshCount, 3);
    assert.equal(form.categoryRows[0].fixed, true);
    assert.equal(form.categoryRows[0].fixedCategory, "Changed games");
    component.methods.removeCategoryRow(0);
    assert.equal(form.categoryRows.length, 1);
    assert.equal(form.categoryRows[0].category, "");
    assert.deepEqual(form.navboxRows, [
        {
            fixed: true,
            fixedText: "{{Foo series}}",
            enabled: true,
            status: "",
            text: "{{Foo series}}",
            title: "Foo series",
        },
        {
            fixed: false,
            fixedText: "",
            enabled: true,
            status: "",
            text: "",
            title: "",
        },
    ]);
    form.navboxRows[0].enabled = false;
    await component.methods.checkNavboxRows();
    assert.equal(navboxCheckCount, 1);
    assert.equal(form.navboxRows[0].enabled, false);
    component.methods.updateNavboxRow(0, "{{Edited series}}");
    assert.equal(form.navboxRows[0].fixed, false);
    await component.methods.checkNavboxRows();
    assert.equal(navboxCheckCount, 2);
    assert.equal(form.navboxRows[0].fixed, true);
    assert.equal(form.navboxRows[0].fixedText, "{{Edited series}}");
    component.methods.addNavboxRow();
    component.methods.updateNavboxRow(1, "{{Manual navbox}}");
    component.methods.removeNavboxRow(0);
    assert.deepEqual(form.navboxRows, [
        {
            fixed: false,
            fixedText: "",
            enabled: true,
            status: "",
            text: "{{Manual navbox}}",
            title: "Manual navbox",
        },
        {
            fixed: false,
            fixedText: "",
            enabled: true,
            status: "",
            text: "",
            title: "",
        },
    ]);
    component.methods.removeNavboxRow(0);
    await component.methods.previewForm();
    assert.deepEqual(form.navboxRows, [
        {
            fixed: false,
            fixedText: "",
            enabled: true,
            status: "",
            text: "",
            title: "",
        },
    ]);

    assert.equal(component.template.includes('caption="Categories"'), true);
    assert.equal(component.template.includes("<cdx-info-chip"), true);
    assert.equal(
        component.template.includes(
            'v-bind:status="getRedirectStatusChipStatus(row)"',
        ),
        true,
    );
    assert.equal(
        component.template.includes(
            'v-bind:status="getNavboxStatusChipStatus(row)"',
        ),
        true,
    );
    assert.equal(
        component.template.includes(
            '<section><cdx-table caption="Categories"',
        ),
        true,
    );
    assert.equal(
        component.template.indexOf('caption="Redirects"') <
            component.template.indexOf('caption="Categories"'),
        true,
    );
    assert.equal(
        component.template.indexOf('caption="Categories"') <
            component.template.indexOf('caption="Navboxes"'),
        true,
    );
    assert.equal(
        component.template.includes(
            "getReviewPageActionLabel(row, row.status === 'OK')",
        ),
        true,
    );
    assert.equal(component.template.includes("Include redirect"), true);
    assert.deepEqual(
        [
            ...state.categoryTableColumns,
            ...state.redirectTableColumns,
            ...state.navboxTableColumns,
            ...state.stubTagTableColumns,
        ]
            .filter((column) => column.id === "enabled")
            .map((column) => column.label),
        ["", "", "", ""],
    );
    assert.equal(
        component.template.includes(
            "create-vg-stub-review-row-marker--redirect-conflict",
        ),
        true,
    );
    assert.equal(
        component.template.includes(
            "create-vg-stub-review-row-marker--category-add",
        ),
        true,
    );
    assert.equal(
        component.template.includes(
            "create-vg-stub-review-row-marker--navbox-add",
        ),
        true,
    );
    assert.equal(
        component.template.includes(
            "create-vg-stub-review-row-marker--stub-tag-add",
        ),
        true,
    );
    assert.equal(
        component.methods.isRedirectConflictReviewRow({
            enabled: true,
            exists: true,
            title: "Existing redirect",
        }),
        true,
    );
    assert.equal(
        component.methods.isCategoryAddReviewRow({
            category: "Missing games",
            enabled: true,
            status: "Not exists",
        }),
        true,
    );
    assert.equal(component.template.includes("Redirects"), true);
    assert.equal(component.template.includes('aria-label="Refresh"'), true);
    assert.equal(
        component.template.includes('v-on:click="rebuildNavboxRows"'),
        true,
    );
    assert.equal(component.template.includes("Navboxes"), true);
    assert.equal(component.template.includes('v-model="row.enabled"'), true);
    assert.equal(
        component.template.includes('v-slot:item-title="{ row }"'),
        true,
    );
    assert.equal(
        component.template.includes("create-vg-stub-review-row-converted"),
        false,
    );
    assert.equal(component.template.includes("redirect.variantMixed"), false);
    assert.equal(component.template.includes("row.variantMixed"), false);
    assert.equal(
        component.template.includes(
            "removeRedirectRow((form.redirectRows || []).indexOf(row))",
        ),
        true,
    );
    assert.equal(
        component.template.includes(
            "updateRedirectRowTitle((form.redirectRows || []).indexOf(row), $event)",
        ),
        true,
    );
    assert.equal(
        component.template.includes(
            "removeCategoryRow(form.categoryRows.indexOf(row))",
        ),
        true,
    );
    assert.equal(
        component.template.includes("create-vg-stub-category-actions"),
        false,
    );
    assert.equal(component.template.includes('v-model="row.enabled"'), true);
    assert.equal(component.template.includes('v-model="row.enabled"'), true);
    assert.equal(
        component.template.includes('v-model="row.stubTagEnabled"'),
        false,
    );
    assert.equal(component.template.includes("{{stub}}"), false);
    assert.equal(component.methods.formatStubTagStatusLabel({}), "empty");
    assert.equal(
        component.methods.formatStubTagStatusLabel({
            enabled: false,
            stubTag: "Foo-stub",
        }),
        "Unchecked",
    );
    assert.equal(
        component.methods.formatStubTagStatusLabel({
            enabled: true,
            originalStubTag: "",
            stubTag: "Foo-stub",
        }),
        "Unchecked",
    );
    assert.equal(
        component.methods.formatStubTagStatusLabel({
            enabled: true,
            originalStubTag: "Foo-stub",
            stubTag: "Foo-stub",
        }),
        "Unchecked",
    );
    assert.equal(
        component.methods.formatStubTagStatusLabel({
            enabled: false,
            status: "OK",
            stubTag: "Foo-stub",
        }),
        "OK",
    );
    assert.equal(component.template.includes('caption="Stub tags"'), true);
    assert.equal(
        component.template.includes('v-bind:data="stubTagRows"'),
        true,
    );
    assert.equal(
        component.template.includes(
            "updateStubTagRow(stubTagRows.indexOf(row), $event)",
        ),
        true,
    );
    assert.equal(
        component.template.includes(
            'v-on:click="removeStubTagRow(stubTagRows.indexOf(row))"',
        ),
        true,
    );
    assert.equal(
        component.template.includes("create-vg-stub-destructive-action"),
        true,
    );
    assert.equal(
        component.template.includes('v-on:click="resetCategoryRow(index)"'),
        false,
    );
    assert.equal(component.template.includes('v-model="row.category"'), true);
    assert.equal(
        component.template.includes(
            "updateCategoryRowCategory(form.categoryRows.indexOf(row), $event)",
        ),
        true,
    );
    assert.equal(
        component.template.includes(
            "checkCategoryRow(form.categoryRows.indexOf(row), $event)",
        ),
        true,
    );
    assert.equal(component.template.includes('v-model="row.text"'), true);
    assert.equal(
        component.template.includes(
            "updateNavboxRow((form.navboxRows || []).indexOf(row), $event)",
        ),
        true,
    );
    assert.equal(
        component.template.includes(
            "checkNavboxRow((form.navboxRows || []).indexOf(row), $event)",
        ),
        true,
    );
    assert.equal(
        component.template.includes('v-on:click.prevent="checkNavboxRows"'),
        false,
    );
    assert.equal(component.template.includes("Footer:"), false);
});

test("original title lookup is separate from the Steam helper", () => {
    const component = createDialogComponent(
        createVueStub(),
        createOptionsStub(),
    );
    const { form, getNameSearchRows } = component.setup();

    assert.equal(
        component.template.indexOf("Steam name helper") <
            component.template.indexOf("Original title lookup"),
        true,
    );
    assert.equal(
        component.template.includes('<ul class="create-vg-stub-name-search"'),
        true,
    );
    assert.equal(
        component.template.includes('v-for="row in getNameSearchRows()"'),
        true,
    );
    assert.deepEqual(
        getNameSearchRows().map((row) => [
            row.key,
            row.query,
            row.links.map((link) => link.label),
        ]),
        [["blank", "", ["CN domain", "Bahamut", "zhwp"]]],
    );

    form.originalName = "zh:黯海";
    form.englishName = "Silt";

    assert.deepEqual(getNameSearchRows(), [
        {
            key: "original",
            links: [
                {
                    label: "CN domain",
                    url:
                        "https://www.google.com/search?q=" +
                        "%22%E9%BB%AF%E6%B5%B7%22%20site%3A*.cn",
                },
                {
                    label: "Bahamut",
                    url:
                        "https://www.google.com/search?q=" +
                        "%22%E9%BB%AF%E6%B5%B7%22%20site%3Agnn.gamer.com.tw",
                },
                {
                    label: "zhwp",
                    url:
                        "https://cse.google.com.hk/cse" +
                        "?cx=25f8f2342cbfa4e46&q=%22%E9%BB%AF%E6%B5%B7%22",
                },
            ],
            query: "黯海",
        },
        {
            key: "english",
            links: [
                {
                    label: "CN domain",
                    url:
                        "https://www.google.com/search?q=" +
                        "%22Silt%22%20site%3A*.cn",
                },
                {
                    label: "Bahamut",
                    url:
                        "https://www.google.com/search?q=" +
                        "%22Silt%22%20site%3Agnn.gamer.com.tw",
                },
                {
                    label: "zhwp",
                    url:
                        "https://cse.google.com.hk/cse" +
                        "?cx=25f8f2342cbfa4e46&q=%22Silt%22",
                },
            ],
            query: "Silt",
        },
    ]);
});

test("review exposes editable stub tags below category rows", async () => {
    const component = createDialogComponent(
        createVueStub(),
        createOptionsStub({
            onCategoryRowsRefresh(form) {
                form.categoryRows = [
                    {
                        category: "Foo games",
                        enabled: true,
                        originalStubTagEnabled: true,
                        stubTag: "Foo-stub",
                        stubTagEnabled: true,
                    },
                    {
                        category: "Foo series",
                        enabled: true,
                        originalStubTagEnabled: false,
                        stubTag: "Foo-stub",
                        stubTagEnabled: false,
                    },
                    {
                        category: "Bar games",
                        enabled: true,
                        originalStubTagEnabled: false,
                        stubTag: "Bar-stub",
                        stubTagEnabled: false,
                    },
                ];
            },
        }),
    );
    const { form, stubTagRows } = component.setup();

    assert.deepEqual(stubTagRows.value, []);
    await component.methods.refreshCategoryRows();

    assert.deepEqual(stubTagRows.value, [
        {
            enabled: true,
            originalEnabled: true,
            originalStubTag: "Foo-stub",
            status: "",
            stubTag: "Foo-stub",
        },
        {
            enabled: false,
            originalEnabled: false,
            originalStubTag: "Bar-stub",
            status: "",
            stubTag: "Bar-stub",
        },
        {
            enabled: true,
            originalEnabled: false,
            originalStubTag: "",
            status: "",
            stubTag: "",
        },
    ]);

    stubTagRows.value[0].enabled = false;
    component.methods.updateStubTagRow(0, "{{Foo-alt-stub}}");
    component.methods.addStubTagRow();
    component.methods.updateStubTagRow(2, "Manual-stub");
    component.methods.removeStubTagRow(1);
    assert.deepEqual(
        form.stubTagRows.map((row) => [row.enabled, row.stubTag]),
        [
            [false, "Foo-alt-stub"],
            [true, "Manual-stub"],
            [true, ""],
        ],
    );
    assert.equal(
        component.methods.formatStubTagLabel("{{Bar-stub}}"),
        "{{Bar-stub}}",
    );
});

test("table clean actions keep one blank editable row", () => {
    const component = createDialogComponent(
        createVueStub(),
        createOptionsStub({
            onCreateCategoryRow() {
                return { category: "" };
            },
        }),
    );
    const { form } = component.setup();

    form.citationRows = [
        {
            generatedParams: [],
            index: 1,
            modified: true,
            params: [
                { name: "", value: "" },
                { name: "url", value: "https://example.test" },
                { name: "title", value: "" },
                { name: "", value: "" },
            ],
            sourceUrl: "https://example.test",
        },
    ];
    component.methods.cleanCitationParams(0);
    assert.deepEqual(form.citationRows[0].params, [
        { name: "url", value: "https://example.test" },
    ]);

    form.noteTaRows = [
        { key: "", value: "" },
        { key: "", value: "" },
        { key: "T", value: "Example" },
    ];
    component.methods.cleanNoteTaRows();
    assert.deepEqual(form.noteTaRows, [
        { key: "T", value: "Example" },
        { key: "", value: "" },
    ]);

    form.redirectRows = [{ title: "" }, { title: "" }, { title: "Foo" }];
    component.methods.cleanRedirectRows();
    assert.deepEqual(
        form.redirectRows.map((row) => row.title),
        ["Foo", ""],
    );

    form.navboxRows = [{ text: "" }, { text: "" }, { text: "{{Foo}}" }];
    component.methods.cleanNavboxRows();
    assert.deepEqual(
        form.navboxRows.map((row) => row.text),
        ["{{Foo}}", ""],
    );

    form.stubTagRows = [
        { stubTag: "" },
        { stubTag: "" },
        { stubTag: "vg-stub" },
    ];
    component.methods.cleanStubTagRows();
    assert.deepEqual(
        form.stubTagRows.map((row) => row.stubTag),
        ["vg-stub", ""],
    );

    form.categoryRows = [
        { category: "" },
        { category: "" },
        { category: "Foo games" },
    ];
    component.methods.cleanCategoryRows();
    assert.deepEqual(
        form.categoryRows.map((row) => row.category),
        ["Foo games", ""],
    );
});

test("navbox review stages source-preview edits and creates", async () => {
    let fetchedTitle = "";
    const parsed = [];
    const component = createDialogComponent(
        createVueStub(),
        createOptionsStub({
            async onFetchPageText(title) {
                fetchedTitle = title;
                return "{{Existing navbox}}";
            },
            onParsePreview(text, title) {
                parsed.push([text, title]);
                return `<p>${text}</p>`;
            },
            async onPrepareReview(form) {
                return form.navboxRows || [];
            },
        }),
    );
    const { pageEditOpen, pageEditState } = component.setup();

    assert.equal(component.methods.formatNavboxStatusLabel("OK"), "OK");
    assert.equal(
        component.methods.formatNavboxStatusLabel("Not exists"),
        "Missing",
    );
    assert.equal(
        component.methods.formatNavboxStatusLabel("Pending creation"),
        "Pending",
    );
    assert.equal(
        component.methods.formatNavboxStatusLabel("Pending edit"),
        "Pending",
    );
    assert.equal(component.methods.formatNavboxStatusLabel(""), "Unchecked");
    assert.equal(
        component.methods.formatNavboxStatusLabel({ text: "" }),
        "empty",
    );
    assert.equal(
        component.methods.isNavboxAddReviewRow({
            enabled: true,
            status: "Not exists",
            text: "{{Missing navbox}}",
        }),
        true,
    );
    assert.equal(
        component.methods.isStubTagAddReviewRow({
            enabled: true,
            status: "Missing",
            stubTag: "Foo-stub",
        }),
        true,
    );
    assert.equal(
        component.methods.formatRedirectStatusLabel({ title: "" }),
        "empty",
    );
    assert.equal(
        component.methods.formatCategoryStatusLabel({ category: "" }),
        "empty",
    );
    assert.equal(
        component.methods.formatCategoryStatusLabel({
            category: "Example games",
            status: "OK",
        }),
        "OK",
    );
    assert.equal(
        component.methods.formatCategoryStatusLabel({
            category: "Example games",
            status: "Not exists",
        }),
        "Missing",
    );
    assert.equal(
        component.methods.formatCategoryStatusLabel({
            category: "Example games",
            status: "",
        }),
        "Unchecked",
    );
    assert.equal(
        component.methods.formatCategorySourceLabel("found"),
        "Found",
    );
    assert.equal(
        component.methods.formatCategorySourceLabel("known"),
        "Known",
    );
    assert.equal(
        component.methods.formatCategorySourceLabel("known †"),
        "Known†",
    );
    assert.equal(
        component.methods.formatCategorySourceTitle("known †"),
        "Known (modified)",
    );
    assert.equal(
        component.methods.formatCategorySourceLabel("suggested"),
        "Suggested",
    );
    assert.equal(
        component.methods.formatCategorySourceLabel("manual"),
        "Manual",
    );

    const existingRow = {
        enabled: true,
        status: "OK",
        text: "{{Example series}}",
        title: "Example series",
    };
    await component.methods.openNavboxEdit(existingRow);
    assert.equal(fetchedTitle, "Template:Example series");
    assert.equal(pageEditOpen.value, true);
    assert.equal(pageEditState.create, false);
    assert.equal(pageEditState.title, "Template:Example series");
    assert.equal(pageEditState.text, "{{Existing navbox}}");
    assert.deepEqual(parsed.at(-1), [
        "{{Existing navbox}}",
        "Template:Example series",
    ]);

    pageEditState.text = "{{Edited navbox}}";
    await component.methods.refreshPageEditPreview();
    assert.deepEqual(parsed.at(-1), [
        "{{Edited navbox}}",
        "Template:Example series",
    ]);
    component.methods.stagePageEdit();
    assert.equal(pageEditOpen.value, false);
    assert.deepEqual(existingRow.pendingEdit, {
        create: false,
        previousStatus: "OK",
        summary: "add link to '[[Example]]'",
        text: "{{Edited navbox}}",
        title: "Template:Example series",
    });
    assert.equal(existingRow.status, "Pending edit");
    await component.methods.openNavboxEdit(existingRow);
    assert.equal(pageEditState.pending, true);
    assert.equal(pageEditState.create, false);
    assert.equal(component.template.includes(">Reset</cdx-button>"), true);
    component.methods.resetPageEdit();
    assert.equal(pageEditOpen.value, false);
    assert.equal(existingRow.pendingEdit, undefined);
    assert.equal(existingRow.status, "OK");

    const missingRow = {
        enabled: true,
        status: "Not exists",
        text: "{{Missing series}}",
        title: "Missing series",
    };
    await component.methods.openNavboxEdit(missingRow);
    assert.equal(pageEditState.create, true);
    assert.equal(pageEditState.title, "Template:Missing series");
    assert.equal(pageEditState.text, "");
    pageEditState.englishName = "Template:Missing series";
    pageEditState.text = "{{New navbox}}";
    component.methods.stagePageEdit();
    assert.deepEqual(missingRow.pendingEdit, {
        create: true,
        englishName: "Template:Missing series",
        previousStatus: "Not exists",
        summary:
            "create 'Template:Missing series', with link to '[[Example]]'",
        text: "{{New navbox}}",
        title: "Template:Missing series",
    });
    assert.equal(missingRow.status, "Pending creation");
    await component.methods.openNavboxEdit(missingRow);
    assert.equal(pageEditState.pending, true);
    assert.equal(pageEditState.create, true);
    assert.equal(pageEditState.englishName, "Template:Missing series");
    assert.equal(pageEditState.text, "{{New navbox}}");
    assert.equal(
        component.template.includes(
            'v-on:click.prevent="openNavboxEdit(row)"',
        ),
        true,
    );
    assert.equal(
        component.template.includes("English Wikipedia template"),
        true,
    );
    assert.equal(
        component.template.includes('v-model="pageEditState.text"'),
        true,
    );
});

test("navbox checks replace textbox text with the resolved page title", async () => {
    const component = createDialogComponent(
        createVueStub(),
        createOptionsStub({
            async onPrepareReview(form) {
                return form.navboxRows.map((row) => ({
                    ...row,
                    status: "OK",
                    text: "{{最终幻想系列}}",
                    title: "最终幻想系列",
                }));
            },
        }),
    );
    const { form } = component.setup();
    const row = {
        enabled: true,
        status: "",
        text: "{{最終幻想系列}}",
        title: "最終幻想系列",
    };

    form.navboxRows = [row];
    await component.methods.checkNavboxRow.call(component.methods, 0, {
        target: {
            value: "{{最終幻想系列}}",
        },
    });

    assert.equal(form.navboxRows[0], row);
    assert.equal(row.text, "{{最终幻想系列}}");
    assert.equal(row.title, "最终幻想系列");
    assert.equal(row.status, "OK");
});

test("category checks preserve manually entered textbox text", async () => {
    const refreshes = [];
    const component = createDialogComponent(
        createVueStub(),
        createOptionsStub({
            onCategoryRowsRefresh(form, _state, options) {
                refreshes.push(options);
                Object.assign(form.categoryRows[0], {
                    category: ".22口径长步枪弹口径枪械",
                    status: "OK",
                });
            },
            onUpdateCategoryRowCategory(row, category) {
                return {
                    ...row,
                    category,
                };
            },
        }),
    );
    const { form } = component.setup();
    const row = {
        category: ".22 LR口徑槍械",
        enabled: true,
        source: "manual",
        status: "",
    };

    form.categoryRows = [row];
    await component.methods.checkCategoryRow.call(component.methods, 0, {
        target: {
            value: ".22 LR口徑槍械",
        },
    });

    assert.equal(form.categoryRows[0].category, ".22 LR口徑槍械");
    assert.equal(form.categoryRows[0].status, "OK");
    assert.deepEqual(refreshes, [{ bypassCache: true }]);
});

test("category helper stages missing category rows for final submission", async () => {
    const enwikiLookups = [];
    const component = createDialogComponent(
        createVueStub(),
        createOptionsStub({
            async onEnwikiTitleChange(title) {
                enwikiLookups.push(title);

                return {
                    wikidataId: "Q123",
                };
            },
            async onPrepareCompanyCategory(row) {
                return `Text for ${row.company}`;
            },
        }),
    );
    const {
        companyCategoryLookupLoading,
        companyCategoryOpen,
        companyCategoryState,
        form,
    } = component.setup();
    const companyRow = {
        category: "Foo Studio游戏",
        company: "Foo Studio",
        enabled: false,
        status: "",
    };
    form.categoryRows = [companyRow];

    assert.equal(component.methods.canCreateCompanyCategory(companyRow), true);
    assert.equal(
        component.methods.canCreateCompanyCategory({
            category: "动作游戏",
            status: "Not exists",
        }),
        false,
    );
    assert.equal(
        component.methods.canCreateCompanyCategory({
            ...companyRow,
            status: "OK",
        }),
        false,
    );

    await component.methods.openCategoryCreate(companyRow);
    assert.equal(companyCategoryOpen.value, true);
    assert.equal(companyCategoryState.text, "Text for Foo Studio");

    companyCategoryState.englishName = "Foo Studio games";
    await component.methods.refreshCompanyCategoryMetadata();
    assert.equal(enwikiLookups.at(-1), "Category:Foo Studio games");
    assert.equal(companyCategoryState.wikidataId, "Q123");
    assert.equal(companyCategoryLookupLoading.value, false);
    assert.equal(
        component.methods.getCompanyCategoryWikidataUrl(),
        "https://www.wikidata.org/wiki/Q123",
    );
    companyCategoryState.text += "\nEdited";
    await component.methods.saveCompanyCategory();

    assert.deepEqual(companyRow.pendingCreation, {
        englishName: "Foo Studio games",
        previousStatus: "",
        text: "Text for Foo Studio\nEdited",
        wikidataId: "Q123",
    });
    assert.equal(companyRow.enabled, true);
    assert.equal(companyRow.status, "Pending creation");
    assert.equal(companyCategoryOpen.value, false);
    assert.equal(
        component.template.includes(
            'v-on:click.prevent="openCategoryEdit(row)"',
        ),
        true,
    );
    assert.equal(component.template.includes("openCategoryView"), false);
    assert.equal(
        component.template.includes(
            "getReviewPageActionLabel(row, row.status === 'OK')",
        ),
        true,
    );
    assert.equal(
        component.template.includes("create-vg-stub-destructive-action"),
        true,
    );
    assert.equal(
        component.template.includes(
            'v-on:click="cancelCompanyCategoryCreation"',
        ),
        true,
    );
    assert.equal(
        component.template.includes(
            "(companyCategoryState.pending ? 'Modify ' : 'Create ')",
        ),
        true,
    );
    assert.equal(
        component.template.includes("English Wikipedia category"),
        true,
    );
    assert.equal(
        component.template.includes("companyCategoryState.wikidataId"),
        true,
    );
    assert.equal(
        component.template.includes("getCompanyCategoryWikidataUrl"),
        true,
    );
    assert.equal(
        component.template.indexOf("English Wikipedia category") >
            component.template.indexOf(
                "(companyCategoryState.pending ? 'Modify ' : 'Create ')",
            ),
        true,
    );
    assert.equal(
        component.template.indexOf("English Wikipedia category") <
            component.template.indexOf("create-vg-stub-company-category-text"),
        true,
    );

    const genericRow = {
        category: "动作游戏",
        status: "Not exists",
    };
    form.categoryRows = [genericRow];
    await component.methods.openCategoryCreate(genericRow);
    assert.equal(companyCategoryState.text, "");
    companyCategoryState.englishName = "Action games";
    await component.methods.refreshCompanyCategoryMetadata();
    assert.equal(enwikiLookups.at(-1), "Category:Action games");
    assert.equal(companyCategoryState.wikidataId, "Q123");
    companyCategoryState.text = "Category text";
    await component.methods.saveCompanyCategory();
    assert.deepEqual(genericRow.pendingCreation, {
        englishName: "Action games",
        previousStatus: "Not exists",
        text: "Category text",
        wikidataId: "Q123",
    });
    assert.equal(
        component.methods.canCreateCategory({
            category: "动作游戏",
            status: "Not exists",
        }),
        true,
    );
});

test("pending category button reopens review and can cancel creation", async () => {
    let prepareCount = 0;
    const component = createDialogComponent(
        createVueStub(),
        createOptionsStub({
            async onPrepareCompanyCategory() {
                prepareCount += 1;
                return "Generated text";
            },
        }),
    );
    const { companyCategoryOpen, companyCategoryState, form } =
        component.setup();
    const row = {
        category: "Foo Studio游戏",
        company: "Foo Studio",
        pendingCreation: {
            englishName: "Category:Foo Studio games",
            previousStatus: "Not exists",
            text: "Edited category text",
        },
        status: "Pending creation",
    };
    form.categoryRows = [row];

    await component.methods.openCategoryCreate(row);

    assert.equal(companyCategoryOpen.value, true);
    assert.equal(companyCategoryState.pending, true);
    assert.equal(
        companyCategoryState.englishName,
        "Category:Foo Studio games",
    );
    assert.equal(companyCategoryState.text, "Edited category text");
    assert.equal(prepareCount, 0);
    assert.equal(component.template.includes("Review Category:"), false);
    assert.equal(component.template.includes("Create Category:"), false);
    assert.equal(component.template.includes(">Close</cdx-button>"), true);
    assert.equal(component.template.includes(">Delete</cdx-button>"), true);
    assert.equal(
        component.template.includes(
            "{{ companyCategoryState.loading ? 'Saving' : 'Save' }}",
        ),
        true,
    );
    assert.equal(component.template.includes('action="destructive"'), true);

    component.methods.cancelCompanyCategoryCreation();

    assert.equal(companyCategoryOpen.value, false);
    assert.equal(row.pendingCreation, undefined);
    assert.equal(row.status, "Not exists");
});

test("category review stages source-preview edits and company creates", async () => {
    let fetchedTitle = "";
    const component = createDialogComponent(
        createVueStub(),
        createOptionsStub({
            async onFetchPageText(title) {
                fetchedTitle = title;
                return "[[Category:Existing]]";
            },
            onParsePreview(text, title) {
                return `<p>${title}: ${text}</p>`;
            },
            async onPrepareCompanyCategory(row) {
                return `Text for ${row.company}`;
            },
        }),
    );
    const { pageEditOpen, pageEditState } = component.setup();

    const existingRow = {
        category: "动作游戏",
        enabled: true,
        status: "OK",
    };
    await component.methods.openCategoryEdit(existingRow);
    assert.equal(fetchedTitle, "Category:动作游戏");
    assert.equal(pageEditOpen.value, true);
    assert.equal(pageEditState.text, "[[Category:Existing]]");
    pageEditState.text = "[[Category:Edited]]";
    component.methods.stagePageEdit();
    assert.deepEqual(existingRow.pendingEdit, {
        create: false,
        previousStatus: "OK",
        summary: "modify 'Category:动作游戏'",
        text: "[[Category:Edited]]",
        title: "Category:动作游戏",
    });
    assert.equal(existingRow.status, "Pending edit");
    await component.methods.openCategoryEdit(existingRow);
    assert.equal(pageEditState.pending, true);
    component.methods.resetPageEdit();
    assert.equal(existingRow.pendingEdit, undefined);
    assert.equal(existingRow.status, "OK");

    const companyRow = {
        category: "Foo Studio游戏",
        company: "Foo Studio",
        enabled: false,
        status: "Not exists",
    };
    await component.methods.openCategoryEdit(companyRow);
    assert.equal(pageEditState.title, "Category:Foo Studio游戏");
    assert.equal(pageEditState.text, "Text for Foo Studio");
    assert.equal(pageEditState.company, "Foo Studio");
    pageEditState.englishName = "Foo Studio games";
    pageEditState.text += "\nEdited";
    component.methods.stagePageEdit();
    assert.deepEqual(companyRow.pendingCreation, {
        englishName: "Foo Studio games",
        previousStatus: "Not exists",
        text: "Text for Foo Studio\nEdited",
    });
    assert.equal(companyRow.enabled, true);
    assert.equal(companyRow.status, "Pending creation");
    assert.equal(
        component.template.includes(
            'v-on:click.prevent="openCategoryEdit(row)"',
        ),
        true,
    );
    assert.equal(
        component.template.includes("{{ formatCategoryStatusLabel(row) }}"),
        true,
    );
    assert.equal(
        component.template.includes("formatCategoryStatusTitle(row)"),
        true,
    );
    assert.equal(
        component.template.includes(
            'v-on:click.prevent="openCategoryEdit(row)"',
        ),
        true,
    );
    assert.equal(
        component.template.includes("English Wikipedia category"),
        true,
    );

    const genericRow = {
        category: "动作游戏",
        enabled: false,
        status: "Not exists",
    };
    await component.methods.openCategoryEdit(genericRow);
    assert.equal(pageEditState.title, "Category:动作游戏");
    assert.equal(pageEditState.text, "");
    assert.equal(pageEditState.company, "");
    pageEditState.englishName = "Action games";
    pageEditState.text = "Generic category text";
    component.methods.stagePageEdit();
    assert.deepEqual(genericRow.pendingCreation, {
        englishName: "Action games",
        previousStatus: "Not exists",
        text: "Generic category text",
    });
    assert.equal(
        component.methods.canCreateCategory({
            category: "动作游戏",
            status: "Not exists",
        }),
        true,
    );
});

test("Steam helper stages official localized name choices", async () => {
    const component = createDialogComponent(
        createVueStub(),
        createOptionsStub({
            async onSteamNamesFetch(url, options) {
                assert.equal(
                    url,
                    "https://store.steampowered.com/app/123/example/",
                );
                assert.deepEqual(options, {
                    includeJapanese: false,
                });

                return [
                    {
                        hans: true,
                        label: "Simplified",
                        name: "简体名",
                        official: true,
                        sourceUrl:
                            "https://store.steampowered.com/app/123/example/?l=schinese",
                    },
                    {
                        hant: true,
                        label: "Traditional",
                        name: "繁體名",
                        official: true,
                        sourceUrl:
                            "https://store.steampowered.com/app/123/example/?l=tchinese",
                    },
                ];
            },
        }),
    );
    const {
        fetchedSteamNameRows,
        form,
        getSteamNameSuggestions,
        steamNameButtons,
    } = component.setup();

    component.methods.updateSteamUrl(
        " https://store.steampowered.com/app/123/example/ ",
    );
    await component.methods.addSteamNames();

    assert.deepEqual(
        fetchedSteamNameRows.value.map((row) => [row.name, row.sourceUrl]),
        [
            [
                "简体名",
                "https://store.steampowered.com/app/123/example/?l=schinese",
            ],
            [
                "繁體名",
                "https://store.steampowered.com/app/123/example/?l=tchinese",
            ],
        ],
    );
    assert.deepEqual(getSteamNameSuggestions(fetchedSteamNameRows.value), [
        {
            label: "Simplified",
            url:
                "https://store.steampowered.com/app/123/example/" +
                "?l=schinese",
            value: "简体名",
        },
        {
            label: "Traditional",
            url:
                "https://store.steampowered.com/app/123/example/" +
                "?l=tchinese",
            value: "繁體名",
        },
    ]);
    assert.deepEqual(
        form.localizedNames.map((row) => row.name),
        [""],
    );
    assert.equal(
        component.template.includes("create-vg-stub-steam-helper"),
        true,
    );
    assert.equal(component.template.includes("Steam name helper"), true);
    assert.equal(component.template.includes("Steam titles"), false);
    assert.equal(component.template.includes("Check"), true);
    assert.equal(component.template.includes("<ul"), true);
    assert.equal(
        component.template.includes("create-vg-stub-steam-links"),
        true,
    );
    assert.equal(component.template.includes("<cdx-button-group"), true);
    assert.equal(
        component.template.includes('v-bind:buttons="steamNameButtons"'),
        true,
    );
    assert.equal(
        component.template.includes('v-on:click="applySteamNameChoice"'),
        true,
    );
    assert.deepEqual(steamNameButtons, [
        { label: "Neither", value: "neither" },
        { label: "Simp", value: "simp" },
        { label: "Trad", value: "trad" },
        { label: "Diff", value: "diff" },
        { label: "Same", value: "same" },
    ]);

    component.methods.applySteamNameChoice("diff");

    assert.deepEqual(
        form.localizedNames
            .slice(0, 2)
            .map((row) => [
                row.official,
                row.hans,
                row.hant,
                row.ww,
                row.name,
                row.sourceUrl,
            ]),
        [
            [
                true,
                true,
                false,
                false,
                "简体名",
                "https://store.steampowered.com/app/123/example/?l=schinese",
            ],
            [
                true,
                false,
                true,
                false,
                "繁體名",
                "https://store.steampowered.com/app/123/example/?l=tchinese",
            ],
        ],
    );
    assert.equal(form.localizedNames.at(-1).name, "");
    assert.equal(fetchedSteamNameRows.value.length, 2);
});

test("Steam helper previews Japanese for a Japanese original title", async () => {
    const component = createDialogComponent(
        createVueStub(),
        createOptionsStub({
            async onSteamNamesFetch(_url, options) {
                assert.deepEqual(options, {
                    includeJapanese: true,
                });

                return [
                    {
                        label: "Simplified",
                        markets: ["hans"],
                        name: "简体名",
                        sourceUrl:
                            "https://store.steampowered.com/app/123/?l=schinese",
                    },
                    {
                        label: "Japanese",
                        markets: [],
                        name: "日本語名",
                        previewOnly: true,
                        sourceUrl:
                            "https://store.steampowered.com/app/123/?l=japanese",
                    },
                ];
            },
        }),
    );
    const { fetchedSteamNameRows, form, getSteamNameSuggestions } =
        component.setup();

    form.originalName = "ja:原題";
    component.methods.updateSteamUrl(
        "https://store.steampowered.com/app/123/",
    );
    await component.methods.addSteamNames();

    assert.deepEqual(getSteamNameSuggestions(fetchedSteamNameRows.value), [
        {
            label: "Simplified",
            url: "https://store.steampowered.com/app/123/?l=schinese",
            value: "简体名",
        },
        {
            label: "Japanese",
            url: "https://store.steampowered.com/app/123/?l=japanese",
            value: "日本語名",
        },
    ]);

    component.methods.applySteamNameChoice("diff");
    assert.deepEqual(
        form.localizedNames.map((row) => row.name),
        ["简体名", ""],
    );
});

test("Steam helper applies same names as one no-region row", async () => {
    const component = createDialogComponent(
        createVueStub(),
        createOptionsStub({
            async onSteamNamesFetch() {
                return [
                    {
                        hans: true,
                        name: "相同名",
                        official: true,
                        sourceUrl:
                            "https://store.steampowered.com/app/123/example/?l=schinese",
                    },
                    {
                        hant: true,
                        name: "相同名",
                        official: true,
                        sourceUrl:
                            "https://store.steampowered.com/app/123/example/?l=tchinese",
                    },
                ];
            },
        }),
    );
    const { form } = component.setup();

    component.methods.updateSteamUrl(
        "https://store.steampowered.com/app/123/example/",
    );
    await component.methods.addSteamNames();
    component.methods.applySteamNameChoice("same");

    assert.deepEqual(form.localizedNames[0], {
        cn: false,
        hans: false,
        hant: false,
        hk: false,
        name: "相同名",
        official: true,
        sourceUrl:
            "https://store.steampowered.com/app/123/example/?l=schinese\n" +
            "https://store.steampowered.com/app/123/example/?l=tchinese",
        tw: false,
        ww: false,
    });
});

test("Steam helper overwrites previously applied helper rows", async () => {
    const component = createDialogComponent(
        createVueStub(),
        createOptionsStub({
            async onSteamNamesFetch() {
                return [
                    {
                        hans: true,
                        name: "简体名",
                        official: true,
                        sourceUrl:
                            "https://store.steampowered.com/app/123/example/?l=schinese",
                    },
                    {
                        hant: true,
                        name: "繁體名",
                        official: true,
                        sourceUrl:
                            "https://store.steampowered.com/app/123/example/?l=tchinese",
                    },
                ];
            },
        }),
    );
    const { form } = component.setup();

    form.localizedNames[0].name = "Manual name";
    component.methods.updateSteamUrl(
        "https://store.steampowered.com/app/123/example/",
    );
    await component.methods.addSteamNames();

    component.methods.applySteamNameChoice("diff");
    form.localizedNames[1].name = "Edited helper row";
    component.methods.applySteamNameChoice("simp");

    assert.deepEqual(
        form.localizedNames.map((row) => [
            row.name,
            row.hans,
            row.hant,
            row.sourceUrl,
        ]),
        [
            ["Manual name", false, false, ""],
            [
                "简体名",
                true,
                false,
                "https://store.steampowered.com/app/123/example/?l=schinese",
            ],
            ["", false, false, ""],
        ],
    );

    component.methods.applySteamNameChoice("neither");

    assert.deepEqual(
        form.localizedNames.map((row) => row.name),
        ["Manual name", ""],
    );
});

test("Clear resets fields and helper state across all tabs", async () => {
    const component = createDialogComponent(
        createVueStub(),
        createOptionsStub({
            async onSteamNamesFetch() {
                return [{ hans: true, name: "简体名" }];
            },
        }),
    );
    const { activeTab, fetchedSteamNameRows, form, steamUrl } =
        component.setup();

    activeTab.value = "review";
    form.name = "Example";
    form.publishers = "Publisher";
    form.categoryRows = [{ category: "Example games" }];
    component.methods.updateSteamUrl(
        "https://store.steampowered.com/app/123/example/",
    );
    await component.methods.addSteamNames();
    await component.methods.handleMainActionSelect.call(
        component.methods,
        "clear",
    );

    assert.equal(activeTab.value, "metadata");
    assert.equal(form.name, "");
    assert.equal(form.pageName, "Example");
    assert.equal(form.publishers, "");
    assert.deepEqual(form.categoryRows, []);
    assert.equal(steamUrl.value, "");
    assert.deepEqual(fetchedSteamNameRows.value, []);
    assert.equal(component.template.includes("<cdx-menu-button"), true);
    assert.equal(component.template.includes("mainActionMenuItems"), true);
});

test("main action menu opens history and reloads derived data", async () => {
    let citationRefreshes = 0;
    let metadataRefreshes = 0;
    let categoryRefreshOptions;
    const component = createDialogComponent(
        createVueStub(),
        createOptionsStub({
            async onEnwikiTitleChange() {
                metadataRefreshes += 1;

                return {};
            },
            async onPrepareCitations() {
                citationRefreshes += 1;

                return [];
            },
            async onCategoryRowsRefresh(_form, _state, options) {
                categoryRefreshOptions = options;
            },
        }),
    );
    const { form, historyOpen, mainActionMenuItems, mainActionMenuSelection } =
        component.setup();

    form.enwikiTitle = "Menu Game";
    await component.methods.handleMainActionSelect.call(
        component.methods,
        "history",
    );
    assert.equal(historyOpen.value, true);

    await component.methods.handleMainActionSelect.call(
        component.methods,
        "reload",
    );
    assert.equal(mainActionMenuSelection.value, null);
    assert.deepEqual(
        mainActionMenuItems.map((item) => item.label),
        ["History", "Reload", "Clear"],
    );
    assert.equal(metadataRefreshes, 1);
    assert.equal(citationRefreshes, 1);
    assert.deepEqual(categoryRefreshOptions, {
        bypassCache: true,
        recheck: true,
    });
});

test("localized name rows separate official and region checkboxes", () => {
    const component = createDialogComponent(
        createVueStub(),
        createOptionsStub(),
    );

    assert.equal(
        component.template.includes(
            '<span aria-hidden="true" class="create-vg-stub-name-market-separator"></span>',
        ),
        true,
    );
    assert.equal(component.template.includes("Regions:"), false);
});

test("Clear removes all localized name rows", () => {
    const component = createDialogComponent(
        createVueStub(),
        createOptionsStub(),
    );
    const { form } = component.setup();

    form.localizedNames = [
        {
            name: "Entered name",
            sourceUrl: "https://example.test/name",
        },
        {
            name: "",
            sourceUrl: "",
        },
    ];
    component.methods.clearNameRows("localizedNames");

    assert.deepEqual(form.localizedNames, [createExpectedBlankNameRow()]);
    assert.equal(
        component.template.includes(
            'v-on:click.prevent="clearNameRows(group.nameGroupKey)"',
        ),
        false,
    );
});

test("field preview helper receives live form and preview key", () => {
    const component = createDialogComponent(
        createVueStub(),
        createOptionsStub({
            getFieldPreview(form, previewKey) {
                return `${previewKey}: ${form.name || "Example"}`;
            },
        }),
    );
    const { getFieldPreview } = component.setup();

    assert.equal(
        getFieldPreview({ key: "englishName", previewKey: "names" }),
        "names: Example",
    );
    assert.equal(getFieldPreview({ key: "genres" }), "genres: Example");
    assert.equal(
        component.template.includes("create-vg-stub-wikitext-preview"),
        false,
    );
    assert.equal(
        component.template.includes('v-for="link in getEnwikiTipLinks()"'),
        true,
    );
    assert.equal(component.template.includes("{{ link.label }} "), true);
    assert.equal(
        component.template.includes(
            "suggestion in getSteamNameSuggestions(fetchedSteamNameRows)",
        ),
        true,
    );
});

test("submit opens preview without changing tabs", async () => {
    let refreshCount = 0;
    let previewCount = 0;
    const component = createDialogComponent(
        createVueStub(),
        createOptionsStub({
            onCategoryRowsRefresh() {
                refreshCount += 1;
            },
            onPreview() {
                previewCount += 1;
                return {
                    html: "",
                    summary: "",
                    text: "Generated text",
                };
            },
        }),
    );
    const { activeTab, preSaveOpen, previewLoadingMessage, previewOpen } =
        component.setup();

    assert.equal(activeTab.value, "metadata");
    assert.equal(previewLoadingMessage.value, "Preparing preview");
    assert.equal(
        component.template.includes("create-vg-stub-dialog-mask"),
        true,
    );
    assert.equal(component.template.includes("<cdx-progress-bar"), true);
    assert.equal(
        component.template.includes("{{ previewLoadingMessage }}"),
        true,
    );
    await component.methods.submitForm();

    assert.equal(activeTab.value, "metadata");
    assert.equal(refreshCount, 1);
    assert.equal(previewCount, 1);
    assert.equal(previewOpen.value, true);
    assert.equal(preSaveOpen.value, false);
    assert.equal(component.template.includes("getVisiblePreSaveGroups"), true);
});

test("submit confirms changed page name before previewing", async () => {
    let moveCount = 0;
    let previewCount = 0;
    const component = createDialogComponent(
        createVueStub(),
        createOptionsStub({
            onMoveTarget() {
                moveCount += 1;
            },
            onPreview() {
                previewCount += 1;
                return {
                    html: "",
                    summary: "",
                    text: "Generated text",
                };
            },
        }),
    );
    const state = component.setup();

    component.methods.updateFieldValue({ key: "pageName" }, "Target page");
    await component.methods.submitForm();

    assert.equal(state.moveOpen.value, true);
    assert.equal(state.movePreviewConfirmation.value, true);
    assert.equal(state.previewOpen.value, false);
    assert.equal(previewCount, 0);
    assert.equal(moveCount, 0);

    await component.methods.previewWithoutMoving();
    assert.equal(state.moveOpen.value, false);
    assert.equal(state.previewOpen.value, true);
    assert.equal(previewCount, 1);

    state.previewOpen.value = false;
    await component.methods.submitForm();
    assert.equal(state.moveOpen.value, false);
    assert.equal(state.previewOpen.value, true);
    assert.equal(previewCount, 2);

    state.previewOpen.value = false;
    component.methods.updateFieldValue({ key: "pageName" }, "Another page");
    await component.methods.submitForm();

    assert.equal(state.moveOpen.value, true);
    assert.equal(state.previewOpen.value, false);
    assert.equal(previewCount, 2);
    assert.equal(
        component.template.includes("Preview without moving"),
        true,
    );
    assert.equal(
        component.template.includes(
            "Move to that page name before previewing?",
        ),
        true,
    );
});

test("native submit bridge opens category and pre-save review", async () => {
    let refreshCount = 0;
    let submitCount = 0;
    const component = createDialogComponent(
        createVueStub(),
        createOptionsStub({
            onCategoryRowsRefresh() {
                refreshCount += 1;
            },
            onSubmit() {
                submitCount += 1;
            },
        }),
    );
    const { open, preSaveOpen } = component.setup();

    await window.createVgStubDialog.submit();

    assert.equal(open.value, true);
    assert.equal(preSaveOpen.value, true);
    assert.equal(refreshCount, 1);
    assert.equal(submitCount, 0);
});

test("submit opens editable source and parsed preview first", async () => {
    let previewCount = 0;
    let submitCount = 0;
    let historyCount = 0;
    let parseText;
    let submittedPreview;
    const component = createDialogComponent(
        createVueStub(),
        createOptionsStub({
            onParsePreview(text) {
                parseText = text;
                return "<p>Edited parsed text</p>";
            },
            onPreview() {
                previewCount += 1;
                return {
                    html: "<p>Generated parsed text</p>",
                    summary: "create stub",
                    text: "Generated text",
                };
            },
            onSubmit(form, state, closeDialog, preSave, preview) {
                submitCount += 1;
                submittedPreview = preview;
            },
            onSubmitHistory() {
                historyCount += 1;
            },
        }),
    );
    const {
        preSaveOpen,
        previewHtml,
        previewOpen,
        previewSummary,
        previewText,
        groups,
    } = component.setup();

    await component.methods.submitForm();
    assert.equal(previewCount, 1);
    assert.equal(submitCount, 0);
    assert.equal(historyCount, 1);
    assert.equal(previewOpen.value, true);
    assert.equal(previewText.value, "Generated text");
    assert.equal(previewSummary.value, "create stub");
    assert.equal(previewHtml.value, "<p>Generated parsed text</p>");

    previewText.value = "Edited generated text";
    await component.methods.refreshParsedPreview();
    assert.equal(parseText, "Edited generated text");
    assert.equal(previewHtml.value, "<p>Edited parsed text</p>");

    await component.methods.submitPreviewText();
    assert.equal(previewOpen.value, false);
    assert.equal(preSaveOpen.value, true);
    assert.equal(submitCount, 0);

    await component.methods.confirmSubmit();
    assert.equal(submitCount, 1);
    assert.equal(preSaveOpen.value, true);
    assert.deepEqual(submittedPreview, {
        summary: "create stub",
        text: "Edited generated text",
    });
    assert.equal(
        component.template.includes('v-on:click="previewForm"'),
        false,
    );
    assert.equal(
        component.template.includes('v-model:open="previewOpen"'),
        true,
    );
    assert.equal(component.template.includes('v-if="previewOpen"'), true);
    assert.equal(component.template.includes('v-model="previewText"'), true);
    assert.equal(
        component.template.includes('v-model="previewSummary"'),
        true,
    );
    assert.equal(component.template.includes('v-html="previewHtml"'), true);
    assert.equal(
        component.template.includes('v-bind:title="getArticlePreviewTitle()"'),
        true,
    );
    assert.equal(component.template.includes("Edit summary"), true);
    assert.equal(
        component.template.includes("create-vg-stub-preview-text"),
        true,
    );
    assert.equal(
        component.template.includes("create-vg-stub-preview-dialog"),
        true,
    );
    assert.equal(
        component.template.includes("create-vg-stub-preview-layout"),
        true,
    );
    assert.equal(component.template.includes("font-family: monospace"), true);
    assert.equal(component.template.includes('v-on:click="submitForm"'), true);
    assert.equal(component.template.includes("'Review'"), true);
    assert.equal(component.template.includes(">Continue<"), true);
    assert.equal(component.template.includes("<cdx-message"), true);
    assert.equal(component.template.includes(">Move text<"), false);
    assert.equal(component.template.includes(">Move<"), true);
    const textFields = groups.find((group) => group.key === "text").fields;
    assert.equal(
        textFields.findIndex((field) => field.label === "Page name") <
            textFields.findIndex(
                (field) => field.label === "Article display title",
            ),
        true,
    );
});

test("submit from review opens preview before pre-save fixes", async () => {
    let refreshCount = 0;
    let previewCount = 0;
    const component = createDialogComponent(
        createVueStub(),
        createOptionsStub({
            onCategoryRowsRefresh() {
                refreshCount += 1;
            },
            onPreview() {
                previewCount += 1;
                return {
                    html: "",
                    summary: "",
                    text: "Generated text",
                };
            },
        }),
    );
    const { activeTab, preSaveOpen, previewOpen } = component.setup();

    activeTab.value = "review";
    await component.methods.submitForm();

    assert.equal(refreshCount, 1);
    assert.equal(previewCount, 1);
    assert.equal(previewOpen.value, true);
    assert.equal(preSaveOpen.value, false);
});

test("pre-save keeps the current page title when move is suggested", async () => {
    let submitted;
    let moveCount = 0;
    const component = createDialogComponent(
        createVueStub(),
        createOptionsStub({
            onMoveTarget() {
                moveCount += 1;
            },
            onPreview() {
                return {
                    html: "",
                    summary: "",
                    text: "Generated text",
                };
            },
            onSubmit(_form, _state, _close, preSave) {
                submitted = preSave;
            },
            async onPreSavePrepare() {
                return {
                    actions: [
                        {
                            id: "talk-banner",
                            label: "Add talk banner",
                            selected: true,
                        },
                    ],
                    move: {
                        enabled: true,
                        to: "預設中文名",
                    },
                };
            },
        }),
    );
    const state = component.setup();

    state.activeTab.value = "review";
    await component.methods.submitForm();
    await component.methods.submitPreviewText();
    assert.equal(state.preSaveMoveEnabled.value, false);
    assert.equal(state.preSaveMoveTitle.value, "預設中文名");
    await component.methods.confirmSubmit();

    assert.equal(moveCount, 0);
    assert.equal(submitted.move.enabled, false);
    assert.equal(submitted.move.to, "Example");
    assert.equal(state.preSaveOpen.value, true);
    assert.equal(
        component.template.includes(
            "Choose fixes to run after the article is submitted.",
        ),
        true,
    );
    assert.equal(component.template.includes("Create page at"), false);
    assert.equal(component.template.includes("Final article title"), false);
    assert.equal(
        component.template.includes("Use this title before saving"),
        false,
    );
    assert.equal(component.template.includes("{{ row.label }}"), true);
    assert.equal(component.template.includes("'Continue'"), false);
    assert.equal(component.template.includes("'Save'"), true);
});

test("pre-save fixes are grouped by target page", () => {
    const redirectAction = {
        displayLabel: "Redirect to [[Samson (遊戲)]]",
        id: "redirect:薩姆森 (遊戲)",
        pageTitle: "薩姆森 (遊戲)",
        selected: true,
        type: "redirect",
    };
    const talkAction = {
        displayLabel: "Tag banner on [[Talk:Samson (遊戲)]]",
        id: "talk-banner",
        pageTitle: "Samson (遊戲)",
        selected: true,
        type: "talk-banner",
    };
    const categoryAction = {
        category: "Chibig遊戲",
        company: "Chibig",
        displayLabel: "Create category page",
        englishName: "Category:Chibig games",
        id: "category:Chibig遊戲",
        pageTitle: "Category:Chibig遊戲",
        selected: true,
        type: "category",
        wikidataId: "Q123",
    };

    assert.deepEqual(
        createPreSaveGroups([redirectAction, talkAction, categoryAction], {
            registerNewPage: true,
        }),
        [
            {
                key: "薩姆森 (遊戲)",
                rows: [
                    {
                        action: redirectAction,
                        key: "redirect:薩姆森 (遊戲)",
                        label: "Redirect to [[Samson (遊戲)]]",
                        type: "action",
                    },
                ],
                title: "薩姆森 (遊戲)",
            },
            {
                key: "Samson (遊戲)",
                rows: [
                    {
                        action: talkAction,
                        key: "talk-banner",
                        label: "Tag banner on [[Talk:Samson (遊戲)]]",
                        type: "action",
                    },
                    {
                        key: "register-new-page",
                        label: "Register on WikiProject new-page list",
                        type: "registration",
                    },
                ],
                title: "Samson (遊戲)",
            },
            {
                key: "Category:Chibig遊戲",
                rows: [
                    {
                        action: categoryAction,
                        key: "category:Chibig遊戲",
                        label: "Create category page",
                        type: "action",
                    },
                    {
                        action: categoryAction,
                        key: "category:Chibig遊戲:talk-banner",
                        label: "Tag banner on [[Category talk:Chibig遊戲]]",
                        type: "bundled-action",
                    },
                    {
                        key: "category:Chibig遊戲:register-new-page",
                        label: "Register on WikiProject new-page list",
                        type: "registration",
                    },
                    {
                        action: categoryAction,
                        key: "category:Chibig遊戲:wikidata",
                        label: "Connect to [[d:Q123]]",
                        type: "bundled-action",
                    },
                ],
                title: "Category:Chibig遊戲",
            },
        ],
    );
});

test("pre-save fixes omit review rows that are not included", () => {
    const redirectAction = {
        displayLabel: "Redirect to [[Samson (遊戲)]]",
        id: "redirect:薩姆森 (遊戲)",
        pageTitle: "薩姆森 (遊戲)",
        selected: false,
        type: "redirect",
    };
    const talkAction = {
        displayLabel: "Tag banner on [[Talk:Samson (遊戲)]]",
        id: "talk-banner",
        pageTitle: "Samson (遊戲)",
        selected: true,
        type: "talk-banner",
    };

    assert.deepEqual(
        createPreSaveGroups([redirectAction, talkAction], {
            registerNewPage: false,
        }),
        [
            {
                key: "Samson (遊戲)",
                rows: [
                    {
                        action: talkAction,
                        key: "talk-banner",
                        label: "Tag banner on [[Talk:Samson (遊戲)]]",
                        type: "action",
                    },
                ],
                title: "Samson (遊戲)",
            },
        ],
    );
});

test("pre-save category fixes show Wikidata work without a known item", () => {
    const categoryAction = {
        category: "Frontier Developments游戏",
        company: "Frontier Developments",
        displayLabel: "Create category page",
        englishName: "Category:Frontier Developments games",
        id: "category:Frontier Developments游戏",
        pageTitle: "Category:Frontier Developments游戏",
        selected: true,
        type: "category",
        wikidataId: "",
    };
    const groups = createPreSaveGroups([categoryAction], {
        registerNewPage: false,
    });

    assert.deepEqual(
        groups[0].rows.map((row) => row.label),
        [
            "Create category page",
            "Tag banner on [[Category talk:Frontier Developments游戏]]",
            "Connect matching Wikidata category item",
        ],
    );
});

test("pre-save submit uses the current page title with disambiguation", async () => {
    let preparedTitle;
    let submitted;
    let submittedHistoryPage;
    let moveCount = 0;
    const component = createDialogComponent(
        createVueStub(),
        createOptionsStub({
            currentTitle: "Samson (遊戲)",
            defaultName: "Samson",
            onMoveTarget() {
                moveCount += 1;
            },
            onSubmit(_form, _state, _close, preSave) {
                submitted = preSave;
            },
            onSubmitHistory(_form, page) {
                submittedHistoryPage = page;
            },
            async onPreSavePrepare(_form, title) {
                preparedTitle = title;

                return {
                    actions: [],
                    move: {
                        enabled: true,
                        to: "中文名",
                    },
                };
            },
        }),
    );
    const state = component.setup();

    state.form.name = "Article prose title";
    await window.createVgStubDialog.submit();
    state.preSaveMoveEnabled.value = false;
    await component.methods.confirmSubmit();

    assert.equal(moveCount, 0);
    assert.equal(preparedTitle, "Samson (遊戲)");
    assert.equal(submittedHistoryPage, "Samson (遊戲)");
    assert.equal(submitted.move.enabled, false);
    assert.equal(submitted.move.to, "Samson (遊戲)");
});

test("enwiki lookup fills wikidata and blank English title", async () => {
    let fetchedSteamUrl = "";
    const openedLinks = [];
    const focusedLinks = [];
    globalThis.window.open = (url, target) => {
        openedLinks.push([url, target]);

        return {
            focus() {
                focusedLinks.push(url);
            },
        };
    };
    const component = createDialogComponent(
        createVueStub(),
        createOptionsStub({
            async onEnwikiTitleChange(title) {
                assert.equal(title, "Example Game");

                return {
                    metacriticId: "example-game",
                    openCriticId: "6789",
                    steamId: "12345",
                    title: "Example Game",
                    wikidataId: "Q123",
                };
            },
            async onSteamNamesFetch(url, options) {
                fetchedSteamUrl = url;
                assert.deepEqual(options, {
                    includeJapanese: false,
                });

                return [{ hans: true, name: "简体名" }];
            },
        }),
    );
    const { fetchedSteamNameRows, form, getEnwikiTipLinks, steamUrl } =
        component.setup();

    form.enwikiTitle = "Example Game";
    await component.methods.updateEnwikiTitle();

    assert.equal(form.wikidataId, "Q123");
    assert.equal(form.englishName, "Example Game");
    assert.equal(
        form.metacriticScoreSourceUrl,
        "https://www.metacritic.com/game/example-game/",
    );
    assert.equal(
        form.openCriticRecommendSourceUrl,
        "https://opencritic.com/game/6789/-",
    );
    assert.equal(steamUrl.value, "https://store.steampowered.com/app/12345/");
    assert.equal(fetchedSteamUrl, "https://store.steampowered.com/app/12345/");
    assert.deepEqual(fetchedSteamNameRows.value, [
        { hans: true, name: "简体名" },
    ]);
    assert.deepEqual(openedLinks, [
        ["https://www.metacritic.com/game/example-game/", "_blank"],
        ["https://opencritic.com/game/6789/-", "_blank"],
    ]);
    assert.deepEqual(focusedLinks, [
        "https://www.metacritic.com/game/example-game/",
    ]);
    assert.deepEqual(getEnwikiTipLinks(), [
        {
            label: "Wikidata",
            url: "https://www.wikidata.org/wiki/Q123",
            value: "Q123",
        },
        {
            label: "Metacritic",
            url: "https://www.metacritic.com/game/example-game/",
            value: "example-game",
        },
        {
            label: "OpenCritic",
            url: "https://opencritic.com/game/6789/-",
            value: "6789",
        },
        {
            label: "Steam",
            url: "https://store.steampowered.com/app/12345/",
            value: "12345",
        },
    ]);
});

test("enwiki lookup opens review links only once for the same URLs", async () => {
    const openedLinks = [];
    globalThis.window.open = (url, target) => {
        openedLinks.push([url, target]);

        return {
            focus() {},
        };
    };
    const component = createDialogComponent(
        createVueStub(),
        createOptionsStub({
            async onEnwikiTitleChange() {
                return {
                    metacriticId: "example-game",
                    openCriticId: "6789",
                    title: "Example Game",
                    wikidataId: "Q123",
                };
            },
        }),
    );
    const { form } = component.setup();

    form.enwikiTitle = "Example Game";
    await component.methods.updateEnwikiTitle();
    await component.methods.updateEnwikiTitle();

    assert.deepEqual(openedLinks, [
        ["https://www.metacritic.com/game/example-game/", "_blank"],
        ["https://opencritic.com/game/6789/-", "_blank"],
    ]);
});

test("history fill rechecks enwiki wikidata for the loaded title", async () => {
    let resolveMetadata;
    let resolveCitations;
    const metadataPromise = new Promise((resolve) => {
        resolveMetadata = resolve;
    });
    const citationsPromise = new Promise((resolve) => {
        resolveCitations = resolve;
    });
    const calls = [];
    const component = createDialogComponent(
        createVueStub(),
        createOptionsStub({
            onEnwikiTitleChange(title) {
                calls.push(title);

                if (title === "Lookup Game") {
                    return metadataPromise;
                }

                return {
                    title,
                    wikidataId: "Q999",
                };
            },
            onPrepareCitations() {
                return citationsPromise;
            },
        }),
    );
    const { form, historyLoading, historyOpen } = component.setup();

    form.enwikiTitle = "Lookup Game";
    const lookup = component.methods.updateEnwikiTitle();

    component.methods.openHistoryDialog();
    const fill = component.methods.fillHistoryEntry({
        data: {
            input: {
                enwikiTitle: "Stored Game",
                name: "Stored name",
            },
            patches: {},
            version: 1,
        },
        id: 1,
        metadata: {
            page: "Stored name",
            savedAt: "2026-06-28",
        },
    });
    assert.equal(historyLoading.value, true);
    assert.equal(component.template.includes("<cdx-progress-bar"), true);
    assert.equal(historyOpen.value, true);

    resolveMetadata({
        title: "Lookup Game",
        wikidataId: "Q123",
    });
    await lookup;
    assert.equal(historyOpen.value, true);

    resolveCitations([]);
    await fill;

    assert.equal(form.enwikiTitle, "Stored Game");
    assert.equal(form.name, "Stored name");
    assert.equal(form.wikidataId, "Q999");
    assert.equal(historyLoading.value, false);
    assert.equal(historyOpen.value, false);
    assert.deepEqual(calls, ["Lookup Game", "Stored Game"]);
});

test("enwiki lookup offers Metacritic search without an ID", async () => {
    const component = createDialogComponent(
        createVueStub(),
        createOptionsStub({
            async onEnwikiTitleChange() {
                return {
                    title: "Example Game (video game)",
                    wikidataId: "Q123",
                };
            },
        }),
    );
    const { form, getEnwikiTipLinks } = component.setup();

    form.enwikiTitle = "Example Game (video game)";
    await component.methods.updateEnwikiTitle();

    assert.equal(form.metacriticScoreSourceUrl, "");
    assert.equal(form.openCriticRecommendSourceUrl, "");
    assert.deepEqual(getEnwikiTipLinks(), [
        {
            label: "Wikidata",
            url: "https://www.wikidata.org/wiki/Q123",
            value: "Q123",
        },
        {
            label: "Metacritic",
            url:
                "https://www.google.com/search?q=" +
                "%22Example%20Game%22%20site%3Ametacritic.com",
            value: "search",
        },
        {
            label: "OpenCritic",
            url:
                "https://www.google.com/search?q=" +
                "%22Example%20Game%22%20site%3Aopencritic.com%2Fgame",
            value: "search",
        },
        {
            label: "Steam",
            url:
                "https://www.google.com/search?q=" +
                "%22Example%20Game%22%20site%3Astore.steampowered.com%2Fapp",
            value: "search",
        },
    ]);
});

test("enwiki lookup offers Wikidata search without an item", async () => {
    const component = createDialogComponent(
        createVueStub(),
        createOptionsStub({
            async onEnwikiTitleChange() {
                return {
                    pageExists: true,
                    title: "Example Game (video game)",
                };
            },
        }),
    );
    const { form, getEnwikiTipLinks } = component.setup();

    form.enwikiTitle = "Example Game (video game)";
    await component.methods.updateEnwikiTitle();

    assert.deepEqual(getEnwikiTipLinks()[0], {
        label: "Wikidata",
        url:
            "https://www.google.com/search?q=" +
            "%22Example%20Game%22%20site%3Awikidata.org%2Fwiki",
        value: "not connected",
    });
});

test("enwiki lookup distinguishes a missing English page", async () => {
    const component = createDialogComponent(
        createVueStub(),
        createOptionsStub({
            async onEnwikiTitleChange() {
                return {
                    pageExists: false,
                    title: "Missing Game",
                };
            },
        }),
    );
    const { form, getEnwikiTipLinks } = component.setup();

    form.enwikiTitle = "Missing Game";
    await component.methods.updateEnwikiTitle();

    assert.equal(getEnwikiTipLinks()[0].value, "no enwiki page");
});

test("enwiki lookup hides fallback links until Wikidata lookup settles", async () => {
    let resolveMetadata;
    const metadataPromise = new Promise((resolve) => {
        resolveMetadata = resolve;
    });
    const component = createDialogComponent(
        createVueStub(),
        createOptionsStub({
            onEnwikiTitleChange() {
                return metadataPromise;
            },
        }),
    );
    const { form, getEnwikiTipLinks } = component.setup();

    form.enwikiTitle = "Final Fantasy (video game)";
    const lookup = component.methods.updateEnwikiTitle();

    assert.deepEqual(
        getEnwikiTipLinks().map(({ label, value, url }) => ({
            label,
            value,
            url,
        })),
        [
            { label: "Wikidata", value: "checking...", url: "" },
            { label: "Metacritic", value: "checking...", url: "" },
            { label: "OpenCritic", value: "checking...", url: "" },
            { label: "Steam", value: "checking...", url: "" },
        ],
    );

    resolveMetadata({
        metacriticId: "final-fantasy",
        title: "Final Fantasy (video game)",
        wikidataId: "Q1415970",
    });
    await lookup;

    assert.deepEqual(getEnwikiTipLinks(), [
        {
            label: "Wikidata",
            url: "https://www.wikidata.org/wiki/Q1415970",
            value: "Q1415970",
        },
        {
            label: "Metacritic",
            url: "https://www.metacritic.com/game/final-fantasy/",
            value: "final-fantasy",
        },
        {
            label: "OpenCritic",
            url:
                "https://www.google.com/search?q=" +
                "%22Final%20Fantasy%22%20site%3Aopencritic.com%2Fgame",
            value: "search",
        },
        {
            label: "Steam",
            url:
                "https://www.google.com/search?q=" +
                "%22Final%20Fantasy%22%20site%3Astore.steampowered.com%2Fapp",
            value: "search",
        },
    ]);
});

test("enwiki lookup preserves entered source and Steam URLs", async () => {
    let steamFetchCount = 0;
    const component = createDialogComponent(
        createVueStub(),
        createOptionsStub({
            async onEnwikiTitleChange() {
                return {
                    metacriticId: "fetched-game",
                    openCriticId: "6789",
                    steamId: "12345",
                    title: "Example Game",
                    wikidataId: "Q123",
                };
            },
            async onSteamNamesFetch() {
                steamFetchCount += 1;
                return [];
            },
        }),
    );
    const { form, steamUrl } = component.setup();

    form.enwikiTitle = "Example Game";
    form.metacriticScoreSourceUrl = "https://example.test/metacritic";
    form.openCriticRecommendSourceUrl = "https://example.test/opencritic";
    steamUrl.value = "https://store.steampowered.com/app/999/";
    await component.methods.updateEnwikiTitle();

    assert.equal(
        form.metacriticScoreSourceUrl,
        "https://example.test/metacritic",
    );
    assert.equal(
        form.openCriticRecommendSourceUrl,
        "https://example.test/opencritic",
    );
    assert.equal(steamUrl.value, "https://store.steampowered.com/app/999/");
    assert.equal(steamFetchCount, 0);
});

test("enwiki lookup removes disambiguation from blank English title", async () => {
    const component = createDialogComponent(
        createVueStub(),
        createOptionsStub({
            async onEnwikiTitleChange() {
                return {
                    title: "Example Game (video game)",
                    wikidataId: "Q123",
                };
            },
        }),
    );
    const { form } = component.setup();

    form.enwikiTitle = "Example Game (video game)";
    await component.methods.updateEnwikiTitle();

    assert.equal(form.wikidataId, "Q123");
    assert.equal(form.englishName, "Example Game");
});

test("enwiki lookup preserves an entered English title", async () => {
    const component = createDialogComponent(
        createVueStub(),
        createOptionsStub({
            async onEnwikiTitleChange() {
                return {
                    title: "Fetched title",
                    wikidataId: "Q123",
                };
            },
        }),
    );
    const { form } = component.setup();

    form.enwikiTitle = "Example Game";
    form.englishName = "Entered title";
    await component.methods.updateEnwikiTitle();

    assert.equal(form.wikidataId, "Q123");
    assert.equal(form.englishName, "Entered title");
});

test("enwiki lookup ignores failed metadata fetches", async () => {
    const component = createDialogComponent(
        createVueStub(),
        createOptionsStub({
            async onEnwikiTitleChange() {
                throw new Error("Nope");
            },
        }),
    );
    const { form } = component.setup();

    form.enwikiTitle = "Example Game";
    await component.methods.updateEnwikiTitle();

    assert.equal(form.wikidataId, "");
    assert.equal(form.englishName, "");
});

function createVueStub() {
    return {
        computed(callback) {
            return {
                get value() {
                    return callback();
                },
            };
        },
        nextTick(callback) {
            callback();
        },
        onBeforeUnmount() {},
        reactive(value) {
            return value;
        },
        ref(value) {
            return { value };
        },
        watch() {},
    };
}

function installCodeMirrorStub() {
    const codeMirror = {
        instances: [],
        modules: [],
    };

    class CodeMirrorStub {
        constructor(textarea) {
            this.textarea = textarea;
            this.value = textarea.value;
            codeMirror.instances.push(this);
        }

        getValue() {
            return this.value;
        }

        initialize() {}

        setValue(value) {
            this.value = value;
        }
    }

    globalThis.mw = {
        loader: {
            async using(modules) {
                codeMirror.modules = modules;

                return (module) => {
                    if (module === "ext.CodeMirror") {
                        return CodeMirrorStub;
                    }

                    if (module === "ext.CodeMirror.mode.mediawiki") {
                        return () => ({ language: "mediawiki" });
                    }

                    return undefined;
                };
            },
        },
    };

    return codeMirror;
}

function installDelayedCodeMirrorStub() {
    let resolveUsing;
    const codeMirror = {
        instances: [],
        modules: [],
        resolve() {
            resolveUsing();
        },
    };

    class CodeMirrorStub {
        constructor(textarea) {
            this.textarea = textarea;
            this.value = textarea.value;
            codeMirror.instances.push(this);
        }

        destroy() {}

        getValue() {
            return this.value;
        }

        initialize() {}

        setValue(value) {
            this.value = value;
        }
    }

    globalThis.mw = {
        loader: {
            using(modules) {
                codeMirror.modules = modules;

                return new Promise((resolve) => {
                    resolveUsing = () =>
                        resolve((module) => {
                            if (module === "ext.CodeMirror") {
                                return CodeMirrorStub;
                            }

                            if (module === "ext.CodeMirror.mode.mediawiki") {
                                return () => ({ language: "mediawiki" });
                            }

                            return undefined;
                        });
                });
            },
        },
    };

    return codeMirror;
}

function createTextareaRef() {
    const textarea = {
        tagName: "TEXTAREA",
        value: "",
    };

    return {
        textarea,
        querySelector(selector) {
            return selector === "textarea" ? textarea : null;
        },
    };
}

function createExpectedBlankNameRow() {
    return {
        cn: false,
        hans: false,
        hant: false,
        hk: false,
        name: "",
        official: false,
        sourceUrl: "",
        tw: false,
        ww: false,
    };
}

function createOptionsStub(options = {}) {
    return {
        defaultName: "Example",
        getProseSinographs() {
            return 0;
        },
        getProseWikitext() {
            return "";
        },
        getPageUrl(title) {
            return `/wiki/${title}`;
        },
        getFieldPlaceholder() {},
        getHistoryEntries() {
            return [];
        },
        onActivate() {},
        onCategoryRowsRefresh() {},
        onClearHistory() {},
        async onCheckRedirectRows(rows) {
            return rows;
        },
        async onCheckPageTitle() {
            return { exists: false };
        },
        onCreateCategoryRow() {},
        onDeleteHistoryEntry() {},
        onFormChange() {},
        onFetchPageText() {
            return "";
        },
        onPreview() {},
        onMoveTarget() {},
        onParsePreview() {
            return "";
        },
        onPrepareCompanyCategory() {},
        async onPrepareReview() {
            return [];
        },
        async onPrepareRedirectRows() {
            return [];
        },
        async onPreSavePrepare() {
            return {
                actions: [],
            };
        },
        onResetCategoryRow() {},
        onSaveCategory() {},
        onSaveCompanyCategory() {},
        onSubmit() {},
        onSubmitHistory() {},
        onUpdateCategoryRowCategory() {},
        ...options,
    };
}
