/**
 * Formats userscript-compatible metadata lines.
 */

const METADATA_KEY_WIDTH = 13;

/**
 * Formats one userscript metadata line.
 *
 * @param key - Metadata key.
 * @param value - Metadata value.
 * @returns Metadata line.
 */
export function formatMetadata(key: string, value: string): string {
    if (hasLineBreak(key) || hasLineBreak(value)) {
        throw new Error("Userscript metadata must fit on one line.");
    }
    return `// @${key.padEnd(METADATA_KEY_WIDTH)}${value}`;
}

/** Qualifies a license when retained third-party terms also apply. */
export function describeArtifactLicense(
    license: string,
    hasNotices: boolean,
): string {
    return hasNotices
        ? `${license}; scope and exceptions in retained legal notices`
        : license;
}

/** Checks for characters that JavaScript treats as line boundaries. */
function hasLineBreak(value: string): boolean {
    return /[\r\n\u2028\u2029]/u.test(value);
}
