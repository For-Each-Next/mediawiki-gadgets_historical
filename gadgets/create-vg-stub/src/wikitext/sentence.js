/* eslint-disable */

/**
 * Composes complete prose sentences from optional clauses.
 */

import { formatText, getTextTemplate } from "../shared/text-templates.js";

/**
 * Joins sentence 1a and optional sentence 1b.
 *
 * @param {string} sentence1a - Title, year, and genre clause.
 * @param {string} [sentence1b] - Company attribution clause.
 * @returns {string} Complete first sentence.
 */
export function buildSentence1Text(sentence1a, sentence1b = "") {
    const separator = getTextTemplate("prose.sentence1Separator");
    const text = [sentence1a, sentence1b].filter(Boolean).join(separator);
    const values = {
        text,
    };
    const sentence = formatText("prose.sentence1", values);

    return sentence;
}
