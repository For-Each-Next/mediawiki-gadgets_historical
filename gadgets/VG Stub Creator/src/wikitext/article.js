/* eslint-disable */

/**
 * Assembles generated article wikitext from prepared article metadata.
 */

import {
    buildCategoryText,
    buildFooterTemplateText,
    buildReferencesText,
    buildStubTagText,
} from "./index.js";
import { buildSentence1Text } from "./sentence.js";
import { formatText } from "../shared/text-templates.js";

/**
 * Builds the Chinese Wikipedia video game stub article text.
 *
 * @param {object} params - Normalized article parameters.
 * @param {string} params.aggScoresText - Aggregate review score sentence.
 * @param {string} params.additionalProseText - User-entered appended prose.
 * @param {object} params.companyMetadata - Company text and metadata.
 * @param {string} params.infoboxText - Infobox wikitext.
 * @param {string} params.leadNameText - Lead article name text.
 * @param {string} params.navboxText - Series navbox wikitext.
 * @param {string} params.noteTaText - NoteTA-lite wikitext.
 * @param {object} params.platformSeriesMetadata - Platform and series text and metadata.
 * @param {Array<object>} params.sourceReferences - Named source references.
 * @param {object} params.yearGenreMetadata - Year/genre text and metadata.
 * @returns {string} Generated Chinese wikitext.
 */
export function buildArticleWikitext(params) {
    const review = params.records?.review?.wikitext || {};
    const intro = params.prose?.text || buildLegacyProse(params);

    return [
        params.renderers?.noteTa || params.noteTaText,
        params.renderers?.infobox || params.infoboxText,
        intro,
        buildReferencesText(params.sourceReferences),
        params.renderers?.navboxes || review.navbox || params.navboxText,
        buildFooterTemplateText(),
        buildCategoryText(params),
        buildStubTagText(params),
    ]
        .filter(Boolean)
        .join("\n\n");
}

function buildLegacyProse(params) {
    const sentence1a = formatText("prose.sentence1a", {
        titles: params.leadNameText,
        yearGenre: params.yearGenreMetadata.text,
    });
    const sentence1 = buildSentence1Text(
        sentence1a,
        params.companyMetadata.text,
    );
    const text = formatText("prose.text", {
        sentence1,
        sentence2: params.platformSeriesMetadata.text,
        sentence3: params.aggScoresText,
        sentence4: params.additionalProseText,
    });

    return text;
}
