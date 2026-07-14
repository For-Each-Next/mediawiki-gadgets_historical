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
} from "../../shared/utils.ts";
// noinspection ES6PreferShortImport -- keep explicit .ts extension.
import { get as getTerminology } from "../../terminologies/index.ts";


/**
 * Builds normalized display, link, and category metadata for platforms.
 *
 * @param value - Raw platform field value.
 * @returns Platform values and metadata.
 */
export function buildPlatformMetadata(value: any): any {
    const references = getPlatformReferences(value);
    const platformValues = splitFieldValues(value);
    const items = platformValues.map(function callback(item) {
        return buildPlatformItem(references, item);
    });
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


/**
 * Defines the module-level build platform item.
 */
function buildPlatformItem(references: any[], value): ArticleDataValue {
    if (isWikilinkValue(value)) {
        return buildLinkedPlatformItem(value);
    }

    const reference = references.find((item) => item.source === value);

    if (reference == null) {
        return {
            displayText: value,
            normalizedText: value,
            wikitext: value,
        };
    }

    const item: ArticleDataValue = {
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

/** Builds a platform item from an explicit wikilink. */
function buildLinkedPlatformItem(value: string): ArticleDataValue {
    const parts = getWikilinkParts(value);

    return {
        displayText: parts.label || parts.target,
        linkTarget: parts.target,
        normalizedText: value,
        wikitext: value,
    };
}


/**
 * Defines the module-level get platform references.
 */
function getPlatformReferences(value): any[] {
    const references = splitFieldValues(value)
        .map(function callback(source) {
            const reference = getTerminology("platform", source);

            return reference == null ? undefined : { ...reference, source };
        })
        .filter(Boolean);

    return references;
}
