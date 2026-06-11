/* eslint-disable */

/**
 * Normalizes genre values and derives genre metadata.
 */

import {
    FIELD_REFERENCE_DATA,
    buildLinkText,
    getReferenceDefinition,
    getReferenceValues,
    getWikilinkParts,
    isWikilinkValue,
    splitFieldValues,
    uniqueValues,
} from "../../utils.js";

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

    const reference = getReferenceDefinition(
        FIELD_REFERENCE_DATA.genres,
        value,
    );

    if (reference?.page == null) {
        const item = {
            displayText: value,
            normalizedText: value,
            wikitext: value,
        };

        return item;
    }

    const displayText = getGenrePageLabel(reference);
    const linkTarget = reference.page.title;
    const item = {
        displayText,
        linkTarget,
        normalizedText: value,
        wikitext: buildLinkText(linkTarget, displayText),
    };

    return item;
}

function getGenrePageLabel(reference) {
    const label = reference.page.label || reference.page.title;

    return label.replace(/(?:[电電]子)?[游遊][戏戲]$/u, "");
}

function getGenreReferences(value) {
    const references = splitFieldValues(value)
        .map(getReferenceDefinition.bind(null, FIELD_REFERENCE_DATA.genres))
        .filter(Boolean);

    return references;
}
