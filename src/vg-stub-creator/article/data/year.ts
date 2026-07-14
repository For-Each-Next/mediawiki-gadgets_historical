/**
 * Normalizes release years and derives year categories.
 */

import { trimValue, uniqueValues } from "../../shared/utils.ts";
import { formatText, getTextTemplate } from "../../shared/text-templates.ts";
import { get as getTerminology } from "../../terminologies";


/**
 * Defines the module-level build year metadata.
 */
export function buildYearMetadata(value) {
    const normalized = normalizeYearFieldValue(value);
    const reference = getYearReference(normalized);
    const metadata = {
        categories: reference.categories,
        phrase: reference.phrase,
        value: normalized,
    };

    return metadata;
}


/**
 * Defines the module-level normalize year field value.
 */
export function normalizeYearFieldValue(value) {
    const entered = value == null ? "" : String(value).trim();
    const planned = entered.startsWith("~");
    const rawYear = planned ? entered.slice(1).trim() : entered;
    const yearMatch = rawYear.match(/\b\d{4}\b/u);
    const candidate = yearMatch?.[0] || rawYear;
    const normalized = getTerminology("year", candidate, "name") || candidate;

    if (planned) {
        return normalized === "" ? "~" : `~${normalized}`;
    }

    return normalized;
}


/**
 * Defines the module-level get year reference.
 */
function getYearReference(value) {
    const year = trimValue(value);
    const definition = getTerminology("year", year);

    if (year === "") {
        return {
            categories: [],
            phrase: "",
        };
    }

    if (year === "~") {
        return {
            categories: [getTextTemplate("patterns.yearFuture")],
            phrase: getTextTemplate("patterns.yearUnreleased"),
        };
    }

    if (year.startsWith("~")) {
        return getPlannedYearReference(year.slice(1));
    }

    const reference = {
        categories: definition?.categories || [],
        phrase: formatText("patterns.yearReleased", {
            year: definition?.name || year,
        }),
    };

    return reference;
}


/**
 * Defines the module-level get planned year reference.
 */
function getPlannedYearReference(value) {
    const year = trimValue(value);
    const definition = getTerminology("year", year);
    const reference = {
        categories: uniqueValues([
            getTextTemplate("patterns.yearFuture"),
            ...(definition?.categories || []),
        ]),
        phrase: formatText("patterns.yearPlanned", {
            year: definition?.name || year,
        }),
    };

    return reference;
}
