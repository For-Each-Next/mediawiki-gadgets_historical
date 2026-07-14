/**
 * Assembles generated article wikitext from prepared article metadata.
 */

import {
    buildCategoryText,
    buildFooterTemplateText,
    buildReferencesText,
    buildStubTagText,
} from ".";
import { buildSentence1Text } from "./sentence.ts";
import { formatText } from "../shared/text-templates.ts";


/**
 * Builds the Chinese Wikipedia video game stub article text.
 *
 * @param params - Normalized article parameters.
 * @param params.aggScoresText - Aggregate review score
 * sentence.
 * @param params.additionalProseText - User-entered appended
 * prose.
 * @param params.companyMetadata - Company text and metadata.
 * @param params.infoboxText - Infobox wikitext.
 * @param params.leadNameText - Lead article name text.
 * @param params.navboxText - Series navbox wikitext.
 * @param params.noteTaText - NoteTA-lite wikitext.
 * @param params.platformSeriesMetadata - Platform and series
 * text and
 * metadata.
 * @param params.sourceReferences - Named source
 * references.
 * @param params.yearGenreMetadata - Year/genre text and
 * metadata.
 * @returns Generated Chinese wikitext.
 */
export function buildArticleWikitext(params: any): string {
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


/**
 * Defines the module-level build legacy prose.
 */
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
