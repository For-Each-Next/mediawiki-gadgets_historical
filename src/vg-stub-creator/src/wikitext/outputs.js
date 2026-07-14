/* eslint-disable */

/**
 * Builds non-prose article outputs from normalized article-part data.
 */

import {
    buildDefaultSortText,
    buildInfoboxText,
    buildNoteTaText,
} from "./index.js";
import { buildNameSourceReferenceKey } from "../shared/form-values.js";

/**
 * Builds infobox, conversion, sorting, and reviewed navbox outputs.
 *
 * @param {object} records - Article records keyed by module.
 * @param {object} sourceTags - Source reference tags keyed by field.
 * @returns {object} Rendered article outputs.
 */
export function buildArticleRenderers(records, sourceTags) {
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

function addNameReferenceTags(rows, sourceTags, key) {
    const values = (rows || []).map((row, index) => {
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
