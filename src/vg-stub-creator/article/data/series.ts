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
} from "../../shared/utils.ts";
import { formatText, getTextTemplate } from "../../shared/text-templates.ts";


/**
 * Builds normalized display, link, and category metadata for series.
 *
 * @param value - Raw series field value.
 * @returns Series values and metadata.
 */
export function buildSeriesMetadata(value: any): any {
    const values = normalizeSeriesValues(value || "");
    const items = values.map(buildSeriesItem);
    const links = items
        .filter((item) => item.linkTarget != null)
        .map(function callback(item) {
            return {
                displayText: item.displayText,
                target: item.linkTarget,
                wikitext: item.wikitext,
            };
        });
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


/**
 * Defines the module-level build series item.
 */
function buildSeriesItem(series): ArticleDataValue {
    const marker = getSeriesMarker(series);
    const value = marker.value;

    if (marker.derivativeWork) {
        return buildDerivativeWorkItem(value);
    }

    return buildSeriesTitleItem(value);
}


/**
 * Defines the module-level build series title item.
 */
function buildSeriesTitleItem(series): ArticleDataValue {
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

    return buildLinkedSeriesTitleItem(series);
}

/** Builds a series-title item from an explicit wikilink. */
function buildLinkedSeriesTitleItem(series: string): ArticleDataValue {
    const parts = getWikilinkParts(series);
    const label = parts.label || parts.target;
    const linkTarget = selectValue(
        parts.label === "",
        function trueBranch() {
            return formatText("patterns.titleSeries", { title: parts.target });
        },
        function falseBranch() {
            return parts.target;
        },
    );
    const displayText = formatText("patterns.seriesDisplayTitle", {
        title: label,
    });
    return {
        displayText,
        linkTarget,
        normalizedText: series,
        wikitext: buildLinkText(linkTarget, displayText),
    };

}


/**
 * Defines the module-level build derivative work item.
 */
function buildDerivativeWorkItem(series): ArticleDataValue {
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


/**
 * Defines the module-level normalize series values.
 */
function normalizeSeriesValues(series) {
    const values = splitFieldValues(series).map(normalizeSeriesValue);

    return values;
}


/**
 * Defines the module-level normalize series value.
 */
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


/**
 * Defines the module-level get series marker.
 */
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


/**
 * Defines the module-level add series marker.
 */
function addSeriesMarker(value, marker) {
    if (!marker.derivativeWork) {
        return value;
    }

    return `${value}*`;
}


/**
 * Defines the module-level trim series suffix.
 */
function trimSeriesSuffix(value) {
    return trimValue(value).replace(/系列$/u, "");
}


/**
 * Defines the module-level build series category plans.
 */
function buildSeriesCategoryPlans(series) {
    const plans = series
        .map((value) => getSeriesMarker(value).value)
        .flatMap((value) => splitLookupFieldValues(value))
        .map(buildSeriesCategoryPlan);

    return plans;
}


/**
 * Defines the module-level build series category plan.
 */
function buildSeriesCategoryPlan(series) {
    const plan = {
        candidates: buildSeriesCategoryCandidates(series),
        fallback: formatText("patterns.titleVideoGames", { title: series }),
    };

    return plan;
}


/**
 * Defines the module-level build series category candidates.
 */
function buildSeriesCategoryCandidates(title) {
    const candidates = uniqueValues(
        [formatText("patterns.titleSeries", { title }), title].flatMap(
            buildSeriesTitleCandidates,
        ),
    );

    return candidates;
}


/**
 * Defines the module-level build series title candidates.
 */
function buildSeriesTitleCandidates(title) {
    return [
        formatText("patterns.titleVideoGames", { title }),
        formatText("patterns.titleGame", { title }),
        title,
    ];
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
