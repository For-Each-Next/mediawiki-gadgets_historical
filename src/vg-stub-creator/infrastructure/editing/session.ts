/**
 * Stores pending article saves and moved editing sessions.
 */

const MOVE_TEXT_STORAGE_KEY = "vg-stub-creator-move-text";
const PENDING_SAVE_STORAGE_KEY = "vg-stub-creator-pending-save";
const PREVIEW_FORM_STORAGE_KEY = "vg-stub-creator-preview-form";

/**
 * Reads pending follow-up tasks for the current article.
 *
 * @param page - Current page title.
 * @param storage - Session storage implementation.
 * @returns Pending save data.
 */
export function getPendingSaveData(
    page: string,
    storage: Storage = sessionStorage,
): any | undefined {
    return readMatchingSessionValue(storage, PENDING_SAVE_STORAGE_KEY, page);
}

/**
 * Clears pending follow-up tasks.
 *
 * @param storage - Session storage implementation.
 * @returns */
export function clearPendingSaveData(storage: Storage = sessionStorage): void {
    storage.removeItem(PENDING_SAVE_STORAGE_KEY);
}

/**
 * Stores generated text for a target-page editing session.
 *
 * @param pending - Moved editing data.
 * @param storage - Session storage implementation.
 * @returns */
export function storeMovedEdit(
    pending: any,
    storage: Storage = sessionStorage,
): void {
    storage.setItem(MOVE_TEXT_STORAGE_KEY, JSON.stringify(pending));
}

/**
 * Gets moved editing data matching the current page.
 *
 * @param page - Current page title.
 * @param storage - Session storage implementation.
 * @returns Moved editing data.
 */
export function getMovedEdit(
    page: string,
    storage: Storage = sessionStorage,
): any | undefined {
    return readMatchingSessionValue(storage, MOVE_TEXT_STORAGE_KEY, page);
}

/**
 * Clears moved editing data.
 *
 * @param storage - Session storage implementation.
 * @returns */
export function clearMovedEdit(storage: Storage = sessionStorage): void {
    storage.removeItem(MOVE_TEXT_STORAGE_KEY);
}

/**
 * Stores the form values used for a MediaWiki preview.
 *
 * @param form - Previewed dialog form.
 * @param title - Previewed page title.
 * @param storage - Session storage implementation.
 * @returns */
export function storePreviewFormData(
    form: any,
    title: string,
    storage: Storage = sessionStorage,
): void {
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
 * @param page - Current page title.
 * @param storage - Session storage implementation.
 * @returns Matching preview form data.
 */
export function getPreviewFormData(
    page: string,
    storage: Storage = sessionStorage,
): any | undefined {
    return readMatchingSessionValue(storage, PREVIEW_FORM_STORAGE_KEY, page);
}

/**
 * Clears stored preview form data.
 *
 * @param storage - Session storage implementation.
 * @returns */
export function clearPreviewFormData(storage: Storage = sessionStorage): void {
    storage.removeItem(PREVIEW_FORM_STORAGE_KEY);
}

/**
 * Normalizes page titles for session matching.
 *
 * @param title - Raw page title.
 * @returns Normalized page title.
 */
export function normalizePageTitle(title: any): string {
    return String(title || "")
        .trim()
        .replace(/_/gu, " ");
}

/**
 * Reads JSON session data only when its title matches the current page.
 *
 * @param storage - Session storage implementation.
 * @param key - Storage key.
 * @param page - Current page title.
 * @returns Matching session data.
 */
function readMatchingSessionValue(
    storage: Storage,
    key: string,
    page: string,
): any | undefined {
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
