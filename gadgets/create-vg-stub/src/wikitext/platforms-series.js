/* eslint-disable */

/**
 * Builds platform and series prose and metadata for video game stubs.
 */

import {
  FIELD_REFERENCE_DATA,
  buildPageText,
  getReferenceValues,
  getSourceReference,
  splitFieldValues,
  trimValue,
  uniqueValues,
} from "../utils.js";

/**
 * Builds display and metadata for platform and series values.
 *
 * @param {object} values - Platform and series values.
 * @param {string} values.platforms - Platform values.
 * @param {string} values.series - Series name.
 * @param {object} [options] - Platform formatting options.
 * @param {string} [options.platformSourceTag] - Platform source reference tag.
 * @param {string} [options.seriesSourceTag] - Series source reference tag.
 * @returns {object} Text, categories, and stub tags.
 */
export function buildPlatformSeriesMetadata(values, options = {}) {
  const references = getPlatformReferences(values.platforms);
  const platformListText = buildPlatformListText(values.platforms, references);

  return {
    categories: uniqueValues(getReferenceValues(references, "categories")),
    stubTags: uniqueValues(getReferenceValues(references, "stubTags")),
    text: buildPlatformSeriesSentenceText(
      platformListText,
      trimValue(values.series || ""),
      options.platformSourceTag || "",
      options.seriesSourceTag || "",
    ),
  };
}

/**
 * Builds the platform and series sentence.
 *
 * @param {string} platformText - Platform list wikitext.
 * @param {string} series - Series name.
 * @param {string} platformSourceTag - Platform source reference tag.
 * @param {string} seriesSourceTag - Series source reference tag.
 * @returns {string} Platform sentence, or an empty string.
 */
function buildPlatformSeriesSentenceText(
  platformText,
  series,
  platformSourceTag,
  seriesSourceTag,
) {
  if (platformText === "") {
    return "";
  }

  return (
    `作品对应${platformText}平台${platformSourceTag}` +
    `${buildSeriesText(series, seriesSourceTag)}。`
  );
}

/**
 * Builds the series phrase.
 *
 * @param {string} series - Series name.
 * @param {string} sourceTag - Series source reference tag.
 * @returns {string} Series phrase, or an empty string.
 */
function buildSeriesText(series, sourceTag) {
  if (series === "") {
    return "";
  }

  return `，属于「《${series}》系列」${sourceTag}`;
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
