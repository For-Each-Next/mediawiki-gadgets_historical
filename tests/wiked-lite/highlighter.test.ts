import assert from "node:assert/strict";
import test from "node:test";
import { decodeNamespaceCatalog } from "@mediawiki-gadgets/shared/wiki-titles";
import {
    collectLinkHelperTitles,
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

function htmlContentClassesAt(
    source: string,
    segments: HighlightSegment[],
    needle: string,
): string[] {
    return classesAt(source, segments, needle)
        .filter((className) =>
            className.startsWith("wiked-lite-token--html-content-"),
        )
        .toSorted();
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

test("nested references and footnotes share one small token", () => {
    const source = "<ref>Outer {{efn|Inner <ref>source</ref>}}</ref>";
    const segments = highlightWikitext(source);

    assertHasClass(source, segments, "Outer", "wiked-lite-token--reference");
    assertHasClass(source, segments, "Inner", "wiked-lite-token--footnote");
    assertHasClass(source, segments, "source", "wiked-lite-token--reference");
    assertHasClass(source, segments, "source", "wiked-lite-token--footnote");
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

test("reference attributes keep footnote prose positional", () => {
    const source =
        "{{efn|name=Terraria: Otherworld|" +
        '译名取自[[游民星空]]<ref name="旧城七喜, 2018" />、' +
        '[[触乐]]<ref name="陈祺, 2016" />、游戏大观' +
        '<ref name="游戏大观, 2020" />等，触乐' +
        '<ref name="刘翁婳, 2022" />和游戏茶馆' +
        '<ref name="崴脚君, 2023" />译作「泰拉瑞亚：异界」，' +
        '触乐又译作「泰拉瑞亚：异世界」<ref name="星咏, 2015" />。}}';
    const segments = highlightWikitext(source);

    assertHasClass(source, segments, "name", "wiked-lite-token--parameter");
    assert.deepEqual(
        segments
            .filter((segment) =>
                segment.classNames.includes("wiked-lite-token--parameter"),
            )
            .map((segment) => segment.text),
        ["name"],
    );
    assertHasClass(
        source,
        segments,
        '<ref name="旧城七喜, 2018" />',
        "wiked-lite-token--html-tag",
    );
    assertLacksClass(
        source,
        segments,
        '="旧城七喜, 2018"',
        "wiked-lite-token--template-delimiter",
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
    assertHasClass(
        source,
        segments,
        "PKGBUILD",
        "wiked-lite-token--html-content-0",
    );
});

test("file options in article examples use syntax-key highlighting", () => {
    const source = [
        "[[File:Emperor Jimmu.jpg|thumb|upright|left|[[神武天皇]]東征]]",
        "[[File:Emblem of the Government of Japan (yellow).svg|75px]]",
    ].join("\n");
    const segments = highlightWikitext(source);

    for (const option of ["thumb", "upright", "left", "75px"]) {
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
    assertLacksClass(source, segments, "東征", "wiked-lite-token--parameter");
    assertHasClass(
        source,
        segments,
        "|thumb",
        "wiked-lite-token--wiki-markup",
    );
});

test("file options recognize MediaWiki format and alignment keywords", () => {
    const options = [
        "baseline",
        "border",
        "bottom",
        "center",
        "centre",
        "enframed",
        "frame",
        "framed",
        "frameless",
        "left",
        "loop",
        "middle",
        "muted",
        "none",
        "right",
        "sub",
        "sup",
        "super",
        "text-bottom",
        "text-top",
        "thumb",
        "thumbnail",
        "top",
        "upright",
    ];

    for (const option of options) {
        const source = `[[File:Example.svg|${option}]]`;
        assertHasClass(
            source,
            highlightWikitext(source),
            option,
            "wiked-lite-token--parameter",
        );
    }
});

test("file options recognize documented pixel dimensions", () => {
    const dimensions = [
        "75px",
        "0075px",
        "x75px",
        "75x100px",
        "75 px",
        "x75 px",
        "75x100 px",
    ];

    for (const dimension of dimensions) {
        const source = `[[File:Example.svg|${dimension}]]`;
        assertHasClass(
            source,
            highlightWikitext(source),
            dimension,
            "wiked-lite-token--parameter",
        );
    }
});

test("file options distinguish named keys from their values", () => {
    const options = [
        ["alt", "Accessible map"],
        ["class", "skin-invert"],
        ["disablecontrols", "fullscreen"],
        ["end", "1:30"],
        ["lang", "ja"],
        ["link", "Emperor Jimmu"],
        ["lossy", "false"],
        ["page", "2"],
        ["start", "1:25"],
        ["thumb", "Poster.jpg"],
        ["thumbnail", "Poster.jpg"],
        ["thumbtime", "1:25"],
        ["upright", "1.2"],
    ] as const;

    for (const [key, value] of options) {
        const source = `[[File:Example.svg|${key}=${value}]]`;
        const segments = highlightWikitext(source);
        assertHasClass(source, segments, key, "wiked-lite-token--parameter");
        assertLacksClass(
            source,
            segments,
            value,
            "wiked-lite-token--parameter",
        );
        assertHasClass(
            source,
            segments,
            "=",
            "wiked-lite-token--template-delimiter",
        );
    }
});

test("file options recognize space-argument page and upright aliases", () => {
    for (const [key, value] of [
        ["page", "2"],
        ["upright", "1.2"],
    ] as const) {
        const source = `[[File:Example.svg|${key} ${value}]]`;
        const segments = highlightWikitext(source);
        assertHasClass(source, segments, key, "wiked-lite-token--parameter");
        assertLacksClass(
            source,
            segments,
            value,
            "wiked-lite-token--parameter",
        );
    }
});

test("file option captions and malformed keywords stay ordinary", () => {
    const options = [
        "Caption text",
        "LEFT",
        "0px",
        "75.5px",
        "75 px wide",
        "alt =Accessible map",
        "page  2",
        "noicon",
        "noplayer",
    ];

    for (const option of options) {
        const source = `[[File:Example.svg|${option}]]`;
        assertLacksClass(
            source,
            highlightWikitext(source),
            option,
            "wiked-lite-token--parameter",
        );
    }
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
    assertHasClass(
        source,
        segments,
        "本文",
        "wiked-lite-token--html-content-0",
    );
});

test("HTML tag bodies use progressively darker nesting backgrounds", () => {
    const source = [
        "<div>outer",
        "<span>middle<i>inner<b>deep<u>capped",
        "<em>still capped</em></u></b></i></span>",
        "</div>",
    ].join("");
    const segments = highlightWikitext(source);
    const expectedClasses = [
        ["outer", [0]],
        ["middle", [0, 1]],
        ["inner", [0, 1, 2]],
        ["deep", [0, 1, 2, 3]],
        ["capped", [0, 1, 2, 3, 4]],
        ["still capped", [0, 1, 2, 3, 4]],
    ] as const;

    for (const [needle, depths] of expectedClasses) {
        assert.deepEqual(
            htmlContentClassesAt(source, segments, needle),
            depths.map((depth) => `wiked-lite-token--html-content-${depth}`),
        );
    }
    assertLacksClass(
        source,
        segments,
        "still capped",
        "wiked-lite-token--html-content-5",
    );
});

test("HTML body depth resets for siblings and ignores void tags", () => {
    const source = '<div lang="en">outer<br>tail</div><p>sibling</p><hr>';
    const segments = highlightWikitext(source);

    for (const text of ["outer", "tail", "sibling"]) {
        assert.deepEqual(htmlContentClassesAt(source, segments, text), [
            "wiked-lite-token--html-content-0",
        ]);
    }
    assertHasClass(source, segments, "lang", "wiked-lite-token--parameter");
    assertHasClass(source, segments, "br", "wiked-lite-token--html-tag");
    assertHasClass(source, segments, "br", "wiked-lite-token--html-content-0");
    assertHasClass(source, segments, "hr", "wiked-lite-token--html-tag");
    assertLacksClass(
        source,
        segments,
        "hr",
        "wiked-lite-token--html-content-0",
    );
});

test("unfinished and protected tags do not shade through their bodies", () => {
    const source = [
        "<nowiki>literal</nowiki>",
        "<mapframe><span>map data</span></mapframe>",
        "<templatestyles><b>style data</b></templatestyles>",
        "lead<div>rest<span>nested</span>",
    ].join(" ");
    const segments = highlightWikitext(source);

    assert.deepEqual(htmlContentClassesAt(source, segments, "literal"), []);
    assertHasClass(source, segments, "literal", "wiked-lite-token--nowiki");
    for (const text of ["map data", "style data"]) {
        assert.deepEqual(htmlContentClassesAt(source, segments, text), []);
        assertHasClass(source, segments, text, "wiked-lite-token--pre");
    }
    assert.deepEqual(htmlContentClassesAt(source, segments, "rest"), []);
    assert.deepEqual(htmlContentClassesAt(source, segments, "nested"), [
        "wiked-lite-token--html-content-0",
    ]);
});

test("HTML body backgrounds preserve nested wikilink metadata", () => {
    const source = '<div lang="en">.ddddddd.. [[Missing]]</div>';
    const segments = highlightWikitext(source);

    assertHasClass(
        source,
        segments,
        ".ddddddd..",
        "wiked-lite-token--html-content-0",
    );
    assert.equal(
        segmentAt(source, segments, "Missing")?.missingTitle,
        "Missing",
    );
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

test("template navigation applies only to the template name", () => {
    const source = "{{ Cite web | title = Example }}";
    const href = "/wiki/Template%3ACite_web";
    const linkedSegments = highlightWikitext(source).filter(
        (segment) => segment.href === href,
    );

    assert.deepEqual(
        linkedSegments.map(({ end, start, text }) => ({ end, start, text })),
        [
            {
                end: source.indexOf("Cite web") + "Cite web".length,
                start: source.indexOf("Cite web"),
                text: "Cite web",
            },
        ],
    );
    assert.equal(segmentAt(source, linkedSegments, "title"), undefined);
    assert.equal(segmentAt(source, linkedSegments, "Example"), undefined);
});

const TEMPLATE_LIKE_MAGIC_SOURCE = [
    "{{DEFAULTSORT:Trusty Bell Chopin No Yume}}",
    "{{DEFAULTSORTKEY:Alias key}}",
    "{{DEFAULTCATEGORYSORT:Category alias}}",
    "{{DISPLAYTITLE:Display value}}",
    "{{CURRENTYEAR}}",
    "{{NUMBEROFPAGES:R}}",
    "{{lc:LOWER ME}}",
    "{{#if:condition|yes|no}}",
].join("\n");

test("template-like magic words use parser-function syntax", () => {
    const segments = highlightWikitext(TEMPLATE_LIKE_MAGIC_SOURCE);
    const heads = [
        "DEFAULTSORT",
        "DEFAULTSORTKEY",
        "DEFAULTCATEGORYSORT",
        "DISPLAYTITLE",
        "CURRENTYEAR",
        "NUMBEROFPAGES",
        "lc",
        "#if",
    ];

    for (const head of heads) {
        assertHasClass(
            TEMPLATE_LIKE_MAGIC_SOURCE,
            segments,
            head,
            "wiked-lite-token--parser-function",
        );
        assertLacksClass(
            TEMPLATE_LIKE_MAGIC_SOURCE,
            segments,
            head,
            "wiked-lite-token--template-name",
        );
    }
    assert.ok(segments.every((segment) => segment.href == null));
    assertHasClass(
        TEMPLATE_LIKE_MAGIC_SOURCE,
        segments,
        ":Trusty Bell Chopin No Yume",
        "wiked-lite-token--parser-function",
    );
});

test("colonless hash magic variables do not navigate to templates", () => {
    const heads = [
        "#bcp47",
        "#dir",
        "#contentmodel",
        "#LANGUAGE",
        "#interwikilink",
        "#interlanguagelink",
        "#isbn",
    ];
    const source = heads.map((head) => `{{${head}}}`).join(" ");
    const segments = highlightWikitext(source);

    for (const head of heads) {
        assertHasClass(
            source,
            segments,
            head,
            "wiked-lite-token--parser-function",
        );
        assertLacksClass(
            source,
            segments,
            head,
            "wiked-lite-token--template-name",
        );
    }
    assert.ok(segments.every((segment) => segment.href == null));
});

test("magic-word arguments remain ordinary editable text", () => {
    const segments = highlightWikitext(TEMPLATE_LIKE_MAGIC_SOURCE);

    for (const argument of [
        "Trusty Bell Chopin No Yume",
        "Alias key",
        "Category alias",
        "Display value",
        "LOWER ME",
        "condition",
    ]) {
        assertLacksClass(
            TEMPLATE_LIKE_MAGIC_SOURCE,
            segments,
            argument,
            "wiked-lite-token--parser-function",
        );
        assertLacksClass(
            TEMPLATE_LIKE_MAGIC_SOURCE,
            segments,
            argument,
            "wiked-lite-token--template-name",
        );
    }
});

test("localized and full-width magic-word syntax is not a template", () => {
    const source = [
        "{{默认排序:Trusty Bell}}",
        "{{顯示標題：Display value}}",
        "{{#调用：范例|main}}",
    ].join("\n");
    const segments = highlightWikitext(source, {
        namespaceSource: "zhwiki",
    });
    const moduleHref = "/wiki/Module%3A%E8%8C%83%E4%BE%8B";

    for (const head of ["默认排序", "顯示標題", "#调用"]) {
        assertHasClass(
            source,
            segments,
            head,
            "wiked-lite-token--parser-function",
        );
        assertLacksClass(
            source,
            segments,
            head,
            "wiked-lite-token--template-name",
        );
    }
    assertHasClass(
        source,
        segments,
        "：Display value",
        "wiked-lite-token--parser-function",
    );
    assert.equal(segmentAt(source, segments, "范例")?.href, moduleHref);
    assert.ok(
        segments
            .filter((segment) => segment.href != null)
            .every((segment) => segment.href === moduleHref),
    );
});

test("common zhwiki magic-word aliases do not become templates", () => {
    const heads = ["小写", "格式化数字", "页名", "今天", "本月", "#语言"];
    const source = [
        "{{小写:ABC}}",
        "{{格式化数字:1234}}",
        "{{页名:Foo}}",
        "{{今天}}",
        "{{本月}}",
        "{{#语言}}",
    ].join(" ");
    const segments = highlightWikitext(source, {
        namespaceSource: "zhwiki",
    });

    for (const head of heads) {
        assertHasClass(
            source,
            segments,
            head,
            "wiked-lite-token--parser-function",
        );
        assertLacksClass(
            source,
            segments,
            head,
            "wiked-lite-token--template-name",
        );
    }
    assert.ok(segments.every((segment) => segment.href == null));
});

test("magic-word collisions remain explicit template transclusions", () => {
    const fixtures = [
        ["{{CURRENTDAYNAME|x}}", "/wiki/Template%3ACURRENTDAYNAME"],
        ["{{Template:CURRENTYEAR}}", "/wiki/Template%3ACURRENTYEAR"],
        ["{{:CURRENTYEAR}}", "/wiki/CURRENTYEAR"],
        ["{{Example:Variant|x}}", "/wiki/Template%3AExample%3AVariant"],
        ["{{defaultsort:key}}", "/wiki/Template%3Adefaultsort%3Akey"],
    ] as const;

    for (const [source, href] of fixtures) {
        const segments = highlightWikitext(source);
        const linked = segments.filter((segment) => segment.href === href);

        assert.ok(
            linked.length > 0,
            `Missing template navigation for ${source}`,
        );
        assert.ok(
            linked.every((segment) =>
                segment.classNames.includes("wiked-lite-token--template-name"),
            ),
        );
        assert.ok(
            linked.every(
                (segment) =>
                    !segment.classNames.includes(
                        "wiked-lite-token--parser-function",
                    ),
            ),
        );
    }
});

test("invoke navigation links only the static module target", () => {
    const source = "{{ safesubst: #InVoKe:Foo/bar | main | key=value }}";
    const href = "/wiki/Module%3AFoo/bar";
    const segments = highlightWikitext(source);
    const linked = segments.filter((segment) => segment.href === href);

    assert.deepEqual(
        linked.map(({ end, start, text }) => ({ end, start, text })),
        [
            {
                end: source.indexOf("Foo/bar") + "Foo/bar".length,
                start: source.indexOf("Foo/bar"),
                text: "Foo/bar",
            },
        ],
    );
    assertHasClass(
        source,
        segments,
        "safesubst",
        "wiked-lite-token--parser-function",
    );
    assertHasClass(
        source,
        segments,
        "#InVoKe",
        "wiked-lite-token--parser-function",
    );
    assertHasClass(
        source,
        segments,
        "Foo/bar",
        "wiked-lite-token--module-name",
    );
    for (const text of ["safesubst", "#InVoKe", "main", "key", "value"]) {
        assert.notEqual(segmentAt(source, segments, text)?.href, href);
    }
});

test("invoke forces the entered operand into the module namespace", () => {
    const source = "{{#invoke:Module:Foo|main}}";
    const segments = highlightWikitext(source);

    assert.equal(
        segmentAt(source, segments, "Module:Foo")?.href,
        "/wiki/Module%3AModule%3AFoo",
    );
});

test("message and raw prefixes retain MediaWiki classification order", () => {
    const source = [
        "{{msg:CURRENTYEAR}}",
        "{{raw:DEFAULTSORT:X}}",
        "{{msg:#invoke:Foo|main}}",
        "{{raw:msgnw:Example}}",
    ].join("\n");
    const segments = highlightWikitext(source);

    assert.equal(
        segmentAt(source, segments, "CURRENTYEAR")?.href,
        "/wiki/Template%3ACURRENTYEAR",
    );
    assertHasClass(
        source,
        segments,
        "DEFAULTSORT",
        "wiked-lite-token--parser-function",
    );
    assert.equal(
        segmentAt(source, segments, "Foo")?.href,
        "/wiki/Module%3AFoo",
    );
    assert.equal(
        segmentAt(source, segments, "msgnw:Example")?.href,
        "/wiki/Template%3Amsgnw%3AExample",
    );
});

test("whitespace before a function colon remains template syntax", () => {
    const source = "{{DEFAULTSORT :x}} {{#invoke :Foo|main}}";
    const segments = highlightWikitext(source);

    for (const head of ["DEFAULTSORT", "#invoke"]) {
        assertLacksClass(
            source,
            segments,
            head,
            "wiked-lite-token--parser-function",
        );
        assertHasClass(
            source,
            segments,
            head,
            "wiked-lite-token--template-name",
        );
    }
});

test("full-width colons do not activate ASCII-only modifiers", () => {
    const source = "{{subst：CURRENTYEAR}}";
    const segments = highlightWikitext(source);

    assertLacksClass(
        source,
        segments,
        "subst",
        "wiked-lite-token--parser-function",
    );
    assertHasClass(
        source,
        segments,
        "subst：CURRENTYEAR",
        "wiked-lite-token--template-name",
    );
});

test("invoke navigation ignores dynamic or unavailable module targets", () => {
    const dynamic = "{{#invoke:{{{module|Foo}}}|main}}";
    const unavailable = "{{#invoke:Foo|main}}";

    assert.ok(
        highlightWikitext(dynamic).every((segment) => segment.href == null),
    );
    assert.ok(
        highlightWikitext(unavailable, {
            namespaceSource: EXAMPLE_NAMESPACE_CATALOG,
        }).every((segment) => segment.href == null),
    );
});

test("outer magic-word styling stops before nested arguments", () => {
    const source = "{{DISPLAYTITLE:Foo {{PAGENAME}}}}";
    const segments = highlightWikitext(source);

    assertHasClass(
        source,
        segments,
        "DISPLAYTITLE",
        "wiked-lite-token--parser-function",
    );
    assertLacksClass(
        source,
        segments,
        "Foo",
        "wiked-lite-token--parser-function",
    );
    assertHasClass(
        source,
        segments,
        "PAGENAME",
        "wiked-lite-token--parser-function",
    );
    assert.ok(segments.every((segment) => segment.href == null));
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
    const source = "{{link-ja|東京|Tokyo}}";
    const segments = highlightWikitext(source, {
        linkHelpers: true,
    });
    const segment = segments
        .filter((item) =>
            item.classNames.includes("wiked-lite-token--link-helper"),
        )
        .at(0);

    assert.equal(segment?.href, "/wiki/%E6%9D%B1%E4%BA%AC");
    assert.equal(segmentAt(source, segments, "東京")?.missingTitle, "東京");
    assert.equal(
        segmentAt(source, segments, "Tokyo")?.missingTitle,
        undefined,
    );
    assert.deepEqual(collectLinkHelperTitles(source), ["東京"]);
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

test("inline definition-list separators receive list syntax styling", () => {
    const source = "; site : zh\n; [[Project:Site]] : linked";
    const segments = highlightWikitext(source);

    assertHasClass(source, segments, ";", "wiked-lite-token--list");
    assertHasClass(source, segments, ":", "wiked-lite-token--list");
    assertLacksClass(source, segments, "Project:", "wiked-lite-token--list");
    assertHasClass(source, segments, ":", "wiked-lite-token--list", 2);
});

test("userbox metadata colons remain inline definition-list markers", () => {
    const source = [
        "; badge : js",
        "; level : 0",
        "; text : This user can not program in " +
            "{{/|wd|Q2005|'''JavaScript'''}}.",
        "; tip : knowing of it's crucial importance for Wikipedia, " +
            "but I really can't understand it",
    ].join("\n");
    const segments = highlightWikitext(source);
    const separators = [...source.matchAll(/:/gu)];

    assert.equal(separators.length, 4);
    for (const [occurrence] of separators.entries()) {
        assertHasClass(
            source,
            segments,
            ":",
            "wiked-lite-token--list",
            occurrence,
        );
    }
});

test("list metadata remains visible inside multiline template data", () => {
    const source = [
        "{{/|contributions|category=review|data=",
        "; site : zh",
        "; title : Talk:超执刀2#For Each ... Next的意見",
        "; status : pr",
        "; note : possibly this wiki's first A-Class review",
        "}}",
    ].join("\n");
    const segments = highlightWikitext(source);

    for (const occurrence of [0, 1, 3, 4]) {
        assertHasClass(
            source,
            segments,
            ":",
            "wiked-lite-token--list",
            occurrence,
        );
    }
    assertLacksClass(source, segments, "Talk:", "wiked-lite-token--list");
});

test("URL schemes do not become definition-list separators", () => {
    const source = "; https://example.test : website";
    const segments = highlightWikitext(source);

    assertLacksClass(source, segments, "https:", "wiked-lite-token--list");
    assertHasClass(source, segments, ":", "wiked-lite-token--list", 1);
});

test("protocol-relative external links color their target and label", () => {
    const source =
        "[//dictionary.cambridge.org/us/dictionary/" +
        "english-chinese-traditional/ Cambridge English–Chinese]";
    const segments = highlightWikitext(source);
    const href =
        "//dictionary.cambridge.org/us/dictionary/" +
        "english-chinese-traditional/";

    assertHasClass(source, segments, href, "wiked-lite-token--url");
    assertHasClass(
        source,
        segments,
        "Cambridge English–Chinese",
        "wiked-lite-token--url",
    );
    assert.equal(segmentAt(source, segments, href)?.href, href);
    assert.equal(
        segmentAt(source, segments, "Cambridge English–Chinese")?.href,
        href,
    );
});

test("external-link colons do not split inline definitions", () => {
    const source = "; [//example.test:8080 label] : definition";
    const segments = highlightWikitext(source);

    assertLacksClass(source, segments, ":8080", "wiked-lite-token--list");
    assertHasClass(source, segments, ":", "wiked-lite-token--list", 1);
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

test("missing-link metadata covers only wikilink target text", () => {
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
        "Target",
    );
    assert.equal(segmentAt(source, segments, "|")?.missingTitle, undefined);
    assert.equal(
        segmentAt(source, segments, "label")?.missingTitle,
        undefined,
    );
});

test("missing-link metadata ignores fragments and leading colons", () => {
    const source = "[[:品田昭子#生平|人物]]";
    const segments = highlightWikitext(source);

    assert.equal(
        segmentAt(source, segments, "品田昭子#生平")?.missingTitle,
        "品田昭子",
    );
    assert.equal(segmentAt(source, segments, "人物")?.missingTitle, undefined);
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
        segmentAt(source, segments, "Missing")?.missingTitle,
        "Missing",
    );
    assert.equal(
        segmentAt(source, segments, "label")?.missingTitle,
        undefined,
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
