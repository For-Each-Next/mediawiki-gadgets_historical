/* eslint-disable */

/**
 * Estimates generated prose length in Hanzi-equivalent sinographs.
 */

/**
 * Counts generated prose in Hanzi-equivalent sinographs.
 *
 * @param {object} params - Article prose parameters.
 * @param {string} params.aggScoresText - Aggregate review score sentence.
 * @param {string} params.additionalProseText - User-entered appended prose.
 * @param {object} params.companyMetadata - Company metadata.
 * @param {string} params.companyMetadata.text - Company prose text.
 * @param {object} params.platformSeriesMetadata - Platform and series metadata.
 * @param {string} params.platformSeriesMetadata.text - Platform/series prose text.
 * @param {object} params.yearGenreMetadata - Year/genre metadata.
 * @param {string} params.yearGenreMetadata.text - Year/genre prose text.
 * @returns {number} Hanzi-equivalent sinograph count.
 */
export function countGeneratedProseSinographs(params) {
  return countProseSinographs(buildGeneratedProseText(params));
}

/**
 * Counts prose text in Hanzi-equivalent sinographs.
 *
 * @param {string} text - Prose text.
 * @returns {number} Hanzi-equivalent sinograph count.
 */
export function countProseSinographs(text) {
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
 * @param {object} params - Article prose parameters.
 * @returns {string} Generated prose text.
 */
function buildGeneratedProseText(params) {
  return (
    `是${params.yearGenreMetadata.text}${params.companyMetadata.text}。` +
    params.platformSeriesMetadata.text +
    params.aggScoresText +
    (params.additionalProseText || "")
  );
}

/**
 * Removes simple wikitext markup while preserving displayed prose.
 *
 * @param {string} text - Wikitext prose.
 * @returns {string} Plain prose.
 */
function stripWikitext(text) {
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
 * @param {string} text - Text to scan.
 * @returns {number} Han character count.
 */
function countHanCharacters(text) {
  return countMatches(text, /\p{Script=Han}/gu);
}

/**
 * Counts regular expression matches.
 *
 * @param {string} text - Text to scan.
 * @param {RegExp} pattern - Global regular expression.
 * @returns {number} Match count.
 */
function countMatches(text, pattern) {
  return Array.from(String(text || "").matchAll(pattern)).length;
}

/**
 * Gets the Latin proper-noun phrase matcher.
 *
 * @returns {RegExp} Latin phrase matcher.
 */
function getLatinPhrasePattern() {
  return /\b[A-Za-z][A-Za-z0-9]*(?:[ \t./&'’:-]+[A-Za-z0-9]+)*\b/gu;
}

/**
 * Gets the numeric token matcher.
 *
 * @returns {RegExp} Number matcher.
 */
function getNumberPattern() {
  return /\b\d+(?:[./:-]\d+)*(?:%)?\b/gu;
}
