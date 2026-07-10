/* eslint-disable */

/**
 * Normalizes platform values and derives platform metadata.
 */

import {
    getReferenceValues,
    getWikilinkParts,
    isWikilinkValue,
    splitFieldValues,
    splitLookupFieldValues,
    uniqueValues,
} from "../../shared/utils.js";
import { get as getTerminology } from "../../terminologies/index.js";

/**
 * Builds normalized display, link, and category metadata for platforms.
 *
 * @param {*} value - Raw platform field value.
 * @returns {object} Platform values and metadata.
 */
export function buildPlatformMetadata(value) {
    const references = getPlatformReferences(value);
    const platformValues = splitFieldValues(value);
    const buildItem = buildPlatformItem.bind(null, references);
    const items = platformValues.map(buildItem);
    const links = items
        .filter((item) => item.linkTarget != null)
        .map((item) => ({
            displayText: item.displayText,
            target: item.linkTarget,
            wikitext: item.wikitext,
        }));
    const metadata = {
        categories: uniqueValues(getReferenceValues(references, "categories")),
        count: splitLookupFieldValues(value || "").length,
        items,
        links,
        stubTags: uniqueValues(getReferenceValues(references, "stubTags")),
        text: items.map((item) => item.wikitext).join("、"),
        values: platformValues,
    };

    return metadata;
}

function buildPlatformItem(references, value) {
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

    const reference = references.find((item) => item.source === value);

    if (reference == null) {
        const item = {
            displayText: value,
            normalizedText: value,
            wikitext: value,
        };

        return item;
    }

    const item = {
        displayText: getTerminology("platform", value, "name"),
        normalizedText: value,
        wikitext: getTerminology("platform", value, "link"),
    };
    const page = getTerminology("platform", value, "page");

    if (page != null) {
        item.linkTarget = page;
    }

    return item;
}

function getPlatformReferences(value) {
    const references = splitFieldValues(value)
        .map((source) => {
            const reference = getTerminology("platform", source);

            return reference == null ? undefined : { ...reference, source };
        })
        .filter(Boolean);

    return references;
}
