/**
 * Stores and restores vg-stub-creator form history.
 */

import { msg } from "#stub/i18n";

const HISTORY_LIMIT = 20;
const HISTORY_STORAGE_KEY = "vg-stub-creator-form-history";
const DRAFT_STORAGE_KEY = "vg-stub-creator-form-draft";
const DRAFT_PAGE_STORAGE_KEY = "vg-stub-creator-form-draft-page";
const DRAFT_SAVED_AT_STORAGE_KEY = "vg-stub-creator-form-draft-saved-at";
const HISTORY_DATA_VERSION = 1;
const INPUT_FORM_KEYS = new Set([
    "additionalProse",
    "additionalProseSourceUrl",
    "developers",
    "developersSourceUrl",
    "englishName",
    "englishNameSourceUrl",
    "enwikiTitle",
    "genres",
    "genresSourceUrl",
    "localizedNames",
    "metacriticScore",
    "metacriticScoreSourceUrl",
    "name",
    "openCriticRecommend",
    "openCriticRecommendSourceUrl",
    "originalName",
    "originalNameSourceUrl",
    "pageName",
    "platforms",
    "platformsSourceUrl",
    "publishers",
    "publishersSourceUrl",
    "registerNewPage",
    "series",
    "seriesSourceUrl",
    "sortKey",
    "stubTagRows",
    "year",
    "yearSourceUrl",
]);

/**
 * Reads the current form draft.
 *
 * @returns Stored draft form values.
 */
