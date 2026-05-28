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

function createOptionsStub() {
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
  };
}
