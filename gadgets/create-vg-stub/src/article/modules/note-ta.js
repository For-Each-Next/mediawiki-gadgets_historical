/* eslint-disable */

/**
 * Flushes manually editable NoteTA-lite template rows.
 */

import { trimFieldValue } from "../../shared/form-values.js";
import { defineArticleModule } from "../module.js";

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
                .map((row) => ({
                    key: "noteTaRow",
                    metadata: {
                        key: row.key,
                        modified: row.modified,
                        source: row.source,
                    },
                    normalizedText: row.value,
                    wikitext: row.value,
                })),
        };
    },
});

function normalizeNoteTaRows(rows) {
    if (!Array.isArray(rows)) {
        return [];
    }

    return rows.map((row) => ({
        key: trimFieldValue(row?.key),
        modified: row?.modified === true,
        source: trimFieldValue(row?.source),
        value: trimFieldValue(row?.value),
    }));
}
