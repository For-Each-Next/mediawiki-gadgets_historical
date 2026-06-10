/* eslint-disable */

/**
 * Builds platform and series prose and metadata for video game stubs.
 */

import {
    FIELD_REFERENCE_DATA,
    buildLinkText,
    buildPageText,
    getReferenceValues,
    getSourceReference,
    getWikilinkParts,
    isWikilinkValue,
    splitFieldValues,
    splitLookupFieldValues,
    trimValue,
    uniqueValues,
} from "../utils.js";

/**
 * Builds display and metadata for platform and series values.
 *
 * @param {object} values - Platform and series values.
 * @param {string} values.platforms - Platform values.
 * @param {string} values.series - Series name.
 * @param {object} [options] - Platform formatting options.
 * @param {string} [options.platformSourceTag] - Platform source reference tag.
 * @param {string} [options.seriesSourceTag] - Series source reference tag.
 * @returns {object} Text, categories, and stub tags.
 */
export function buildPlatformSeriesMetadata(values, options = {}) {
    const references = getPlatformReferences(values.platforms);
    const platformListText = buildPlatformListText(
        values.platforms,
        references,
    );
    const series = normalizeSeriesValues(values.series || "");

    return {
        categories: uniqueValues(getReferenceValues(references, "categories")),
        categoryPlans: buildSeriesCategoryPlans(series),
        platformCount: splitLookupFieldValues(values.platforms || "").length,
        stubTags: uniqueValues(getReferenceValues(references, "stubTags")),
        text: buildPlatformSeriesSentenceText(
            platformListText,
            series,
            options.platformSourceTag || "",
            options.seriesSourceTag || "",
        ),
    };
}

/**
 * Builds the platform and series sentence.
 *
 * @param {string} platformText - Platform list wikitext.
 * @param {Array<string>} series - Series names.
 * @param {string} platformSourceTag - Platform source reference tag.
 * @param {string} seriesSourceTag - Series source reference tag.
 * @returns {string} Platform sentence, or an empty string.
 */
function buildPlatformSeriesSentenceText(
    platformText,
    series,
    platformSourceTag,
    seriesSourceTag,
) {
    if (platformText === "" && series.length === 0) {
        return "";
    }

    if (platformText === "") {
        return `作品属于${buildSeriesListText(series)}${seriesSourceTag}。`;
    }

    return (
        `作品对应${platformText}平台${platformSourceTag}` +
        `${buildSeriesText(series, seriesSourceTag)}。`
    );
}

/**
 * Builds the series phrase.
 *
 * @param {Array<string>} series - Series names.
 * @param {string} sourceTag - Series source reference tag.
 * @returns {string} Series phrase, or an empty string.
 */
function buildSeriesText(series, sourceTag) {
    if (series.length === 0) {
        return "";
    }

    return `，属于${buildSeriesListText(series)}${sourceTag}`;
}

/**
 * Builds the series display list.
 *
 * @param {Array<string>} series - Normalized series names.
 * @returns {string} Series display wikitext.
 */
function buildSeriesListText(series) {
    const values = series.map(
        (value) => `「${buildSeriesDisplayText(value)}」`,
    );

    if (values.length === 2) {
        return values.join("和");
    }

    return values.join("、");
}

/**
 * Builds the series display text.
 *
 * @param {string} series - Normalized series name.
 * @returns {string} Series display wikitext.
 */
function buildSeriesDisplayText(series) {
    if (!isWikilinkValue(series)) {
        return `《${series}》系列`;
    }

    const parts = getWikilinkParts(series);
    const label = parts.label || parts.target;

    if (parts.label === "") {
        return buildLinkText(`${parts.target}系列`, `《${label}》系列`);
    }

    return buildLinkText(parts.target, `《${label}》系列`);
}

/**
 * Normalizes a user-entered series value before prose and lookup use it.
 *
 * @param {string} series - Raw series names.
 * @returns {Array<string>} Normalized series names.
 */
function normalizeSeriesValues(series) {
    return splitFieldValues(series).map(normalizeSeriesValue);
}

/**
 * Normalizes one user-entered series value before prose and lookup use it.
 *
 * @param {string} series - Raw series name.
 * @returns {string} Normalized series name.
 */
function normalizeSeriesValue(series) {
    const value = trimValue(series);

    if (!isWikilinkValue(value)) {
        return trimSeriesSuffix(value);
    }

    const parts = getWikilinkParts(value);
    const target = trimSeriesSuffix(parts.target);
    const label = trimSeriesSuffix(parts.label);

    if (label === "") {
        return `[[${target}]]`;
    }

    return buildLinkText(target, label);
}

/**
 * Trims a redundant Chinese series suffix from one value.
 *
 * @param {string} value - Raw series value.
 * @returns {string} Series value without a trailing suffix.
 */
function trimSeriesSuffix(value) {
    return trimValue(value).replace(/系列$/u, "");
}

/**
 * Builds linked platform text from raw values and matched metadata.
 *
 * @param {string} value - User-entered platform values.
 * @param {Array<object>} references - Matched platform metadata.
 * @returns {string} Platform list wikitext.
 */
function buildPlatformListText(value, references) {
    return splitFieldValues(value)
        .map(buildPlatformText.bind(null, references))
        .join("、");
}

/**
 * Builds display text for one platform value.
 *
 * @param {Array<object>} references - Matched platform metadata.
 * @param {string} value - User-entered platform value.
 * @returns {string} Platform wikitext.
 */
function buildPlatformText(references, value) {
    if (isWikilinkValue(value)) {
        return value;
    }

    const reference = references.find((item) => item.source === value);

    if (reference == null || reference.page == null) {
        return value;
    }

    return buildPageText(reference.page);
}

/**
 * Gets reference metadata for platform values.
 *
 * @param {string} value - User-entered platform values.
 * @returns {Array<object>} Matched platform metadata.
 */
function getPlatformReferences(value) {
    return splitFieldValues(value)
        .map(getSourceReference.bind(null, FIELD_REFERENCE_DATA.platforms))
        .filter(Boolean);
}

/**
 * Builds series category lookup plans.
 *
 * @param {Array<string>} series - Series values.
 * @returns {Array<object>} Series category lookup plans.
 */
function buildSeriesCategoryPlans(series) {
    return series
        .flatMap((value) => splitLookupFieldValues(value))
        .map(buildSeriesCategoryPlan);
}

/**
 * Builds one series category lookup plan.
 *
 * @param {string} series - Series value.
 * @returns {object} Series category lookup plan.
 */
function buildSeriesCategoryPlan(series) {
    return {
        candidates: buildSeriesCategoryCandidates(series),
        fallback: `${series}电子游戏`,
    };
}

/**
 * Builds series category candidates.
 *
 * @param {string} title - Series title.
 * @returns {Array<string>} Candidate category titles.
 */
function buildSeriesCategoryCandidates(title) {
    return uniqueValues(
        [`${title}系列`, title].flatMap(buildSeriesTitleCandidates),
    );
}

/**
 * Builds series category candidates for one title variant.
 *
 * @param {string} title - Series title.
 * @returns {Array<string>} Candidate category titles.
 */
function buildSeriesTitleCandidates(title) {
    return [`${title}电子游戏`, `${title}游戏`, title];
}
