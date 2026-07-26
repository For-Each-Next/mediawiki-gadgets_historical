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

function assertReferenceMarker(text: string, label: string): void {
    const lines = text.split("\n");
    const findIndexCallback = (line: string) => line.includes(` ${label} `);
    const index = lines.findIndex(findIndexCallback);
    assert.ok(index >= 1);
    assert.equal(lines[index - 1], "");
    const markerPattern = new RegExp(`^<!-- -+ ${label} -+ -->$`, "u");
    assert.match(lines[index], markerPattern);
    assert.equal(lines[index + 1], "");
    assert.equal(lines[index].length, 79);
}

const testCallbackAA = () => {
    const source =
        "Text.<ref>{{cite web|url=https://example.test|title=Example|last=Ma|date=June 1, 2006}}</ref>\n\n<references />";
    const result = formatCitationWikitext(source, templateData);

    assert.match(result.text, /<ref name="Ma, 2006" \/>/u);
    assert.match(
        result.text,
        /<references responsive>\n\n<!-- -+ § 0 Lead -+ -->\n\n<ref name="Ma, 2006">\{\{Cite web/u,
    );
    assertReferenceMarker(result.text, "§ 0 Lead");
    assert.match(result.text, /\| date = 2006-06-01/u);
    assert.equal(result.citationsFormatted, 1);
    assert.equal(result.referencesMoved, 1);
};
test(
    "moves and formats citations into an existing references tag",
    testCallbackAA,
);

const testInlineCitationLayout = () => {
    const source =
        "Text.<ref>{{cite web|url=https://example.test|title=Example|last=Ma|date=June 1, 2006}}</ref>\n\n<references />";
    const result = formatCitationWikitext(source, templateData, "inline");

    assert.match(
        result.text,
        /<ref name="Ma, 2006">\{\{Cite web \| author = Ma [^\n]+\}\}<\/ref>/u,
    );
    assert.doesNotMatch(result.text, /\{\{Cite web\n/u);
};
test(
    "formats list-defined citation templates inline",
    testInlineCitationLayout,
);

const testCallbackZ = () => {
    const result = formatCitationWikitext("<references />", templateData);
    assert.equal(result.text, "<references responsive />");
};
test("adds responsive to an empty native references list", testCallbackZ);

const testCallbackY = () => {
    const source = [
        "Text.<ref>{{Citation|last=Ma|first=Anne|date=2020|title=Book|publisher=Publisher}}</ref>",
        "<references />",
    ].join("\n");
    const result = formatCitationWikitext(source, generatedTemplateData);

    assert.match(result.text, /<ref name="Ma, 2020" \/>/u);
    assert.match(
        result.text,
        /\{\{Citation\n  \| last = Ma\n  \| first = Anne/u,
    );
    assert.equal(result.citationsFormatted, 1);
    assert.equal(result.referencesNotFormatted, 0);
};
test("formats the general Citation template", testCallbackY);

const testCallbackX = () => {
    const source =
        "Text.<ref>{{cite web|title=Example|publisher=Site}}</ref>\n{{reflist|20em}}";
    const result = formatCitationWikitext(source, templateData);

    assert.match(
        result.text,
        /<references responsive>\n\n<!-- -+ § 0 Lead -+ -->\n\n<ref name="Site, n\.d\.">/u,
    );
    assert.doesNotMatch(result.text, /\{\{reflist/iu);
    assert.doesNotMatch(result.text, /20em/u);
};
test("replaces reflist and ignores positional column widths", testCallbackX);

const testCallbackW = () => {
    const source = [
        'Text.<ref group="note">{{cite web|author=Site|date=2020|title=Example}}</ref>',
        "{{Reflist|group=note|30em|colwidth=20em}}",
    ].join("\n");
    const result = formatCitationWikitext(source, templateData);

    assert.match(
        result.text,
        /<references group="note" responsive>\n\n<!-- -+ § 0 Lead -+ -->/u,
    );
    assert.doesNotMatch(result.text, /\{\{reflist|30em|colwidth/iu);
};
test(
    "replaces grouped parameterized reflists with references tags",
    testCallbackW,
);

const testCallbackV = () => {
    const source = [
        "Text.<ref group=note>{{cite web|title=X|publisher=Site|date=2020}}</ref>",
        '<references group="note" />',
    ].join("\n");
    const result = formatCitationWikitext(source, templateData);

    assert.match(result.text, /<ref name="Site, 2020" group="note" \/>/u);
    assert.match(result.text, /<references group="note" responsive>/u);
    assert.doesNotMatch(
        result.text,
        /<references group="note" responsive>\n<ref[^>]+group=/u,
    );
};
test("keeps reference groups paired with their list", testCallbackV);

const testCallbackU = () => {
    const source = [
        "Lead.<ref>{{cite web|author=Lead|date=2020|title=Lead source}}</ref>",
        "== Gameplay ==",
        'Text.<ref name="used" />',
        "== References ==",
        "<references>",
        '<ref name="used">{{cite web|author=Used|date=2021|title=Used source}}</ref>',
        '<ref name="unused">{{cite web|author=Unused|date=2022|title=Unused source}}</ref>',
        "</references>",
    ].join("\n");
    const result = formatCitationWikitext(source, templateData);

    const lead = result.text.indexOf("§ 0 Lead");
    const gameplay = result.text.indexOf("§ 1 Gameplay");
    const unused = result.text.indexOf("§ A Unused references");
    assert.ok(lead < gameplay);
    assert.ok(gameplay < unused);
    assert.match(
        result.text,
        /§ 1 Gameplay -+ -->\n\n<ref name="Used, 2021">/u,
    );
    assert.match(
        result.text,
        /§ A Unused references -+ -->\n\n<ref name="Unused, 2022">/u,
    );
    assertReferenceMarker(result.text, "§ 1 Gameplay");
};
test(
    "groups definitions by lead, article section, and unused status",
    testCallbackU,
);

const testCallbackT = () => {
    const source = [
        "Lead without a reference.",
        "== 內容 ==",
        'Text.<ref name="content" />',
        "== 製作 ==",
        'Text.<ref name="production" />',
        "== 評測 ==",
        'Text.<ref name="reviews" />',
        "== 參考文獻 ==",
        "<references>",
        '<ref name="content">{{cite web|author=Content|date=2020|title=Content source}}</ref>',
        '<ref name="production">{{cite web|author=Production|date=2021|title=Production source}}</ref>',
        '<ref name="reviews">{{cite web|author=Reviews|date=2022|title=Reviews source}}</ref>',
        "</references>",
    ].join("\n");
    const result = formatCitationWikitext(source, templateData);

    assert.match(
        result.text,
        /<references responsive>\n\n<!-- -+ § 1 內容 -+ -->\n\n<ref name="Content, 2020">/u,
    );
    assert.match(
        result.text,
        /§ 2 製作 -+ -->\n\n<ref name="Production, 2021">/u,
    );
    assert.match(
        result.text,
        /§ 3 評測 -+ -->\n\n<ref name="Reviews, 2022">/u,
    );
    assertReferenceMarker(result.text, "§ 1 內容");
    assertReferenceMarker(result.text, "§ 2 製作");
    assertReferenceMarker(result.text, "§ 3 評測");
    assert.doesNotMatch(result.text, /§ 0 Lead/u);
};
test("emits section comments when the lead has no reference", testCallbackT);

const testCallbackS = () => {
    const source = [
        "== Gameplay ==",
        "=== Combat ===",
        "Text.<ref>{{cite web|author=Ma|date=2020|title=Combat}}</ref>",
        "<references />",
    ].join("\n");
    const result = formatCitationWikitext(source, templateData);
    assert.match(result.text, /§ 1\.1 Combat -+ -->/u);
};
test("uses hierarchical section markers", testCallbackS);

const testCallbackR = () => {
    const source = [
        "A.<ref>{{cite web|author=First|date=2020|title=First}}</ref>",
        "B.<ref>{{cite web|author=Second|date=2021|title=Second}}</ref>",
        "<references />",
    ].join("\n");
    const result = formatCitationWikitext(source, templateData);

    assert.match(result.text, /<\/ref>\n<ref name="Second, 2021">/u);
};
test("places adjacent definitions on consecutive lines", testCallbackR);

const testCallbackQ = () => {
    const source = [
        "Text.<ref>",
        "{{cite web|last=Taylor|first=John Michael|last2=Neimeyer|date=2015|title=First}}",
        "{{cite book|last=Taylor|first=Tom|date=2014|title=Second|page=4}}",
        "</ref>",
        "<references />",
    ].join("\n");
    const result = formatCitationWikitext(source, templateData);

    assert.match(
        result.text,
        /name="J\. M\. Taylor & Neimeyer, 2015; T\. Taylor, 2014, p\. 4"/u,
    );
    assert.match(
        result.text,
        /\{\{Unbulleted list citebundle\n  \| 1 = \{\{Cite web\n/u,
    );
    assert.match(result.text, /\n  \| 2 = \{\{Cite book\n/u);
    assert.match(result.text, /\n      \| last = Taylor/u);

    const inline = formatCitationWikitext(source, templateData, "inline").text;
    assert.match(
        inline,
        /\{\{Unbulleted list citebundle\n  \| 1 = \{\{Cite web \|/u,
    );
    assert.match(inline, /\n  \| 2 = \{\{Cite book \|/u);
    assert.doesNotMatch(inline, /\{\{Cite (?:web|book)\n/u);
};
test(
    "bundles multiple whole-ref citations with multiline inner templates",
    testCallbackQ,
);

const testCallbackP = () => {
    const openTemplate = "{" + "{";
    const source = [
        "Text ",
        openTemplate,
        "r|old}}.\n<references>",
        openTemplate,
        "r|name=old|ref=",
        openTemplate,
        "cite web|last=Ma|date=2006|title=X}}}}</references>",
    ].join("");
    const result = formatCitationWikitext(source, templateData);

    assert.match(result.text, /Text <ref name="Ma, 2006" \/>\./u);
    assert.doesNotMatch(result.text, /\{\{r\|/u);
    assert.equal(result.individualReferencesFound, 1);
    assert.equal(result.referenceCallsFound, 1);
    assert.equal(result.rTemplatesFound, 1);
};
test("converts r invocations and definitions", testCallbackP);

const testCallbackO = () => {
    const source = [
        'A.<ref name="source">{{cite web|author=Ma|date=2020|title=X}}</ref>',
        'B.<ref name="source" />',
        "C.{{r|source}}",
        "<references />",
    ].join("\n");
    const result = formatCitationWikitext(source, templateData);

    assert.equal(result.individualReferencesFound, 1);
    assert.equal(result.referenceCallsFound, 3);
    assert.equal(result.rTemplatesFound, 1);
};
test(
    "counts individual references separately from repeated call tags",
    testCallbackO,
);

const testCallbackN = () => {
    const source = [
        "Text.<ref>{{cite interview|author1=Horii &amp; Hayasaka|author2=Editor|date=2025|title=Interview}}</ref>",
        "<references />",
    ].join("\n");
    const result = formatCitationWikitext(source, generatedTemplateData);

    assert.match(result.text, /\| author1 = Horii &amp; Hayasaka/u);
    assert.match(result.text, /\| author2 = Editor/u);
    assert.match(result.text, /<ref name="Horii & Hayasaka & Editor, 2025"/u);
    assert.doesNotMatch(result.text, /name="[^"]*&amp;/u);
};
test(
    "normalizes incomplete author aliases and keeps ref ampersands literal",
    testCallbackN,
);

const testCallbackM = () => {
    const source = [
        "Text.<ref>{{cite interview",
        "|author1=堀井雄二<!-- # Horii, Yūji -->",
        "|interviewer=大出綾太<!-- # Ōde, Ryōta -->",
        "|title=ドラゴンクエストI&II 公式ガイドブック【HD-2D版】",
        "|author2=早坂将昭<!-- # Hayasaka, Masaaki -->",
        "|publisher=スクウェア・エニックス",
        "|date=2025-11-27",
        "|pages=488—492",
        "|language=ja",
        "|isbn=978-4-301-00084-6",
        "|chapter=堀井雄二×早坂將昭 スペシャル対談}}</ref>",
        "<references />",
    ].join("\n");
    const result = formatCitationWikitext(source, generatedTemplateData);

    const author1 = result.text.indexOf("| author1 =");
    const interviewer = result.text.indexOf("| interviewer =");
    const title = result.text.indexOf("| title =");
    const author2 = result.text.indexOf("| author2 =");
    assert.ok(author1 < author2);
    assert.ok(author2 < interviewer);
    assert.ok(interviewer < title);
    const authorMatches = result.text.match(/\| author\d =/gu);
    const firstAuthors = authorMatches?.slice(0, 2);
    assert.deepEqual(firstAuthors, ["| author1 =", "| author2 ="]);
    assert.match(result.text, /<ref name="Horii & Hayasaka, 2025"/u);
};
test(
    "keeps Cite interview subjects together before its other fields",
    testCallbackM,
);

const testCallbackL = () => {
    const source = [
        "Text.<ref>{{cite interview",
        "|last=Hayasaka|first=Masaaki",
        '|title="A happy accident" — Dragon Quest I & II HD-2D Remake',
        "|url=https://example.test/interview",
        "|access-date=2026-04-07",
        "|work=RPG Site",
        "|date=2025-11-06",
        "|language=en",
        "|editor-last=Madnani|editor-first=Mikhail}}</ref>",
        "<references />",
    ].join("\n");
    const result = formatCitationWikitext(source, generatedTemplateData);

    const editorLast = result.text.indexOf("| editor-last =");
    const editorFirst = result.text.indexOf("| editor-first =");
    const title = result.text.indexOf("| title =");
    assert.ok(editorLast < editorFirst);
    assert.ok(title < editorLast);
    assert.match(result.text, /<ref name="Hayasaka, 2025"/u);
};
test(
    "places Cite interview fallback editors after defined fields",
    testCallbackL,
);

const testCallbackK = () => {
    const source = [
        "A<ref>{{cite web|last=Ma|date=2006|title=First|page=1}}</ref>",
        "B<ref>{{cite web|last=Ma|date=2006|title=Second|page=2}}</ref>",
        "<references />",
    ].join("\n");
    const result = formatCitationWikitext(source, templateData);

    assert.match(result.text, /name="Ma, 2006a"/u);
    assert.match(result.text, /name="Ma, 2006b"/u);
    assert.doesNotMatch(result.text, /name="Ma, 2006[ab], p\./u);
};
test("adds year suffixes for distinct works in source order", testCallbackK);

const testCallbackJ = () => {
    const source = [
        "A<ref>{{cite web|last=Ma|title=First}}</ref>",
        "B<ref>{{cite web|last=Ma|title=Second}}</ref>",
        "<references />",
    ].join("\n");
    const result = formatCitationWikitext(source, templateData);

    assert.match(result.text, /name="Ma, n\.d\.-a"/u);
    assert.match(result.text, /name="Ma, n\.d\.-b"/u);
};
test("hyphenates no-date suffixes for distinct works", testCallbackJ);

const testCallbackI = () => {
    const source = [
        "A<ref>{{cite book|last=Ma|date=2006|title=Book|page=59}}</ref>",
        "B<ref>{{cite book|last=Ma|date=2006|title=Book|page=60}}</ref>",
        "C<ref>{{cite web|last=Li|date=2020|title=Video|time=12:30}}</ref>",
        "<references />",
    ].join("\n");
    const result = formatCitationWikitext(source, templateData);

    assert.match(result.text, /name="Ma, 2006, p\. 59"/u);
    assert.match(result.text, /name="Ma, 2006, p\. 60"/u);
    assert.match(result.text, /name="Li, 2020"/u);
    assert.doesNotMatch(result.text, /name="Li, 2020, at time/u);
    assert.doesNotMatch(result.text, /2006a/u);
};
test(
    "uses locators only for multiple parts of the same source",
    testCallbackI,
);

const testCallbackH = () => {
    const source = [
        "A<ref>{{cite web|last=Ma|date=2006|title=Book|url=https://example.test/book#one|pages=1-2}}</ref>",
        "B<ref>{{cite web|last=Ma|date=2006|title=Book|url=https://example.test/book#two|chapter=Second}}</ref>",
        "C<ref>{{cite web|last=Li|date=2020|title=Video|url=https://www.youtube.com/watch?v=abc&t=1m|time=1:00}}</ref>",
        "D<ref>{{cite web|last=Li|date=2020|title=Video|url=https://www.youtube.com/watch?start=120&v=abc|time=2:00}}</ref>",
        "<references />",
    ].join("\n");
    const result = formatCitationWikitext(source, templateData);

    assert.match(result.text, /name="Ma, 2006, pp\. 1-2"/u);
    assert.match(result.text, /name="Ma, 2006, chapter Second"/u);
    assert.match(result.text, /name="Li, 2020, at time 1:00"/u);
    assert.match(result.text, /name="Li, 2020, at time 2:00"/u);
    assert.doesNotMatch(result.text, /Ma, 2006[ab]/u);
    assert.doesNotMatch(result.text, /Li, 2020[ab]/u);
};
test("matches source identity across parts and position URLs", testCallbackH);

const testManualSourceIdentity = () => {
    const source = buildPaginatedInterviewSource();
    const result = formatCitationWikitext(source, generatedTemplateData);
    const rerun = formatCitationWikitext(result.text, generatedTemplateData);

    assert.match(result.text, /name="Shinji & Hiroya, 2006, p\. 1"/u);
    assert.match(result.text, /name="Shinji & Hiroya, 2006, p\. 2"/u);
    assert.doesNotMatch(result.text, /Shinji & Hiroya, 2006[ab]/u);
    assert.match(result.text, /751888p1\.html/u);
    assert.match(result.text, /751888p2\.html/u);
    assert.equal(
        result.text.split("https://xbox360.ign.com/articles/751/751888.html")
            .length - 1,
        2,
    );
    assert.equal(rerun.text, result.text);
};
test(
    "groups manually keyed page URLs as parts of one source",
    testManualSourceIdentity,
);

test("uses an unmarked base URL for keyed continuation pages", () => {
    const base =
        "https://nlab.itmedia.co.jp/games/articles/0706/18/news007.html";
    const continuation =
        "https://nlab.itmedia.co.jp/games/articles/0706/18/news007_2.html";
    const source = [
        "A<ref>{{cite web|author=nlab|date=2007|title=Feature|" +
            `url=${base}|at=Part 1}}</ref>`,
        "B<ref>{{cite web|author=nlab|date=2007|title=Feature continued|" +
            `url=${continuation}<!-- # ${base} -->|at=Part 2}}</ref>`,
        "<references />",
    ].join("\n");
    const result = formatCitationWikitext(source, generatedTemplateData);

    assert.match(result.text, /name="nlab, 2007, Part 1"/u);
    assert.match(result.text, /name="nlab, 2007, Part 2"/u);
    assert.doesNotMatch(result.text, /nlab, 2007[ab]/u);
    assert.match(result.text, /news007\.html/u);
    assert.match(result.text, /news007_2\.html/u);
});

function buildPaginatedInterviewSource(): string {
    const key = "https://xbox360.ign.com/articles/751/751888.html";
    const first = [
        "{{cite interview|last1=Shinji|first1=Noguchi",
        "|author2=Hiroya|fisrt2=Hatsushiba",
        "|title=Eternal Sonata Interview",
        "|url=https://xbox360.ign.com/articles/751/751888p1.html",
        `<!-- # ${key} -->|work=[[IGN]]|date=2006-12-20|page=1}}`,
    ].join("");
    const second = [
        "{{cite interview|last1=Shinji|first1=Noguchi",
        "|last2=Hiroya|first2=Hatsushiba",
        "|title=Eternal Sonata Interview",
        "|url=http://xbox360.ign.com/articles/751/751888p2.html",
        `<!-- # ${key} -->|work=IGN|date=2006-12-20|page=2}}`,
    ].join("");
    return [
        `A<ref>${first}</ref>`,
        `B<ref>${second}</ref>`,
        "<references />",
    ].join("\n");
}

const testCallbackG = () => {
    const source = [
        "A<ref>{{cite web|last=Ma|date=2006|title=Report|url=https://one.test/report}}</ref>",
        "B<ref>{{cite web|last=Ma|date=2006|title=Report|url=https://two.test/report}}</ref>",
        "<references />",
    ].join("\n");
    const result = formatCitationWikitext(source, templateData);

    assert.match(result.text, /name="Ma, 2006a"/u);
    assert.match(result.text, /name="Ma, 2006b"/u);
};
test("keeps different sources with similar titles separate", testCallbackG);

const testCallbackF = () => {
    const source = [
        "Text.<ref>{{cite tweet|user=Pigsonthewing|number=564068436633214977|author=Andy Mabbett|date=February 7, 2015|title=Example tweet}}</ref>",
        "<references />",
    ].join("\n");
    const result = formatCitationWikitext(source, generatedTemplateData);

    assert.match(result.text, /<ref name="Andy Mabbett, 2015" \/>/u);
    const number = result.text.indexOf("| number =");
    const user = result.text.indexOf("| user =");
    const title = result.text.indexOf("| title =");
    const author = result.text.indexOf("| author =");
    assert.ok(number < user);
    assert.ok(user < title);
    assert.ok(title < author);
    assert.match(result.text, /\| date = 2015-02-07/u);
    assert.match(result.text, /<\/ref>\n\n<\/references>/u);
};
test(
    "formats cite tweet and leaves a blank line before references closes",
    testCallbackF,
);

const testCallbackE = () => {
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
    assert.equal(result.referencesNotFormatted, 2);
    assert.equal(result.citationsFormatted, 0);
};
test(
    "uses numeric-colon fallbacks for plain and mixed note content",
    testCallbackE,
);

test(
    "names CITEREF-linked short citations from their source identity",
    testLinkedShortCitation,
);

function testLinkedShortCitation(): void {
    const source = [
        "Short.<ref>[[#CITEREF_Ma_2006|Ma 2006]], p. 42</ref>",
        "{{cite web|last=Ma|date=2006|title=Book|ref=CITEREF Ma 2006}}",
        "<references />",
    ].join("\n");
    const result = formatCitationWikitext(source, templateData);

    assert.match(result.text, /<ref name="Ma, 2006, p\. 42" \/>/u);
    assert.match(
        result.text,
        /<ref name="Ma, 2006, p\. 42">\[\[#CITEREF_Ma_2006\|Ma 2006\]\], p\. 42<\/ref>/u,
    );
    assert.equal(result.citationsFormatted, 1);
    assert.equal(result.referencesNotFormatted, 0);
}

test(
    "cleans punctuation from CITEREF-linked citation locators",
    testColonLinkedShortCitation,
);

function testColonLinkedShortCitation(): void {
    const source = [
        "Short.<ref>[[#CITEREF_Ma_2006|Ma 2006]]: p. 42</ref>",
        "{{cite web|last=Ma|date=2006|title=Book|ref=CITEREF Ma 2006}}",
        "<references />",
    ].join("\n");
    const result = formatCitationWikitext(source, templateData);

    assert.match(result.text, /<ref name="Ma, 2006, p\. 42" \/>/u);
    assert.doesNotMatch(result.text, /name="Ma, 2006, :/u);
}

test(
    "names plain linked references from custom citation ref values",
    testCustomLinkedCitation,
);

function testCustomLinkedCitation(): void {
    const source = [
        "Short.<ref>[[#custom_ref|source]]: pp. 10–12</ref>",
        "{{cite web|last=Li|date=2020|title=Article|ref=Custom ref}}",
        "<references />",
    ].join("\n");
    const result = formatCitationWikitext(source, templateData);

    assert.match(result.text, /<ref name="Li, 2020, pp\. 10–12" \/>/u);
    assert.equal(result.citationsFormatted, 0);
    assert.equal(result.referencesNotFormatted, 1);
}

test(
    "ignores linked-citation sources in protected wikitext",
    testProtectedLinkedCitationSources,
);

function testProtectedLinkedCitationSources(): void {
    const source = [
        "<nowiki>{{cite web|last=Wrong|date=1999|title=Wrong|ref=Custom ref}}</nowiki>",
        "{{cite web|last=Li|date=2020|title=Article|ref=Custom ref}}",
        "{{cite web|last=Ma|date=2006|title=Book|ref=CITEREF Ma 2006}}",
        "<nowiki>{{cite web|last=Wrong|date=1999|title=Wrong|ref=CITEREF Ma 2006}}</nowiki>",
        "Custom.<ref>[[#custom_ref|source]], p. 10</ref>",
        "Short.<ref>[[#CITEREF_Ma_2006|Ma 2006]], p. 42</ref>",
        "<references />",
    ].join("\n");
    const result = formatCitationWikitext(source, templateData);

    assert.match(result.text, /<ref name="Li, 2020, p\. 10" \/>/u);
    assert.match(result.text, /<ref name="Ma, 2006, p\. 42" \/>/u);
    assert.doesNotMatch(result.text, /<ref name="Wrong, 1999/u);
}

test(
    "preserves existing names while numbering anonymous plain references",
    testPlainReferenceNames,
);

function testPlainReferenceNames(): void {
    const source = [
        'Named.<ref name=":1">Plain note</ref>',
        "Anonymous.<ref>Another note</ref>",
        "<references />",
    ].join("\n");
    const result = formatCitationWikitext(source, templateData);

    assert.match(result.text, /Named\.<ref name=":1" \/>/u);
    assert.match(result.text, /Anonymous\.<ref name=":2" \/>/u);
    assert.match(result.text, /<ref name=":1">Plain note<\/ref>/u);
    assert.match(result.text, /<ref name=":2">Another note<\/ref>/u);
}

const testCallbackD = () => {
    const source = [
        "A<ref>{{cite web|last=Haywald|first=Justin|date=October 30, 2016|title=Example}}{{cbignore}}</ref>",
        "B<ref>{{cite web|last=Reynolds|date=2024|title=Example}} {{Dead link|date=July 2026}}</ref>",
        "<references />",
    ].join("\n");
    const result = formatCitationWikitext(source, templateData);

    assert.match(result.text, /<ref name="Haywald, 2016" \/>/u);
    assert.match(result.text, /<ref name="Reynolds, 2024" \/>/u);
    assert.match(result.text, /\}\}\{\{cbignore\}\}<\/ref>/u);
    assert.match(
        result.text,
        /\}\} \{\{Dead link\|date=July 2026\}\}<\/ref>/u,
    );
    assert.equal(result.citationsFormatted, 2);
    assert.equal(result.referencesNotFormatted, 0);
};
test("preserves citation maintenance templates with APA names", testCallbackD);

const testCallbackC = () => {
    const source = [
        '<ref name=":3" />',
        '<ref name="Ma, 2020b" />',
        '<ref name=":1" />',
        '<ref name="Ma, 2020a" />',
        '<ref name=":2" />',
        "<references>",
        '<ref name=":3">Third plain note</ref>',
        '<ref name="Ma, 2020b">{{cite web|last=Ma|date=2020|title=Second}}</ref>',
        '<ref name=":1">First plain note</ref>',
        '<ref name="Ma, 2020a">{{cite web|last=Ma|date=2020|title=First}}</ref>',
        '<ref name=":2">Second plain note</ref>',
        "</references>",
    ].join("\n");
    const first = formatCitationWikitext(source, templateData).text;
    const second = formatCitationWikitext(first, templateData).text;

    for (const text of [first, second]) {
        const matches = text.matchAll(/<ref name="([^"]+)">/gu);
        const names = Array.from(matches, (match) => match[1]);
        assert.deepEqual(names, [":3", "Ma, 2020a", ":1", "Ma, 2020b", ":2"]);
    }
};
test(
    "preserves plain names and assigns year suffixes by first use on every run",
    testCallbackC,
);

const testCallbackB = () => {
    const source = [
        'Text.<ref name="used" />',
        "{{Reflist|25em|refs=",
        '<ref name="used">{{cite web|author=Used|date=2020|title=Source}}</ref>',
        '<!--<ref name="disabled">{{cite web|title=Disabled}}</ref> -->',
        "}}",
    ].join("\n");
    const result = formatCitationWikitext(source, templateData);

    assert.match(
        result.text,
        /<\/references>\n<!--<ref name="disabled">\{\{cite web\|title=Disabled\}\}<\/ref> -->/u,
    );
    assert.doesNotMatch(
        result.text,
        /<!--<ref name="disabled">[\s\S]*?<\/references>/u,
    );
};
test("moves standalone list comments after references", testCallbackB);

const testCallbackA = () => {
    const source = [
        "<!-- <ref>{{cite web|title=Comment}}</ref> -->",
        "<nowiki><ref>{{cite web|title=Code}}</ref></nowiki>",
    ].join("\n");
    const result = formatCitationWikitext(source, templateData);
    assert.equal(result.text, source);
};
test("does not parse refs in comments or nowiki blocks", testCallbackA);

const testCallback = () => {
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
    assert.match(result.text, /<references responsive>\n\n<!-- -+ § 0 Lead/u);
    assert.doesNotMatch(result.text, /\{\{reflist/iu);
    assert.doesNotMatch(result.text, /25em/u);
    assert.match(result.text, /<!--<ref name="commented">/u);
};
test("formats EarthBound Beginnings article reference patterns", testCallback);

test(
    "formats Dragon Quest I and II draft citation patterns",
    testDragonQuestPatterns,
);

function testDragonQuestPatterns(): void {
    const source = buildDragonQuestSource();
    const result = formatCitationWikitext(source, generatedTemplateData);
    assertDragonQuestResult(result.text);
}

function buildDragonQuestSource(): string {
    const parts = [
        'Text.<ref name="Horii & Hayasaka, 2025a" />',
        'Text.<ref name="Horii & Hayasaka, 2025b" />',
        'Text.<ref name="Horii & Hayasaka, 2025c" />',
        'Text.<ref name="Khan, 2025" />',
        "<references>",
        '<ref name="Horii & Hayasaka, 2025a">{{Cite interview',
        "|title=発売記念特集 ドラゴンクエストI&II",
        "|author2=早坂将昭<!-- # Hayasaka, Masaaki -->",
        "|work=週刊ファミ通|date=2025-10-30|pages=16—21",
        "|author1=堀井雄二<!-- # Horii, Yūji -->}}</ref>",
        '<ref name="Horii & Hayasaka, 2025b">{{Cite interview',
        "|title=『ドラクエ1＆2』堀井雄二氏×早坂P対談をお届け。",
        "|author2=早坂将昭<!-- # Hayasaka, Masaaki -->",
        "|url=https://www.famitsu.com/article/202511/56367",
        "|work=ファミ通.com|date=2025-11-01",
        "|author1=堀井雄二<!-- # Horii, Yūji -->}}</ref>",
        '<ref name="Horii & Hayasaka, 2025c">{{Cite interview',
        "|title=ドラゴンクエストI&II 公式ガイドブック【HD-2D版】",
        "|author2=早坂将昭<!-- # Hayasaka, Masaaki -->",
        "|publisher=スクウェア・エニックス|date=2025-11-27",
        "|pages=488—492|author1=堀井雄二<!-- # Horii, Yūji -->",
        "|isbn=978-4-301-00084-6|chapter=スペシャル対談}}</ref>",
        '<ref name="Khan, 2025">{{Cite web|last=Khan|first=Zubi',
        "|date=2025-10-29|title=Dragon Quest review",
        "|url=https://example.test/review|dead-url=no}}</ref>",
        "</references>",
    ];
    return parts.join("\n");
}

function assertDragonQuestResult(text: string): void {
    assert.match(text, /<ref name="Horii & Hayasaka, 2025a" \/>/u);
    assert.match(text, /<ref name="Horii & Hayasaka, 2025b" \/>/u);
    assert.match(text, /<ref name="Horii & Hayasaka, 2025c" \/>/u);
    assert.match(text, /\| url-status = live/u);
    assert.doesNotMatch(text, /\| dead-url =/u);
    assert.match(text, /<\/ref>\n\n<\/references>/u);
}

const VIDEO_TIMES = [
    "0:00–5:00",
    "5:00–10:00",
    "10:00–15:00",
    "15:00–20:00",
    "20:00–25:00",
];
const PLATFORMS = ["pc", "nintendo-switch", "playstation-5", "xbox-series-x"];

test(
    "formats Sea of Stars timestamp, platform, and tweet citations",
    testSeaOfStarsPatterns,
);

function testSeaOfStarsPatterns(): void {
    const source = buildSeaOfStarsSource();
    const result = formatCitationWikitext(source, generatedTemplateData);
    assertSeaOfStarsResult(result.text);
}

function buildSeaOfStarsSource(): string {
    const parts = [
        ...VIDEO_TIMES.map(buildVideoCall),
        ...PLATFORMS.map(buildPlatformCall),
        '<ref name="Sea of Stars, 2023" />',
        "<references>",
        ...[0, 5, 10, 15, 20].map(buildVideoDefinition),
        ...PLATFORMS.map(buildPlatformDefinition),
        '<ref name="Sea of Stars, 2023">{{Cite tweet',
        "|author=Sea of Stars|user=seaofstarsgame",
        "|number=1699175546930766092|date=2023-09-05",
        "|title=Thank you}}</ref>",
        "</references>",
    ];
    return parts.join("\n");
}

function buildVideoCall(time: string): string {
    return `<ref name="Boulanger, n.d., ${time}" />`;
}

function buildPlatformCall(_platform: string, index: number): string {
    const suffix = alphabeticTestSuffix(index);
    return `<ref name="Metacritic, n.d.-${suffix}" />`;
}

function buildVideoDefinition(minute: number): string {
    const start = `${minute}:00`;
    const end = `${minute + 5}:00`;
    const position = minute === 0 ? "" : `&t=0h${minute}m00s`;
    return [
        `<ref name="Boulanger, n.d., ${start}–${end}">{{Cite AV media`,
        `|url=https://www.youtube.com/watch?v=NvsDBAcKFDw${position}`,
        "|title=The Making of Sea of Stars &verbar; Escapist Documentary",
        "|last=Boulanger|first=Thierry|publisher=[[The Escapist]]",
        `|time=${start}–${end}|via=YouTube}}</ref>`,
    ].join("\n");
}

function buildPlatformDefinition(platform: string, index: number): string {
    const suffix = alphabeticTestSuffix(index);
    return [
        `<ref name="Metacritic, n.d.-${suffix}">{{Cite web`,
        `|title=Sea of Stars for ${platform} Reviews`,
        "|url=https://www.metacritic.com/game/sea-of-stars/" +
            `critic-reviews/?platform=${platform}`,
        "|website=[[Metacritic]]}}</ref>",
    ].join("\n");
}

function assertSeaOfStarsResult(text: string): void {
    for (const time of VIDEO_TIMES) {
        const timePattern = new RegExp(
            `name="Boulanger, n\\.d\\., at time ${time}"`,
            "u",
        );
        assert.match(text, timePattern);
    }
    assert.doesNotMatch(text, /Boulanger, n\.d\.-[a-e]/u);
    assert.match(text, /\| time = 0′00″–5′00″/u);
    for (const suffix of ["a", "b", "c", "d"]) {
        const suffixPattern = new RegExp(
            `name="Metacritic, n\\.d\\.-${suffix}"`,
            "u",
        );
        assert.match(text, suffixPattern);
    }
    assert.match(text, /\{\{Cite tweet\n/u);
    assert.match(text, /name="Sea of Stars, 2023"/u);
    assert.match(text, /<\/ref>\n\n<\/references>/u);
}

function alphabeticTestSuffix(index: number): string {
    const firstCode = "a".charCodeAt(0);
    return String.fromCharCode(firstCode + index);
}
