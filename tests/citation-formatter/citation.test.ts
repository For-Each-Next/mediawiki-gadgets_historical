/* eslint-disable max-len */

/** Tests canonical citation formatting and semantic names. */

import assert from "node:assert/strict";
import test from "node:test";

import {
    formatCitationTemplate,
    getCitationIdentity,
    normalizeEnglishDate,
} from "citation-formatter/domain/citation.ts";
import type { CitationTemplateData } from "citation-formatter/domain/types.ts";

const metadata: CitationTemplateData = {
    aliases: {
        "access-date": ["accessdate"],
        first: ["first1"],
        last: ["last1", "author", "author1"],
        title: [],
        url: ["URL"],
    },
    paramOrder: ["last", "first", "date", "title", "url", "access-date"],
};

test("normalizes English dates at year, month, and day precision", () => {
    assert.equal(normalizeEnglishDate("June 2005"), "2005-06");
    assert.equal(normalizeEnglishDate("June 7, 2005"), "2005-06-07");
    assert.equal(normalizeEnglishDate("7 June 2005"), "2005-06-07");
    assert.equal(
        normalizeEnglishDate("February 29, 2005"),
        "February 29, 2005",
    );
    assert.equal(normalizeEnglishDate("2005"), "2005");
    assert.equal(normalizeEnglishDate("夏 2005"), "夏 2005");
});

test("canonicalizes aliases and applies TemplateData order", () => {
    const result = formatCitationTemplate(
        "{{Cite web|URL=https://example.test|title=Example|author1=Ma|accessdate=June 2005}}",
        metadata,
    );

    assert.equal(
        result.text,
        [
            "{{cite web",
            "  | last = Ma",
            "  | title = Example",
            "  | url = https://example.test",
            "  | access-date = 2005-06",
            "}}",
        ].join("\n"),
    );
});

test("uses hashtag comments, multiple authors, and n.d. in names", () => {
    const commented = formatCitationTemplate(
        "{{cite web|author=宵崎奏<!-- # Yoisaki -->|publisher=セガ|title=X}}",
        metadata,
    );
    assert.equal(
        getCitationIdentity(commented.citation).baseName,
        "Yoisaki, n.d.",
    );

    const multiple = formatCitationTemplate(
        "{{cite web|last=Ma|last2=Smith|last3=Jones|date=2006|title=X}}",
        metadata,
    );
    assert.equal(
        getCitationIdentity(multiple.citation).baseName,
        "Ma et al., 2006",
    );
});

test("falls back from author to publisher and then title", () => {
    const publisher = formatCitationTemplate(
        "{{cite web|publisher=セガ<!--#Sega-->|date=2020|title=X}}",
        metadata,
    );
    assert.equal(
        getCitationIdentity(publisher.citation).baseName,
        "Sega, 2020",
    );

    const title = formatCitationTemplate(
        "{{cite web|date=2020|title=Example work}}",
        metadata,
    );
    assert.equal(
        getCitationIdentity(title.citation).baseName,
        "Example work, 2020",
    );
});

test("uses a containing work before publisher and title", () => {
    const work = formatCitationTemplate(
        "{{cite web|website=Example Site|publisher=Publisher|title=Page}}",
        metadata,
    );
    assert.equal(
        getCitationIdentity(work.citation).baseName,
        "Example Site, n.d.",
    );
});
