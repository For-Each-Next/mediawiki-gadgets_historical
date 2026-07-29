/**
 * Fetches raw page citation metadata from Wikimedia Citoid.
 */

const CITOID_ENDPOINT = "/api/rest_v1/data/citation/zotero/";

export type CitationMetadata = Record<string, unknown>;

export interface CitationMetadataOptions {
    fetcher?: typeof fetch;
}

/** Reports an unsuccessful Citoid HTTP response. */
export class CitoidRequestError extends Error {
    override name = "CitoidRequestError";
    readonly status: number;

    constructor(status: number) {
        super(`Citoid request failed: HTTP ${status}`);
        this.status = status;
    }
}

/**
 * Fetches the first raw metadata record for a URL or identifier.
 *
 * @param search - URL or bibliographic identifier to resolve.
 * @param options - Request options.
 * @returns The first Citoid metadata object without post-processing.
 */
export async function fetchCitationMetadata(
    search: string,
    options: CitationMetadataOptions = {},
): Promise<CitationMetadata> {
    const fetcher = options.fetcher ?? fetch;
    const response = await fetcher(buildCitoidUrl(search), {
        headers: { accept: "application/json" },
    });
    if (!response.ok) {
        throw new CitoidRequestError(response.status);
    }
    return getFirstCitation(await response.json());
}

/**
 * Builds the Citoid REST URL for source lookup text.
 *
 * @param search - URL or bibliographic identifier to resolve.
 * @returns Citoid request URL.
 */
export function buildCitoidUrl(search: string): string {
    const trimmedSearch = search.trim();
    if (trimmedSearch === "") {
        throw new Error("Enter a source before fetching citation metadata.");
    }
    return `${CITOID_ENDPOINT}${encodeURIComponent(trimmedSearch)}`;
}

/** Validates and returns the first Citoid response record unchanged. */
function getFirstCitation(citations: unknown): CitationMetadata {
    if (!Array.isArray(citations) || !isCitationMetadata(citations[0])) {
        throw new Error("Citoid did not return citation metadata.");
    }
    return citations[0];
}

/** Checks whether a value is a metadata object. */
function isCitationMetadata(value: unknown): value is CitationMetadata {
    return (
        typeof value === "object" && value !== null && !Array.isArray(value)
    );
}
