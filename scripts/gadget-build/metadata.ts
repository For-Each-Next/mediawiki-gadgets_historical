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
    return `// @${key.padEnd(METADATA_KEY_WIDTH)}${value}`;
}
