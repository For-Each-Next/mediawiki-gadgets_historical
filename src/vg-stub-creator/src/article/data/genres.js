/* eslint-disable */

/**
 * Normalizes genre values and derives genre metadata.
 */

import {
    getReferenceValues,
    getWikilinkParts,
    isWikilinkValue,
    splitFieldValues,
    uniqueValues,
} from "../../shared/utils.js";
import { get as getTerminology } from "../../terminologies/index.js";

export function buildGenreMetadata(value) {
    const genres = splitFieldValues(value);
    const items = genres.map(buildGenreItem);
    const references = getGenreReferences(value);
    const links = items
        .filter((item) => item.linkTarget != null)
        .map((item) => ({
            displayText: item.displayText,
            target: item.linkTarget,
            wikitext: item.wikitext,
        }));
    const metadata = {
        categories: uniqueValues(getReferenceValues(references, "categories")),
        items,
        links,
        stubTags: uniqueValues(getReferenceValues(references, "stubTags")),
        text: items.map((item) => item.wikitext).join("、"),
        values: genres,
    };

    return metadata;
}

function buildGenreItem(value) {
    if (isWikilinkValue(value)) {
        const parts = getWikilinkParts(value);
        const item = {
            displayText: parts.label || parts.target,
            linkTarget: parts.target,
            normalizedText: value,
            wikitext: value,
        };

        return item;
    }

    const reference = getTerminology("genre", value);

    if (reference == null) {
        const item = {
            displayText: value,
            normalizedText: value,
            wikitext: value,
        };

        return item;
    }

    const item = {
        displayText: getTerminology("genre", value, "short name"),
        normalizedText: value,
        wikitext: getTerminology("genre", value, "link"),
    };
    const page = getTerminology("genre", value, "page");

    if (page != null) {
        item.linkTarget = page;
    }

    return item;
}

function getGenreReferences(value) {
    const references = splitFieldValues(value)
        .map((genre) => getTerminology("genre", genre))
        .filter(Boolean);

    return references;
}
