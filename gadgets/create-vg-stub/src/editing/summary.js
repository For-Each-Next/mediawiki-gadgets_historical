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
    const nameText = buildNameSummaryText(metadata.displayName);
    const yearText =
        nameText === ""
            ? ""
            : buildYearDetailText(buildYearSummaryText(metadata.year));
    const proseText =
        nameText === ""
            ? ""
            : buildProseDetailText(
                  buildProseCountText(metadata.proseSinographs),
              );
    const values = {
        icon: EDIT_SUMMARY_SUFFIX,
        name: `${nameText}${yearText}${proseText}`,
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

    return formatText("editing.summaryYear", {
        year: match[0],
    });
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
 * Builds parenthesized year detail text for an edit summary.
 *
 * @param {string} year - Year detail fragment.
 * @returns {string} Year detail summary text.
 */
function buildYearDetailText(year) {
    const text = String(year || "").trim();

    return text === "" ? "" : ` (${text})`;
}

/**
 * Builds prose-count detail text for an edit summary.
 *
 * @param {string} proseCount - Prose-count fragment.
 * @returns {string} Prose-count detail summary text.
 */
function buildProseDetailText(proseCount) {
    const text = String(proseCount || "").trim();

    return text === "" ? "" : `, ${text}`;
}

/**
 * Builds the game title text for an edit summary.
 *
 * @param {string} displayName - Summary display title.
 * @returns {string} Game title summary text.
 */
function buildNameSummaryText(displayName) {
    const label = String(displayName || "").trim();

    if (label === "") {
        return "";
    }

    return `create '«${formatText("editing.localName", { label })}»'`;
}
