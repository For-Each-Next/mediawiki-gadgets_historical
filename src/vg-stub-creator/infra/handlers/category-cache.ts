/**
 * Stores per-page category resolution caches.
 */

const CATEGORY_CACHE_STORAGE_PREFIX = "vg-stub-creator-category-cache:";

/**
 * Browser-backed category resolution cache.
 */
interface CategoryCacheStore {
    cache: Record<string, any>;
    clear: () => void;
    save: () => void;
}

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
): CategoryCacheStore {
    const storageKey = `${CATEGORY_CACHE_STORAGE_PREFIX}${page}`;
    const cache = readJsonStorage(storage, storageKey) || {};

    const result: CategoryCacheStore = {
        cache,

        /**
         * Clears cached category resolutions.
         *
         * @returns Result when the function
         *   clears cached category resolutions.
         */
        clear(): void {
            Object.keys(cache).forEach(function callback(key) {
                delete cache[key];
            });
            removeStorageItem(storage, storageKey);
        },

        /**
         * Saves current category resolutions.
         *
         * @returns Result when the function
         *   saves current category resolutions.
         */
        save(): void {
            writeJsonStorage(storage, storageKey, cache);
        },
    };
    return result;
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
 * @returns Result when the function
 *   writes a json value to browser storage.
 */
function writeJsonStorage(storage: Storage, key: string, value: any): void {
    try {
        const stringifyResult = JSON.stringify(value);
        storage.setItem(key, stringifyResult);
    } catch (_error) {
        // Storage may fail. The in-memory cache remains usable.
    }
}

/**
 * Removes one browser storage value.
 *
 * @param storage - Browser storage implementation.
 * @param key - Storage key.
 * @returns Result when the function
 *   removes one browser storage value.
 */
function removeStorageItem(storage: Storage, key: string): void {
    try {
        storage.removeItem(key);
    } catch (_error) {
        // Cleanup is best effort. The in-memory cache is already clear.
    }
}
