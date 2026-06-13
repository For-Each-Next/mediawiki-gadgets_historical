/**
 * Tests create-vg-stub dialog behavior.
 */

import assert from "node:assert/strict";
import test, { afterEach, beforeEach } from "node:test";

import { StyleSheet, createDialogComponent } from "../src/interface/form.js";

const originalWindow = globalThis.window;

beforeEach(() => {
    globalThis.window = {};
});

afterEach(() => {
    globalThis.window = originalWindow;
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

test("history JSON can be copied, edited, and imported", () => {
    const entry = {
        citations: {
            "https://example.test/source": "{{cite web|title=Example}}",
        },
        form: {
            name: "Stored name",
            year: "2025",
        },
        id: "stored-entry",
        page: "Stored page",
        savedAt: "2026-06-13",
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
        historyJsonError,
        historyJsonOpen,
        historyJsonText,
        historyOpen,
    } = component.setup();

    component.methods.openHistoryDialog();
    component.methods.openHistoryJsonDialog(entry);

    assert.equal(historyJsonOpen.value, true);
    assert.deepEqual(JSON.parse(historyJsonText.value), entry);

    historyJsonText.value = JSON.stringify({
        form: {
            name: "Imported name",
            year: "2026",
        },
    });
    component.methods.importHistoryJson();

    assert.equal(form.name, "Imported name");
    assert.equal(form.year, "2026");
    assert.equal(historyJsonError.value, "");
    assert.equal(historyJsonOpen.value, false);
    assert.equal(historyOpen.value, false);
    assert.equal(
        component.template.indexOf(">Fill<") <
            component.template.indexOf(">Import<"),
        true,
    );
});

test("invalid history JSON stays open and preserves the form", () => {
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
    component.methods.importHistoryJson();

    assert.equal(form.name, "");
    assert.equal(historyJsonOpen.value, true);
    assert.notEqual(historyJsonError.value, "");
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

test("additional prose uses a textarea and source URL field", () => {
    const component = createDialogComponent(
        createVueStub(),
        createOptionsStub(),
    );
    const { form, getArticleField } = component.setup();
    const field = getArticleField("additionalProse");

    assert.equal(form.additionalProse, "");
    assert.equal(form.additionalProseSourceUrl, "");
    assert.equal(field.multiline, true);
    assert.equal(field.sourceField.sourceKey, "additionalProseSourceUrl");
    assert.equal(field.placeholder, "Text appended after the generated prose");
    assert.equal(component.template.includes('<cdx-text-area rows="1"'), true);
});

test("review exposes editable navboxes and subtle prose length", async () => {
    const component = createDialogComponent(
        createVueStub(),
        createOptionsStub({
            getProseSinographs(form) {
                return form.additionalProse === "" ? 24 : 51;
            },
            async onPrepareReview(form) {
                return form.navboxRows?.length > 0
                    ? form.navboxRows
                    : ["{{Foo series}}"];
            },
        }),
    );
    const { form } = component.setup();

    assert.equal(component.methods.getProseSinographs(), 24);
    form.additionalProse = "補充文字";
    assert.equal(component.methods.getProseSinographs(), 51);
    form.series = "Foo";
    form.navboxRows = [];

    await component.methods.previewForm();
    assert.deepEqual(form.navboxRows, [
        {
            enabled: true,
            status: "",
            text: "{{Foo series}}",
            title: "Foo series",
        },
    ]);
    form.navboxRows[0].enabled = false;
    await component.methods.checkNavboxRows();
    assert.equal(form.navboxRows[0].enabled, false);
    component.methods.updateNavboxRow(0, "{{Edited series}}");
    component.methods.addNavboxRow();
    component.methods.updateNavboxRow(1, "{{Manual navbox}}");
    component.methods.removeNavboxRow(0);
    assert.deepEqual(form.navboxRows, [
        {
            enabled: true,
            status: "",
            text: "{{Manual navbox}}",
            title: "Manual navbox",
        },
    ]);
    component.methods.removeNavboxRow(0);
    await component.methods.previewForm();
    assert.deepEqual(form.navboxRows, []);

    assert.equal(component.template.includes("Prose length:"), true);
    assert.equal(
        component.template.includes("create-vg-stub-prose-length"),
        true,
    );
    assert.equal(component.template.includes("Add category"), true);
    assert.equal(component.template.includes("Add navbox"), true);
    assert.equal(component.template.includes("Navboxes"), true);
    assert.equal(
        component.template.includes('v-model="navbox.enabled"'),
        true,
    );
    assert.equal(component.template.includes('v-model="row.enabled"'), true);
    assert.equal(
        component.template.includes('v-model="row.stubTagEnabled"'),
        true,
    );
    assert.equal(component.template.includes("{{stub}}"), true);
    assert.equal(
        component.template.includes(
            "'Whether adding {{' + row.stubTag + '}}'",
        ),
        true,
    );
    assert.equal(component.template.includes("<h3>Stub tags</h3>"), false);
    assert.equal(
        component.template.includes('v-on:click="resetCategoryRow(index)"'),
        false,
    );
    assert.equal(
        component.template.includes('class="create-vg-stub-category-action"'),
        true,
    );
    assert.equal(component.template.includes('v-model="row.category"'), true);
    assert.equal(
        component.template.includes(
            'v-on:blur="checkCategoryRow(index, $event)"',
        ),
        true,
    );
    assert.equal(component.template.includes('v-model="navbox.text"'), true);
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

test("navbox review shows status and opens view or create dialogs", async () => {
    const saved = [];
    const component = createDialogComponent(
        createVueStub(),
        createOptionsStub({
            async onPrepareReview(form) {
                return form.navboxRows || [];
            },
            async onSaveNavbox(title, text) {
                saved.push([title, text]);
            },
        }),
    );
    const {
        categoryViewOpen,
        categoryViewState,
        navboxCreateOpen,
        navboxCreateState,
    } = component.setup();

    assert.equal(component.methods.formatNavboxStatusLabel("OK"), "OK");
    assert.equal(
        component.methods.formatNavboxStatusLabel("Not exists"),
        "Missing",
    );
    assert.equal(component.methods.formatNavboxStatusLabel(""), "Unchecked");

    component.methods.openNavboxView({
        title: "Example series",
    });
    assert.equal(categoryViewOpen.value, true);
    assert.equal(categoryViewState.title, "Template:Example series");
    assert.equal(categoryViewState.url, "/wiki/Template:Example series");

    component.methods.createNavbox({
        title: "Missing series",
    });
    assert.equal(navboxCreateOpen.value, true);
    assert.equal(navboxCreateState.title, "Missing series");
    assert.equal(navboxCreateState.text, "");

    navboxCreateState.text = "{{Navbox}}";
    await component.methods.saveNavbox();
    assert.deepEqual(saved, [["Missing series", "{{Navbox}}"]]);
    assert.equal(navboxCreateOpen.value, false);
    assert.equal(component.template.includes("Create Template:"), true);
    assert.equal(
        component.template.includes('v-model="navboxCreateState.text"'),
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
            async onPrepareCompanyCategory(row) {
                return `Text for ${row.company}`;
            },
        }),
    );
    const { companyCategoryOpen, companyCategoryState, form } =
        component.setup();
    const companyRow = {
        category: "Foo Studio游戏",
        company: "Foo Studio",
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
    companyCategoryState.text += "\nEdited";
    await component.methods.saveCompanyCategory();

    assert.deepEqual(companyRow.pendingCreation, {
        englishName: "Foo Studio games",
        text: "Text for Foo Studio\nEdited",
    });
    assert.equal(companyRow.status, "Pending creation");
    assert.equal(companyCategoryOpen.value, false);
    assert.equal(component.template.includes(">Pending</span>"), true);
    assert.equal(component.template.includes("Create Category:"), true);
    assert.equal(
        component.template.includes("English Wikipedia category"),
        true,
    );
    assert.equal(
        component.template.indexOf("English Wikipedia category") >
            component.template.indexOf(
                "'Create Category:' + companyCategoryState.category",
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
        text: "Category text",
    });
    assert.equal(
        component.methods.canCreateCategory({
            category: "动作游戏",
            status: "Not exists",
        }),
        true,
    );
});

test("category viewer opens for existing company and other category rows", () => {
    const component = createDialogComponent(
        createVueStub(),
        createOptionsStub({
            getCategoryPageUrl(category) {
                return `/wiki/Category:${category}`;
            },
        }),
    );
    const { categoryViewOpen, categoryViewState } = component.setup();

    component.methods.openCategoryView({
        category: "Foo Studio游戏",
        company: "Foo Studio",
        status: "OK",
    });

    assert.equal(categoryViewOpen.value, true);
    assert.equal(categoryViewState.title, "Category:Foo Studio游戏");
    assert.equal(categoryViewState.url, "/wiki/Category:Foo Studio游戏");

    component.methods.closeCategoryView();
    assert.equal(categoryViewOpen.value, false);

    component.methods.openCategoryView({
        category: "动作游戏",
        status: "OK",
    });
    assert.equal(categoryViewState.url, "/wiki/Category:动作游戏");
    assert.equal(component.template.includes(">View</cdx-button>"), true);
    assert.equal(
        component.template.includes('v-bind:src="categoryViewState.url"'),
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

    assert.deepEqual(
        getSteamNameSuggestions(fetchedSteamNameRows.value),
        [
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
        ],
    );

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

test("localized name rows visually distinguish official and regions", () => {
    const component = createDialogComponent(
        createVueStub(),
        createOptionsStub(),
    );

    assert.equal(
        component.template.includes(
            '<span class="create-vg-stub-name-market-label">Regions:</span>',
        ),
        true,
    );
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
        component.template.includes("v-for=\"link in getEnwikiTipLinks()\""),
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

test("submit opens pre-save fixes without changing tabs", async () => {
    let refreshCount = 0;
    const component = createDialogComponent(
        createVueStub(),
        createOptionsStub({
            onCategoryRowsRefresh() {
                refreshCount += 1;
            },
            async onPreSavePrepare() {
                return {
                    actions: [],
                };
            },
        }),
    );
    const { activeTab, preSaveOpen } = component.setup();

    assert.equal(activeTab.value, "titles");
    await component.methods.submitForm();

    assert.equal(activeTab.value, "titles");
    assert.equal(refreshCount, 1);
    assert.equal(preSaveOpen.value, true);
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

test("preview and submit use separate popup actions", async () => {
    let previewCount = 0;
    let submitCount = 0;
    let historyCount = 0;
    const component = createDialogComponent(
        createVueStub(),
        createOptionsStub({
            onPreview() {
                previewCount += 1;
            },
            onSubmit() {
                submitCount += 1;
            },
            onSubmitHistory() {
                historyCount += 1;
            },
        }),
    );
    await component.methods.previewForm();
    assert.equal(previewCount, 1);
    assert.equal(submitCount, 0);
    assert.equal(historyCount, 1);
    assert.equal(
        component.template.includes('v-on:click="previewForm"'),
        true,
    );
    assert.equal(component.template.includes("'Preview'"), true);
    assert.equal(component.template.includes('v-on:click="submitForm"'), true);
    assert.equal(component.template.includes("'Submit'"), true);
    assert.equal(
        component.template.indexOf(">Move<") <
            component.template.indexOf('v-on:click="previewForm"'),
        true,
    );
    assert.equal(
        component.template.indexOf('v-on:click="previewForm"') <
            component.template.indexOf('v-on:click="submitForm"'),
        true,
    );
});

test("submit from review opens pre-save fixes", async () => {
    let refreshCount = 0;
    let submitCount = 0;
    let historyCount = 0;
    const component = createDialogComponent(
        createVueStub(),
        createOptionsStub({
            onCategoryRowsRefresh() {
                refreshCount += 1;
            },
            onSubmit() {
                submitCount += 1;
            },
            onSubmitHistory() {
                historyCount += 1;
            },
        }),
    );
    const { activeTab, preSaveOpen } = component.setup();

    activeTab.value = "review";
    await component.methods.submitForm();

    assert.equal(refreshCount, 1);
    assert.equal(preSaveOpen.value, true);
    assert.equal(submitCount, 0);
    assert.equal(historyCount, 0);
});

test("pre-save title choice moves the editing session before saving", async () => {
    let submitted;
    let moved;
    const component = createDialogComponent(
        createVueStub(),
        createOptionsStub({
            onMoveTarget(_form, title) {
                moved = title;
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
    assert.equal(state.preSaveMoveEnabled.value, true);
    assert.equal(state.preSaveMoveTitle.value, "預設中文名");
    state.preSaveMoveTitle.value = " 中文名 ";
    await component.methods.confirmSubmit();

    assert.equal(moved, "中文名");
    assert.equal(submitted, undefined);
    assert.equal(state.preSaveOpen.value, false);
    assert.equal(
        component.template.includes(
            "The generated text will use the final title.",
        ),
        true,
    );
    assert.equal(component.template.includes("{{ action.label }}"), true);
    assert.equal(component.template.includes("'Continue'"), true);
});

test("pre-save title choice can be declined to keep the Latin title", async () => {
    let submitted;
    let moveCount = 0;
    const component = createDialogComponent(
        createVueStub(),
        createOptionsStub({
            onMoveTarget() {
                moveCount += 1;
            },
            onSubmit(_form, _state, _close, preSave) {
                submitted = preSave;
            },
            async onPreSavePrepare() {
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

    state.activeTab.value = "review";
    await component.methods.submitForm();
    state.preSaveMoveEnabled.value = false;
    await component.methods.confirmSubmit();

    assert.equal(moveCount, 0);
    assert.equal(submitted.move.enabled, false);
    assert.equal(submitted.move.to, "Example");
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

function createVueStub() {
    return {
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
        getCategoryPageUrl(category) {
            return `/wiki/Category:${category}`;
        },
        getTemplatePageUrl(template, edit) {
            return `/wiki/Template:${template}${edit ? "?action=edit" : ""}`;
        },
        getFieldPlaceholder() {},
        getHistoryEntries() {
            return [];
        },
        onActivate() {},
        onCategoryRowsRefresh() {},
        onClearHistory() {},
        onCreateCategoryRow() {},
        onDeleteHistoryEntry() {},
        onFormChange() {},
        onPreview() {},
        onMoveTarget() {},
        onPrepareCompanyCategory() {},
        async onPrepareReview() {
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
        onSaveNavbox() {},
        onSubmit() {},
        onSubmitHistory() {},
        onUpdateCategoryRowCategory() {},
        ...options,
    };
}
