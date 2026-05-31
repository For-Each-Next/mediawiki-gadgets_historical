import assert from "node:assert/strict";
import test, { afterEach, beforeEach } from "node:test";

import { createDialogComponent } from "../src/interface.js";

const originalWindow = globalThis.window;

beforeEach(() => {
  globalThis.window = {};
});

afterEach(() => {
  globalThis.window = originalWindow;
});

test("live field updates trim values and normalize full dates to years", () => {
  const component = createDialogComponent(createVueStub(), createOptionsStub());
  const { form } = component.setup();

  component.methods.updateFieldValue({ key: "year" }, " May 2023 ");
  assert.equal(form.year, "2023");

  component.methods.updateFieldValue({ key: "year" }, " 5 February 2015 ");
  assert.equal(form.year, "2015");

  component.methods.updateFieldValue({ key: "englishName" }, " Example ");
  assert.equal(form.englishName, "Example");
});

test("live multi-item updates preserve standalone and", () => {
  const component = createDialogComponent(createVueStub(), createOptionsStub());
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
  const component = createDialogComponent(createVueStub(), createOptionsStub());
  const { form, moveTarget } = component.setup();

  component.methods.updateSourceValue(
    { sourceKey: "yearSourceUrl" },
    " https://example.test ",
  );
  component.methods.updateNameRowValue(
    "officialNames",
    0,
    "name",
    " 簡体名 ",
  );
  component.methods.updateMoveTarget(" Target page ");

  assert.equal(form.yearSourceUrl, "https://example.test");
  assert.equal(form.officialNames[0].name, "簡体名");
  assert.equal(moveTarget.value, "Target page");
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
    getFieldPlaceholder() {},
    getHistoryEntries() {
      return [];
    },
    onCategoryRowsRefresh() {},
    onClearHistory() {},
    onCreateCategoryRow() {},
    onDeleteHistoryEntry() {},
    onFormChange() {},
    onMoveTarget() {},
    onResetCategoryRow() {},
    onSubmit() {},
    onSubmitHistory() {},
    onUpdateCategoryRowCategory() {},
    ...options,
  };
}
