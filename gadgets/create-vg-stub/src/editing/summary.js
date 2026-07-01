/* eslint-disable */

/**
 * Builds edit summaries for generated video game stubs.
 */

import { formatText, getTextTemplate } from "../shared/text-templates.js";

export const EDIT_SUMMARY_SUFFIX = getTextTemplate("editing.summaryIcon");

/**
 * Builds a generated-stub edit summary.
 *
 * @param {object} metadata - Edit summary metadata.
 * @param {string} metadata.displayName - Summary display title.
 * @param {string} metadata.enwikiTitle - English Wikipedia page title.
 * @param {number} metadata.proseSinographs - Prose length in sinographs.
 * @param {string} metadata.wikidataId - Wikidata entity ID.
 * @param {string} metadata.year - Release year.
 * @returns {string} Generated edit summary.
 */
export function buildEditSummary(metadata) {
    const nameText = buildArticleCreationSummaryText(
        metadata.displayName,
        metadata.year,
    );
    const proseText =
        nameText === ""
            ? ""
            : buildProseDetailText(
                  buildProseCountText(metadata.proseSinographs),
              );
    const sourceText =
        nameText === "" ? "" : buildSourceDetailText(metadata);
    const values = {
        icon: EDIT_SUMMARY_SUFFIX,
        name: `${nameText}${proseText}${sourceText}`,
        proseCount: "",
        year: "",
    };
    const summary = formatText("editing.summary", values).trim();

    return summary;
}

/**
 * Adds gadget attribution to an edit summary.
 *
 * @param {string} summary - Edit summary text.
 * @returns {string} Attributed edit summary.
 */
export function addEditSummarySuffix(summary) {
    const text = String(summary || "").trim();

    if (text === "") {
        return EDIT_SUMMARY_SUFFIX;
    }

    return formatText("editing.summary", {
        icon: EDIT_SUMMARY_SUFFIX,
        name: text,
        proseCount: "",
        year: "",
    }).trim();
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

    return match[0];
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

    return formatText("editing.proseCount", {
        count: Math.round(count),
    });
}

/**
 * Builds prose-count detail text for an edit summary.
 *
 * @param {string} proseCount - Prose-count fragment.
 * @returns {string} Prose-count detail summary text.
 */
function buildProseDetailText(proseCount) {
    const text = String(proseCount || "").trim();

    return text === "" ? "" : `, with ${text}`;
}

/**
 * Builds source-link detail text for an edit summary.
 *
 * @param {object} metadata - Edit summary metadata.
 * @param {string} metadata.enwikiTitle - English Wikipedia page title.
 * @param {string} metadata.wikidataId - Wikidata entity ID.
 * @returns {string} Source-link detail text.
 */
function buildSourceDetailText(metadata) {
    const links = [
        buildEnwikiSummaryLink(metadata.enwikiTitle),
        buildWikidataSummaryLink(metadata.wikidataId),
    ].filter(Boolean);

    return links.length === 0
        ? ""
        : `; also see ${links.map((link) => `"${link}"`).join(" and ")}`;
}

/**
 * Builds the article creation text for an edit summary.
 *
 * @param {string} displayName - Summary display title.
 * @param {string} year - Release year.
 * @returns {string} Article creation summary text.
 */
function buildArticleCreationSummaryText(displayName, year) {
    const label = String(displayName || "").trim();
    const yearText = buildYearSummaryText(year);

    if (label === "") {
        return "";
    }

    return `create an article for the ${yearText === "" ? "" : `${yearText} `}video game «${label}»`;
}

/**
 * Builds an English Wikipedia summary link.
 *
 * @param {string} title - English Wikipedia page title.
 * @returns {string} Summary link, or an empty string.
 */
function buildEnwikiSummaryLink(title) {
    const value = String(title || "").trim();

    return value === "" ? "" : `[[:w:en:${value}]]`;
}

/**
 * Builds a Wikidata summary link.
 *
 * @param {string} id - Wikidata entity ID.
 * @returns {string} Summary link, or an empty string.
 */
function buildWikidataSummaryLink(id) {
    const value = String(id || "").trim();

    return value === "" ? "" : `[[:d:${value}]]`;
}
