import assert from "node:assert/strict";
import test from "node:test";
import { decodeNamespaceCatalog } from "@mediawiki-gadgets/shared/wikitext";
import {
    highlightWikitext,
    type HighlightSegment,
} from "../../src/wiked-lite/domain/highlighter.ts";

const EXAMPLE_NAMESPACE_CATALOG = decodeNamespaceCatalog("examplewiki", {
    query: {
        namespacealiases: [{ alias: "Image", id: 6 }],
        namespaces: {
            0: { id: 0, name: "" },
            2: { canonical: "User", id: 2, name: "Benutzer" },
            6: { canonical: "File", id: 6, name: "Datei" },
            10: { canonical: "Template", id: 10, name: "Vorlage" },
            14: { canonical: "Category", id: 14, name: "Kategorie" },
        },
    },
});

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
    occurrence = 0,
): void {
    assert.ok(
        classesAt(source, segments, needle, occurrence).includes(className),
    );
}

function assertLacksClass(
    source: string,
    segments: HighlightSegment[],
    needle: string,
    className: string,
    occurrence = 0,
): void {
    assert.ok(
        !classesAt(source, segments, needle, occurrence).includes(className),
    );
}

interface ReferenceContainerFixture {
    body: string;
    containerBody: string;
    source: string;
}

const REFERENCE_CONTAINER_FIXTURES: ReferenceContainerFixture[] = [
    {
        body: "Native definition",
        containerBody: "Native container",
        source: [
            "{{outer|",
            "<references>",
            "Native container {{container template|Native}}",
            '<ref name="native">Native definition ' +
                "{{cite web|title={{lang|en|Native}}}}</ref>",
            "</references>",
            "}}",
        ].join("\n"),
    },
    {
        body: "Refs definition",
        containerBody: "Refs container",
        source: [
            "{{outer|",
            "{{Reflist|refs=",
            "Refs container {{container template|Refs}}",
            '<ref name="refs">Refs definition ' +
                "{{cite web|title={{lang|en|Refs}}}}</ref>",
            "}}",
            "}}",
        ].join("\n"),
    },
    {
        body: "List definition",
        containerBody: "List container",
        source: [
            "{{outer|",
            "{{Reflist|list=",
            "List container {{container template|List}}",
            '<ref name="list">List definition ' +
                "{{cite web|title={{lang|en|List}}}}</ref>",
            "}}",
            "}}",
        ].join("\n"),
    },
];

function assertReferenceContainerNesting(
    fixture: ReferenceContainerFixture,
    options: Parameters<typeof highlightWikitext>[1] = {},
): void {
    const segments = highlightWikitext(fixture.source, options);
    const expectedDepths = [
        [fixture.containerBody, 0],
        ["container template", 0],
        [fixture.body, 1],
        ["cite web", 1],
        ["lang", 2],
    ] as const;

    for (const [needle, depth] of expectedDepths) {
        assertHasClass(
            fixture.source,
            segments,
            needle,
            `wiked-lite-token--template-${depth}`,
        );
    }
    assertReferenceContainerBoundaries(fixture, segments);
}

