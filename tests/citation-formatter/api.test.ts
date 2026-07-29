/** Tests the side-effect-free Citation Formatter entry point. */

import assert from "node:assert/strict";
import test from "node:test";

import {
    findNameOverrideFields,
    findUsedCitationTemplates,
    formatCitations,
    formatCitationWikitext,
    manageCitations,
    manageCitationsWithResult,
    normalizeEnglishDate,
} from "citation-formatter";

test("exports every supported operation without a browser", () => {
    const functions = [
        findNameOverrideFields,
        findUsedCitationTemplates,
        formatCitations,
        formatCitationWikitext,
        manageCitations,
        manageCitationsWithResult,
        normalizeEnglishDate,
    ];

    assert.ok(functions.every((value) => typeof value === "function"));
});

test("formats text through the package entry point", () => {
    const source =
        '<ref name="Example">{{cite web|title=Example|' +
        "date=January 2, 2025}}</ref>";
    const result = formatCitations(source, "inline");

    assert.match(result.text, /date = 2025-01-02/u);
    assert.deepEqual(findUsedCitationTemplates(source), ["cite web"]);
    assert.equal(normalizeEnglishDate("January 2, 2025"), "2025-01-02");
});
