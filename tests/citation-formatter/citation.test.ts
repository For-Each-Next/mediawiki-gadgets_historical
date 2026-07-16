/* eslint-disable max-len */

/** Tests canonical citation formatting and semantic names. */

import assert from "node:assert/strict";
import test from "node:test";

import {
    formatCitationTemplate,
    getCitationIdentity,
    normalizeEnglishDate,
} from "citation-formatter/domain/citation.ts";
import generatedTemplateData from "citation-formatter/domain/data/index.ts";
import type { CitationTemplateData } from "citation-formatter/domain/types.ts";

const metadata: CitationTemplateData = {
    aliases: {
        "access-date": ["accessdate"],
        first: ["first1"],
        first2: [],
        last: ["last1", "author", "author1"],
        last2: ["author2"],
        title: [],
        url: ["URL"],
        "url-status": [],
    },
    paramOrder: [
        "last",
        "first",
        "last2",
        "first2",
        "date",
        "title",
        "url",
        "access-date",
        "url-status",
    ],
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
            "{{Cite web",
            "  | author = Ma",
            "  | title = Example",
            "  | url = https://example.test",
            "  | access-date = 2005-06",
            "}}",
        ].join("\n"),
    );
});

test("uses canonical citation template casing", () => {
    const cases = [
        ["citation", "Citation"],
        ["cite arxiv", "Cite arXiv"],
        ["cite av media", "Cite AV media"],
        ["cite av media notes", "Cite AV media notes"],
        ["cite biorxiv", "Cite bioRxiv"],
        ["cite citeseerx", "Cite CiteSeerX"],
        ["cite medrxiv", "Cite medRxiv"],
        ["cite ssrn", "Cite SSRN"],
        ["cite tweet", "Cite tweet"],
        ["cite web", "Cite web"],
    ] as const;

    for (const [entered, canonical] of cases) {
        const result = formatCitationTemplate(
            `{{${entered}|title=Example}}`,
            generatedTemplateData[entered],
        );
        assert.match(result.text, new RegExp(`^\\{\\{${canonical}\\n`, "u"));
    }
});

test("uses numbered author labels only when multiple authors are present", () => {
    const unstructured = formatCitationTemplate(
        "{{cite web|author1=Ma|author2=Li|title=Example}}",
        metadata,
    );
    assert.match(unstructured.text, /\| author1 = Ma/u);
    assert.match(unstructured.text, /\| author2 = Li/u);

    const structured = formatCitationTemplate(
        "{{cite web|last1=Ma|first1=Anne|last2=Li|first2=Bo|title=Example}}",
        metadata,
    );
    assert.match(structured.text, /\| last1 = Ma/u);
    assert.match(structured.text, /\| first1 = Anne/u);
    assert.match(structured.text, /\| last2 = Li/u);
    assert.match(structured.text, /\| first2 = Bo/u);
});

test("replaces removed dead-url parameters and converts boolean values", () => {
    const live = formatCitationTemplate(
        "{{cite web|title=Example|url=https://example.test|archive-url=https://archive.test|dead-url=no}}",
        metadata,
    );
    assert.match(live.text, /\| url-status = live/u);
    assert.doesNotMatch(live.text, /dead-url/u);

    const dead = formatCitationTemplate(
        "{{cite web|title=Example|url=https://example.test|archive-url=https://archive.test|deadurl=yes}}",
        metadata,
    );
    assert.match(dead.text, /\| url-status = dead/u);
});

test("uses cite book ordering as the print-template fallback", () => {
    const result = formatCitationTemplate(
        "{{cite journal|title=Example|name-list-style=amp|archive-format=PDF}}",
        generatedTemplateData["cite journal"],
    );
    assert.ok(
        result.text.indexOf("| archive-format =") <
            result.text.indexOf("| name-list-style ="),
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

    const familyNames = formatCitationTemplate(
        "{{cite web|author1=堀井雄二<!-- # Horii, Yūji -->|author2=早坂将昭<!-- # Hayasaka, Masaaki -->|date=2025|title=X}}",
        metadata,
    );
    assert.equal(
        getCitationIdentity(familyNames.citation).baseName,
        "Horii & Hayasaka, 2025",
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
