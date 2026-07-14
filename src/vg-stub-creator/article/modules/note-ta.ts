/**
 * Flushes manually editable NoteTA-lite template rows.
 */

import { trimFieldValue } from "../../shared/form-values.ts";
import { defineArticleModule } from "../module.ts";

export const noteTaModule = defineArticleModule({
    fields: ["noteTaRows", "noteTaNamesRemoved"],
    key: "noteTa",

    normalize(form) {
        return {
            noteTaNamesRemoved: form.noteTaNamesRemoved === true,
            noteTaRows: normalizeNoteTaRows(form.noteTaRows),
        };
    },

    flush(form) {
        return {
            metadata: {
                namesRemoved: form.noteTaNamesRemoved,
                rows: form.noteTaRows,
            },
            values: form.noteTaRows
                .filter((row) => row.value !== "")
                .map(function callback(row) {
                    return {
                        key: "noteTaRow",
                        metadata: {
                            key: row.key,
                            modified: row.modified,
                            source: row.source,
                        },
                        normalizedText: row.value,
                        wikitext: row.value,
                    };
                }),
        };
    },
});


/**
 * Defines the module-level normalize note ta rows.
 */
function normalizeNoteTaRows(rows) {
    if (!Array.isArray(rows)) {
        return [];
    }

    return rows.map(function callback(row) {
        return {
            key: trimFieldValue(row?.key),
            modified: row?.modified === true,
            source: trimFieldValue(row?.source),
            value: trimFieldValue(row?.value),
        };
    });
}
