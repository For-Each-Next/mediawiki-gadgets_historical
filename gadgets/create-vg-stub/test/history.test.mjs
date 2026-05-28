import assert from "node:assert/strict";
import test, { afterEach, beforeEach } from "node:test";

import {
  readFormDraftForPage,
  saveFormDraft,
} from "../src/history.js";

const originalLocalStorage = globalThis.localStorage;

beforeEach(() => {
  const entries = new Map();

  globalThis.localStorage = {
    getItem(key) {
      return entries.has(key) ? entries.get(key) : null;
    },
    removeItem(key) {
      entries.delete(key);
    },
    setItem(key, value) {
      entries.set(key, String(value));
    },
  };
});

afterEach(() => {
  globalThis.localStorage = originalLocalStorage;
});

test("readFormDraftForPage returns a draft for the same page", () => {
  const form = {
    name: "Example",
    year: "2026",
  };

  saveFormDraft(form);

  assert.deepEqual(readFormDraftForPage("Example"), form);
});

test("readFormDraftForPage ignores a draft from another page", () => {
  saveFormDraft({
    name: "Original page",
    year: "2026",
  });

  assert.equal(readFormDraftForPage("Different page"), undefined);
});

