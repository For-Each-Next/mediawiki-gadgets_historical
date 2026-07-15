/* eslint-disable max-len */

/** Tests article-level list-defined-reference conversion. */

import assert from "node:assert/strict";
import test from "node:test";

import generatedTemplateData from "citation-formatter/domain/data/index.ts";
import { formatCitationWikitext } from "citation-formatter/domain/formatter.ts";
import type { CitationTemplateDataMap } from "citation-formatter/domain/types.ts";

const templateData: CitationTemplateDataMap = {
    "cite book": generatedTemplateData["cite book"],
    "cite web": generatedTemplateData["cite web"],
};

test("moves and formats citations into an existing references tag", () => {
    const source =
        "Text.<ref>{{cite web|url=https://example.test|title=Example|last=Ma|date=June 1, 2006}}</ref>\n\n<references />";
    const result = formatCitationWikitext(source, templateData);

    assert.match(result.text, /<ref name="Ma, 2006" \/>/u);
    assert.match(
        result.text,
        /<references>\n<ref name="Ma, 2006">\{\{cite web/u,
    );
    assert.match(result.text, /\| date = 2006-06-01/u);
    assert.equal(result.citationsFormatted, 1);
    assert.equal(result.referencesMoved, 1);
});

test("uses reflist list and ignores positional column widths", () => {
    const source =
        "Text.<ref>{{cite web|title=Example|publisher=Site}}</ref>\n{{reflist|20em}}";
    const result = formatCitationWikitext(source, templateData);

    assert.match(
        result.text,
        /\{\{reflist\n\| list =\n<ref name="Site, n\.d\.">/u,
    );
    assert.doesNotMatch(result.text, /20em/u);
});

test("keeps reference groups paired with their list", () => {
    const source = [
        "Text.<ref group=note>{{cite web|title=X|publisher=Site|date=2020}}</ref>",
        '<references group="note" />',
    ].join("\n");
    const result = formatCitationWikitext(source, templateData);

    assert.match(result.text, /<ref name="Site, 2020" group="note" \/>/u);
    assert.match(result.text, /<references group="note">/u);
    assert.doesNotMatch(
        result.text,
        /<references group="note">\n<ref[^>]+group=/u,
    );
});

test("converts r invocations and definitions", () => {
    const source =
        "Text {{r|old}}.\n<references>{{r|name=old|ref={{cite web|last=Ma|date=2006|title=X}}}}</references>";
    const result = formatCitationWikitext(source, templateData);

    assert.match(result.text, /Text <ref name="Ma, 2006" \/>\./u);
    assert.doesNotMatch(result.text, /\{\{r\|/u);
});

test("adds year suffixes for distinct works in source order", () => {
    const source = [
        "A<ref>{{cite web|last=Ma|date=2006|title=First}}</ref>",
        "B<ref>{{cite web|last=Ma|date=2006|title=Second}}</ref>",
        "<references />",
    ].join("\n");
    const result = formatCitationWikitext(source, templateData);

    assert.match(result.text, /name="Ma, 2006a"/u);
    assert.match(result.text, /name="Ma, 2006b"/u);
});

test("distinguishes same-source page and media locators without year letters", () => {
    const source = [
        "A<ref>{{cite book|last=Ma|date=2006|title=Book|page=59}}</ref>",
        "B<ref>{{cite book|last=Ma|date=2006|title=Book|page=60}}</ref>",
        "C<ref>{{cite web|last=Li|date=2020|title=Video|time=12:30}}</ref>",
        "<references />",
    ].join("\n");
    const result = formatCitationWikitext(source, templateData);

    assert.match(result.text, /name="Ma, 2006, p\. 59"/u);
    assert.match(result.text, /name="Ma, 2006, p\. 60"/u);
    assert.match(result.text, /name="Li, 2020, timestamp 12:30"/u);
    assert.doesNotMatch(result.text, /2006a/u);
});

test("uses numeric-colon fallbacks for plain and mixed note content", () => {
    const source = [
        "A<ref>Plain note</ref>",
        "B<ref>See {{cite web|title=Nested}}</ref>",
        "<references />",
    ].join("\n");
    const result = formatCitationWikitext(source, templateData);

    assert.match(result.text, /A<ref name=":1" \/>/u);
    assert.match(result.text, /B<ref name=":2" \/>/u);
    assert.match(result.text, /<ref name=":1">Plain note<\/ref>/u);
    assert.match(result.text, /<ref name=":2">See \{\{cite web/u);
});

test("does not parse refs in comments or nowiki blocks", () => {
    const source = [
        "<!-- <ref>{{cite web|title=Comment}}</ref> -->",
        "<nowiki><ref>{{cite web|title=Code}}</ref></nowiki>",
    ].join("\n");
    assert.equal(formatCitationWikitext(source, templateData).text, source);
});

test("formats EarthBound Beginnings article reference patterns", () => {
    const source = [
        "Lead.<ref>{{Cite web |title=Releases Section " +
            "|url=https://www.nintendo.co.jp/n08/before/n2005_b01.html " +
            "|access-date=2023-07-04 |website=www.nintendo.co.jp " +
            "|archive-date=April 7, 2023}}</ref>",
        'Gameplay.<ref name="MotherEncyclopedia">' +
            "{{cite book |title=Mother Encyclopedia|date=1989 " +
            "|publisher=[[Shogakukan]] |isbn=4-09-104114-0}}</ref>",
        "Plot.{{efn|Character note.<ref>{{cite video game" +
            "|title=[[Super Smash Bros. Brawl]]" +
            "|developer=[[Sora Ltd.]], [[Game Arts]]" +
            "|publisher=[[Nintendo]]|date=January 31, 2008" +
            "|platform=[[Wii]]}}</ref>}}",
        'Reuse.<ref name="nlife: profile"/>',
        "{{Reflist|25em|refs=",
        '<ref name="nlife: profile">{{cite news' +
            "|url=https://www.nintendolife.com/games/nes/mother" +
            "|title=Mother News|work=[[Nintendo Life]]" +
            "|date=December 21, 2009|last1=Life|first1=Nintendo}}</ref>",
        '<ref name="mixed">{{cite web|last=Itoi|date=2000' +
            "|title=Cancellation}}</ref> [https://example.test Translation]",
        '<!--<ref name="commented">{{cite web|title=Old}}</ref>-->',
        "}}",
    ].join("\n");
    const result = formatCitationWikitext(source, generatedTemplateData);

    assert.match(result.text, /name="www\.nintendo\.co\.jp, n\.d\."/u);
    assert.match(result.text, /\| archive-date = 2023-04-07/u);
    assert.match(result.text, /name="Shogakukan, 1989"/u);
    assert.match(result.text, /name="Sora Ltd\., Game Arts, 2008"/u);
    assert.match(result.text, /name="Life, 2009"/u);
    assert.match(result.text, /name="Itoi, 2000"/u);
    assert.match(result.text, /\[https:\/\/example\.test Translation\]/u);
    assert.match(result.text, /\{\{reflist\n\| list =/u);
    assert.doesNotMatch(result.text, /25em/u);
    assert.match(result.text, /<!--<ref name="commented">/u);
});
