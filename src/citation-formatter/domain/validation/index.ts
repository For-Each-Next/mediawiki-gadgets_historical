import { ENWIKI_CITATION_VALIDATION } from "./enwiki.ts";
import type { CitationValidationConfig } from "./types.ts";
import { ZHWIKI_CITATION_VALIDATION } from "./zhwiki.ts";

const CITATION_VALIDATION_CONFIGS = [
    ENWIKI_CITATION_VALIDATION,
    ZHWIKI_CITATION_VALIDATION,
] as const;

/**
 * Selects citation rules for one MediaWiki database name.
 *
 * @param wikiId - Wiki id value.
 * @returns Selected citation rules for one MediaWiki database name.
 */
export function getCitationValidationConfig(
    wikiId: string,
): CitationValidationConfig {
    const normalized = wikiId.toLocaleLowerCase("en-US");
    return (
        CITATION_VALIDATION_CONFIGS.find((config) =>
            config.wikiIds.includes(normalized),
        ) ?? ENWIKI_CITATION_VALIDATION
    );
}

export type { CitationValidationConfig } from "./types.ts";
