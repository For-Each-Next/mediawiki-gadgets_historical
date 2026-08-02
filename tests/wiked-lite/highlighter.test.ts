import assert from "node:assert/strict";
import test from "node:test";
import {
    highlightWikitext,
    type HighlightSegment,
} from "../../src/wiked-lite/domain/highlighter.ts";

function classesAt(
    source: string,
    segments: HighlightSegment[],
    needle: string,
    occurrence = 0,
): string[] {
    let offset = -1;
    for (let index = 0; index <= occurrence; index += 1) {
        offset = source.indexOf(needle, offset + 1);
    }
    return (
        segments.find(
            (segment) => segment.start <= offset && offset < segment.end,
        )?.classNames ?? []
    );
}

function segmentAt(
    source: string,
    segments: HighlightSegment[],
    needle: string,
): HighlightSegment | undefined {
    const offset = source.indexOf(needle);
    return segments.find(
        (segment) => segment.start <= offset && offset < segment.end,
    );
}

function assertHasClass(
    source: string,
    segments: HighlightSegment[],
    needle: string,
    className: string,
): void {
    assert.ok(classesAt(source, segments, needle).includes(className));
}

test("reference and nested-template classes differ", () => {
    const source = [
        "<ref>{{cite web|url=https://example.test}}</ref>",
        "{{sfn|Weiss|2014}}",
        "{{efn|A note}}",
        "{{outer|{{inner|value}}}}",
    ].join("\n");
    const classes = highlightWikitext(source).flatMap(
        (segment) => segment.classNames,
    );

    assert.ok(classes.includes("wiked-lite-token--reference"));
    assert.ok(classes.includes("wiked-lite-token--footnote"));
    assert.ok(classes.includes("wiked-lite-token--template-1"));
});

test("self-closing references do not color the following article text", () => {
    const source = [
        'Reuse.<ref name="nlife: profile" />',
        "Arch Linux body text remains outside the reference.",
        "<references>",
        '<ref name="nlife: profile">' + "{{Cite news|title=Profile}}</ref>",
        "</references>",
    ].join("\n");
    const segments = highlightWikitext(source);

    assert.ok(
        classesAt(source, segments, '<ref name="nlife: profile" />').includes(
            "wiked-lite-token--reference",
        ),
    );
    assert.doesNotMatch(
        classesAt(source, segments, "Arch Linux body text").join(" "),
        /wiked-lite-token--reference/u,
    );
    assert.doesNotMatch(
        classesAt(source, segments, "Cite news").join(" "),
        /wiked-lite-token--reference/u,
    );
});

test("Arch Linux NoteTA rules use conversion token families", () => {
    const source = [
        "{{NoteTA",
        " | 2 = zh-cn:乔纳森; zh-tw:強納生; zh-hk:莊拿芬",
        "}}",
    ].join("\n");
    const segments = highlightWikitext(source, { linkHelpers: true });

    assertHasClass(
        source,
        segments,
        "zh-cn:乔纳森",
        "wiked-lite-token--language-conversion",
    );
    assertHasClass(
        source,
        segments,
        "zh-cn",
        "wiked-lite-token--language-variant",
    );
});

test("Arch Linux infobox links and HTML keep original token families", () => {
    const source = [
        "{{Infobox OS",
        " | logo = {{Dark mode switch",
        "  | [[File:Arch Linux logo.svg|250px|alt=Arch Linux标志]]",
        " }}",
        "}}",
        "通过<code>PKGBUILD</code>脚本编译软件包。",
    ].join("\n");
    const segments = highlightWikitext(source, {
        databaseName: "zhwiki",
        linkHelpers: true,
    });

    assertHasClass(
        source,
        segments,
        "Dark mode switch",
        "wiked-lite-token--template-1",
    );
    assertHasClass(
        source,
        segments,
        "File:Arch Linux",
        "wiked-lite-token--file",
    );
    assertHasClass(
        source,
        segments,
        "File:Arch Linux",
        "wiked-lite-token--file-link",
    );
    assertHasClass(source, segments, "code", "wiked-lite-token--html-tag");
    assert.deepEqual(classesAt(source, segments, "PKGBUILD"), []);
});

