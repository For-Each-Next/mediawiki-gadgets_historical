/**
 * Estimates generated prose length in Hanzi-equivalent sinographs.
 */

import { formatText } from "./text-templates.ts";
import { buildSentence1Text } from "./sentence.ts";

/**
 * Counts generated prose in Hanzi-equivalent sinographs.
 *
 * @param params - Article prose parameters.
 * @param params.aggScoresText - Aggregate review score
 * sentence.
 * @param params.additionalProseText - User-entered appended
 * prose.
 * @param params.companyMetadata - Company metadata.
 * @param params.companyMetadata.text - Company prose text.
 * @param params.platformSeriesMetadata - Platform and series
 * metadata.
 * @param params.platformSeriesMetadata.text - Platform/series
 * prose
 * text.
 * @param params.yearGenreMetadata - Year/genre metadata.
 * @param params.yearGenreMetadata.text - Year/genre prose
 * text.
 * @returns Hanzi-equivalent sinograph count.
 */
export function countGeneratedProseSinographs(params: any): number {
    if (params.prose?.sinographs != null) {
        return params.prose.sinographs;
    }

    return countProseSinographs(buildGeneratedProseText(params));
}

/**
 * Counts prose text in Hanzi-equivalent sinographs.
 *
 * @param text - Prose text.
 * @returns Hanzi-equivalent sinograph count.
 */
export function countProseSinographs(text: string): number {
    const plainText = stripWikitext(text);
    const withoutLatin = plainText.replace(getLatinPhrasePattern(), "");
    const withoutNumbers = withoutLatin.replace(getNumberPattern(), "");

    return (
        countHanCharacters(withoutNumbers) +
        countMatches(plainText, getLatinPhrasePattern()) * 2 +
        countMatches(withoutLatin, getNumberPattern()) * 2
    );
}

/**
 * Builds the generated article prose covered by the count.
 *
 * @param params - Article prose parameters.
 * @returns Generated prose text.
 */
function buildGeneratedProseText(params: any): string {
    const sentence1a = formatText("prose.countedSentence1a", {
        yearGenre: params.yearGenreMetadata.text,
    });
    const sentence1 = buildSentence1Text(
        sentence1a,
        params.companyMetadata.text,
    );
    const text = formatText("prose.text", {
        sentence1,
        sentence2: params.platformSeriesMetadata.text,
        sentence3: params.aggScoresText,
        sentence4: params.additionalProseText || "",
    });

    return text;
}

/**
 * Removes simple wikitext markup while preserving displayed prose.
 *
 * @param text - Wikitext prose.
 * @returns Plain prose.
 */
function stripWikitext(text: string): string {
    return String(text || "")
        .replace(/<ref\b[^>]*\/>/giu, "")
        .replace(/<ref\b[^>]*>[\s\S]*?<\/ref>/giu, "")
        .replace(/\[\[[^\]|]*\|([^\]]+)\]\]/gu, "$1")
        .replace(/\[\[([^\]]+)\]\]/gu, "$1")
        .replace(/\{\{[^{}]*\}\}/gu, "");
}

/**
 * Counts Han script characters.
 *
 * @param text - Text to scan.
 * @returns Han character count.
 */
function countHanCharacters(text: string): number {
    return countMatches(text, /\p{Script=Han}/gu);
}

/**
 * Counts regular expression matches.
 *
 * @param text - Text to scan.
 * @param pattern - Global regular expression.
 * @returns Match count.
 */
function countMatches(text: string, pattern: RegExp): number {
    return Array.from(String(text || "").matchAll(pattern)).length;
}

/**
 * Gets the Latin proper-noun phrase matcher.
 *
 * @returns Latin phrase matcher.
 */
function getLatinPhrasePattern(): RegExp {
    return new RegExp(
        [
            "\\b[A-Za-z][A-Za-z0-9]*",
            "(?:[ \\t./&",
            "'’:-]+[A-Za-z0-9]+)*\\b",
        ].join(""),
        "gu",
    );
}

/**
 * Gets the numeric token matcher.
 *
 * @returns Number matcher.
 */
function getNumberPattern(): RegExp {
    return /\b\d+(?:[./:-]\d+)*%?\b/gu;
}
