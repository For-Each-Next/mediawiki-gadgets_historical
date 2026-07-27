/** Structural checks for generated citation TemplateData snapshots. */

import assert from "node:assert/strict";
import test from "node:test";

import templateData from "citation-formatter/domain/data/index.ts";
import {
    normalizeTemplateName,
    SUPPORTED_CITATION_TEMPLATES,
} from "citation-formatter/domain/templates.ts";

test("covers every supported citation template title exactly once", () => {
    const expected = SUPPORTED_CITATION_TEMPLATES.map(normalizeTemplateName);

    assert.deepEqual(
        Object.keys(templateData).toSorted(),
        expected.toSorted(),
    );
});

test("keeps template metadata structurally consistent", () => {
    for (const [template, metadata] of Object.entries(templateData)) {
        const ordered = new Set(metadata.paramOrder);
        assert.equal(
            ordered.size,
            metadata.paramOrder.length,
            `${template} has a duplicate paramOrder entry`,
        );
        for (const canonical of Object.keys(metadata.aliases)) {
            assert.ok(
                ordered.has(canonical),
                `${template} alias key ${canonical} is absent from paramOrder`,
            );
        }
        for (const date of metadata.dateParams ?? []) {
            assert.ok(
                ordered.has(date),
                `${template} date key ${date} is absent from paramOrder`,
            );
        }
    }
});
