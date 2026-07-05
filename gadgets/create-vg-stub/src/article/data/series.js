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
} from "../../shared/utils.js";
import { formatText, getTextTemplate } from "../../shared/text-templates.js";

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
        text: items
            .map((item) => item.wikitext)
            .join(getTextTemplate("shared.enumerationSeparator")),
        values,
    };

    return metadata;
}

function buildSeriesItem(series) {
    const marker = getSeriesMarker(series);
    const value = marker.value;

    if (marker.derivativeWork) {
        return buildDerivativeWorkItem(value);
    }

    return buildSeriesTitleItem(value);
}

function buildSeriesTitleItem(series) {
    if (!isWikilinkValue(series)) {
        const displayText = formatText("patterns.seriesDisplayTitle", {
            title: series,
        });
        const item = {
            displayText,
            normalizedText: series,
            wikitext: displayText,
        };

        return item;
    }

    const parts = getWikilinkParts(series);
    const label = parts.label || parts.target;
    const linkTarget =
        parts.label === ""
            ? formatText("patterns.titleSeries", { title: parts.target })
            : parts.target;
    const displayText = formatText("patterns.seriesDisplayTitle", {
        title: label,
    });
    const item = {
        displayText,
        linkTarget,
        normalizedText: series,
        wikitext: buildLinkText(linkTarget, displayText),
    };

    return item;
}

function buildDerivativeWorkItem(series) {
    if (!isWikilinkValue(series)) {
        const displayText = formatText("patterns.derivativeWorkDisplayTitle", {
            title: series,
        });

        return {
            displayText,
            normalizedText: series,
            wikitext: displayText,
        };
    }

    const parts = getWikilinkParts(series);
    const label = parts.label || parts.target;
    const displayLink = buildLinkText(parts.target, label);
    const displayText = formatText("patterns.derivativeWorkDisplayTitle", {
        title: displayLink,
    });

    return {
        displayText,
        linkTarget: parts.target,
        normalizedText: series,
        wikitext: displayText,
    };
}

function normalizeSeriesValues(series) {
    const values = splitFieldValues(series).map(normalizeSeriesValue);

    return values;
}

function normalizeSeriesValue(series) {
    const marker = getSeriesMarker(series);
    const value = marker.value;

    if (!isWikilinkValue(value)) {
        return addSeriesMarker(trimSeriesSuffix(value), marker);
    }

    const parts = getWikilinkParts(value);
    const target = trimSeriesSuffix(parts.target);
    const label = trimSeriesSuffix(parts.label);

    if (label === "") {
        return addSeriesMarker(`[[${target}]]`, marker);
    }

    return addSeriesMarker(buildLinkText(target, label), marker);
}

function getSeriesMarker(series) {
    const value = trimValue(series);
    const derivativeWork = value.endsWith("*");

    if (!derivativeWork) {
        return {
            derivativeWork,
            value,
        };
    }

    return {
        derivativeWork,
        value: trimValue(value.slice(0, -1)),
    };
}

function addSeriesMarker(value, marker) {
    if (!marker.derivativeWork) {
        return value;
    }

    return `${value}*`;
}

function trimSeriesSuffix(value) {
    return trimValue(value).replace(/系列$/u, "");
}

function buildSeriesCategoryPlans(series) {
    const plans = series
        .map((value) => getSeriesMarker(value).value)
        .flatMap((value) => splitLookupFieldValues(value))
        .map(buildSeriesCategoryPlan);

    return plans;
}

function buildSeriesCategoryPlan(series) {
    const plan = {
        candidates: buildSeriesCategoryCandidates(series),
        fallback: formatText("patterns.titleVideoGames", { title: series }),
    };

    return plan;
}

function buildSeriesCategoryCandidates(title) {
    const candidates = uniqueValues(
        [formatText("patterns.titleSeries", { title }), title].flatMap(
            buildSeriesTitleCandidates,
        ),
    );

    return candidates;
}

function buildSeriesTitleCandidates(title) {
    return [
        formatText("patterns.titleVideoGames", { title }),
        formatText("patterns.titleGame", { title }),
        title,
    ];
}
