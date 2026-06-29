/**
 * Tests create-vg-stub dialog behavior.
 */

import assert from "node:assert/strict";
import test, { afterEach, beforeEach } from "node:test";

import {
    StyleSheet,
    createDialogComponent,
    createPreSaveGroups,
} from "../src/interface/form.js";

const originalWindow = globalThis.window;
beforeEach(() => {
    globalThis.window = {};
});

afterEach(() => {
    globalThis.window = originalWindow;
    delete globalThis.__CREATE_VG_STUB_FIELD_DATA__;
});

test("StyleSheet serializes selector arrays and nested media rules", () => {
    const styles = new StyleSheet()
        .add([".example", ".example-alt"], {
            fontSize: "12px",
        })
        .media("(max-width: 640px)", (sheet) => {
            sheet.add(".example", {
                fontSize: "10px",
            });
        });

    assert.equal(
        styles.toString(),
        ".example,\n" +
            ".example-alt {\n" +
            "  font-size: 12px;\n" +
            "}\n\n" +
            "@media (max-width: 640px) {\n" +
            "  .example {\n" +
            "    font-size: 10px;\n" +
            "  }\n" +
            "}",
    );
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
        "JSON must contain structured history data.",
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

test("live source and name row updates trim values", () => {
    const component = createDialogComponent(
        createVueStub(),
        createOptionsStub(),
    );
    const { form, moveTarget } = component.setup();

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
    const { form, getCitationParamRows, groups } = component.setup();

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
    assert.deepEqual(groups.map((group) => group.label).slice(-2), [
        "References",
        "Checks",
    ]);
    assert.equal(
        component.template.includes("Reference {{ citation.index }}"),
        true,
    );
    assert.equal(component.template.includes("Add param"), true);
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
    assert.equal(component.template.includes('<cdx-text-area rows="1"'), true);
    assert.deepEqual(
        groups.map((group) => group.label),
        [
            "Titles",
            "Metadata",
            "Localized names",
            "Prose",
            "References",
            "Checks",
        ],
    );
    assert.equal(
        component.template.includes(
            '<p class="create-vg-stub-prose-length" v-if="group.key === \'prose\'">',
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
            component.template.indexOf("<h3>NoteTA items</h3>"),
        true,
    );
});

test("group action buttons keep their intended alignment", () => {
    const component = createDialogComponent(
        createVueStub(),
        createOptionsStub(),
    );

    assertActionFooterAlignment(
        component.template,
        'v-on:click="clearNameRows(group.nameGroupKey)"',
        "flex-start",
    );
    assertActionFooterAlignment(
        component.template,
        'v-on:click="addCitationParam(citationIndex)"',
        "flex-start",
    );
    assertActionFooterAlignment(
        component.template,
        'v-on:click="regenerateNoteTaRows"',
        "flex-end",
    );
    assertActionFooterAlignment(
        component.template,
        'v-on:click="checkRedirectRows"',
        "flex-end",
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
    assert.equal(component.template.includes(">Sort<"), true);
    assert.equal(component.template.includes(">Regenerate<"), true);
    assert.equal(component.template.includes("<h3>NoteTA items</h3>"), true);
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
    const { form } = component.setup();

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
    ]);
    assert.equal(
        component.methods.formatRedirectStatusLabel("Missing"),
        "New",
    );
    form.redirectRows[0].enabled = false;
    await component.methods.checkRedirectRows();
    assert.equal(redirectCheckCount, 0);
    assert.equal(form.redirectRows[0].enabled, false);
    component.methods.updateRedirectRowTitle(0, "Existing redirect");
    assert.equal(form.redirectRows[0].fixed, false);
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
        false,
    );
    component.methods.addCategoryRow();
    assert.equal(form.categoryRows.length, 1);
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
    assert.equal(form.categoryRows.length, 0);
    assert.deepEqual(form.navboxRows, [
        {
            fixed: true,
            fixedText: "{{Foo series}}",
            enabled: true,
            status: "",
            text: "{{Foo series}}",
            title: "Foo series",
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
    ]);
    component.methods.removeNavboxRow(0);
    await component.methods.previewForm();
    assert.deepEqual(form.navboxRows, []);

    assert.equal(component.template.includes("<h3>Categories</h3>"), true);
    assert.equal(
        component.template.includes("<section><h3>Categories</h3>"),
        true,
    );
    assert.equal(
        component.template.indexOf("<h3>Redirects</h3>") <
            component.template.indexOf("<h3>Categories</h3>"),
        true,
    );
    assert.equal(
        component.template.indexOf("<h3>Categories</h3>") <
            component.template.indexOf("<h3>Navboxes</h3>"),
        true,
    );
    assert.equal(component.template.includes("Add category"), true);
    assert.equal(component.template.includes("Add redirect"), true);
    assert.equal(component.template.includes("Redirects"), true);
    assert.equal(component.template.includes("Check redirects"), true);
    assert.equal(component.template.includes("Add navbox"), true);
    assert.equal(component.template.includes("Navboxes"), true);
    assert.equal(
        component.template.includes('v-model="redirect.enabled"'),
        true,
    );
    assert.equal(
        component.template.includes('v-model="redirect.title"'),
        true,
    );
    assert.equal(
        component.template.includes("create-vg-stub-review-row-converted"),
        false,
    );
    assert.equal(component.template.includes("redirect.variantMixed"), false);
    assert.equal(component.template.includes("row.variantMixed"), false);
    assert.equal(
        component.template.includes("removeRedirectRow(index)"),
        true,
    );
    assert.equal(
        component.template.includes(
            'v-on:update:model-value="updateRedirectRowTitle(index, $event)"',
        ),
        true,
    );
    assert.equal(
        component.template.includes("removeCategoryRow(index)"),
        true,
    );
    assert.equal(
        component.template.includes("create-vg-stub-category-actions"),
        false,
    );
    assert.equal(
        component.template.includes('v-model="navbox.enabled"'),
        true,
    );
    assert.equal(component.template.includes('v-model="row.enabled"'), true);
    assert.equal(
        component.template.includes('v-model="row.stubTagEnabled"'),
        false,
    );
    assert.equal(component.template.includes("{{stub}}"), false);
    assert.equal(component.template.includes("<h3>Stub tags</h3>"), true);
    assert.equal(
        component.template.includes(
            'v-for="(stubTag, index) in stubTagRows"',
        ),
        true,
    );
    assert.equal(
        component.template.includes(
            'v-on:update:model-value="updateStubTagRow(index, $event)"',
        ),
        true,
    );
    assert.equal(
        component.template.includes('v-on:click="removeStubTagRow(index)"'),
        true,
    );
    assert.equal(component.template.includes("Add stub tag"), true);
    assert.equal(
        component.template.includes('class="create-vg-stub-review-action"'),
        true,
    );
    assert.equal(
        component.template.includes('v-on:click="resetCategoryRow(index)"'),
        false,
    );
    assert.equal(component.template.includes('v-model="row.category"'), true);
    assert.equal(
        component.template.includes(
            'v-on:update:model-value="updateCategoryRowCategory(index, $event)"',
        ),
        true,
    );
    assert.equal(
        component.template.includes(
            'v-on:blur="checkCategoryRow(index, $event)"',
        ),
        true,
    );
    assert.equal(component.template.includes('v-model="navbox.text"'), true);
    assert.equal(
        component.template.includes(
            'v-on:update:model-value="updateNavboxRow(index, $event)"',
        ),
        true,
    );
    assert.equal(
        component.template.includes(
            'v-on:blur="checkNavboxRow(index, $event)"',
        ),
        true,
    );
    assert.equal(
        component.template.includes('v-on:click="checkNavboxRows"'),
        false,
    );
    assert.equal(component.template.includes("Footer:"), false);
    for (const action of [
        "addCategoryRow",
        "rebuildCategoryRows",
        "addNavboxRow",
        "rebuildNavboxRows",
    ]) {
        const button = component.template.match(
            new RegExp(`<cdx-button[^>]*v-on:click="${action}"[^>]*>`, "u"),
        )?.[0];

        assert.equal(button?.includes('action="progressive"'), false);
        assert.equal(button?.includes('weight="primary"'), false);
    }
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
            stubTag: "Foo-stub",
        },
        {
            enabled: false,
            originalEnabled: false,
            originalStubTag: "Bar-stub",
            stubTag: "Bar-stub",
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
        ],
    );
    assert.equal(
        component.methods.formatStubTagLabel("{{Bar-stub}}"),
        "{{Bar-stub}}",
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
    assert.equal(component.methods.formatCategorySourceLabel("found"), "Found");
    assert.equal(component.methods.formatCategorySourceLabel("known"), "Known");
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
    assert.equal(component.methods.formatCategorySourceLabel("manual"), "Manual");

    const existingRow = {
        enabled: true,
        status: "OK",
        text: "{{Example series}}",
        title: "Example series",
    };
    await component.methods.openNavboxEdit(existingRow);
    assert.equal(fetchedTitle, "Template:Example series");
    assert.equal(pageEditOpen.value, true);
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
        summary: "modify 'Template:Example series', with link to '[[Example]]'",
        text: "{{Edited navbox}}",
        title: "Template:Example series",
    });
    assert.equal(existingRow.status, "Pending edit");
    await component.methods.openNavboxEdit(existingRow);
    assert.equal(pageEditState.pending, true);
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
    assert.equal(pageEditState.title, "Template:Missing series");
    assert.equal(pageEditState.text, "");
    pageEditState.text = "{{New navbox}}";
    component.methods.stagePageEdit();
    assert.deepEqual(missingRow.pendingEdit, {
        create: true,
        previousStatus: "Not exists",
        summary: "create 'Template:Missing series', with link to '[[Example]]'",
        text: "{{New navbox}}",
        title: "Template:Missing series",
    });
    assert.equal(missingRow.status, "Pending creation");
    assert.equal(
        component.template.includes(
            "{{ navbox.pendingEdit ? 'Pending' : navbox.status === 'OK' ? 'Edit' : 'Create' }}",
        ),
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
    const component = createDialogComponent(
        createVueStub(),
        createOptionsStub({
            async onEnwikiTitleChange(title) {
                assert.equal(title, "Category:Foo Studio games");

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
        component.template.includes('v-on:click="openCategoryEdit(row)"'),
        true,
    );
    assert.equal(component.template.includes("openCategoryView"), false);
    assert.equal(component.template.includes("'Edit' : 'Create'"), true);
    assert.equal(component.template.includes(">Remove</cdx-button>"), true);
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
    companyCategoryState.text = "Category text";
    await component.methods.saveCompanyCategory();
    assert.deepEqual(genericRow.pendingCreation, {
        englishName: "",
        previousStatus: "Not exists",
        text: "Category text",
        wikidataId: "",
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
    assert.equal(component.template.includes(">Cancel</cdx-button>"), true);
    assert.equal(component.template.includes(">Delete</cdx-button>"), true);
    assert.equal(component.template.includes(">Done</cdx-button>"), true);
    assert.equal(component.template.includes(">Close</cdx-button>"), false);
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
            "{{ row.pendingCreation || row.pendingEdit ? 'Pending' : row.status === 'OK' ? 'Edit' : 'Create' }}",
        ),
        true,
    );
    assert.equal(
        component.template.includes(
            "{{ formatCategorySourceLabel(row.source) }}",
        ),
        true,
    );
    assert.equal(
        component.template.includes("formatCategorySourceTitle(row.source)"),
        true,
    );
    assert.equal(
        component.template.includes('v-on:click="openCategoryEdit(row)"'),
        true,
    );
    assert.equal(
        component.template.includes("English Wikipedia category"),
        true,
    );
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
    const { fetchedSteamNameRows, form, getSteamNameSuggestions } =
        component.setup();

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

    component.methods.applySteamNameChoice("both");

    assert.deepEqual(
        form.localizedNames
            .slice(0, 2)
            .map((row) => [
                row.official,
                row.hans,
                row.hant,
                row.name,
                row.sourceUrl,
            ]),
        [
            [
                true,
                true,
                false,
                "简体名",
                "https://store.steampowered.com/app/123/example/?l=schinese",
            ],
            [
                true,
                false,
                true,
                "繁體名",
                "https://store.steampowered.com/app/123/example/?l=tchinese",
            ],
        ],
    );
    assert.deepEqual(fetchedSteamNameRows.value, []);
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

    component.methods.applySteamNameChoice("both");
    assert.deepEqual(
        form.localizedNames.map((row) => row.name),
        ["简体名"],
    );
});

test("Steam helper can merge or blank fetched localized names", async () => {
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
    component.methods.applySteamNameChoice("merge");

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
        ww: true,
    });

    await component.methods.addSteamNames();
    component.methods.applySteamNameChoice("other");

    assert.equal(form.localizedNames[1].name, "");
    assert.equal(form.localizedNames[1].ww, false);
    assert.equal(form.localizedNames[1].hans, false);
    assert.equal(form.localizedNames[1].hant, false);
    assert.equal(
        form.localizedNames[1].sourceUrl,
        "https://store.steampowered.com/app/123/example/?l=schinese\n" +
            "https://store.steampowered.com/app/123/example/?l=tchinese",
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
    component.methods.clearForm();

    assert.equal(activeTab.value, "titles");
    assert.equal(form.name, "");
    assert.equal(form.publishers, "");
    assert.deepEqual(form.categoryRows, []);
    assert.equal(steamUrl.value, "");
    assert.deepEqual(fetchedSteamNameRows.value, []);
    assert.equal(component.template.includes('v-on:click="clearForm"'), true);
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

    assert.deepEqual(form.localizedNames, []);
    assert.equal(
        component.template.includes(
            'v-on:click="clearNameRows(group.nameGroupKey)">Clear</cdx-button>',
        ),
        true,
    );
});

test("field preview callback receives live form and preview key", () => {
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
        true,
    );
    assert.equal(
        component.template.includes('v-for="link in getEnwikiTipLinks()"'),
        true,
    );
    assert.equal(
        component.template.includes("<strong>{{ link.label }}</strong>"),
        true,
    );
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
    const { activeTab, preSaveOpen, previewOpen } = component.setup();

    assert.equal(activeTab.value, "titles");
    await component.methods.submitForm();

    assert.equal(activeTab.value, "titles");
    assert.equal(refreshCount, 1);
    assert.equal(previewCount, 1);
    assert.equal(previewOpen.value, true);
    assert.equal(preSaveOpen.value, false);
    assert.equal(component.template.includes("preSaveGroups"), true);
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
    assert.equal(previewOpen.value, true);
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
    assert.equal(component.template.includes('v-model="previewText"'), true);
    assert.equal(component.template.includes('v-model="previewSummary"'), true);
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
    assert.equal(component.template.includes("'Preview and submit'"), true);
    assert.equal(component.template.includes(">Continue<"), true);
    assert.equal(
        component.template.indexOf(">Move<") <
            component.template.indexOf('v-on:click="submitForm"'),
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
        displayLabel:
            "Tagging {{WikiProject Video games}} to [[Talk:Samson (遊戲)]]",
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
    };

    assert.deepEqual(
        createPreSaveGroups(
            [redirectAction, talkAction, categoryAction],
            { registerNewPage: true },
        ),
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
                        label:
                            "Tagging {{WikiProject Video games}} to [[Talk:Samson (遊戲)]]",
                        type: "action",
                    },
                    {
                        key: "register-new-page",
                        label:
                            "Register on WikiProject Video games' new-page list",
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
                        key: "category:Chibig遊戲:wikidata",
                        label: "Connect to matching Wikidata item",
                        type: "bundled-action",
                    },
                    {
                        action: categoryAction,
                        key: "category:Chibig遊戲:talk-banner",
                        label:
                            "Tagging {{WikiProject Video games}} to [[Category talk:Chibig遊戲]]",
                        type: "bundled-action",
                    },
                    {
                        key: "category:Chibig遊戲:register-new-page",
                        label:
                            "Register on WikiProject Video games' new-page list",
                        type: "registration",
                    },
                ],
                title: "Category:Chibig遊戲",
            },
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
        }),
    );
    const { form, getEnwikiTipLinks, steamUrl } = component.setup();

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
    const { form, historyOpen } = component.setup();

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

function assertActionFooterAlignment(template, marker, justifyContent) {
    const markerIndex = template.indexOf(marker);
    assert.notEqual(markerIndex, -1);

    const footerIndex = template.lastIndexOf("<div style=", markerIndex);
    assert.notEqual(footerIndex, -1);

    const footerStart = template.slice(
        footerIndex,
        template.indexOf(">", footerIndex),
    );
    assert.equal(
        footerStart.includes(`justify-content: ${justifyContent}`),
        true,
    );
}

function createVueStub() {
    return {
        computed(callback) {
            return {
                get value() {
                    return callback();
                },
            };
        },
        reactive(value) {
            return value;
        },
        ref(value) {
            return { value };
        },
        watch() {},
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
