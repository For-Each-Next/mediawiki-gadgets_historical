/**
 * Decodes the small MediaWiki response shapes used by the gadget.
 */

export type UnknownRecord = Record<string, unknown>;

export function asRecord(value: unknown): UnknownRecord | null {
    if (value == null || typeof value !== "object" || Array.isArray(value)) {
        return null;
    }

    return value as UnknownRecord;
}

export function getFirstQueryPage(response: unknown): UnknownRecord | null {
    const responseRecord = asRecord(response);
    const query = asRecord(responseRecord?.query);
    const pages = query?.pages;

    if (Array.isArray(pages)) {
        return asRecord(pages[0]);
    }

    const pageRecord = asRecord(pages);
    if (pageRecord == null) {
        return null;
    }

    return asRecord(Object.values(pageRecord)[0]);
}

export function getFirstRevision(
    page: UnknownRecord | null,
): UnknownRecord | null {
    const revisions = page?.revisions;
    return Array.isArray(revisions) ? asRecord(revisions[0]) : null;
}

export function getRevisionContent(revision: UnknownRecord | null): string {
    const slots = asRecord(revision?.slots);
    const main = asRecord(slots?.main);
    const content = main?.content ?? main?.["*"] ?? revision?.["*"] ?? "";
    return typeof content === "string" ? content : String(content);
}

export function getRequiredString(
    record: UnknownRecord | null,
    key: string,
    description: string,
): string {
    const value = record?.[key];
    if (typeof value !== "string" || value === "") {
        throw new Error(`MediaWiki response omitted ${description}.`);
    }

    return value;
}