test("Chinese image templates use the original green family", () => {
    const source = "{{multiple image|image1=ArchWiki.svg}}";
    const segments = highlightWikitext(source, {
        databaseName: "zhwiki",
    });

    assertHasClass(
        source,
        segments,
        "multiple image",
        "wiked-lite-token--image-template",
    );
});

test("Chinese interlanguage helpers expose local navigation", () => {
    const segment = highlightWikitext("{{link-ja|東京|Tokyo}}", {
        linkHelpers: true,
    })
        .filter((item) =>
            item.classNames.includes("wiked-lite-token--link-helper"),
        )
        .at(0);

    assert.equal(segment?.href, "/wiki/%E6%9D%B1%E4%BA%AC");
});

test("comments are opaque to template highlighting", () => {
    const segments = highlightWikitext("<!-- {{cite web|url=x}} -->");

    assert.deepEqual(
        [...new Set(segments.flatMap((segment) => segment.classNames))],
        ["wiked-lite-token--comment"],
    );
});

test("template syntax and headings receive wikEd-style tokens", () => {
    const segments = highlightWikitext(
        "== Heading ==\n{{ Cite web | URL = https://example.test }}",
    );
    const classesFor = (text: string) =>
        segments.find((segment) => segment.text === text)?.classNames ?? [];

    assert.deepEqual(classesFor("== Heading =="), [
        "wiked-lite-token--heading-2",
        "wiked-lite-token--heading",
    ]);
    assert.ok(
        classesFor("Cite web").includes("wiked-lite-token--template-name"),
    );
    assert.ok(classesFor("URL").includes("wiked-lite-token--parameter"));
});

test("apostrophe markup renders bold and italic text", () => {
    const source = "'''bold''' ''italic'' '''''both'''''";
    const segments = highlightWikitext(source);

    assertHasClass(source, segments, "bold", "wiked-lite-token--bold");
    assertHasClass(source, segments, "italic", "wiked-lite-token--italic");
    assertHasClass(source, segments, "both", "wiked-lite-token--bold");
    assertHasClass(source, segments, "both", "wiked-lite-token--italic");
    assertHasClass(source, segments, "'''", "wiked-lite-token--wiki-markup");
});

test("opaque apostrophes do not leak emphasis into article text", () => {
    const source = "<!-- ''' -->plain'''\n<nowiki>''</nowiki>still''";
    const segments = highlightWikitext(source);

    assert.doesNotMatch(
        classesAt(source, segments, "plain").join(" "),
        /wiked-lite-token--bold/u,
    );
    assert.doesNotMatch(
        classesAt(source, segments, "still").join(" "),
        /wiked-lite-token--italic/u,
    );
});

test("unmatched emphasis does not pair across lines", () => {
    const source = "'''first\nsecond'''";
    const segments = highlightWikitext(source);

    assert.doesNotMatch(
        classesAt(source, segments, "first").join(" "),
        /wiked-lite-token--bold/u,
    );
    assert.doesNotMatch(
        classesAt(source, segments, "second").join(" "),
        /wiked-lite-token--bold/u,
    );
});

test("apostrophes in HTML attributes do not open article emphasis", () => {
    const source = "<span title=\"''\">plain''</span>";
    const segments = highlightWikitext(source);

    assert.doesNotMatch(
        classesAt(source, segments, "plain").join(" "),
        /wiked-lite-token--italic/u,
    );
});

test("explanatory footnotes do not expose reference-preview metadata", () => {
    const footnotes = ["{{efn|1=A}}", "{{efn-ua|1=A}}"];
    for (const source of footnotes) {
        const segments = highlightWikitext(source);

        assert.ok(
            segments.every((segment) => segment.referenceSource == null),
        );
    }
});

