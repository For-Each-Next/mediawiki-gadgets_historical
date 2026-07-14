/* eslint-disable */

/**
 * Normalizes values shared by the article data flow and dialog.
 */

/**
 * Trims leading and trailing whitespace from a form value.
 *
 * @param {*} value - Raw form value.
 * @returns {string} Trimmed form value.
 */
export function trimFieldValue(value) {
    if (value == null) {
        return "";
    }

    return String(value).trim();
}

/**
 * Splits a source URL field into one URL per nonblank line.
 *
 * @param {*} value - Raw source URL field value.
 * @returns {Array<string>} Trimmed source URLs.
 */
export function splitSourceUrls(value) {
    return trimFieldValue(value)
        .split(/[\r\n]+/u)
        .map(trimFieldValue)
        .filter(Boolean);
}

/**
 * Builds a source reference key for one localized name row.
 *
 * @param {string} key - Localized name group key.
 * @param {number} index - Row index.
 * @returns {string} Source reference key.
 */
export function buildNameSourceReferenceKey(key, index) {
    return `${key}.${index}`;
}

/**
 * Normalizes pasted list values while preserving ordinary commas.
 *
 * @param {*} value - Raw list field value.
 * @returns {string} Normalized list field value.
 */
export function normalizeListFieldValue(value) {
    const text = trimFieldValue(value);

    if (!hasFirstLevelFieldSeparator(text)) {
        return text;
    }

    return text
        .split(/\s*[;；]\s*|[\r\n]+/u)
        .map(trimFieldValue)
        .filter(Boolean)
        .join("; ");
}

/**
 * Checks whether a value contains a first-level list separator.
 *
 * @param {*} value - Raw list field value.
 * @returns {boolean} Whether a semicolon or line break is present.
 */
export function hasFirstLevelFieldSeparator(value) {
    return /[;；\r\n]/u.test(String(value || ""));
}

/**
 * Parses a compact prefixed value such as "ja:タイトル".
 *
 * @param {*} value - Raw prefixed field value.
 * @param {string} defaultPrefix - Prefix used when none is entered.
 * @returns {object} Parsed prefix and value.
 */
export function parsePrefixedValue(value, defaultPrefix) {
    const text = trimFieldValue(value);
    const match = text.match(/^([^:\s][^:]*):(.*)$/u);

    if (match == null) {
        return {
            prefix: trimFieldValue(defaultPrefix),
            value: text,
        };
    }

    return {
        prefix: trimFieldValue(match[1]),
        value: trimFieldValue(match[2]),
    };
}

/**
 * Formats a compact prefixed value without separator whitespace.
 *
 * @param {*} value - Raw prefixed field value.
 * @param {object} [options] - Prefix formatting options.
 * @param {Function} [options.normalizePrefix] - Prefix normalizer.
 * @returns {string} Compact prefixed value.
 */
export function formatPrefixedValue(value, options = {}) {
    const parsed = parsePrefixedValue(value, "");

    if (parsed.prefix === "") {
        return parsed.value;
    }

    const normalizePrefix =
        options.normalizePrefix ||
        /**
         * Returns an unchanged prefix.
         *
         * @param {string} prefix - Entered prefix.
         * @returns {string} Unchanged prefix.
         */
        ((prefix) => prefix);

    return `${normalizePrefix(parsed.prefix)}:${parsed.value}`;
}
