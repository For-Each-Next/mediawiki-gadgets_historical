/* eslint-disable */

/**
 * Builds navbox template calls from resolved navbox titles.
 */

import { buildTemplateCall, trimValue } from "../shared/utils.js";

/**
 * Builds generated navbox wikitext for resolved template titles.
 *
 * @param {Array<string>} titles - Resolved template titles.
 * @returns {string} Navbox wikitext.
 */
export function buildNavboxText(titles) {
    const result = titles.map(buildTemplateCall).join("\n");

    return result;
}

/**
 * Builds navbox wikitext from selected review rows.
 *
 * @param {Array<object|string>} rows - Reviewed navbox rows.
 * @returns {string} Selected navbox wikitext.
 */
export function buildReviewedNavboxText(rows) {
    const result = rows
        .filter((row) => row?.enabled !== false)
        .map((row) => trimValue(row?.text ?? row))
        .filter(Boolean)
        .map((text) =>
            text.startsWith("{{") ? text : buildTemplateCall(text),
        )
        .join("\n");

    return result;
}
