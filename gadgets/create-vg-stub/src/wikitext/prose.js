/* eslint-disable */

/**
 * Composes article prose from independent article-part outputs.
 */

import { buildAggScoresText } from "./aggregate-scores.js";
import { buildLeadNameText } from "./lead-name.js";
import { countProseSinographs } from "./prose-count.js";

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
    const leadName = buildLeadNameText(leadValues);
    const yearGenre = buildYearGenreProse(
        records.year,
        records.genre,
        joinSourceTags(sourceTags, ["year", "genres"]),
    );
    const companies = buildCompanyProse(records.companies, {
        sourceTag: joinSourceTags(sourceTags, ["developers", "publishers"]),
    });
    const platformSeries = buildPlatformSeriesProse(
        records.platform,
        records.series,
        sourceTags,
    );
    const scores = buildScoreProse(records.scores, sourceTags);
    const additional = buildAdditionalProse(
        records.additionalProse,
        sourceTags.additionalProse,
    );
    const fragments = {
        additional,
        companies,
        leadName,
        platformSeries,
        scores,
        yearGenre,
    };
    const text =
        `${leadName}是${yearGenre}${companies}。` +
        platformSeries +
        scores +
        additional;
    const prose = {
        fragments,
        sinographs: countProseSinographs(
            `是${yearGenre}${companies}。` +
                platformSeries +
                scores +
                additional,
        ),
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
        genre.wikitext.list === "" ? "" : `${genre.wikitext.list}类`;
    const prefix = `${yearText}${genreText}` || "一款";
    const prose = `${prefix}[[电子游戏]]${sourceTag}`;

    return prose;
}

/**
 * Builds developer and publisher attribution prose.
 *
 * @param {object} options - Attribution options.
 * @param {string} [options.sourceTag] - Combined company source tags.
 * @returns {string} Company attribution beginning with a comma.
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

    const prose = `，由${roleText}${options.sourceTag || ""}`;

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
export function buildPlatformSeriesProse(platforms, series, sourceTags = {}) {
    const platformText = platforms.wikitext.list;
    const seriesText = buildSeriesListText(series.values);

    if (platformText === "" && seriesText === "") {
        return "";
    }

    if (platformText === "") {
        const prose = `作品属于${seriesText}${sourceTags.series || ""}。`;

        return prose;
    }

    const seriesClause =
        seriesText === ""
            ? ""
            : `，属于${seriesText}${sourceTags.series || ""}`;
    const prose =
        `作品对应${platformText}平台${sourceTags.platforms || ""}` +
        `${seriesClause}。`;

    return prose;
}

/**
 * Builds aggregate review score prose from score metadata.
 *
 * @param {object} scores - Review-score part output.
 * @param {object} sourceTags - Source tags keyed by field.
 * @returns {string} Aggregate score sentence.
 */
export function buildScoreProse(scores, sourceTags = {}) {
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
export function buildAdditionalProse(additionalProse, sourceTag = "") {
    const text = additionalProse.wikitext.text || "";

    if (text === "") {
        return "";
    }

    const prose = text.endsWith("。")
        ? `${text.slice(0, -1)}${sourceTag}。`
        : `${text}${sourceTag}`;

    return prose;
}

function buildCompanyRoleText(developers, publishers, sameCompanies) {
    if (developers === "" && publishers === "") {
        return "";
    }

    if (developers !== "" && sameCompanies) {
        return `${developers}开发及发行`;
    }

    if (developers === "") {
        return `${publishers}发行`;
    }

    if (publishers === "") {
        return `${developers}开发`;
    }

    return `${developers}开发、${publishers}发行`;
}

function buildSeriesListText(values) {
    const names = values.map((value) => `「${value.wikitext}」`);

    if (names.length === 2) {
        return names.join("和");
    }

    return names.join("、");
}

function joinSourceTags(sourceTags, keys) {
    const tags = keys.map((key) => sourceTags[key] || "").join("");

    return tags;
}
