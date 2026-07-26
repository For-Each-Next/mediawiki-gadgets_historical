/** Tests site-aware CS1 draft validation. */

import assert from "node:assert/strict";
import test from "node:test";

import {
    formatSourceDraftRows,
    parseSourceDraft,
    type SourceDraft,
} from "citation-formatter/domain/source-manager.ts";
import { getSourceDraftErrors } from "citation-formatter/domain/source-validation.ts";

function getRowIndex(draft: SourceDraft, name: string): number {
    const index = draft.rows.findIndex((row) => row.name === name);
    assert.notEqual(index, -1, `Missing ${name} row`);
    return index;
}

test("formats added rows into standard template order", () => {
    const draft = parseSourceDraft(
        "{{cite web|author=One|date=2026|url=https://example.test}}",
    );
    draft.rows.push({
        alias: "",
        directive: "",
        main: false,
        name: "author2",
        value: "Two",
    });
    draft.rows.push({
        alias: "",
        directive: "",
        main: false,
        name: "quote",
        value: "Quoted text",
    });
    draft.rows.push({
        alias: "",
        directive: "",
        main: false,
        name: "format",
        value: "PDF",
    });

    formatSourceDraftRows(draft);

    assert.ok(getRowIndex(draft, "author") < getRowIndex(draft, "author2"));
    assert.ok(getRowIndex(draft, "author2") < getRowIndex(draft, "date"));
    assert.ok(getRowIndex(draft, "format") < getRowIndex(draft, "quote"));
});

test("marks unsupported parameters and malformed dates", () => {
    const draft = parseSourceDraft(
        "{{cite web|title=Example|date=2026-13-40}}",
    );
    draft.rows.push({
        alias: "",
        directive: "",
        main: false,
        name: "titel",
        value: "Typo",
    });

    const errors = getSourceDraftErrors(draft, "enwiki");

    assert.match(
        errors.get(getRowIndex(draft, "titel"))?.name ?? "",
        /Unsupported/u,
    );
    assert.match(
        errors.get(getRowIndex(draft, "date"))?.value ?? "",
        /Invalid date/u,
    );
});

test("accepts CS1 parameters supported by another citation class", () => {
    const draft = parseSourceDraft("{{cite web|title=Example|pages=4–6}}");

    const errors = getSourceDraftErrors(draft, "enwiki");

    assert.equal(errors.get(getRowIndex(draft, "pages"))?.name, undefined);
});

test("marks a missing archive pair field", () => {
    const draft = parseSourceDraft(
        "{{cite web|title=Example|" +
            "archive-url=https://web.archive.org/example}}",
    );

    const errors = getSourceDraftErrors(draft, "enwiki");

    assert.match(
        errors.get(getRowIndex(draft, "archive-date"))?.value ?? "",
        /requires an archive date/u,
    );
});

test("validates archive dates for every citation class", () => {
    const draft = parseSourceDraft(
        "{{cite book|title=Example|" +
            "archive-url=https://web.archive.org/example|" +
            "archive-date=2026-02-30}}",
    );

    const errors = getSourceDraftErrors(draft, "enwiki");

    assert.match(
        errors.get(getRowIndex(draft, "archive-date"))?.value ?? "",
        /Invalid archive-date/u,
    );
});

test("uses Chinese Wikipedia aliases and date syntax on zhwiki", () => {
    const draft = parseSourceDraft(
        "{{cite web|title_zh=示例|date=2026年7月26日}}",
    );

    const errors = getSourceDraftErrors(draft, "zhwiki");

    assert.equal(errors.get(getRowIndex(draft, "title_zh"))?.name, undefined);
    assert.equal(errors.get(getRowIndex(draft, "date"))?.value, undefined);
});
