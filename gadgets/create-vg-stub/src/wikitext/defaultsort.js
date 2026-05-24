/* eslint-disable */

/**
 * Builds DEFAULTSORT wikitext for video game stubs.
 */

/**
 * Builds a DEFAULTSORT magic word.
 *
 * @param {object} params - Default sort parameters.
 * @param {string} params.title - Article title.
 * @param {string} [params.original] - Original title.
 * @param {string} [params.english] - English title.
 * @param {string} [params.sortKey] - User-entered sort key.
 * @returns {string} DEFAULTSORT wikitext.
 */
export function buildDefaultSortText(params) {
  return `{{DEFAULTSORT:${buildDefaultSortKey(params)}}}`;
}

/**
 * Builds a default sort key.
 *
 * @param {object} params - Default sort parameters.
 * @param {string} params.title - Article title.
 * @param {string} [params.original] - Original title.
 * @param {string} [params.english] - English title.
 * @param {string} [params.sortKey] - User-entered sort key.
 * @returns {string} Sort key.
 */
export function buildDefaultSortKey(params) {
  const sortKey = normalizeValue(params.sortKey);

  if (sortKey != null) {
    return sortKey;
  }

  const original = normalizeValue(params.original);

  if (original != null && !hasNonLatinLetter(original)) {
    return normalizeSortKey(original);
  }

  return normalizeSortKey(params.english || params.title);
}

/**
 * Normalizes one sort key.
 *
 * @param {string} value - Raw sort key.
 * @returns {string} Normalized sort key.
 */
function normalizeSortKey(value) {
  return toTitleUpperCase(normalizeSortPunctuation(normalizeValue(value) || ""));
}

/**
 * Normalizes easy punctuation and symbol cases for sort keys.
 *
 * @param {string} value - Raw sort key.
 * @returns {string} Sort key with mechanical punctuation cleanup.
 */
function normalizeSortPunctuation(value) {
  return value
    .normalize("NFKC")
    .replace(/\.{3,}/gu, " ")
    .replace(/(\d)[,.](?=\d)/gu, "$1")
    .replace(/[‐‑‒–—―−]/gu, "-")
    .replace(/&/gu, " and ")
    .replace(/×/gu, " x ")
    .replace(/\bO'(?=\p{Letter})/gu, "O")
    .replace(/[^\p{Letter}\p{Mark}\p{Number}\s.'-]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

/**
 * Converts a value to title-style uppercase.
 *
 * @param {string} value - Raw value.
 * @returns {string} Title-style value.
 */
function toTitleUpperCase(value) {
  return value
    .replace(/\s+/gu, " ")
    .replace(/\p{Letter}[\p{Letter}\p{Mark}'’-]*/gu, titleUpperWord);
}

/**
 * Converts one word to title-style uppercase.
 *
 * @param {string} word - Word to convert.
 * @returns {string} Title-style word.
 */
function titleUpperWord(word) {
  return word
    .toLocaleLowerCase()
    .replace(/(^|-)\p{Letter}/gu, (character) => character.toLocaleUpperCase());
}

/**
 * Checks whether a value contains a non-Latin letter.
 *
 * @param {string} value - Value to inspect.
 * @returns {boolean} Whether the value contains a non-Latin letter.
 */
function hasNonLatinLetter(value) {
  return Array.from(value).some(isNonLatinLetter);
}

/**
 * Checks whether one character is a non-Latin letter.
 *
 * @param {string} character - Character to inspect.
 * @returns {boolean} Whether the character is a non-Latin letter.
 */
function isNonLatinLetter(character) {
  return /\p{Letter}/u.test(character) && !/\p{Script=Latin}/u.test(character);
}

/**
 * Normalizes a user-entered string.
 *
 * @param {string} value - Raw value.
 * @returns {string|undefined} Trimmed value, or undefined when empty.
 */
function normalizeValue(value) {
  if (value == null) {
    return undefined;
  }

  const trimmedValue = String(value).trim();

  return trimmedValue === "" ? undefined : trimmedValue;
}
