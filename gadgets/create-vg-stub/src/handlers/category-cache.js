/* eslint-disable */

/**
 * Stores per-page category resolution caches.
 */

const CATEGORY_CACHE_STORAGE_PREFIX = "create-vg-stub-category-cache:";

/**
 * Creates a category cache backed by browser storage.
 *
 * @param {string} page - Current page title.
 * @param {Storage} [storage] - Browser storage implementation.
 * @returns {object} Category cache store.
 */
export function createCategoryCacheStore(page, storage = localStorage) {
    const storageKey = `${CATEGORY_CACHE_STORAGE_PREFIX}${page}`;
    const cache = readJsonStorage(storage, storageKey) || {};

    return {
        cache,

        /**
         * Clears cached category resolutions.
         *
         * @returns {void}
         */
        clear() {
            Object.keys(cache).forEach((key) => {
                delete cache[key];
            });
            removeStorageItem(storage, storageKey);
        },

        /**
         * Saves current category resolutions.
         *
         * @returns {void}
         */
        save() {
            writeJsonStorage(storage, storageKey, cache);
        },
    };
}

/**
 * Reads a JSON value from browser storage.
 *
 * @param {Storage} storage - Browser storage implementation.
 * @param {string} key - Storage key.
 * @returns {object|undefined} Stored value.
 */
function readJsonStorage(storage, key) {
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
 * @param {Storage} storage - Browser storage implementation.
 * @param {string} key - Storage key.
 * @param {object} value - Value to store.
 * @returns {void}
 */
function writeJsonStorage(storage, key, value) {
    try {
        storage.setItem(key, JSON.stringify(value));
    } catch (_error) {}
}

/**
 * Removes one browser storage value.
 *
 * @param {Storage} storage - Browser storage implementation.
 * @param {string} key - Storage key.
 * @returns {void}
 */
function removeStorageItem(storage, key) {
    try {
        storage.removeItem(key);
    } catch (_error) {}
}
