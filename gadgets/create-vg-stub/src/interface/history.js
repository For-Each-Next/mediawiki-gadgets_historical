/* eslint-disable */

/**
 * Stores and restores create-vg-stub form history.
 */

const HISTORY_LIMIT = 20;
const HISTORY_STORAGE_KEY = "create-vg-stub-form-history";
const DRAFT_STORAGE_KEY = "create-vg-stub-form-draft";
const DRAFT_SAVED_AT_STORAGE_KEY = "create-vg-stub-form-draft-saved-at";
const HISTORY_DATA_VERSION = 1;
const GENERATED_FORM_KEYS = new Set([
    "categoryRows",
    "citationRows",
    "navboxRows",
    "navboxText",
    "redirectRows",
    "sourceReferences",
    "historyPatches",
]);

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
 * Reads the current form draft when it belongs to the given page.
 *
 * @param {string} page - Current page title.
 * @returns {object|undefined} Stored draft form values.
 */
export function readFormDraftForPage(page) {
    const draft = readFormDraft();

    if (draft == null || normalizePage(draft.name) !== normalizePage(page)) {
        return undefined;
    }

    return draft;
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
        data: createHistoryData(form),
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
 * @param {object} [citations] - Citation cache keyed by source URL.
 * @returns {void}
 */
export function saveFormHistory(form, page, citations = {}) {
    const entry = createFormHistoryEntry(form, page, citations);
    const entries = [
        entry,
        ...readFormHistory().filter((item) => item.id !== entry.id),
    ].slice(0, HISTORY_LIMIT);

    writeFormHistory(entries);
}

/**
 * Gets citation cache data for a form history page.
 *
 * @param {object} form - Dialog form values.
 * @param {string} page - Page title associated with the snapshot.
 * @returns {object} Citation cache keyed by source URL.
 */
export function getFormHistoryCitations(form, page) {
    return {};
}

/**
 * Updates citation cache data for a form history page.
 *
 * @param {object} form - Dialog form values.
 * @param {string} page - Page title associated with the snapshot.
 * @param {object} citations - Citation cache keyed by source URL.
 * @returns {void}
 */
export function updateFormHistoryCitations(form, page, citations) {
    const entry = getFormHistoryEntry(form, page);

    if (entry == null) {
        return;
    }

    entry.data = createHistoryData(form);
    writeFormHistory([
        entry,
        ...readFormHistory().filter((item) => item.id !== entry.id),
    ]);
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
 * Creates one form history entry.
 *
 * @param {object} form - Dialog form values.
 * @param {string} page - Page title associated with the snapshot.
 * @param {object} citations - Citation cache keyed by source URL.
 * @returns {object} History entry.
 */
function createFormHistoryEntry(form, page, citations) {
    const snapshot = cloneValue(form);

    return {
        data: createHistoryData(snapshot, citations),
        id: createHistoryEntryId(snapshot, page),
        page:
            normalizePage(page) ||
            normalizePage(snapshot.name) ||
            "(untitled)",
        savedAt: new Date().toLocaleString(),
    };
}

/**
 * Gets one form history entry.
 *
 * @param {object} form - Dialog form values.
 * @param {string} page - Page title associated with the snapshot.
 * @returns {object|undefined} Stored history entry.
 */
function getFormHistoryEntry(form, page) {
    const id = createHistoryEntryId(form, page);

    return readFormHistory().find((entry) => entry.id === id);
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
 * Creates a structured history payload grouped by data provenance.
 *
 * @param {object} form - Dialog form values.
 * @returns {object} Provenance-aware history data.
 */
function createHistoryData(form) {
    return {
        input: createInputData(form),
        patches: createPatchData(form),
        version: HISTORY_DATA_VERSION,
    };
}

/**
 * Gets user-entered values from a form snapshot.
 *
 * @param {object} form - Dialog form values.
 * @returns {object} User-entered input data.
 */
function createInputData(form) {
    return Object.fromEntries(
        Object.entries(cloneValue(form)).filter(
            ([key]) => !GENERATED_FORM_KEYS.has(key),
        ),
    );
}

/**
 * Gets user-edited patches derived from generated values.
 *
 * @param {object} form - Dialog form values.
 * @returns {object} Patch data.
 */
function createPatchData(form) {
    return {
        categories: getCategoryPatches(form),
        citations: getCitationPatches(form),
        navboxes: getNavboxPatches(form),
        noteTa: getPatchedNoteTaRows(form),
    };
}

/**
 * Gets citation patches keyed by source URL.
 *
 * @param {object} form - Dialog form values.
 * @returns {Array<object>} Citation patches.
 */
function getCitationPatches(form) {
    return (form.citationRows || [])
        .filter((row) => row.modified === true)
        .map((row) => ({
            sourceUrl: row.sourceUrl,
            params: cloneValue(row.params || []),
            ...createChangedValuePatch(
                {
                    template: row.template,
                },
                {
                    template: "cite web",
                },
            ),
        }));
}

/**
 * Gets category patches keyed by their minimum source.
 *
 * @param {object} form - Dialog form values.
 * @returns {Array<object>} Category patches.
 */
function getCategoryPatches(form) {
    return (form.categoryRows || [])
        .filter(
            (row) =>
                isManualCategoryRow(row) ||
                isModifiedCategoryRow(row) ||
                row.enabled === false ||
                row.stubTagEnabled !== row.originalStubTagEnabled,
        )
        .map((row) => {
            if (isManualCategoryRow(row)) {
                return createManualCategoryPatch(row);
            }

            return createCategoryPatch(row);
        });
}

/**
 * Creates a minimal category patch row.
 *
 * @param {object} row - Category row.
 * @returns {object} Minimal category patch.
 */
function createCategoryPatch(row) {
    return {
        source: createCategoryPatchSource(row),
        ...createChangedValuePatch(
            {
                category: row.category,
                company: row.company || "",
                enabled: row.enabled !== false,
                status: row.status || "",
                stubTag: row.stubTag || "",
                stubTagEnabled: row.stubTagEnabled === true,
            },
            {
                category: row.originalCategory || row.category,
                company: row.company || "",
                enabled: true,
                status: row.status || "",
                stubTag: row.stubTag || "",
                stubTagEnabled: row.originalStubTagEnabled === true,
            },
        ),
    };
}

/**
 * Creates a manually added category patch row.
 *
 * @param {object} row - Category row.
 * @returns {object} Manual category patch.
 */
function createManualCategoryPatch(row) {
    return {
        source: {
            manual: true,
        },
        ...createPresentValuePatch({
            category: row.category,
            company: row.company || "",
            enabled: row.enabled !== false,
            status: row.status || "",
            stubTag: row.stubTag || "",
            stubTagEnabled: row.stubTagEnabled === true,
        }),
    };
}

/**
 * Creates a category patch source.
 *
 * @param {object} row - Category row.
 * @returns {object} Category patch source.
 */
function createCategoryPatchSource(row) {
    if (row.company) {
        return {
            company: row.company,
        };
    }

    return {
        category: row.originalCategory || row.category,
    };
}

/**
 * Gets navbox patches keyed by generated title.
 *
 * @param {object} form - Dialog form values.
 * @returns {Array<object>} Navbox patches.
 */
function getNavboxPatches(form) {
    return (form.navboxRows || [])
        .filter((row) => row.enabled === false || row.text !== row.title)
        .map((row) => ({
            source: {
                title: row.title || row.text,
            },
            ...createChangedValuePatch(
                {
                    enabled: row.enabled !== false,
                    text: row.text,
                },
                {
                    enabled: true,
                    text: row.title || row.text,
                },
            ),
        }));
}

/**
 * Creates a patch containing only changed values.
 *
 * @param {object} values - Current values.
 * @param {object} baseValues - Generated values.
 * @returns {object} Changed values.
 */
function createChangedValuePatch(values, baseValues) {
    return Object.fromEntries(
        Object.entries(values).filter(
            ([key, value]) => !isSameJsonValue(value, baseValues[key]),
        ),
    );
}

/**
 * Creates a patch containing only values that carry information.
 *
 * @param {object} values - Current values.
 * @returns {object} Present values.
 */
function createPresentValuePatch(values) {
    return Object.fromEntries(
        Object.entries(values).filter(([_key, value]) => {
            if (value === "" || value === false) {
                return false;
            }

            return value != null;
        }),
    );
}

/**
 * Compares JSON-safe values.
 *
 * @param {*} left - First value.
 * @param {*} right - Second value.
 * @returns {boolean} Whether the values are equal.
 */
function isSameJsonValue(left, right) {
    return JSON.stringify(left) === JSON.stringify(right);
}

/**
 * Gets user-edited NoteTA rows.
 *
 * @param {object} form - Dialog form values.
 * @returns {Array<object>} Patched NoteTA rows.
 */
function getPatchedNoteTaRows(form) {
    return (form.noteTaRows || []).filter((row) => row.modified === true);
}

/**
 * Checks whether a category row was manually added.
 *
 * @param {object} row - Category row.
 * @returns {boolean} Whether the row is manual.
 */
function isManualCategoryRow(row) {
    return /manual/u.test(row.source || "");
}

/**
 * Checks whether a generated category row was changed.
 *
 * @param {object} row - Category row.
 * @returns {boolean} Whether the row is modified.
 */
function isModifiedCategoryRow(row) {
    return /†$/u.test(row.source || "");
}

/**
 * Removes the generated-row modified marker from a label.
 *
 * @param {string} source - Category row source label.
 * @returns {string} Source label without marker.
 */
function trimModifiedMarker(source) {
    return String(source || "").replace(/\s*†$/u, "");
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
