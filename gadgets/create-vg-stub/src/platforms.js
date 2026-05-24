/* eslint-disable */

/**
 * Builds platform prose and metadata for video game stubs.
 */

import {
  FIELD_REFERENCE_DATA,
  buildPageText,
  getReferenceValues,
  getSourceReference,
  splitFieldValues,
  uniqueValues,
} from "./utils.js";

/**
 * Builds display and metadata for platform values.
 *
 * @param {string} value - Platform values.
 * @param {object} [options] - Platform formatting options.
 * @param {string} [options.sourceTag] - Source reference tag.
 * @returns {object} Text, categories, and stub tags.
 */
export function buildPlatformMetadata(value, options = {}) {
  const references = getPlatformReferences(value);
  const platformListText = buildPlatformListText(value, references);

  return {
    categories: uniqueValues(getReferenceValues(references, "categories")),
    stubTags: uniqueValues(getReferenceValues(references, "stubTags")),
    text: buildPlatformSentenceText(platformListText, options.sourceTag || ""),
  };
}

/**
 * Builds the platform sentence.
 *
 * @param {string} text - Platform list wikitext.
 * @param {string} sourceTag - Source reference tag.
 * @returns {string} Platform sentence, or an empty string.
 */
function buildPlatformSentenceText(text, sourceTag) {
  if (text === "") {
    return "";
  }

  return `作品对应${text}平台${sourceTag}。`;
}

/**
 * Builds linked platform text from raw values and matched metadata.
 *
 * @param {string} value - User-entered platform values.
 * @param {Array<object>} references - Matched platform metadata.
 * @returns {string} Platform list wikitext.
 */
function buildPlatformListText(value, references) {
  return splitFieldValues(value)
    .map(buildPlatformText.bind(null, references))
    .join("、");
}

/**
 * Builds display text for one platform value.
 *
 * @param {Array<object>} references - Matched platform metadata.
 * @param {string} value - User-entered platform value.
 * @returns {string} Platform wikitext.
 */
function buildPlatformText(references, value) {
  const reference = references.find((item) => item.source === value);

  if (reference == null || reference.page == null) {
    return value;
  }

  return buildPageText(reference.page);
}

/**
 * Gets reference metadata for platform values.
 *
 * @param {string} value - User-entered platform values.
 * @returns {Array<object>} Matched platform metadata.
 */
function getPlatformReferences(value) {
  return splitFieldValues(value)
    .map(getSourceReference.bind(null, FIELD_REFERENCE_DATA.platforms))
    .filter(Boolean);
}
