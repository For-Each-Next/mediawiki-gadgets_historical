/* eslint-disable */

/**
 * Normalizes release years and derives year categories.
 */

import {
    FIELD_REFERENCE_DATA,
    getReferenceEntry,
    trimValue,
    uniqueValues,
} from "../../utils.js";

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

export function normalizeYearFieldValue(value) {
    const entered = value == null ? "" : String(value).trim();
    const planned = entered.startsWith("~");
    const rawYear = planned ? entered.slice(1).trim() : entered;
    const yearMatch = rawYear.match(/\b\d{4}\b/u);
    const candidate = yearMatch?.[0] || rawYear;
    const definition = getYearDefinition(candidate);
    const normalized = definition.key || candidate;

    if (planned) {
        return normalized === "" ? "~" : `~${normalized}`;
    }

    return normalized;
}

function getYearReference(value) {
    const year = trimValue(value);
    const yearDefinition = getYearDefinition(year);

    if (year === "") {
        return {
            categories: [],
            phrase: "",
        };
    }

    if (year === "~") {
        return {
            categories: ["未来电子游戏"],
            phrase: "尚未推出的",
        };
    }

    if (year.startsWith("~")) {
        return getPlannedYearReference(year.slice(1));
    }

    const reference = {
        categories: getReferenceCategories(yearDefinition.reference),
        phrase: `${getYearLabel(year, yearDefinition)}年`,
    };

    return reference;
}

function getPlannedYearReference(value) {
    const year = trimValue(value);
    const yearDefinition = getYearDefinition(year);
    const reference = {
        categories: uniqueValues([
            "未来电子游戏",
            ...getReferenceCategories(yearDefinition.reference),
        ]),
        phrase: `预定于${getYearLabel(year, yearDefinition)}年推出的`,
    };

    return reference;
}

function getYearDefinition(year) {
    return getReferenceEntry(FIELD_REFERENCE_DATA.years, year);
}

function getReferenceCategories(reference) {
    return reference?.categories || [];
}

function getYearLabel(fallback, definition) {
    return definition.key == null ? fallback : definition.key;
}
