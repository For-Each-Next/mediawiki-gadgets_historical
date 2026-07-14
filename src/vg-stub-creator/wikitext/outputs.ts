/**
 * Builds non-prose article outputs from normalized article-part data.
 */

import {
    buildDefaultSortText,
    buildInfoboxText,
    buildNoteTaText,
} from "./index.ts";
import { buildNameSourceReferenceKey } from "../shared/form-values.ts";


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
    const defaultSort = buildDefaultSortText({
        english: names.englishName,
        original: names.original.name,
        sortKey: names.sortKey,
        title: names.name,
    });
    const infobox = buildInfoboxText({
        commonNames,
        englishName: names.englishName,
        name: names.name,
        officialNames,
        originalLanguage: names.original.language,
        originalName: names.original.name,
    });
    const noteTa = buildNoteTaText({
        entries: records.noteTa.metadata.rows,
        namesRemoved: records.noteTa.metadata.namesRemoved,
        officialNames: names.officialNames,
    });
    const outputs = {
        defaultSort,
        infobox,
        navboxes: records.review.wikitext.navbox,
        noteTa,
    };

    return outputs;
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
