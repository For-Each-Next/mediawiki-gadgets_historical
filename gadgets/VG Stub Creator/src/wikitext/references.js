/* eslint-disable */

/**
 * Builds references-section wikitext for video game stubs.
 */

import { getTextTemplate } from "../shared/text-templates.js";

/**
 * Builds the references section for generated citations.
 *
 * @param {Array<object>} references - Named source references.
 * @returns {string} References section, or an empty string.
 */
export function buildReferencesText(references) {
    if (references.length === 0) {
        return "";
    }

    const referenceText = references.map(buildFullReferenceText).join("\n");
    const heading = getTextTemplate("referencesHeading");
    const result = [
        `== ${heading} ==`,
        "",
        "<references responsive>",
        referenceText,
        "</references>",
    ].join("\n");

    return result;
}

/**
 * Builds one full named reference.
 *
 * @param {object} reference - Named source reference.
 * @param {string} reference.citation - Citation template wikitext.
 * @param {string} reference.name - Reference name.
 * @returns {string} Full named reference wikitext.
 */
function buildFullReferenceText(reference) {
    return `<ref name="${reference.name}">${reference.citation}</ref>`;
}
