/**
 * Tests create-vg-stub dialog behavior.
 */

import assert from "node:assert/strict";
import test, { afterEach, beforeEach } from "node:test";

import {
    StyleSheet,
    createDialogComponent,
} from "../src/interface/form.js";

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
    const component = createDialogComponent(
        createVueStub(),
        createOptionsStub({
            initialForm: {
                name: "中文名",
            },
            initialOpen: true,
        }),
    );
    const { form, open } = component.setup();

    assert.equal(open.value, true);
    assert.equal(form.name, "中文名");
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
});

test("review exposes editable navboxes and subtle prose length", async () => {
    const component = createDialogComponent(
        createVueStub(),
        createOptionsStub({
            getProseSinographs(form) {
                return form.additionalProse === "" ? 24 : 51;
            },
            async onPrepareReview(form) {
                return form.navboxRows || ["{{Foo series}}"];
            },
        }),
    );
    const { form } = component.setup();

    assert.equal(component.methods.getProseSinographs(), 24);
    form.additionalProse = "補充文字";
    assert.equal(component.methods.getProseSinographs(), 51);

    await component.methods.fillForm();
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

test("category helper opens and saves missing category rows", async () => {
    const saved = [];
    const refreshes = [];
    const component = createDialogComponent(
        createVueStub(),
        createOptionsStub({
            onCategoryRowsRefresh(_form, _state, options) {
                refreshes.push(options);
            },
            async onPrepareCompanyCategory(row) {
                return `Text for ${row.company}`;
            },
            async onSaveCompanyCategory(category, text) {
                saved.push(["company", category, text]);
            },
            async onSaveCategory(category, text) {
                saved.push(["category", category, text]);
            },
        }),
    );
    const { companyCategoryOpen, companyCategoryState } = component.setup();
    const companyRow = {
        category: "Foo Studio游戏",
        company: "Foo Studio",
        status: "",
    };

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

    companyCategoryState.text += "\nEdited";
    await component.methods.saveCompanyCategory();

    assert.deepEqual(saved, [
        ["company", "Foo Studio游戏", "Text for Foo Studio\nEdited"],
    ]);
    assert.deepEqual(refreshes, [{ bypassCache: true }]);
    assert.equal(companyCategoryOpen.value, false);
    assert.equal(component.template.includes("Create Category:"), true);

    await component.methods.openCategoryCreate({
        category: "动作游戏",
        status: "Not exists",
    });
    assert.equal(companyCategoryState.text, "");
    companyCategoryState.text = "Category text";
    await component.methods.saveCompanyCategory();
    assert.deepEqual(saved.at(-1), ["category", "动作游戏", "Category text"]);
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
            async onSteamNamesFetch(url) {
                assert.equal(
                    url,
                    "https://store.steampowered.com/app/123/example/",
                );

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
    const { fetchedSteamNameRows, form, formatSteamNameSuggestion } =
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
    assert.equal(
        formatSteamNameSuggestion(fetchedSteamNameRows.value),
        "Hans: 简体名 | Hant: 繁體名",
    );
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
    assert.equal(form.localizedNames[1].ww, true);
    assert.equal(form.localizedNames[1].hans, false);
    assert.equal(form.localizedNames[1].hant, false);
    assert.equal(
        form.localizedNames[1].sourceUrl,
        "https://store.steampowered.com/app/123/example/?l=schinese\n" +
            "https://store.steampowered.com/app/123/example/?l=tchinese",
    );
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
        component.template.includes("Wikidata: {{ getWikidataText() }}"),
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

test("fill and submit use separate popup actions", async () => {
    let fillCount = 0;
    let submitCount = 0;
    let historyCount = 0;
    const component = createDialogComponent(
        createVueStub(),
        createOptionsStub({
            onFill() {
                fillCount += 1;
            },
            onSubmit() {
                submitCount += 1;
            },
            onSubmitHistory() {
                historyCount += 1;
            },
        }),
    );
    await component.methods.fillForm();
    assert.equal(fillCount, 1);
    assert.equal(submitCount, 0);
    assert.equal(historyCount, 1);
    assert.equal(component.template.includes('v-on:click="fillForm"'), true);
    assert.equal(component.template.includes("'Fill'"), true);
    assert.equal(component.template.includes('v-on:click="submitForm"'), true);
    assert.equal(component.template.includes("'Submit'"), true);
    assert.equal(
        component.template.indexOf(">Move<") <
            component.template.indexOf('v-on:click="fillForm"'),
        true,
    );
    assert.equal(
        component.template.indexOf('v-on:click="fillForm"') <
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
                    title: "Example Game",
                    wikidataId: "Q123",
                };
            },
        }),
    );
    const { form } = component.setup();

    form.enwikiTitle = "Example Game";
    await component.methods.updateEnwikiTitle();

    assert.equal(form.wikidataId, "Q123");
    assert.equal(form.englishName, "Example Game");
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
        onCategoryRowsRefresh() {},
        onClearHistory() {},
        onCreateCategoryRow() {},
        onDeleteHistoryEntry() {},
        onFormChange() {},
        onFill() {},
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
