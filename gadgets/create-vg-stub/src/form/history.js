/* eslint-disable */

/**
 * Stores and restores create-vg-stub form history.
 */

const HISTORY_LIMIT = 20;
const HISTORY_STORAGE_KEY = "create-vg-stub-form-history";
const DRAFT_STORAGE_KEY = "create-vg-stub-form-draft";
const DRAFT_SAVED_AT_STORAGE_KEY = "create-vg-stub-form-draft-saved-at";

/**
 * Reads the current form draft.
 *
 * @returns {object|undefined} Stored draft form values.
 */
export function readFormDraft() {
  try {
    if (typeof localStorage === "undefined") {
      return undefined;
    }

    const draft = JSON.parse(localStorage.getItem(DRAFT_STORAGE_KEY));

    return draft == null || typeof draft !== "object" ? undefined : draft;
  } catch (_error) {
    return undefined;
  }
}

/**
 * Reads the current form draft as a history-style entry.
 *
 * @returns {object|undefined} Draft history entry.
 */
export function readFormDraftEntry() {
  const form = readFormDraft();

  if (form == null) {
    return undefined;
  }

  return {
    form,
    id: "draft",
    page: normalizePage(form.name) || "(temporary draft)",
    savedAt: readFormDraftSavedAt(),
    temporary: true,
  };
}

/**
 * Saves the current form draft.
 *
 * @param {object} form - Dialog form values.
 * @returns {void}
 */
export function saveFormDraft(form) {
  writeStorageItem(DRAFT_STORAGE_KEY, cloneValue(form));
  writeStorageItem(DRAFT_SAVED_AT_STORAGE_KEY, new Date().toLocaleString());
}

/**
 * Reads stored form history.
 *
 * @returns {Array<object>} Stored history entries.
 */
export function readFormHistory() {
  try {
    if (typeof localStorage === "undefined") {
      return [];
    }

    const entries = JSON.parse(localStorage.getItem(HISTORY_STORAGE_KEY));

    return Array.isArray(entries) ? entries : [];
  } catch (_error) {
    return [];
  }
}

/**
 * Saves one form snapshot to history.
 *
 * @param {object} form - Dialog form values.
 * @param {string} page - Page title associated with the snapshot.
 * @returns {void}
 */
export function saveFormHistory(form, page) {
  const entry = createFormHistoryEntry(form, page);
  const entries = [
    entry,
    ...readFormHistory().filter((item) => item.id !== entry.id),
  ].slice(0, HISTORY_LIMIT);

  writeFormHistory(entries);
}

/**
 * Deletes one form history entry.
 *
 * @param {string} id - History entry ID.
 * @returns {void}
 */
export function deleteFormHistoryEntry(id) {
  writeFormHistory(readFormHistory().filter((entry) => entry.id !== id));
}

/**
 * Clears all form history entries.
 *
 * @returns {void}
 */
export function clearFormHistory() {
  removeStorageItem(HISTORY_STORAGE_KEY);
}

/**
 * Replaces a reactive form object with stored form values.
 *
 * @param {object} form - Reactive form object.
 * @param {object} values - Stored form values.
 * @returns {void}
 */
export function replaceFormValues(form, values) {
  Object.keys(form).forEach((key) => {
    delete form[key];
  });
  Object.assign(form, cloneValue(values));
}

/**
 * Creates one form history entry.
 *
 * @param {object} form - Dialog form values.
 * @param {string} page - Page title associated with the snapshot.
 * @returns {object} History entry.
 */
function createFormHistoryEntry(form, page) {
  const snapshot = cloneValue(form);

  return {
    form: snapshot,
    id: createHistoryEntryId(snapshot, page),
    page: normalizePage(page) || normalizePage(snapshot.name) || "(untitled)",
    savedAt: new Date().toLocaleString(),
  };
}

/**
 * Creates a stable history entry ID.
 *
 * @param {object} form - Stored form values.
 * @param {string} page - Page title associated with the snapshot.
 * @returns {string} History entry ID.
 */
function createHistoryEntryId(form, page) {
  return JSON.stringify([normalizePage(page), form]);
}

/**
 * Writes form history entries to storage.
 *
 * @param {Array<object>} entries - History entries.
 * @returns {void}
 */
function writeFormHistory(entries) {
  writeStorageItem(HISTORY_STORAGE_KEY, entries);
}

/**
 * Writes a value to local storage.
 *
 * @param {string} key - Storage key.
 * @param {*} value - Stored value.
 * @returns {void}
 */
function writeStorageItem(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (_error) {
    // Ignore storage quota and privacy-mode failures.
  }
}

/**
 * Reads the draft save timestamp.
 *
 * @returns {string} Draft save timestamp.
 */
function readFormDraftSavedAt() {
  try {
    return JSON.parse(localStorage.getItem(DRAFT_SAVED_AT_STORAGE_KEY));
  } catch (_error) {
    return "Temporary draft";
  }
}

/**
 * Removes a value from local storage.
 *
 * @param {string} key - Storage key.
 * @returns {void}
 */
function removeStorageItem(key) {
  try {
    localStorage.removeItem(key);
  } catch (_error) {
    // Ignore storage quota and privacy-mode failures.
  }
}

/**
 * Creates a plain cloned value.
 *
 * @param {*} value - Source value.
 * @returns {*} Cloned value.
 */
function cloneValue(value) {
  return JSON.parse(JSON.stringify(value));
}

/**
 * Normalizes a page title for display and identity.
 *
 * @param {string} page - Page title.
 * @returns {string} Normalized page title.
 */
function normalizePage(page) {
  return String(page || "").trim();
}
