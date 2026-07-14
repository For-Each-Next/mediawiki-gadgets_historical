/**
 * Builds references-section wikitext for video game stubs.
 */

import { getTextTemplate } from "../shared/text-templates.ts";


/**
 * Builds the references section for generated citations.
 *
 * @param references - Named source references.
 * @returns References section, or an empty string.
 */
export function buildReferencesText(references: Array<any>): string {
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
 * @param reference - Named source reference.
 * @param reference.citation - Citation template wikitext.
 * @param reference.name - Reference name.
 * @returns Full named reference wikitext.
 */
function buildFullReferenceText(reference: any): string {
    return [
        '<ref name="',
        reference.name,
        '">',
        reference.citation,
        "</ref>",
    ].join("");
}
