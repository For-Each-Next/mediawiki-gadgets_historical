/* eslint-disable */

/**
 * Builds edit summaries for generated video game stubs.
 */

export const EDIT_SUMMARY_SUFFIX =
  "[[:m:User:For_Each_..._Next/global.js/create_vg_stub.js|🎮]]";

/**
 * Builds a generated-stub edit summary.
 *
 * @param {object} metadata - Edit summary metadata.
 * @param {string} metadata.displayName - Summary display title.
 * @param {string} metadata.enwikiTitle - English Wikipedia page title.
 * @param {number} metadata.proseSinographs - Prose length in sinographs.
 * @param {string} metadata.year - Release year.
 * @returns {string} Generated edit summary.
 */
export function buildEditSummary(metadata) {
  return [
    buildNameSummaryText(metadata.displayName, metadata.enwikiTitle),
    buildYearSummaryText(metadata.year),
    buildProseCountText(metadata.proseSinographs),
    EDIT_SUMMARY_SUFFIX,
  ]
    .filter(Boolean)
    .join(" ");
}

/**
 * Adds gadget attribution to an edit summary.
 *
 * @param {string} summary - Edit summary text.
 * @returns {string} Attributed edit summary.
 */
export function addEditSummarySuffix(summary) {
  return [String(summary || "").trim(), EDIT_SUMMARY_SUFFIX]
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
 * Builds the game title text for an edit summary.
 *
 * @param {string} displayName - Summary display title.
 * @param {string} enwikiTitle - English Wikipedia page title.
 * @returns {string} Game title summary text.
 */
function buildNameSummaryText(displayName, enwikiTitle) {
  const label = String(displayName || "").trim();
  const title = String(enwikiTitle || "").trim();

  if (label === "") {
    return "";
  }

  if (title === "") {
    return label;
  }

  return `[[:w:en:${title}|${label}]]`;
}
