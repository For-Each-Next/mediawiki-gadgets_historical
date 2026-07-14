/**
 * Composes complete prose sentences from optional clauses.
 */

import { formatText, getTextTemplate } from "../shared/text-templates.ts";


/**
 * Joins sentence 1a and optional sentence 1b.
 *
 * @param sentence1a - Title, year, and genre clause.
 * @param sentence1b - Company attribution clause.
 * @returns Complete first sentence.
 */
export function buildSentence1Text(
    sentence1a: string,
    sentence1b: string = "",
): string {
    const separator = getTextTemplate("prose.sentence1Separator");
    const text = [sentence1a, sentence1b].filter(Boolean).join(separator);
    const values = {
        text,
    };
    const sentence = formatText("prose.sentence1", values);

    return sentence;
}
