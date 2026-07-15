/**
 * Builds references-section wikitext for video game stubs.
 */

import { getTextTemplate } from "./text-templates.ts";
import { buildReferencesSection } from "../../../shared/cite";

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

    return buildReferencesSection(references, {
        heading: getTextTemplate("referencesHeading"),
    });
}