function assertReferenceContainerBoundaries(
    fixture: ReferenceContainerFixture,
    segments: HighlightSegment[],
): void {
    assertLacksClass(
        fixture.source,
        segments,
        "container template",
        "wiked-lite-token--template-1",
    );
    assertLacksClass(
        fixture.source,
        segments,
        "cite web",
        "wiked-lite-token--template-2",
    );
    assertLacksClass(
        fixture.source,
        segments,
        fixture.body,
        "wiked-lite-token--reference",
    );
    assert.equal(
        segmentAt(fixture.source, segments, fixture.body)?.referenceSource,
        undefined,
    );
    assert.equal(
        segmentAt(fixture.source, segments, fixture.containerBody)?.href,
        undefined,
    );
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

test("reference containers use relative template nesting", () => {
    for (const fixture of REFERENCE_CONTAINER_FIXTURES) {
        assertReferenceContainerNesting(fixture);
    }
});

test("current-wiki template prefixes preserve reference nesting", () => {
    const fixture = {
        ...REFERENCE_CONTAINER_FIXTURES[1],
        source: REFERENCE_CONTAINER_FIXTURES[1].source.replace(
            "{{Reflist",
            "{{Vorlage:Reflist",
        ),
    };

    assertReferenceContainerNesting(fixture, {
        namespaceSource: EXAMPLE_NAMESPACE_CATALOG,
    });
});

test("the innermost reference boundary controls template depth", () => {
    const source = [
        "{{sfn|<references>Clipped metadata</references>}}",
        "<references><ref><references>{{Inner reset}}" +
            "</references></ref></references>",
    ].join("\n");
    const segments = highlightWikitext(source);

    assertLacksClass(
        source,
        segments,
        "Clipped metadata",
        "wiked-lite-token--reference",
    );
    assert.equal(
        segmentAt(source, segments, "Clipped metadata")?.href,
        undefined,
    );
    assert.equal(
        segmentAt(source, segments, "Clipped metadata")?.referenceSource,
        undefined,
    );
    assertHasClass(
        source,
        segments,
        "Inner reset",
        "wiked-lite-token--template-0",
    );
    assertLacksClass(
        source,
        segments,
        "Inner reset",
        "wiked-lite-token--template-1",
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

test("NoteTA conversion keys retain complete declaration boundaries", () => {
    const source =
        "{{NoteTA-lite|1=11zh-tw:22; a=>region:xx; a{{=}}>zh-tw:33}}";
    const segments = highlightWikitext(source, { linkHelpers: true });
    const malformed = segmentAt(source, segments, "11zh-tw");

    assert.equal(malformed?.text, "11zh-tw");
    assert.ok(
        malformed?.classNames.includes("wiked-lite-token--language-variant"),
    );
    assertHasClass(
        source,
        segments,
        "region",
        "wiked-lite-token--language-variant",
    );
    assertHasClass(
        source,
        segments,
        "zh-tw",
        "wiked-lite-token--language-variant",
        1,
    );
    assertLacksClass(
        source,
        segments,
        "a=>",
        "wiked-lite-token--language-variant",
    );
});

test("conversion separators ignore values and tag attributes", () => {
    const source =
        '-{zh-cn:A=>B; zh-tw:<span title="a:b;=>c">x</span>; a=>region:xx}-';
    const segments = highlightWikitext(source, { linkHelpers: true });

    for (const key of ["zh-cn", "zh-tw", "region"]) {
        assertHasClass(
            source,
            segments,
            key,
            "wiked-lite-token--language-variant",
        );
    }
    for (const value of ["B", "a:b"]) {
        assertLacksClass(
            source,
            segments,
            value,
            "wiked-lite-token--language-variant",
        );
    }
});

test("literal tag contents do not create conversion declarations", () => {
    const source =
        "{{NoteTA-lite|1=<nowiki>a;b:c; a=>region:xx</nowiki> plain}}";
    const segments = highlightWikitext(source, { linkHelpers: true });

    assertLacksClass(
        source,
        segments,
        "plain",
        "wiked-lite-token--language-conversion",
    );
    assertLacksClass(
        source,
        segments,
        "region",
        "wiked-lite-token--language-variant",
    );
});

test("comments before conversion keys preserve declarations", () => {
    const fixtures = [
        ["-{<!--c-->zh-cn:x}-", "zh-cn"],
        ["-{zh-cn:x;<!--c-->zh-tw:y}-", "zh-tw"],
        ["{{NoteTA|1=H|<!--c-->zh-tw:x}}", "zh-tw"],
    ] as const;

    for (const [source, key] of fixtures) {
        assertHasClass(
            source,
            highlightWikitext(source, { linkHelpers: true }),
            key,
            "wiked-lite-token--language-variant",
        );
    }
});

test("literal pipes do not split wikilink labels", () => {
    const source = "[[Target|<nowiki>a|b</nowiki> visible]]";
    const segments = highlightWikitext(source);

    assertHasClass(source, segments, "visible", "wiked-lite-token--link-text");
});

test("localized namespace aliases classify file and category links", () => {
    const source = "[[圖片:Example.svg]] [[分類:Examples]]";
    const segments = highlightWikitext(source, {
        namespaceSource: "zhwiki",
    });

    assertHasClass(
        source,
        segments,
        "圖片:Example.svg",
        "wiked-lite-token--file-link",
    );
    assertHasClass(
        source,
        segments,
        "分類:Examples",
        "wiked-lite-token--category",
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

test("file options distinguish keywords and named keys from values", () => {
    const source =
        "[[File:Example.svg|thumb|right|alt=Accessible map|Caption text]]";
    const segments = highlightWikitext(source);

    for (const option of ["thumb", "right", "alt"]) {
        assertHasClass(
            source,
            segments,
            option,
            "wiked-lite-token--parameter",
        );
        assertHasClass(
            source,
            segments,
            option,
            "wiked-lite-token--file-link",
        );
    }
    for (const value of ["Accessible map", "Caption text"]) {
        assertLacksClass(
            source,
            segments,
            value,
            "wiked-lite-token--parameter",
        );
    }
    assertHasClass(
        source,
        segments,
        "|thumb",
        "wiked-lite-token--wiki-markup",
    );
});

test("file options ignore pipes and equals signs in tag attributes", () => {
    const source = '[[File:X.svg|<span title="a|right|alt=x">Caption</span>]]';
    const segments = highlightWikitext(source);

    for (const text of ["right", "alt"]) {
        assertLacksClass(
            source,
            segments,
            text,
            "wiked-lite-token--parameter",
        );
    }
});

test("HTML attributes and CSS properties use syntax token families", () => {
    const source = '<span lang="ja" style="display: none">本文</span>';
    const segments = highlightWikitext(source);

    for (const attribute of ["lang", "style"]) {
        assertHasClass(
            source,
            segments,
            attribute,
            "wiked-lite-token--parameter",
        );
        assertHasClass(
            source,
            segments,
            attribute,
            "wiked-lite-token--html-tag",
        );
    }
    assertHasClass(
        source,
        segments,
        "display",
        "wiked-lite-token--language-variant",
    );
    assertHasClass(source, segments, "display", "wiked-lite-token--html-tag");
    assertLacksClass(
        source,
        segments,
        "none",
        "wiked-lite-token--language-variant",
    );
    assert.deepEqual(classesAt(source, segments, "本文"), []);
});

test("HTML syntax keys respect literal content and nested wikitext", () => {
    const source = [
        '<syntaxhighlight lang="ts" style="display:none">display:x' +
            "</syntaxhighlight>",
        '<span style="{{foo|x;display:none}};color:red">text</span>',
    ].join("\n");
    const segments = highlightWikitext(source);

    for (const attribute of ["lang", "style"]) {
        assertHasClass(
            source,
            segments,
            attribute,
            "wiked-lite-token--parameter",
        );
    }
    assertHasClass(
        source,
        segments,
        "display",
        "wiked-lite-token--language-variant",
    );
    assertLacksClass(
        source,
        segments,
        "display",
        "wiked-lite-token--language-variant",
        1,
    );
    assertLacksClass(
        source,
        segments,
        "display",
        "wiked-lite-token--language-variant",
        2,
    );
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

test("current namespaces format template navigation titles", () => {
    const source = "{{Vorlage:Example}}";
    const segments = highlightWikitext(source, {
        namespaceSource: EXAMPLE_NAMESPACE_CATALOG,
    });

    assert.equal(
        segmentAt(source, segments, "Vorlage:Example")?.href,
        "/wiki/Vorlage%3AExample",
    );
});

test("template navigation respects explicit current-wiki namespaces", () => {
    const options = {
        namespaceSource: EXAMPLE_NAMESPACE_CATALOG,
    };

    assert.equal(
        segmentAt(
            "{{Example}}",
            highlightWikitext("{{Example}}", options),
            "Example",
        )?.href,
        "/wiki/Vorlage%3AExample",
    );
    assert.equal(
        segmentAt(
            "{{Benutzer:Example}}",
            highlightWikitext("{{Benutzer:Example}}", options),
            "Benutzer:Example",
        )?.href,
        "/wiki/Benutzer%3AExample",
    );
    assert.equal(
        segmentAt(
            "{{:Article}}",
            highlightWikitext("{{:Article}}", options),
            ":Article",
        )?.href,
        "/wiki/Article",
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
    const source =
        "== Heading ==\n{{ Cite web | URL = https://example.test }}";
    const segments = highlightWikitext(source);
    const classesFor = (text: string) =>
        segments.find((segment) => segment.text === text)?.classNames ?? [];

    assertHasClass(source, segments, "Heading", "wiked-lite-token--heading-2");
    assertHasClass(source, segments, "Heading", "wiked-lite-token--heading");
    assert.ok(
        classesFor("Cite web").includes("wiked-lite-token--template-name"),
    );
    assert.ok(classesFor("URL").includes("wiked-lite-token--parameter"));
});

test("heading underlines contain only trimmed level 2 and 3 text", () => {
    const source = "==   Level two   ==   \n===  Level three  ===　";
    const segments = highlightWikitext(source);
    const underlinedText = segments
        .filter((segment) =>
            segment.classNames.includes("wiked-lite-token--heading-text"),
        )
        .map((segment) => segment.text)
        .join("");

    assert.equal(underlinedText, "Level twoLevel three");
    assertHasClass(
        source,
        segments,
        "Level two",
        "wiked-lite-token--heading-2",
    );
    assertHasClass(
        source,
        segments,
        "Level three",
        "wiked-lite-token--heading-3",
    );
    assertLacksClass(
        source,
        segments,
        "==   ",
        "wiked-lite-token--heading-text",
    );
    assertLacksClass(
        source,
        segments,
        "   ==   ",
        "wiked-lite-token--heading-text",
    );
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
