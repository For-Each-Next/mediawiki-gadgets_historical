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

function assertReferenceBanner(text: string, label: string): void {
    const lines = text.split("\n");
    const index = lines.findIndex((line) => line.includes(` ${label} `));
    assert.ok(index >= 1);
    assert.equal(lines[index - 1], "");
    assert.match(lines[index], new RegExp(`^<!-- -+ ${label} -+ -->$`, "u"));
    assert.equal(lines[index + 1], "");
    assert.equal(lines[index].length, 79);
}

test("moves and formats citations into an existing references tag", () => {
    const source =
        "Text.<ref>{{cite web|url=https://example.test|title=Example|last=Ma|date=June 1, 2006}}</ref>\n\n<references />";
    const result = formatCitationWikitext(source, templateData);

    assert.match(result.text, /<ref name="Ma, 2006" \/>/u);
    assert.match(
        result.text,
        /<references>\n\n<!-- -+ Section 0 -+ -->\n\n<ref name="Ma, 2006">\{\{Cite web/u,
    );
    assertReferenceBanner(result.text, "Section 0");
    assert.match(result.text, /\| date = 2006-06-01/u);
    assert.equal(result.citationsFormatted, 1);
    assert.equal(result.referencesMoved, 1);
});

test("formats the general Citation template", () => {
    const source = [
        "Text.<ref>{{Citation|last=Ma|first=Anne|date=2020|title=Book|publisher=Publisher}}</ref>",
        "<references />",
    ].join("\n");
    const result = formatCitationWikitext(source, generatedTemplateData);

    assert.match(result.text, /<ref name="Ma, 2020" \/>/u);
    assert.match(result.text, /\{\{Citation\n  \| last = Ma\n  \| first = Anne/u);
    assert.equal(result.citationsFormatted, 1);
    assert.equal(result.referencesNotFormatted, 0);
});

test("replaces reflist and ignores positional column widths", () => {
    const source =
        "Text.<ref>{{cite web|title=Example|publisher=Site}}</ref>\n{{reflist|20em}}";
    const result = formatCitationWikitext(source, templateData);

    assert.match(
        result.text,
        /<references>\n\n<!-- -+ Section 0 -+ -->\n\n<ref name="Site, n\.d\.">/u,
    );
    assert.doesNotMatch(result.text, /\{\{reflist/iu);
    assert.doesNotMatch(result.text, /20em/u);
});

test("replaces grouped parameterized reflists with references tags", () => {
    const source = [
        'Text.<ref group="note">{{cite web|author=Site|date=2020|title=Example}}</ref>',
        "{{Reflist|group=note|30em|colwidth=20em}}",
    ].join("\n");
    const result = formatCitationWikitext(source, templateData);

    assert.match(
        result.text,
        /<references group="note">\n\n<!-- -+ Section 0 -+ -->/u,
    );
    assert.doesNotMatch(result.text, /\{\{reflist|30em|colwidth/iu);
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

test("groups definitions by lead, article section, and unused status", () => {
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

    const lead = result.text.indexOf(" Section 0 ");
    const gameplay = result.text.indexOf(" Section 1: Gameplay ");
    const unused = result.text.indexOf(" Unused refs ");
    assert.ok(lead < gameplay);
    assert.ok(gameplay < unused);
    assert.match(
        result.text,
        /Section 1: Gameplay -+ -->\n\n<ref name="Used, 2021">/u,
    );
    assert.match(
        result.text,
        /Unused refs -+ -->\n\n<ref name="Unused, 2022">/u,
    );
    assertReferenceBanner(result.text, "Section 1: Gameplay");
});

test("emits section comments when the lead has no reference", () => {
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
        /<references>\n\n<!-- -+ Section 1: 內容 -+ -->\n\n<ref name="Content, 2020">/u,
    );
    assert.match(
        result.text,
        /Section 2: 製作 -+ -->\n\n<ref name="Production, 2021">/u,
    );
    assert.match(
        result.text,
        /Section 3: 評測 -+ -->\n\n<ref name="Reviews, 2022">/u,
    );
    assertReferenceBanner(result.text, "Section 1: 內容");
    assertReferenceBanner(result.text, "Section 2: 製作");
    assertReferenceBanner(result.text, "Section 3: 評測");
    assert.doesNotMatch(result.text, / Section 0 /u);
});

test("separates adjacent definitions with an empty line", () => {
    const source = [
        "A.<ref>{{cite web|author=First|date=2020|title=First}}</ref>",
        "B.<ref>{{cite web|author=Second|date=2021|title=Second}}</ref>",
        "<references />",
    ].join("\n");
    const result = formatCitationWikitext(source, templateData);

    assert.match(
        result.text,
        /<\/ref>\n\n<ref name="Second, 2021">/u,
    );
});

test("bundles multiple whole-ref citations with multiline inner templates", () => {
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
});

test("converts r invocations and definitions", () => {
    const source =
        "Text {{r|old}}.\n<references>{{r|name=old|ref={{cite web|last=Ma|date=2006|title=X}}}}</references>";
    const result = formatCitationWikitext(source, templateData);

    assert.match(result.text, /Text <ref name="Ma, 2006" \/>\./u);
    assert.doesNotMatch(result.text, /\{\{r\|/u);
    assert.equal(result.individualReferencesFound, 1);
    assert.equal(result.referenceCallsFound, 1);
    assert.equal(result.rTemplatesFound, 1);
});

test("counts individual references separately from repeated call tags", () => {
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
});

test("normalizes incomplete author aliases and keeps ref ampersands literal", () => {
    const source = [
        "Text.<ref>{{cite interview|author1=Horii &amp; Hayasaka|author2=Editor|date=2025|title=Interview}}</ref>",
        "<references />",
    ].join("\n");
    const result = formatCitationWikitext(source, generatedTemplateData);

    assert.match(result.text, /\| author1 = Horii &amp; Hayasaka/u);
    assert.match(result.text, /\| author2 = Editor/u);
    assert.match(result.text, /<ref name="Horii & Hayasaka & Editor, 2025"/u);
    assert.doesNotMatch(result.text, /name="[^"]*&amp;/u);
});

test("keeps all interview authors before the title", () => {
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
    const author2 = result.text.indexOf("| author2 =");
    assert.ok(author1 < author2);
    assert.deepEqual(result.text.match(/\| author\d =/gu)?.slice(0, 2), [
        "| author1 =",
        "| author2 =",
    ]);
    assert.match(
        result.text,
        /<ref name="Horii & Hayasaka, 2025, pp\. 488—492"/u,
    );
});

test("places cite interview editors before the title", () => {
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
    assert.ok(editorFirst < title);
    assert.match(result.text, /<ref name="Hayasaka, 2025"/u);
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

test("hyphenates no-date suffixes for distinct works", () => {
    const source = [
        "A<ref>{{cite web|last=Ma|title=First}}</ref>",
        "B<ref>{{cite web|last=Ma|title=Second}}</ref>",
        "<references />",
    ].join("\n");
    const result = formatCitationWikitext(source, templateData);

    assert.match(result.text, /name="Ma, n\.d\.-a"/u);
    assert.match(result.text, /name="Ma, n\.d\.-b"/u);
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
    assert.match(result.text, /name="Li, 2020, at time 12:30"/u);
    assert.doesNotMatch(result.text, /2006a/u);
});

test("matches source identity across parts and position URLs", () => {
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
});

test("keeps different sources with similar titles separate", () => {
    const source = [
        "A<ref>{{cite web|last=Ma|date=2006|title=Report|url=https://one.test/report}}</ref>",
        "B<ref>{{cite web|last=Ma|date=2006|title=Report|url=https://two.test/report}}</ref>",
        "<references />",
    ].join("\n");
    const result = formatCitationWikitext(source, templateData);

    assert.match(result.text, /name="Ma, 2006a"/u);
    assert.match(result.text, /name="Ma, 2006b"/u);
});

test("formats cite tweet and leaves a blank line before references closes", () => {
    const source = [
        "Text.<ref>{{cite tweet|user=Pigsonthewing|number=564068436633214977|author=Andy Mabbett|date=February 7, 2015|title=Example tweet}}</ref>",
        "<references />",
    ].join("\n");
    const result = formatCitationWikitext(source, generatedTemplateData);

    assert.match(result.text, /<ref name="Andy Mabbett, 2015" \/>/u);
    assert.match(result.text, /\{\{Cite tweet\n  \| author = Andy Mabbett/u);
    assert.match(result.text, /\| date = 2015-02-07/u);
    assert.match(result.text, /<\/ref>\n\n<\/references>/u);
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
    assert.equal(result.referencesNotFormatted, 2);
    assert.equal(result.citationsFormatted, 0);
});

test("moves standalone list comments after references", () => {
    const source = [
        "Text.<ref name=\"used\" />",
        "{{Reflist|25em|refs=",
        '<ref name="used">{{cite web|author=Used|date=2020|title=Source}}</ref>',
        "<!--<ref name=\"disabled\">{{cite web|title=Disabled}}</ref> -->",
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
    assert.match(result.text, /<references>\n\n<!-- -+ Section 0/u);
    assert.doesNotMatch(result.text, /\{\{reflist/iu);
    assert.doesNotMatch(result.text, /25em/u);
    assert.match(result.text, /<!--<ref name="commented">/u);
});

test("formats Dragon Quest I and II draft citation patterns", () => {
    const source = [
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
    ].join("\n");
    const result = formatCitationWikitext(source, generatedTemplateData);

    assert.match(
        result.text,
        /<ref name="Horii & Hayasaka, 2025a, pp\. 16—21" \/>/u,
    );
    assert.match(
        result.text,
        /<ref name="Horii & Hayasaka, 2025b" \/>/u,
    );
    assert.match(
        result.text,
        /<ref name="Horii & Hayasaka, 2025c, pp\. 488—492" \/>/u,
    );
    assert.match(result.text, /\| url-status = live/u);
    assert.doesNotMatch(result.text, /\| dead-url =/u);
    assert.match(result.text, /<\/ref>\n\n<\/references>/u);
});

test("formats Sea of Stars timestamp, platform, and tweet citations", () => {
    const source = [
        ...["0:00–5:00", "5:00–10:00", "10:00–15:00", "15:00–20:00", "20:00–25:00"].map(
            (time) => `<ref name="Boulanger, n.d., ${time}" />`,
        ),
        ...["a", "b", "c", "d"].map(
            (suffix) => `<ref name="Metacritic, n.d.-${suffix}" />`,
        ),
        '<ref name="Sea of Stars, 2023" />',
        "<references>",
        ...[0, 5, 10, 15, 20].map(function buildVideoDefinition(minute) {
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
        }),
        ...["pc", "nintendo-switch", "playstation-5", "xbox-series-x"].map(
            function buildPlatformDefinition(platform, index) {
                const suffix = alphabeticTestSuffix(index);
                return [
                    `<ref name="Metacritic, n.d.-${suffix}">{{Cite web`,
                    `|title=Sea of Stars for ${platform} Reviews`,
                    `|url=https://www.metacritic.com/game/sea-of-stars/critic-reviews/?platform=${platform}`,
                    "|website=[[Metacritic]]}}</ref>",
                ].join("\n");
            },
        ),
        '<ref name="Sea of Stars, 2023">{{Cite tweet',
        "|author=Sea of Stars|user=seaofstarsgame",
        "|number=1699175546930766092|date=2023-09-05",
        "|title=Thank you}}</ref>",
        "</references>",
    ].join("\n");
    const result = formatCitationWikitext(source, generatedTemplateData);

    for (const time of [
        "0:00–5:00",
        "5:00–10:00",
        "10:00–15:00",
        "15:00–20:00",
        "20:00–25:00",
    ]) {
        assert.match(
            result.text,
            new RegExp(`name="Boulanger, n\\.d\\., at time ${time}"`, "u"),
        );
    }
    assert.doesNotMatch(result.text, /Boulanger, n\.d\.-[a-e]/u);
    assert.match(result.text, /\| time = 0′00″–5′00″/u);
    for (const suffix of ["a", "b", "c", "d"]) {
        assert.match(
            result.text,
            new RegExp(`name="Metacritic, n\\.d\\.-${suffix}"`, "u"),
        );
    }
    assert.match(result.text, /\{\{Cite tweet\n/u);
    assert.match(result.text, /name="Sea of Stars, 2023"/u);
    assert.match(result.text, /<\/ref>\n\n<\/references>/u);
});

function alphabeticTestSuffix(index: number): string {
    return String.fromCharCode("a".charCodeAt(0) + index);
}
