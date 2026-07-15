/**
 * Builds non-prose article outputs from normalized article-part data.
 */

import { buildDefaultSortText, buildInfoboxText, buildNoteTaText } from ".";
import { buildNameSourceReferenceKey } from "../../shared/form-values.ts";

/**
 * Builds infobox, conversion, sorting, and reviewed navbox outputs.
 *
 * @param records - Article records keyed by module.
 * @param sourceTags - Source reference tags keyed by field.
 * @returns Rendered article outputs.
 */
export function buildArticleRenderers(records: any, sourceTags: any): any {
    const names = records.names.metadata;
    const commonNames = addNameReferenceTags(
        names.commonNames,
        sourceTags,
        "commonNames",
    );
    const officialNames = addNameReferenceTags(
        names.officialNames,
        sourceTags,
        "officialNames",
    );
    const defaultSort = buildNameDefaultSort(names);
    const infobox = buildNameInfobox(names, commonNames, officialNames);
    const noteTa = buildNoteTaText({
        entries: records.noteTa.metadata.rows,
        namesRemoved: records.noteTa.metadata.namesRemoved,
        officialNames: names.officialNames,
    });

    return {
        defaultSort,
        infobox,
        navboxes: records.review.wikitext.navbox,
        noteTa,
    };
}

/** Builds default-sort text from normalized names. */
function buildNameDefaultSort(names: any): string {
    return buildDefaultSortText({
        english: names.englishName,
        original: names.original.name,
        sortKey: names.sortKey,
        title: names.name,
    });
}

/** Builds infobox text from normalized names. */
function buildNameInfobox(
    names: any,
    commonNames: any,
    officialNames: any,
): string {
    return buildInfoboxText({
        commonNames,
        englishName: names.englishName,
        name: names.name,
        officialNames,
        originalLanguage: names.original.language,
        originalName: names.original.name,
    });
}

/**
 * Defines the module-level add name reference tags.
 */
function addNameReferenceTags(rows, sourceTags, key) {
    const values = (rows || []).map(function callback(row, index) {
        const sourceKey =
            row.sourceKey || buildNameSourceReferenceKey(key, index);
        const value = {
            ...row,
            ref: sourceTags[sourceKey] || "",
        };

        return value;
    });

    return values;
}
