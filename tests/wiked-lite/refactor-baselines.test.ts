/** Migration contracts for wikEd Lite source decomposition. */

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import * as highlightPartition from "wiked-lite/domain/highlight-partition.ts";
import { highlightWikitext } from "wiked-lite/domain/highlighter.ts";
import { EditorHistory } from "wiked-lite/ui/editor-history.ts";

const editorSource = await readFile(
    new URL("../../src/wiked-lite/ui/editor.ts", import.meta.url),
    "utf8",
);
const mainSource = await readFile(
    new URL("../../src/wiked-lite/main.ts", import.meta.url),
    "utf8",
);

test("keeps the package root runtime API exact", async () => {
    const api = await import("wiked-lite");

    assert.deepEqual(Object.keys(api).sort(), [
        "buildReferencePreview",
        "formatWikitext",
        "highlightWikitext",
    ]);
});

test("highlighting is a deterministic lossless source partition", () => {
    const source = [
        "== Heading ==",
        "Text [[Target#Part|'''label''']] and {{Example|name=value}}.",
        '<ref name="source">{{cite web|title=Source}}</ref>',
        "<!-- {{opaque}} -->",
    ].join("\n");
    const first = highlightWikitext(source);
    const second = highlightWikitext(source);

    assert.deepEqual(second, first);
    assert.equal(first.map((segment) => segment.text).join(""), source);
    assert.equal(first[0]?.start, 0);
    assert.equal(first.at(-1)?.end, source.length);
    for (const [index, segment] of first.entries()) {
        assert.equal(segment.text, source.slice(segment.start, segment.end));
        if (index > 0) {
            assert.equal(segment.start, first[index - 1]?.end);
        }
    }
});

test("metadata remains attached to its source offset", () => {
    const source = [
        "[[Target#Part|label]]",
        "{{Example|name=value}}",
        '<ref name="source">{{cite web|title=Source}}</ref>',
    ].join(" ");
    const segments = highlightWikitext(source);

    assert.equal(
        metadataAt(source, segments, "Target#Part").href,
        "/wiki/Target%23Part",
    );
    assert.equal(
        metadataAt(source, segments, "Target#Part").missingTitle,
        "Target",
    );
    assert.equal(
        metadataAt(source, segments, "label").href,
        "/wiki/Target%23Part",
    );
    assert.equal(
        metadataAt(source, segments, "Example").href,
        "/wiki/Template%3AExample",
    );
    assert.equal(metadataAt(source, segments, "value").href, undefined);
    assert.equal(
        metadataAt(source, segments, "cite web").referenceSource,
        '<ref name="source">{{cite web|title=Source}}</ref>',
    );
});

test("selection-only updates do not create an editor undo step", () => {
    const history = new EditorHistory({ end: 3, source: "abc", start: 3 });

    history.record({ end: 1, source: "abc", start: 1 });
    history.record({ end: 2, source: "aXbc", start: 2 });

    assert.deepEqual(history.undo(), {
        end: 1,
        source: "abc",
        start: 1,
    });
    assert.equal(history.undo(), null);
});

test("range partitioning gives opaque syntax exclusive precedence", () => {
    const segments = highlightPartition.partitionHighlightRanges("Target", [
        {
            className: "wiked-lite-token--link",
            end: 6,
            href: "/wiki/Target",
            missingTitle: "Target",
            priority: 20,
            start: 0,
        },
        {
            className: "wiked-lite-token--comment",
            end: 6,
            priority: 100,
            start: 3,
        },
    ]);

    assert.deepEqual(segments, [
        {
            classNames: ["wiked-lite-token--link"],
            end: 3,
            href: "/wiki/Target",
            missingTitle: "Target",
            referenceSource: undefined,
            start: 0,
            text: "Tar",
        },
        {
            classNames: ["wiked-lite-token--comment"],
            end: 6,
            href: undefined,
            missingTitle: undefined,
            referenceSource: undefined,
            start: 3,
            text: "get",
        },
    ]);
});

test("composition injects logging and native action notifications", () => {
    assert.match(mainSource, /createLogger\("wiked-lite"\)/u);
    assert.match(mainSource, /createActionNotifier\("wiked-lite"\)/u);
    assert.match(editorSource, /services\.logger\.(?:error|warn)/u);
    assert.match(editorSource, /services\.notify\(\{/u);
    assert.doesNotMatch(editorSource, /\bconsole\.|\bmw\.notify\(/u);
});

function metadataAt(
    source: string,
    segments: ReturnType<typeof highlightWikitext>,
    text: string,
): ReturnType<typeof highlightWikitext>[number] {
    const offset = source.indexOf(text);
    const segment = segments.find(
        (candidate) => candidate.start <= offset && offset < candidate.end,
    );

    assert.ok(segment, `No highlight segment covers ${text}`);
    return segment;
}