test("nested citations keep citation preview metadata", () => {
    const reference = '<Ref name="Gould, 2026" />';
    const namedReuse = "{{r|Hon, 2026}}";
    const shortFootnote = "{{sfn|Meghan G|2026}}";
    const source = `{{efn|1=See ${reference} ${namedReuse} ${shortFootnote}}}`;
    const segments = highlightWikitext(source);

    assertHasClass(source, segments, "See", "wiked-lite-token--footnote");
    assert.equal(
        segmentAt(source, segments, "See")?.referenceSource,
        undefined,
    );
    for (const citation of [reference, namedReuse, shortFootnote]) {
        assertHasClass(
            source,
            segments,
            citation,
            "wiked-lite-token--reference",
        );
        assert.equal(
            segmentAt(source, segments, citation)?.referenceSource,
            citation,
        );
    }
});

test("emphasis is limited to template values and wikilink labels", () => {
    const source = [
        "{{''template''|''name''=value|body=''shown''}}",
        "[[''target''|''label'']]",
    ].join(" ");
    const segments = highlightWikitext(source);

    assert.doesNotMatch(
        classesAt(source, segments, "template").join(" "),
        /wiked-lite-token--italic/u,
    );
    assert.doesNotMatch(
        classesAt(source, segments, "name").join(" "),
        /wiked-lite-token--italic/u,
    );
    assertHasClass(source, segments, "shown", "wiked-lite-token--italic");
    assert.doesNotMatch(
        classesAt(source, segments, "target").join(" "),
        /wiked-lite-token--italic/u,
    );
    assertHasClass(source, segments, "label", "wiked-lite-token--italic");
});

test("block template parameters are not treated as table rows", () => {
    const source = [
        "{{Infobox",
        " | name = value",
        "}}",
        "{|",
        "| cell",
        "|}",
    ].join("\n");
    const segments = highlightWikitext(source);
    const parameterClasses = classesAt(source, segments, "name");

    assert.ok(parameterClasses.includes("wiked-lite-token--parameter"));
    assert.ok(!parameterClasses.includes("wiked-lite-token--table"));
    assertHasClass(source, segments, "cell", "wiked-lite-token--table");
});

test("template parameters nested in tables remain parameter tokens", () => {
    const source = ["{|", "| {{Infobox", " | name = value", "}}", "|}"].join(
        "\n",
    );
    const segments = highlightWikitext(source);
    const parameterClasses = classesAt(source, segments, "name");

    assert.ok(parameterClasses.includes("wiked-lite-token--parameter"));
    assert.ok(!parameterClasses.includes("wiked-lite-token--table"));
});

test("missing-link metadata covers only visible wikilink text", () => {
    const source = "[[品田昭子]] [[Target|label]]";
    const segments = highlightWikitext(source);

    assert.equal(segmentAt(source, segments, "[[")?.missingTitle, undefined);
    assert.equal(
        segmentAt(source, segments, "品田昭子")?.missingTitle,
        "品田昭子",
    );
    assert.equal(segmentAt(source, segments, "]] ")?.missingTitle, undefined);
    assert.equal(
        segmentAt(source, segments, "Target")?.missingTitle,
        undefined,
    );
    assert.equal(segmentAt(source, segments, "|")?.missingTitle, undefined);
    assert.equal(segmentAt(source, segments, "label")?.missingTitle, "Target");
});

test("missing-link metadata ignores fragments and leading colons", () => {
    const source = "[[:品田昭子#生平|人物]]";
    const segments = highlightWikitext(source);

    assert.equal(
        segmentAt(source, segments, "人物")?.missingTitle,
        "品田昭子",
    );
});

test("missing links exclude label markup and non-label options", () => {
    const source = [
        "[[Missing|'''label''']]",
        "[[File:Missing.svg|thumb|caption]]",
        "[[Category:Missing|sort]]",
    ].join(" ");
    const segments = highlightWikitext(source);

    assert.equal(segmentAt(source, segments, "'''")?.missingTitle, undefined);
    assert.equal(
        segmentAt(source, segments, "label")?.missingTitle,
        "Missing",
    );
    assert.equal(
        segmentAt(source, segments, "File:Missing.svg")?.missingTitle,
        "File:Missing.svg",
    );
    assert.equal(
        segmentAt(source, segments, "thumb")?.missingTitle,
        undefined,
    );
    assert.equal(
        segmentAt(source, segments, "Category:Missing")?.missingTitle,
        "Category:Missing",
    );
    assert.equal(segmentAt(source, segments, "sort")?.missingTitle, undefined);
});
