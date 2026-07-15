/**
 * Composes article prose from independent article-part outputs.
 */

import { buildAggScoresText } from "./aggregate-scores.ts";
import { buildLeadNameText } from "./lead-name.ts";
import { countProseSinographs } from "./prose-count.ts";
import { buildSentence1Text } from "./sentence.ts";
import { formatText, getTextTemplate } from "./text-templates.ts";
import type { AggregateScoreRecord, SourceTags } from "../article";

/**
 * Builds every prose fragment that combines independent data records.
 *
 * @param records - Article records keyed by module.
 * @param sourceTags - Source reference tags keyed by field.
 * @returns Composed article prose fragments.
 */
export function buildArticleProse(records: any, sourceTags: any): any {
    const sentence1 = buildOpeningProse(records, sourceTags);
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
    const fragments = { sentence1, sentence2, sentence3, sentence4 };
    const proseValues = {
        sentence1: sentence1.text,
        sentence2,
        sentence3,
        sentence4,
    };
    const countedText = buildCountedProseText(sentence1, proseValues);
    const prose = {
        fragments,
        sinographs: countProseSinographs(countedText),
        text: formatText("prose.text", proseValues),
    };

    return prose;
}

/** Builds the opening title, year, genre, and company sentence. */
function buildOpeningProse(records, sourceTags): any {
    const names = records.names.metadata;
    const leadValues = buildLeadValues(names, sourceTags);
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
    const sentence = {
        s1a: sentence1a,
        s1b: sentence1b,
        text: buildSentence1Text(sentence1a.text, sentence1b),
    };

    return sentence;
}

/** Builds lead-name input values from normalized name metadata. */
function buildLeadValues(names, sourceTags): any {
    return {
        englishName: names.englishName,
        name: names.name,
        originalLanguage: names.original.language,
        originalName: names.original.name,
        sourceTags,
    };
}

/** Builds prose text with titles excluded from the length count. */
function buildCountedProseText(sentence1, proseValues): string {
    const countedSentence1a = formatText("prose.countedSentence1a", {
        yearGenre: sentence1.s1a.yearGenre,
    });
    const countedSentence1 = buildSentence1Text(
        countedSentence1a,
        sentence1.s1b,
    );
    const countedText = formatText("prose.text", {
        ...proseValues,
        sentence1: countedSentence1,
    });

    return countedText;
}

/**
 * Builds the year, genre, and video-game noun phrase.
 *
 * @param year - Release-year field output.
 * @param genre - Genre field output.
 * @param sourceTag - Combined year and genre source tags.
 * @returns Video-game noun phrase.
 */
export function buildYearGenreProse(
    year: any,
    genre: any,
    sourceTag: string = "",
): string {
    const yearText = year.metadata.phrase || "";
    const genreText = selectValue(
        genre.wikitext.list === "",
        function trueBranch() {
            return "";
        },
        function falseBranch() {
            return formatText("prose.genreClass", {
                genreText: genre.wikitext.list,
            });
        },
    );
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
 * @param companies - Company article data.
 * @param options - Attribution options.
 * @param options.sourceTag - Combined company source tags.
 * @returns Company attribution clause.
 */
export function buildCompanyProse(companies, options: any = {}): string {
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
 * @param platforms - Platform field output.
 * @param series - Series field output.
 * @param sourceTags - Source tags keyed by field.
 * @returns Platform/series sentence.
 */
export function buildPlatformsAndSeriesProse(
    platforms: any,
    series: any,
    sourceTags: any = {},
): string {
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

    const seriesClause = buildSeriesClause(seriesText, sourceTags);
    const values = {
        platformSourceTag: sourceTags.platforms || "",
        platformText,
        seriesClause,
    };
    const prose = formatText("prose.sentence2", values);

    return prose;
}

/** Builds the optional series clause following platform prose. */
function buildSeriesClause(seriesText: string, sourceTags: any): string {
    if (seriesText === "") {
        return "";
    }

    const clause = formatText("prose.seriesClause", {
        seriesSourceTag: sourceTags.series || "",
        seriesText,
    });

    return clause;
}

/**
 * Builds aggregate review score prose from score metadata.
 *
 * @param scores - Review-score part output.
 * @param sourceTags - Source tags keyed by field.
 * @returns Aggregate score sentence.
 */
export function buildScoresProse(
    scores: AggregateScoreRecord,
    sourceTags: SourceTags = {},
): string {
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
 * @param additionalProse - Additional-prose part output.
 * @param sourceTag - Additional-prose source tag.
 * @returns Sourced prose text.
 */
export function buildAppendProse(
    additionalProse: any,
    sourceTag: string = "",
): string {
    const text = additionalProse.wikitext.text || "";

    if (text === "") {
        return "";
    }

    const hasPeriod = text.endsWith("。");
    const templateKey = selectValue(
        hasPeriod,
        function trueBranch() {
            return "prose.sentence4WithPeriod";
        },
        function falseBranch() {
            return "prose.sentence4";
        },
    );
    const prose = formatText(templateKey, {
        sourceTag,
        text: hasPeriod ? text.slice(0, -1) : text,
    });

    return prose;
}

/**
 * Defines the module-level build company role text.
 */
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

/**
 * Defines the module-level build series list text.
 */
function buildSeriesListText(values) {
    const names = values.map(function callback(value) {
        return formatText("prose.seriesTitle", {
            value: value.wikitext,
        });
    });

    if (names.length === 2) {
        return names.join(getTextTemplate("shared.conjunction"));
    }

    return names.join(getTextTemplate("shared.enumerationSeparator"));
}

/**
 * Defines the module-level join source tags.
 */
function joinSourceTags(sourceTags, keys) {
    const tags = keys.map((key) => sourceTags[key] || "").join("");

    return tags;
}

/**
 * Selects a lazily evaluated value for a condition.
 *
 * @param condition - Condition to evaluate.
 * @param trueBranch - Branch used when the condition is
 * true.
 * @param falseBranch - Branch used when the condition is
 * false.
 * @returns Value returned by the selected branch.
 */
function selectValue(
    condition: unknown,
    trueBranch: (...args: any[]) => any,
    falseBranch: (...args: any[]) => any,
): any {
    if (condition) {
        return trueBranch();
    }

    return falseBranch();
}
