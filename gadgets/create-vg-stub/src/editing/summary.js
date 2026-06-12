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
    const values = {
        name: buildNameSummaryText(
            metadata.displayName,
            metadata.wikidataId,
            metadata.enwikiTitle,
        ),
        proseCount: buildProseCountText(metadata.proseSinographs),
        year: buildYearSummaryText(metadata.year),
    };
    const summaryBody = formatText("editing.summary", values).trim();
    const summary = addEditSummarySuffix(summaryBody);

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

    return formatText("editing.summaryWithIcon", {
        icon: EDIT_SUMMARY_SUFFIX,
        summary: text,
    });
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
 * Builds the game title text for an edit summary.
 *
 * @param {string} displayName - Summary display title.
 * @param {string} wikidataId - Wikidata entity ID.
 * @param {string} enwikiTitle - English Wikipedia page title.
 * @returns {string} Game title summary text.
 */
function buildNameSummaryText(displayName, wikidataId, enwikiTitle) {
    const label = String(displayName || "").trim();
    const entityId = String(wikidataId || "").trim();
    const title = String(enwikiTitle || "").trim();

    if (label === "") {
        return "";
    }

    if (entityId !== "") {
        return formatText("editing.wikidataName", {
            id: entityId,
            label,
        });
    }

    if (title === "") {
        return label;
    }

    return formatText("editing.enwikiName", {
        label,
        title,
    });
}