export function readFormDraft(): any | undefined {
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
 * @param page - Current page title.
 * @returns Stored draft form values.
 */
export function readFormDraftForPage(page: string): any | undefined {
    const draft = readFormDraft();

    if (
        draft == null ||
        normalizePage(readFormDraftPage()) !== normalizePage(page)
    ) {
        return undefined;
    }

    return draft;
}

/**
 * Reads the current form draft as a history-style entry.
 *
 * @returns Draft history entry.
 */
export function readFormDraftEntry(): any | undefined {
    const form = readFormDraft();
    const page = normalizePage(readFormDraftPage());

    if (form == null) {
        return undefined;
    }

    const result = {
        data: createHistoryData(form),
        id: 0,
        metadata: {
            page,
            savedAt: readFormDraftSavedAt(),
            temporary: true,
        },
    };
    return result;
}

/**
 * Saves the current form draft.
 *
 * @param form - Dialog form values.
 * @param page - Page title associated with the draft.
 * @returns Result when the function
 *   saves the current form draft.
 */
export function saveFormDraft(form: any, page: string = ""): void {
    writeStorageItem(DRAFT_STORAGE_KEY, cloneValue(form));
    writeStorageItem(DRAFT_PAGE_STORAGE_KEY, normalizePage(page));
    writeStorageItem(DRAFT_SAVED_AT_STORAGE_KEY, new Date().toLocaleString());
}

/**
 * Reads stored form history.
 *
 * @returns Stored history entries.
 */
export function readFormHistory(): Array<any> {
    try {
        if (typeof localStorage === "undefined") {
            return [];
        }

        const entries = JSON.parse(localStorage.getItem(HISTORY_STORAGE_KEY));

        const result = selectValue(
            Array.isArray(entries),
            function trueBranch() {
                return entries.filter(isFormHistoryEntry);
            },
            function falseBranch() {
                return [];
            },
        );
        return result;
    } catch (_error) {
        return [];
    }
}

/**
 * Saves one form snapshot to history.
 *
 * @param form - Dialog form values.
 * @param page - Page title associated with the snapshot.
 * @param citations - Citation cache keyed by source URL.
 * @returns Result when the function
 *   saves one form snapshot to history.
 */
export function saveFormHistory(
    form: any,
    page: string,
    citations: any = {},
): void {
    const entry = createFormHistoryEntry(form, page, citations);
    const entries = [
        entry,
        ...readFormHistory().filter((item) => item.id !== entry.id),
    ].slice(0, HISTORY_LIMIT);

    writeFormHistory(entries);
}

/**
 * Deletes one form history entry.
 *
 * @param id - History entry ID.
 * @returns Result when the function
 *   deletes one form history entry.
 */
export function deleteFormHistoryEntry(id: string): void {
    writeFormHistory(readFormHistory().filter((entry) => entry.id !== id));
}

/**
 * Clears all form history entries.
 *
 * @returns Result when the function
 *   clears all form history entries.
 */
export function clearFormHistory(): void {
    removeStorageItem(HISTORY_STORAGE_KEY);
}

/**
 * Creates one form history entry.
 *
 * @param form - Dialog form values.
 * @param page - Page title associated with the snapshot.
 * @param citations - Citation cache keyed by source URL.
 * @returns History entry.
 */
function createFormHistoryEntry(form: any, page: string, citations: any): any {
    const snapshot = cloneValue(form);

    const result = {
        data: createHistoryData(snapshot, citations),
        id: createHistoryEntryId(snapshot, page),
        metadata: {
            page:
                normalizePage(page) ||
                normalizePage(snapshot.pageName) ||
                normalizePage(snapshot.name) ||
                msg("history.untitled"),
            savedAt: new Date().toLocaleString(),
        },
    };
    return result;
}

/**
 * Handles is form history entry.
 *
 * Checks whether a stored value matches the current history entry
 * shape.
 *
 * @param entry - Stored history value.
 * @returns Whether the entry can be used as form history.
 */
function isFormHistoryEntry(entry: any): boolean {
    const result =
        entry != null &&
        typeof entry === "object" &&
        Number.isInteger(entry.id) &&
        entry.data != null &&
        typeof entry.data === "object" &&
        entry.metadata != null &&
        typeof entry.metadata === "object";
    return result;
}

/**
 * Creates a stable history entry ID.
 *
 * @param form - Stored form values.
 * @param page - Page title associated with the snapshot.
 * @returns History entry ID.
 */
function createHistoryEntryId(form: any, page: string): number {
    const text = JSON.stringify([normalizePage(page), form]);
    let hash = 2166136261;

    for (const character of text) {
        hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
    }

    return hash >>> 0 || 1;
}

/**
 * Creates a structured history payload grouped by data provenance.
 *
 * @param form - Dialog form values.
 * @param _citations - Reserved citation data.
 * @returns Provenance-aware history data.
 */
function createHistoryData(form: any, _citations = {}): any {
    const result = {
        input: createInputData(form),
        patches: createPatchData(form),
        version: HISTORY_DATA_VERSION,
    };
    return result;
}

/**
 * Gets user-entered values from a form snapshot.
 *
 * @param form - Dialog form values.
 * @returns User-entered input data.
 */
function createInputData(form: any): any {
    const result = Object.fromEntries(
        Object.entries(cloneValue(form)).filter(function callback([key]) {
            return INPUT_FORM_KEYS.has(key);
        }),
    );
    return result;
}

/**
 * Gets user-edited patches derived from generated values.
 *
 * @param form - Dialog form values.
 * @returns Patch data.
 */
function createPatchData(form: any): any {
    const result = {
        categories: getCategoryPatches(form),
        citations: getCitationPatches(form),
        navboxes: getNavboxPatches(form),
        noteTa: getPatchedNoteTaRows(form),
    };
    return result;
}

/**
 * Gets citation patches keyed by source URL.
 *
 * @param form - Dialog form values.
 * @returns Citation patches.
 */
function getCitationPatches(form: any): Array<any> {
    const citationRows: Array<{
        modified: boolean;
        sourceUrl: string;
        template: string;
    }> = form.citationRows || [];
    const result = citationRows
        .filter((row) => row.modified === true)
        .map(function callback(row: {
            sourceUrl: unknown;
            template: unknown;
        }) {
            const result = {
                sourceUrl: row.sourceUrl,
                params: getCitationParamPatches(row),
                ...createChangedValuePatch(
                    {
                        template: row.template,
                    },
                    {
                        template: "cite web",
                    },
                ),
            };
            return result;
        });
    return result;
}

/**
 * Gets citation parameter patches keyed by parameter name.
 *
 * @param row - Citation row.
 * @returns Citation parameter patches.
 */
function getCitationParamPatches(row: any): Array<any> {
    const currentParams: Array<{ name: string; value: string }> =
        row.params || [];
    const originalParams: Array<{ name: string; value: string }> =
        row.generatedParams || [];
    const params = new Map(
        currentParams.map((param) => [param.name, param.value]),
    );
    const generatedParams = new Map(
        originalParams.map((param) => [param.name, param.value]),
    );
    const names = new Set([...params.keys(), ...generatedParams.keys()]);

    const result = Array.from(names)
        .filter(function callback(name) {
            const result = !isSameJsonValue(
                params.get(name),
                generatedParams.get(name),
            );
            return result;
        })
        .map(function callback(name) {
            const result = {
                name,
                value: params.has(name) ? params.get(name) : null,
            };
            return result;
        });
    return result;
}

/**
 * Gets category patches keyed by their minimum source.
 *
 * @param form - Dialog form values.
 * @returns Category patches.
 */
function getCategoryPatches(form: any): Array<any> {
    const result = (form.categoryRows || [])
        .filter(function callback(row: {
            enabled: boolean;
            stubTagEnabled: unknown;
            originalStubTagEnabled: unknown;
        }) {
            const result =
                isManualCategoryRow(row) ||
                isModifiedCategoryRow(row) ||
                row.enabled === false ||
                row.stubTagEnabled !== row.originalStubTagEnabled;
            return result;
        })
        .map(function callback(row: unknown) {
            if (isManualCategoryRow(row)) {
                return createManualCategoryPatch(row);
            }

            return createCategoryPatch(row);
        });
    return result;
}

/**
 * Creates a minimal category patch row.
 *
 * @param row - Category row.
 * @returns Minimal category patch.
 */
function createCategoryPatch(row: any): any {
    const result = {
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
    return result;
}

/**
 * Creates a manually added category patch row.
 *
 * @param row - Category row.
 * @returns Manual category patch.
 */
function createManualCategoryPatch(row: any): any {
    const result = {
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
    return result;
}

/**
 * Creates a category patch source.
 *
 * @param row - Category row.
 * @returns Category patch source.
 */
function createCategoryPatchSource(row: any): any {
    if (row.company) {
        const result = {
            company: row.company,
        };
        return result;
    }

    const result = {
        category: row.originalCategory || row.category,
    };
    return result;
}

/**
 * Gets navbox patches keyed by generated title.
 *
 * @param form - Dialog form values.
 * @returns Navbox patches.
 */
function getNavboxPatches(form: any): Array<any> {
    const result = (form.navboxRows || [])
        .filter(function isChanged(row: {
            enabled: boolean;
            text: string;
            title: string;
        }) {
            return row.enabled === false || row.text !== row.title;
        })
        .map(function callback(row: {
            title: unknown;
            text: unknown;
            enabled: boolean;
        }) {
            const result = {
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
            };
            return result;
        });
    return result;
}

/**
 * Creates a patch containing only changed values.
 *
 * @param values - Current values.
 * @param baseValues - Generated values.
 * @returns Changed values.
 */
function createChangedValuePatch(values: any, baseValues: any): any {
    const result = Object.fromEntries(
        Object.entries(values).filter(
            ([key, value]) => !isSameJsonValue(value, baseValues[key]),
        ),
    );
    return result;
}

/**
 * Creates a patch containing only values that carry information.
 *
 * @param values - Current values.
 * @returns Present values.
 */
function createPresentValuePatch(values: any): any {
    const result = Object.fromEntries(
        Object.entries(values).filter(function callback([_key, value]) {
            if (value === "" || value === false) {
                return false;
            }

            return value != null;
        }),
    );
    return result;
}

/**
 * Compares JSON-safe values.
 *
 * @param left - First value.
 * @param right - Second value.
 * @returns Whether the values are equal.
 */
function isSameJsonValue(left: any, right: any): boolean {
    return JSON.stringify(left) === JSON.stringify(right);
}

/**
 * Gets user-edited NoteTA rows.
 *
 * @param form - Dialog form values.
 * @returns Patched NoteTA rows.
 */
function getPatchedNoteTaRows(form: any): Array<any> {
    const noteTaRows: Array<{ modified: boolean }> = form.noteTaRows || [];
    const result = noteTaRows.filter((row) => row.modified === true);
    return result;
}

/**
 * Checks whether a category row was manually added.
 *
 * @param row - Category row.
 * @returns Whether the row is manual.
 */
function isManualCategoryRow(row: any): boolean {
    return /manual/u.test(row.source || "");
}

/**
 * Checks whether a generated category row was changed.
 *
 * @param row - Category row.
 * @returns Whether the row is modified.
 */
function isModifiedCategoryRow(row: any): boolean {
    return /†$/u.test(row.source || "");
}

/**
 * Writes form history entries to storage.
 *
 * @param entries - History entries.
 * @returns Result when the function
 *   writes form history entries to storage.
 */
function writeFormHistory(entries: Array<any>): void {
    writeStorageItem(HISTORY_STORAGE_KEY, entries);
}

/**
 * Writes a value to local storage.
 *
 * @param key - Storage key.
 * @param value - Stored value.
 * @returns Result when the function
 *   writes a value to local storage.
 */
function writeStorageItem(key: string, value: any): void {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (_error) {
        // Ignore storage quota and privacy-mode failures.
    }
}

/**
 * Reads the draft save timestamp.
 *
 * @returns Draft save timestamp.
 */
function readFormDraftSavedAt(): string {
    try {
        return JSON.parse(localStorage.getItem(DRAFT_SAVED_AT_STORAGE_KEY));
    } catch (_error) {
        return msg("history.temporaryDraft");
    }
}

/**
 * Reads the page title associated with the current draft.
 *
 * @returns Draft page title.
 */
function readFormDraftPage(): string {
    try {
        return JSON.parse(localStorage.getItem(DRAFT_PAGE_STORAGE_KEY));
    } catch (_error) {
        return "";
    }
}

/**
 * Removes a value from local storage.
 *
 * @param key - Storage key.
 * @returns Result when the function
 *   removes a value from local storage.
 */
function removeStorageItem(key: string): void {
    try {
        localStorage.removeItem(key);
    } catch (_error) {
        // Ignore storage quota and privacy-mode failures.
    }
}

/**
 * Creates a plain cloned value.
 *
 * @param value - Source value.
 * @returns Cloned value.
 */
function cloneValue(value: any): any {
    return JSON.parse(JSON.stringify(value));
}

/**
 * Normalizes a page title for display and identity.
 *
 * @param page - Page title.
 * @returns Normalized page title.
 */
function normalizePage(page: string): string {
    return String(page || "").trim();
}

/**
 * Selects a lazily evaluated value for a condition.
 *
 * @param condition - Condition to evaluate.
 * @param trueBranch - Branch used when the condition is
 * true.
 * @param falseBranch - Branch used when the condition is
 * false.
 * @returns Value returned by the selected branch.
 */
function selectValue(
    condition: unknown,
    trueBranch: (...args: any[]) => any,
    falseBranch: (...args: any[]) => any,
): any {
    if (condition) {
        return trueBranch();
    }

    return falseBranch();
}
