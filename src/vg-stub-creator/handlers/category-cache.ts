/**
 * Stores per-page category resolution caches.
 */

const CATEGORY_CACHE_STORAGE_PREFIX = "vg-stub-creator-category-cache:";


/**
 * Creates a category cache backed by browser storage.
 *
 * @param page - Current page title.
 * @param storage - Browser storage implementation.
 * @returns Category cache store.
 */
export function createCategoryCacheStore(
    page: string,
    storage: Storage = localStorage,
): any {
    const storageKey = `${CATEGORY_CACHE_STORAGE_PREFIX}${page}`;
    const cache = readJsonStorage(storage, storageKey) || {};

    return {
        cache,

        /**
         * Clears cached category resolutions.
         *
         * @returns */
        clear(): void {
            Object.keys(cache).forEach(function callback(key) {
                delete cache[key];
            });
            removeStorageItem(storage, storageKey);
        },

        /**
         * Saves current category resolutions.
         *
         * @returns */
        save(): void {
            writeJsonStorage(storage, storageKey, cache);
        },
    };
}


/**
 * Reads a JSON value from browser storage.
 *
 * @param storage - Browser storage implementation.
 * @param key - Storage key.
 * @returns Stored value.
 */
function readJsonStorage(storage: Storage, key: string): any | undefined {
    try {
        const value = storage.getItem(key);

        return value == null ? undefined : JSON.parse(value);
    } catch (_error) {
        return undefined;
    }
}


/**
 * Writes a JSON value to browser storage.
 *
 * @param storage - Browser storage implementation.
 * @param key - Storage key.
 * @param value - Value to store.
 * @returns */
function writeJsonStorage(storage: Storage, key: string, value: any): void {
    try {
        storage.setItem(key, JSON.stringify(value));
    } catch (_error) {}
}


/**
 * Removes one browser storage value.
 *
 * @param storage - Browser storage implementation.
 * @param key - Storage key.
 * @returns */
function removeStorageItem(storage: Storage, key: string): void {
    try {
        storage.removeItem(key);
    } catch (_error) {}
}
