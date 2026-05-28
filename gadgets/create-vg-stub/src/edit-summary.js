/* eslint-disable */

/**
 * Builds edit summaries for generated video game stubs.
 */

/**
 * Builds a generated-stub edit summary.
 *
 * @param {object} metadata - Edit summary metadata.
 * @param {string} metadata.displayName - Summary display title.
 * @param {number} metadata.proseSinographs - Prose length in sinographs.
 * @param {string} metadata.wikidataId - Wikidata item ID.
 * @param {string} metadata.year - Release year.
 * @returns {string} Generated edit summary.
 */
export function buildEditSummary(metadata) {
  return [
    "🎮",
    buildWikidataSummaryText(metadata.wikidataId, metadata.displayName),
    buildYearSummaryText(metadata.year),
    buildProseCountText(metadata.proseSinographs),
    "🎮",
  ]
    .filter(Boolean)
    .join(" ");
}

/**
 * Builds the year link for an edit summary.
 *
 * @param {string} year - Release year.
 * @returns {string} Year summary text.
 */
function buildYearSummaryText(year) {
  const value = String(year || "").trim();
  const match = value.match(/\b\d{4}\b/u);

  if (match == null) {
    return "";
  }

  return `([[${match[0]}年電子遊戲界|${match[0]}]])`;
}

/**
 * Builds the prose count text for an edit summary.
 *
 * @param {number} count - Prose length in sinographs.
 * @returns {string} Prose count text.
 */
function buildProseCountText(count) {
  if (!Number.isFinite(count) || count <= 0) {
    return "";
  }

  return `<${Math.round(count)} sinographs>`;
}

/**
 * Builds the Wikidata item link for an edit summary.
 *
 * @param {string} wikidataId - Wikidata item ID.
 * @param {string} displayName - Summary display title.
 * @returns {string} Wikidata summary text.
 */
function buildWikidataSummaryText(wikidataId, displayName) {
  const value = String(wikidataId || "").trim();
  const label = String(displayName || "").trim();

  if (!/^Q\d+$/u.test(value) || label === "") {
    return "";
  }

  return `[[d:${value}|${label}]]`;
}
