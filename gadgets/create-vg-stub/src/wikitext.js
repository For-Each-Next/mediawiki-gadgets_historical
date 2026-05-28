/* eslint-disable */

/**
 * Assembles generated article wikitext from prepared article metadata.
 */

import { buildCategoryText, buildStubTagText } from "./categories.js";

/**
 * Builds the Chinese Wikipedia video game stub article text.
 *
 * @param {object} params - Normalized article parameters.
 * @param {string} params.aggScoresText - Aggregate review score sentence.
 * @param {object} params.companyMetadata - Company text and metadata.
 * @param {string} params.infoboxText - Infobox wikitext.
 * @param {string} params.leadNameText - Lead article name text.
 * @param {string} params.noteTaText - NoteTA-lite wikitext.
 * @param {object} params.platformSeriesMetadata - Platform and series text and metadata.
 * @param {Array<object>} params.sourceReferences - Named source references.
 * @param {object} params.yearGenreMetadata - Year/genre text and metadata.
 * @returns {string} Generated Chinese wikitext.
 */
export function buildArticleWikitext(params) {
  const intro =
    `${params.leadNameText}是${buildVideoGameText(params)}。` +
    params.platformSeriesMetadata.text +
    params.aggScoresText;

  return [
    params.noteTaText,
    params.infoboxText,
    intro,
    buildReferencesText(params.sourceReferences),
    buildCategoryText(params),
    buildStubTagText(params),
  ]
    .filter(Boolean)
    .join("\n\n");
}

/**
 * Builds the video game noun phrase.
 *
 * @param {object} params - Normalized article parameters.
 * @param {object} params.companyMetadata - Company text and metadata.
 * @param {object} params.yearGenreMetadata - Year/genre text and metadata.
 * @returns {string} Video game noun phrase.
 */
function buildVideoGameText(params) {
  return params.yearGenreMetadata.text + params.companyMetadata.text;
}

/**
 * Builds the references section for generated citations.
 *
 * @param {Array<object>} references - Named source references.
 * @returns {string} References section, or an empty string.
 */
function buildReferencesText(references) {
  if (references.length === 0) {
    return "";
  }

  return `== 参考文献 ==\n\n<references>\n${references
    .map(buildFullReferenceText)
    .join("\n")}\n</references>`;
}

/**
 * Builds one full named reference.
 *
 * @param {object} reference - Named source reference.
 * @param {string} reference.citation - Citation template wikitext.
 * @param {string} reference.name - Reference name.
 * @returns {string} Full named reference wikitext.
 */
function buildFullReferenceText(reference) {
  return `<ref name="${reference.name}">${reference.citation}</ref>`;
}
