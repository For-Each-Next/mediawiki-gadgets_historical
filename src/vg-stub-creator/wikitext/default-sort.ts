/**
 * Builds DEFAULTSORT wikitext for video game stubs.
 */

/**
 * Builds a DEFAULTSORT magic word.
 *
 * @param params - Default sort parameters.
 * @param params.title - Article title.
 * @param params.original - Original title.
 * @param params.english - English title.
 * @param params.sortKey - User-entered sort key.
 * @returns DEFAULTSORT wikitext.
 */
export function buildDefaultSortText(params: any): string {
    return `{{DEFAULTSORT:${buildDefaultSortKey(params)}}}`;
}


/**
 * Builds a default sort key.
 *
 * @param params - Default sort parameters.
 * @param params.title - Article title.
 * @param params.original - Original title.
 * @param params.english - English title.
 * @param params.sortKey - User-entered sort key.
 * @returns Sort key.
 */
export function buildDefaultSortKey(params: any): string {
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
 * @param value - Raw sort key.
 * @returns Normalized sort key.
 */
function normalizeSortKey(value: string): string {
    return toTitleUpperCase(
        normalizeSortPunctuation(normalizeValue(value) || ""),
    );
}


/**
 * Normalizes easy punctuation and symbol cases for sort keys.
 *
 * @param value - Raw sort key.
 * @returns Sort key with mechanical punctuation cleanup.
 */
function normalizeSortPunctuation(value: string): string {
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
 * @param value - Raw value.
 * @returns Title-style value.
 */
function toTitleUpperCase(value: string): string {
    return value
        .replace(/\s+/gu, " ")
        .replace(/\p{Letter}[\p{Letter}\p{Mark}'’-]*/gu, titleUpperWord);
}


/**
 * Converts one word to title-style uppercase.
 *
 * @param word - Word to convert.
 * @returns Title-style word.
 */
function titleUpperWord(word: string): string {
    return word
        .toLocaleLowerCase()
        .replace(/(^|-)\p{Letter}/gu, function callback(character) {
            return character.toLocaleUpperCase();
        });
}


/**
 * Checks whether a value contains a non-Latin letter.
 *
 * @param value - Value to inspect.
 * @returns Whether the value contains a non-Latin letter.
 */
function hasNonLatinLetter(value: string): boolean {
    return Array.from(value).some(isNonLatinLetter);
}


/**
 * Checks whether one character is a non-Latin letter.
 *
 * @param character - Character to inspect.
 * @returns Whether the character is a non-Latin letter.
 */
function isNonLatinLetter(character: string): boolean {
    return (
        /\p{Letter}/u.test(character) && !/\p{Script=Latin}/u.test(character)
    );
}


/**
 * Normalizes a user-entered string.
 *
 * @param value - Raw value.
 * @returns Trimmed value, or undefined when empty.
 */
function normalizeValue(value: string): string | undefined {
    if (value == null) {
        return undefined;
    }

    const trimmedValue = String(value).trim();

    return trimmedValue === "" ? undefined : trimmedValue;
}
