/* eslint-disable */

/**
 * Normalizes series values and derives category lookup plans.
 */

import {
    buildLinkText,
    getWikilinkParts,
    isWikilinkValue,
    splitFieldValues,
    splitLookupFieldValues,
    trimValue,
    uniqueValues,
} from "../../utils.js";

/**
 * Builds normalized display, link, and category metadata for series.
 *
 * @param {*} value - Raw series field value.
 * @returns {object} Series values and metadata.
 */
export function buildSeriesMetadata(value) {
    const values = normalizeSeriesValues(value || "");
    const items = values.map(buildSeriesItem);
    const links = items
        .filter((item) => item.linkTarget != null)
        .map((item) => ({
            displayText: item.displayText,
            target: item.linkTarget,
            wikitext: item.wikitext,
        }));
    const metadata = {
        categoryPlans: buildSeriesCategoryPlans(values),
        items,
        links,
        text: items.map((item) => item.wikitext).join("、"),
        values,
    };

    return metadata;
}

function buildSeriesItem(series) {
    if (!isWikilinkValue(series)) {
        const item = {
            displayText: `《${series}》系列`,
            normalizedText: series,
            wikitext: `《${series}》系列`,
        };

        return item;
    }

    const parts = getWikilinkParts(series);
    const label = parts.label || parts.target;
    const linkTarget =
        parts.label === "" ? `${parts.target}系列` : parts.target;
    const displayText = `《${label}》系列`;
    const item = {
        displayText,
        linkTarget,
        normalizedText: series,
        wikitext: buildLinkText(linkTarget, displayText),
    };

    return item;
}

function normalizeSeriesValues(series) {
    const values = splitFieldValues(series).map(normalizeSeriesValue);

    return values;
}

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

function trimSeriesSuffix(value) {
    return trimValue(value).replace(/系列$/u, "");
}

function buildSeriesCategoryPlans(series) {
    const plans = series
        .flatMap((value) => splitLookupFieldValues(value))
        .map(buildSeriesCategoryPlan);

    return plans;
}

function buildSeriesCategoryPlan(series) {
    const plan = {
        candidates: buildSeriesCategoryCandidates(series),
        fallback: `${series}电子游戏`,
    };

    return plan;
}

function buildSeriesCategoryCandidates(title) {
    const candidates = uniqueValues(
        [`${title}系列`, title].flatMap(buildSeriesTitleCandidates),
    );

    return candidates;
}

function buildSeriesTitleCandidates(title) {
    return [`${title}电子游戏`, `${title}游戏`, title];
}
