/**
 * Normalizes English ISO language names for reusable gadget workflows.
 *
 * Language identifiers and reference names are sourced from SIL
 * International's ISO 639-3 registry:
 * https://iso639-3.sil.org/code_tables/download_tables
 */

import { ISO_639_LANGUAGE_NAME_ROWS } from "./language-code-data.ts";

const LANGUAGE_CODE_PATTERN = /^[a-z]{2,3}(?:-[a-z0-9]{1,8})*$/iu;
const WIKITEXT_SYNTAX_PATTERN = /(?:\{\{|\}\}|\[\[|\]\]|[<>|])/u;

let languageCodesByEnglishName: Map<string, string> | undefined;

/**
 * Replaces recognized English language names with compact ISO codes.
 *
 * ISO 639-1 identifiers are preferred where the registry supplies one.
 * Otherwise, the ISO 639-3 identifier is used. Existing code-like
 * values and unrecognized names are retained.
 *
 * @param value - A comma-separated citation language value.
 * @returns Safely normalized language codes and comma spacing.
 */
export function normalizeEnglishLanguageCodes(value: string): string {
    const trimmed = value.trim();
    if (trimmed === "" || WIKITEXT_SYNTAX_PATTERN.test(trimmed)) {
        return trimmed;
    }
    const values = trimmed.split(",").map((item) => item.trim());
    if (values.some((item) => item === "")) {
        return trimmed;
    }
    return values.map(normalizeLanguageValue).join(", ");
}

/**
 * Normalizes one name while giving existing tags precedence.
 */
function normalizeLanguageValue(value: string): string {
    if (LANGUAGE_CODE_PATTERN.test(value)) {
        return value;
    }
    const lookup = value.toLocaleLowerCase("en-US");
    return getLanguageCodesByEnglishName().get(lookup) ?? value;
}

/**
 * Lazily parses the generated table on the first name lookup.
 */
function getLanguageCodesByEnglishName(): Map<string, string> {
    languageCodesByEnglishName ??= new Map(
        ISO_639_LANGUAGE_NAME_ROWS.trim()
            .split("\n")
            .map(parseLanguageNameRow),
    );
    return languageCodesByEnglishName;
}

/**
 * Parses one generated code-tab-name row.
 */
function parseLanguageNameRow(row: string): [string, string] {
    const separator = row.indexOf("\t");
    const code = row.slice(0, separator);
    const name = row.slice(separator + 1);
    return [name, code];
}
