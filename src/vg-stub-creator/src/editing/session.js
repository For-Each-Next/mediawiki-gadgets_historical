/* eslint-disable */

/**
 * Stores pending article saves and moved editing sessions.
 */

const MOVE_TEXT_STORAGE_KEY = "vg-stub-creator-move-text";
const PENDING_SAVE_STORAGE_KEY = "vg-stub-creator-pending-save";
const PREVIEW_FORM_STORAGE_KEY = "vg-stub-creator-preview-form";

/**
 * Stores selected follow-up tasks for a submitted article.
 *
 * @param {object} form - Submitted dialog form.
 * @param {string} title - Submitted article title.
 * @param {object} [preSave] - Configured pre-save fixes.
 * @param {Storage} [storage] - Session storage implementation.
 * @returns {void}
 */
export function storePendingSaveData(
    form,
    title,
    preSave = {},
    storage = sessionStorage,
) {
    storage.setItem(
        PENDING_SAVE_STORAGE_KEY,
        JSON.stringify({
            actions: preSave.actions,
            form,
            move: preSave.move,
            progressGroups: preSave.progressGroups,
            registration: preSave.registration,
            title,
        }),
    );
}

/**
 * Reads pending follow-up tasks for the current article.
 *
 * @param {string} page - Current page title.
 * @param {Storage} [storage] - Session storage implementation.
 * @returns {object|undefined} Pending save data.
 */
export function getPendingSaveData(page, storage = sessionStorage) {
    return readMatchingSessionValue(storage, PENDING_SAVE_STORAGE_KEY, page);
}

/**
 * Clears pending follow-up tasks.
 *
 * @param {Storage} [storage] - Session storage implementation.
 * @returns {void}
 */
export function clearPendingSaveData(storage = sessionStorage) {
    storage.removeItem(PENDING_SAVE_STORAGE_KEY);
}

/**
 * Stores generated text for a target-page editing session.
 *
 * @param {object} pending - Moved editing data.
 * @param {Storage} [storage] - Session storage implementation.
 * @returns {void}
 */
export function storeMovedEdit(pending, storage = sessionStorage) {
    storage.setItem(MOVE_TEXT_STORAGE_KEY, JSON.stringify(pending));
}

/**
 * Gets moved editing data matching the current page.
 *
 * @param {string} page - Current page title.
 * @param {Storage} [storage] - Session storage implementation.
 * @returns {object|undefined} Moved editing data.
 */
export function getMovedEdit(page, storage = sessionStorage) {
    return readMatchingSessionValue(storage, MOVE_TEXT_STORAGE_KEY, page);
}

/**
 * Clears moved editing data.
 *
 * @param {Storage} [storage] - Session storage implementation.
 * @returns {void}
 */
export function clearMovedEdit(storage = sessionStorage) {
    storage.removeItem(MOVE_TEXT_STORAGE_KEY);
}

/**
 * Stores the form values used for a MediaWiki preview.
 *
 * @param {object} form - Previewed dialog form.
 * @param {string} title - Previewed page title.
 * @param {Storage} [storage] - Session storage implementation.
 * @returns {void}
 */
export function storePreviewFormData(form, title, storage = sessionStorage) {
    storage.setItem(
        PREVIEW_FORM_STORAGE_KEY,
        JSON.stringify({
            form,
            title,
        }),
    );
}

/**
 * Gets preview form data matching the current page.
 *
 * @param {string} page - Current page title.
 * @param {Storage} [storage] - Session storage implementation.
 * @returns {object|undefined} Matching preview form data.
 */
export function getPreviewFormData(page, storage = sessionStorage) {
    return readMatchingSessionValue(storage, PREVIEW_FORM_STORAGE_KEY, page);
}

/**
 * Clears stored preview form data.
 *
 * @param {Storage} [storage] - Session storage implementation.
 * @returns {void}
 */
export function clearPreviewFormData(storage = sessionStorage) {
    storage.removeItem(PREVIEW_FORM_STORAGE_KEY);
}

/**
 * Normalizes page titles for session matching.
 *
 * @param {*} title - Raw page title.
 * @returns {string} Normalized page title.
 */
export function normalizePageTitle(title) {
    return String(title || "")
        .trim()
        .replace(/_/gu, " ");
}

/**
 * Reads JSON session data only when its title matches the current page.
 *
 * @param {Storage} storage - Session storage implementation.
 * @param {string} key - Storage key.
 * @param {string} page - Current page title.
 * @returns {object|undefined} Matching session data.
 */
function readMatchingSessionValue(storage, key, page) {
    const item = storage.getItem(key);

    if (item == null) {
        return undefined;
    }

    try {
        const pending = JSON.parse(item);

        if (normalizePageTitle(pending.title) !== normalizePageTitle(page)) {
            return undefined;
        }

        return pending;
    } catch (_error) {
        storage.removeItem(key);
        return undefined;
    }
}
