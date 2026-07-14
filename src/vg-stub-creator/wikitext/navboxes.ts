/**
 * Builds navbox template calls from resolved navbox titles.
 */

import { buildTemplateCall, trimValue } from "../shared/utils.ts";


/**
 * Builds generated navbox wikitext for resolved template titles.
 *
 * @param titles - Resolved template titles.
 * @returns Navbox wikitext.
 */
export function buildNavboxText(titles: Array<string>): string {
    const result = titles.map(buildTemplateCall).join("\n");

    return result;
}


/**
 * Builds navbox wikitext from selected review rows.
 *
 * @param rows - Reviewed navbox rows.
 * @returns Selected navbox wikitext.
 */
export function buildReviewedNavboxText(rows: Array<any | string>): string {
    const result = rows
        .filter((row) => row?.enabled !== false)
        .map((row) => trimValue(row?.text ?? row))
        .filter(Boolean)
        .map(function callback(text) {
            return text.startsWith("{{") ? text : buildTemplateCall(text);
        })
        .join("\n");

    return result;
}
