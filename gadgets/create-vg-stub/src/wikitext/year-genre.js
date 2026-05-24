/* eslint-disable */

/**
 * Builds year and genre prose plus metadata for video game stubs.
 */

import {
  FIELD_REFERENCE_DATA,
  buildLinkText,
  getReferenceDefinition,
  getReferenceEntry,
  getReferenceValues,
  splitFieldValues,
  trimValue,
  uniqueValues,
} from "../utils.js";

/**
 * Builds display and metadata for year and genre values.
 *
 * @param {object} values - Year and genre values.
 * @param {string} values.genres - Game genre text.
 * @param {string} [values.sourceTag] - Source reference tag.
 * @param {string} values.year - Release year.
 * @returns {object} Video game text, categories, and stub tags.
 */
export function buildYearGenreMetadata(values) {
  const genreReferences = getGenreReferences(values.genres);
  const yearReference = getYearReference(values.year);
  const text = buildYearGenreText({
    genreReferences,
    genres: values.genres,
    sourceTag: values.sourceTag || "",
    yearReference,
  });

  return {
    categories: uniqueValues([
      ...getReferenceValues(genreReferences, "categories"),
      ...yearReference.categories,
    ]),
    stubTags: uniqueValues(getReferenceValues(genreReferences, "stubTags")),
    text,
  };
}

/**
 * Builds the year, genre, and video game phrase for the intro sentence.
 *
 * @param {object} params - Normalized article parameters.
 * @param {Array<object>} params.genreReferences - Matched genre metadata.
 * @param {string} params.genres - Raw genre text.
 * @param {string} params.sourceTag - Source reference tag.
 * @param {object} params.yearReference - Matched year metadata.
 * @returns {string} Year, genre, and video game phrase.
 */
function buildYearGenreText(params) {
  return `${buildYearGenrePrefixText(params)}[[电子游戏]]${params.sourceTag}`;
}

/**
 * Builds the year and genre phrase before the video game link.
 *
 * @param {object} params - Normalized article parameters.
 * @param {Array<object>} params.genreReferences - Matched genre metadata.
 * @param {string} params.genres - Raw genre text.
 * @param {object} params.yearReference - Matched year metadata.
 * @returns {string} Year and genre phrase.
 */
function buildYearGenrePrefixText(params) {
  const yearText = params.yearReference.phrase;
  const genreText = buildGenreClassText(params);
  const text = `${yearText}${genreText}`;

  if (text === "") {
    return "一款";
  }

  return text;
}

/**
 * Builds the genre class phrase.
 *
 * @param {object} params - Normalized article parameters.
 * @param {Array<object>} params.genreReferences - Matched genre metadata.
 * @param {string} params.genres - Raw genre text.
 * @returns {string} Genre class phrase.
 */
function buildGenreClassText(params) {
  const genreText = buildGenreText(params);

  if (genreText === "") {
    return "";
  }

  return `${genreText}类`;
}

/**
 * Builds genre-aware text for the genre phrase.
 *
 * @param {object} params - Normalized article parameters.
 * @param {Array<object>} params.genreReferences - Matched genre metadata.
 * @param {string} params.genres - Raw genre text.
 * @returns {string} Genre phrase wikitext.
 */
function buildGenreText(params) {
  return splitFieldValues(params.genres).map(buildGenreItemText).join("、");
}

/**
 * Builds one genre item.
 *
 * @param {string} value - User-entered genre value.
 * @returns {string} Genre item wikitext.
 */
function buildGenreItemText(value) {
  const genreReference = getReferenceDefinition(
    FIELD_REFERENCE_DATA.genres,
    value,
  );

  if (genreReference == null || genreReference.page == null) {
    return value;
  }

  return buildLinkText(
    genreReference.page.title,
    getGenrePageLabel(genreReference),
  );
}

/**
 * Gets the display label for a genre page.
 *
 * @param {object} reference - Genre reference metadata.
 * @param {object} reference.page - Genre page metadata.
 * @returns {string} Genre page label.
 */
function getGenrePageLabel(reference) {
  if (reference.page.label == null) {
    return removeGameSuffix(reference.page.title);
  }

  return removeGameSuffix(reference.page.label);
}

/**
 * Removes Chinese video game suffixes from display labels.
 *
 * @param {string} value - Display label.
 * @returns {string} Display label without the game suffix.
 */
function removeGameSuffix(value) {
  return value.replace(/(?:[电電]子)?[游遊][戏戲]$/u, "");
}

/**
 * Gets reference metadata for the genre parameter.
 *
 * @param {string} value - User-entered genre value.
 * @returns {Array<object>} Matched linked pages, categories, and tags.
 */
function getGenreReferences(value) {
  return splitFieldValues(value)
    .map(getReferenceDefinition.bind(null, FIELD_REFERENCE_DATA.genres))
    .filter(Boolean);
}

/**
 * Gets category and display metadata for a year value.
 *
 * @param {string} value - User-entered year value.
 * @returns {object} Year phrase and categories.
 */
function getYearReference(value) {
  const year = trimValue(value);
  const yearDefinition = getYearDefinition(year);

  if (year === "") {
    return {
      categories: [],
      phrase: "",
    };
  }

  if (year === "~") {
    return {
      categories: ["未来电子游戏"],
      phrase: "尚未推出的",
    };
  }

  if (year.startsWith("~")) {
    return getPlannedYearReference(year.slice(1));
  }

  return {
    categories: getReferenceCategories(yearDefinition.reference),
    phrase: `${getYearLabel(year, yearDefinition)}年`,
  };
}

/**
 * Gets display and category metadata for a planned release year.
 *
 * @param {string} value - Planned release year.
 * @returns {object} Planned year phrase and categories.
 */
function getPlannedYearReference(value) {
  const year = trimValue(value);
  const yearDefinition = getYearDefinition(year);

  return {
    categories: uniqueValues([
      "未来电子游戏",
      ...getReferenceCategories(yearDefinition.reference),
    ]),
    phrase: `预定于${getYearLabel(year, yearDefinition)}年推出的`,
  };
}

/**
 * Gets reference metadata for a year.
 *
 * @param {string} year - Release year.
 * @returns {object} Matched year key and metadata.
 */
function getYearDefinition(year) {
  return getReferenceEntry(FIELD_REFERENCE_DATA.years, year);
}

/**
 * Gets categories from reference metadata.
 *
 * @param {object|undefined} reference - Reference metadata.
 * @returns {Array<string>} Category titles.
 */
function getReferenceCategories(reference) {
  if (reference == null) {
    return [];
  }

  return reference.categories || [];
}

/**
 * Gets the canonical year label from a matched year entry.
 *
 * @param {string} fallback - Fallback year label.
 * @param {object} definition - Matched year key and metadata.
 * @returns {string} Canonical year label.
 */
function getYearLabel(fallback, definition) {
  if (definition.key == null) {
    return fallback;
  }

  return definition.key;
}
