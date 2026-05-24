/* eslint-disable */

/**
 * Builds video game infobox wikitext.
 */

import { buildTemplateText } from "./utils.js";

const NAME_MARKETS = ["ww", "hans", "hant", "cn", "tw", "hk"];

/**
 * Builds an Infobox VG template.
 *
 * @param {object} params - Infobox parameters.
 * @param {string} params.name - Article title.
 * @param {string} [params.englishName] - English title.
 * @param {string} [params.japaneseName] - Japanese title.
 * @param {string} [params.originalLanguage] - Original title language code.
 * @param {string} [params.originalName] - Original title.
 * @param {Array<object>} [params.officialNames] - Official name rows.
 * @param {Array<object>} [params.commonNames] - Common name rows.
 * @returns {string} Infobox template wikitext.
 */
export function buildInfoboxText(params) {
  return buildTemplateText(
    "Infobox VG",
    [
      ["title", normalizeValue(params.name)],
      ["original", buildOriginalNameText(params)],
      ["japanese", buildJapaneseNameText(params)],
      ["english", normalizeValue(params.englishName)],
      ["official", buildVgnText(params.officialNames)],
      ["common", buildVgnText(params.commonNames)],
    ],
    "block",
  );
}

/**
 * Builds the original title parameter for non-Japanese original names.
 *
 * @param {object} params - Infobox parameters.
 * @param {string} [params.originalLanguage] - Original title language code.
 * @param {string} [params.originalName] - Original title.
 * @returns {string|undefined} Original title parameter.
 */
function buildOriginalNameText(params) {
  const language = normalizeValue(params.originalLanguage);
  const name = normalizeValue(params.originalName);

  if (name == null || language == null || language === "ja") {
    return undefined;
  }

  return `${language}:${name}`;
}

/**
 * Builds the Japanese title parameter.
 *
 * @param {object} params - Infobox parameters.
 * @param {string} [params.japaneseName] - Japanese title.
 * @param {string} [params.originalLanguage] - Original title language code.
 * @param {string} [params.originalName] - Original title.
 * @returns {string|undefined} Japanese title parameter.
 */
function buildJapaneseNameText(params) {
  const japaneseName = normalizeValue(params.japaneseName);

  if (japaneseName != null) {
    return japaneseName;
  }

  if (normalizeValue(params.originalLanguage) !== "ja") {
    return undefined;
  }

  return normalizeValue(params.originalName);
}

/**
 * Builds a vgn template from localized name rows.
 *
 * @param {Array<object>} rows - Localized name rows.
 * @returns {string|undefined} vgn template wikitext.
 */
function buildVgnText(rows) {
  const entries = (rows || []).flatMap(buildVgnEntries);

  if (entries.length === 0) {
    return undefined;
  }

  return buildTemplateText("vgn", entries.map((entry) => [1, entry]));
}

/**
 * Builds vgn entries for one localized name row.
 *
 * @param {object} row - Localized name row.
 * @param {string} row.name - Localized name.
 * @param {Array<string>} [row.markets] - Selected market codes.
 * @param {string} [row.ref] - Reference tag appended to each name.
 * @returns {Array<string>} vgn entries.
 */
function buildVgnEntries(row) {
  const name = normalizeValue(row.name);

  if (name == null) {
    return [];
  }

  const ref = normalizeValue(row.ref) || "";
  const markets = getSelectedMarkets(row);

  if (markets.length === 0) {
    return [`${name}${ref}`];
  }

  return markets.map(
    (market) => `${market}:${name}${ref}`,
  );
}

/**
 * Gets selected market codes for one localized name row.
 *
 * @param {object} row - Localized name row.
 * @param {Array<string>} [row.markets] - Selected market codes.
 * @returns {Array<string>} Selected market codes.
 */
function getSelectedMarkets(row) {
  if (Array.isArray(row.markets)) {
    return NAME_MARKETS.filter((market) => row.markets.includes(market));
  }

  return NAME_MARKETS.filter((market) => row[market] === true);
}

/**
 * Normalizes a user-entered string.
 *
 * @param {string} value - Raw value.
 * @returns {string|undefined} Trimmed value, or undefined when empty.
 */
function normalizeValue(value) {
  if (value == null) {
    return undefined;
  }

  const trimmedValue = String(value).trim();

  return trimmedValue === "" ? undefined : trimmedValue;
}
