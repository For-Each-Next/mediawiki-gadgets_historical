import assert from "node:assert/strict";
import test from "node:test";
import { highlightWikitext } from "../../src/wiked-lite/domain/highlighter.ts";

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
