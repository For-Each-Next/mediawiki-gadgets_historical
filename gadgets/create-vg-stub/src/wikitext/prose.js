/* eslint-disable */

/**
 * Composes article prose from independent article-part outputs.
 */

import { buildAggScoresText } from "./aggregate-scores.js";
import { buildLeadNameText } from "./lead-name.js";
import { countProseSinographs } from "./prose-count.js";
import { buildSentence1Text } from "./sentence.js";
import { formatText, getTextTemplate } from "../shared/text-templates.js";

/**
 * Builds every prose fragment that combines independent data records.
 *
 * @param {object} records - Article records keyed by module.
 * @param {object} sourceTags - Source reference tags keyed by field.
 * @returns {object} Composed article prose fragments.
 */
export function buildArticleProse(records, sourceTags) {
    const names = records.names.metadata;
    const leadValues = {
        englishName: names.englishName,
        name: names.name,
        originalLanguage: names.original.language,
        originalName: names.original.name,
        sourceTags,
    };
    const titles = buildLeadNameText(leadValues);
    const yearGenre = buildYearGenreProse(
        records.year,
        records.genre,
        joinSourceTags(sourceTags, ["year", "genres"]),
    );
    const sentence1aText = formatText("prose.sentence1a", {
        titles,
        yearGenre,
    });
    const sentence1b = buildCompanyProse(records.companies, {
        sourceTag: joinSourceTags(sourceTags, ["developers", "publishers"]),
    });
    const sentence1a = {
        text: sentence1aText,
        titles,
        yearGenre,
    };
    const sentence1 = {
        s1a: sentence1a,
        s1b: sentence1b,
        text: buildSentence1Text(sentence1a.text, sentence1b),
    };
    const sentence2 = buildPlatformsAndSeriesProse(
        records.platform,
        records.series,
        sourceTags,
    );
    const sentence3 = buildScoresProse(records.scores, sourceTags);
    const sentence4 = buildAppendProse(
        records.additionalProse,
        sourceTags.additionalProse,
    );
    const fragments = {
        sentence1,
        sentence2,
        sentence3,
        sentence4,
    };
    const proseValues = {
        sentence1: sentence1.text,
        sentence2,
        sentence3,
        sentence4,
    };
    const countedSentence1a = formatText("prose.countedSentence1a", {
        yearGenre,
    });
    const countedSentence1 = buildSentence1Text(countedSentence1a, sentence1b);
    const countedText = formatText("prose.paragraph", {
        ...proseValues,
        sentence1: countedSentence1,
    });
    const text = formatText("prose.paragraph", proseValues);
    const prose = {
        fragments,
        sinographs: countProseSinographs(countedText),
        text,
    };

    return prose;
}

/**
 * Builds the year, genre, and video-game noun phrase.
 *
 * @param {object} year - Release-year field output.
 * @param {object} genre - Genre field output.
 * @param {string} sourceTag - Combined year and genre source tags.
 * @returns {string} Video-game noun phrase.
 */
export function buildYearGenreProse(year, genre, sourceTag = "") {
    const yearText = year.metadata.phrase || "";
    const genreText =
        genre.wikitext.list === ""
            ? ""
            : formatText("prose.genreClass", {
                  genreText: genre.wikitext.list,
              });
    const prefix =
        `${yearText}${genreText}` ||
        getTextTemplate("prose.fallbackYearGenrePrefix");
    const values = {
        prefix,
        sourceTag,
    };
    const prose = formatText("prose.yearGenre", values);

    return prose;
}

/**
 * Builds developer and publisher attribution prose.
 *
 * @param {object} options - Attribution options.
 * @param {string} [options.sourceTag] - Combined company source tags.
 * @returns {string} Company attribution clause.
 */
export function buildCompanyProse(companies, options = {}) {
    const developerText = companies.wikitext.developers || "";
    const publisherText = companies.wikitext.publishers || "";
    const roleText = buildCompanyRoleText(
        developerText,
        publisherText,
        companies.metadata.sameCompanies,
    );

    if (roleText === "") {
        return "";
    }

    const values = {
        roleText,
        sourceTag: options.sourceTag || "",
    };
    const prose = formatText("prose.sentence1b", values);

    return prose;
}

/**
 * Builds the platform and series sentence.
 *
 * @param {object} platforms - Platform field output.
 * @param {object} series - Series field output.
 * @param {object} [sourceTags] - Source tags keyed by field.
 * @returns {string} Platform/series sentence.
 */
export function buildPlatformsAndSeriesProse(
    platforms,
    series,
    sourceTags = {},
) {
    const platformText = platforms.wikitext.list;
    const seriesText = buildSeriesListText(series.values);

    if (platformText === "" && seriesText === "") {
        return "";
    }

    if (platformText === "") {
        const values = {
            seriesSourceTag: sourceTags.series || "",
            seriesText,
        };
        const prose = formatText("prose.seriesOnly", values);

        return prose;
    }

    const seriesClause =
        seriesText === ""
            ? ""
            : formatText("prose.seriesClause", {
                  seriesSourceTag: sourceTags.series || "",
                  seriesText,
              });
    const values = {
        platformSourceTag: sourceTags.platforms || "",
        platformText,
        seriesClause,
    };
    const prose = formatText("prose.sentence2", values);

    return prose;
}

/**
 * Builds aggregate review score prose from score metadata.
 *
 * @param {object} scores - Review-score part output.
 * @param {object} sourceTags - Source tags keyed by field.
 * @returns {string} Aggregate score sentence.
 */
export function buildScoresProse(scores, sourceTags = {}) {
    const values = {
        metacriticPlatform: scores.metadata.metacritic.platform,
        metacriticScore: scores.metadata.metacritic.score,
        metacriticSourceTag: sourceTags.metacriticScore,
        openCriticRecommend: scores.metadata.openCritic.recommend,
        openCriticSourceTag: sourceTags.openCriticRecommend,
    };
    const prose = buildAggScoresText(values);

    return prose;
}

/**
 * Adds a source tag to user-entered additional prose.
 *
 * @param {object} additionalProse - Additional-prose part output.
 * @param {string} sourceTag - Additional-prose source tag.
 * @returns {string} Sourced prose text.
 */
export function buildAppendProse(additionalProse, sourceTag = "") {
    const text = additionalProse.wikitext.text || "";

    if (text === "") {
        return "";
    }

    const hasPeriod = text.endsWith("。");
    const templateKey = hasPeriod
        ? "prose.sentence4WithPeriod"
        : "prose.sentence4";
    const prose = formatText(templateKey, {
        sourceTag,
        text: hasPeriod ? text.slice(0, -1) : text,
    });

    return prose;
}

function buildCompanyRoleText(developers, publishers, sameCompanies) {
    if (developers === "" && publishers === "") {
        return "";
    }

    if (developers !== "" && sameCompanies) {
        return formatText("prose.developedAndPublished", {
            developers,
        });
    }

    if (developers === "") {
        return formatText("prose.published", {
            publishers,
        });
    }

    if (publishers === "") {
        return formatText("prose.developed", {
            developers,
        });
    }

    return formatText("prose.developedThenPublished", {
        developers,
        publishers,
    });
}

function buildSeriesListText(values) {
    const names = values.map((value) =>
        formatText("prose.seriesTitle", {
            value: value.wikitext,
        }),
    );

    if (names.length === 2) {
        return names.join(getTextTemplate("shared.conjunction"));
    }

    return names.join(getTextTemplate("shared.enumerationSeparator"));
}

function joinSourceTags(sourceTags, keys) {
    const tags = keys.map((key) => sourceTags[key] || "").join("");

    return tags;
}
