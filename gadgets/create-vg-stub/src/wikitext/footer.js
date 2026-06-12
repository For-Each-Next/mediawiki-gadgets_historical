/* eslint-disable */

/**
 * Builds footer maintenance templates for video game stubs.
 */

import { getTextTemplate } from "../shared/text-templates.js";

/**
 * Builds the video game portal bar and authority control templates.
 *
 * @returns {string} Footer template wikitext.
 */
export function buildFooterTemplateText() {
    const portal = getTextTemplate("shared.portal");
    const text = [`{{Portal bar|${portal}}}`, "{{Authority control}}"].join(
        "\n",
    );

    return text;
}
