/**
 * Normalizes values shared by the article data flow and dialog.
 */

/**
 * Trims leading and trailing whitespace from a form value.
 *
 * @param value - Raw form value.
 * @returns Trimmed form value.
 */
export function trimFieldValue(value: any): string {
    if (value == null) {
        return "";
    }

    return String(value).trim();
}

/**
 * Splits a source URL field into one URL per nonblank line.
 *
 * @param value - Raw source URL field value.
 * @returns Trimmed source URLs.
 */
export function splitSourceUrls(value: any): Array<string> {
    const result = trimFieldValue(value)
        .split(/[\r\n]+/u)
        .map(trimFieldValue)
        .filter(Boolean);
    return result;
}

/**
 * Builds a source reference key for one localized name row.
 *
 * @param key - Localized name group key.
 * @param index - Row index.
 * @returns Source reference key.
 */
export function buildNameSourceReferenceKey(
    key: string,
    index: number,
): string {
    return `${key}.${index}`;
}

/**
 * Normalizes pasted list values while preserving ordinary commas.
 *
 * @param value - Raw list field value.
 * @returns Normalized list field value.
 */
export function normalizeListFieldValue(value: any): string {
    const text = trimFieldValue(value);

    if (!hasFirstLevelFieldSeparator(text)) {
        return text;
    }

    const result = text
        .split(/\s*[;；]\s*|[\r\n]+/u)
        .map(trimFieldValue)
        .filter(Boolean)
        .join("; ");
    return result;
}

/**
 * Checks whether a value contains a first-level list separator.
 *
 * @param value - Raw list field value.
 * @returns Whether a semicolon or line break is present.
 */
export function hasFirstLevelFieldSeparator(value: any): boolean {
    return /[;；\r\n]/u.test(String(value || ""));
}

/**
 * Parses a compact prefixed value such as "ja:タイトル".
 *
 * @param value - Raw prefixed field value.
 * @param defaultPrefix - Prefix used when none is entered.
 * @returns Parsed prefix and value.
 */
export function parsePrefixedValue(value: any, defaultPrefix: string): any {
    const text = trimFieldValue(value);
    const match = text.match(/^([^:\s][^:]*):(.*)$/u);

    if (match == null) {
        const result = {
            prefix: trimFieldValue(defaultPrefix),
            value: text,
        };
        return result;
    }

    const result = {
        prefix: trimFieldValue(match[1]),
        value: trimFieldValue(match[2]),
    };
    return result;
}

/**
 * Formats a compact prefixed value without separator whitespace.
 *
 * @param value - Raw prefixed field value.
 * @param options - Prefix formatting options.
 * @param options.normalizePrefix - Prefix normalizer.
 * @returns Compact prefixed value.
 */
export function formatPrefixedValue(value: any, options: any = {}): string {
    const parsed = parsePrefixedValue(value, "");

    if (parsed.prefix === "") {
        return parsed.value;
    }

    const normalizePrefix: (prefix: string) => string =
        options.normalizePrefix || preservePrefix;

    return `${normalizePrefix(parsed.prefix)}:${parsed.value}`;
}

/**
 * Returns a prefix without modification.
 *
 * @param prefix - Entered prefix.
 * @returns Unchanged prefix.
 */
function preservePrefix(prefix: string): string {
    return prefix;
}
