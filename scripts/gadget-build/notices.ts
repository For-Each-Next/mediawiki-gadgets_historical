/** Formats legal notices retained in generated browser artifacts. */

/**
 * Wraps package legal notices in ordinary JavaScript comments.
 *
 * @param notices - Complete notice texts.
 * @returns JavaScript comment blocks in declared order.
 */
export function formatLegalNotices(notices: readonly string[]): string {
    return notices.map((notice) => `/*\n${notice.trim()}\n*/`).join("\n\n");
}
