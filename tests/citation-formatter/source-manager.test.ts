/* eslint-disable max-len */

/** Tests source-manager parsing, matching, editing, and serialization. */

import assert from "node:assert/strict";
import test from "node:test";

import {
    buildExistingSourceReference,
    canJoinAuthorDraftRow,
    canSplitAuthorDraftRow,
    changeSourceDraftTemplate,
    createManualSourceDraft,
    ensureNextAuthorDraftRows,
    filterExistingSources,
    findCreatorAliasSuggestions,
    findExistingSource,
    getSourceDraftCitationNameRows,
    joinAuthorDraftRow,
    listExistingSources,
    normalizeSourceUrl,
    parseSourceDraft,
    parseSourceInput,
    parseSourceUrl,
    replaceExistingSource,
    serializeSourceDraft,
    splitAuthorDraftRow,
    type SourceDraft,
} from "citation-formatter/domain/source-manager.ts";
import templateData from "citation-formatter/domain/data/index.ts";
import {
    normalizeTemplateName,
    SUPPORTED_CITATION_TEMPLATES,
} from "citation-formatter/domain/templates.ts";

function getRow(draft: SourceDraft, name: string) {
    const row = draft.rows.find((candidate) => candidate.name === name);
    assert.ok(row, `Missing ${name} row`);
    return row;
}

const testSourceUrlParsing = () => {
    const normal = parseSourceUrl(" https://example.test/a?x=1&amp;y=2 ");
    assert.deepEqual(normal, {
        archiveDate: "",
        archiveUrl: "",
        originalUrl: "https://example.test/a?x=1&y=2",
    });

    const archive = parseSourceUrl(
        "https://web.archive.org/web/20240203040506id_/https://example.test/a?x=1",
    );
    assert.deepEqual(archive, {
        archiveDate: "2024-02-03",
        archiveUrl:
            "https://web.archive.org/web/20240203040506id_/https://example.test/a?x=1",
        originalUrl: "https://example.test/a?x=1",
    });
    assert.equal(
        parseSourceUrl(
            "https://web.archive.org/web/20249999/https://example.test",
        )?.archiveDate,
        "",
    );
    assert.equal(
        parseSourceUrl("https://web.archive.org/web/2024/https://example.test")
            ?.archiveDate,
        "",
    );
    assert.equal(parseSourceUrl("ftp://example.test/file"), null);
    assert.equal(parseSourceUrl("not a url"), null);
};
test("parses normal and Wayback source URLs", testSourceUrlParsing);

test("accepts identifiers and citation text as source input", () => {
    assert.deepEqual(parseSourceInput(" 978-0-306-40615-7 "), {
        archiveDate: "",
        archiveUrl: "",
        originalUrl: "",
        search: "978-0-306-40615-7",
    });
    assert.deepEqual(parseSourceInput("https://example.test/article"), {
        archiveDate: "",
        archiveUrl: "",
        originalUrl: "https://example.test/article",
        search: "https://example.test/article",
    });
    assert.deepEqual(parseSourceInput("ISSN 2049-3630"), {
        archiveDate: "",
        archiveUrl: "",
        originalUrl: "",
        search: "ISSN 2049-3630",
    });
    assert.equal(parseSourceInput("   "), null);
});

const testEncodedWaybackUrl = () => {
    const entered =
        "https://web.archive.org/web/20200102im_/" +
        "https%3A%2F%2Fexample.test%2Fimage%3Fa%3D1";
    const archive = parseSourceUrl(entered);
    assert.deepEqual(archive, {
        archiveDate: "2020-01-02",
        archiveUrl: entered,
        originalUrl: "https://example.test/image?a=1",
    });
};
test("decodes an encoded Wayback target", testEncodedWaybackUrl);

test("makes pasted URL delimiters safe for wikitext", () => {
    assert.deepEqual(parseSourceUrl("https://example.test/a?x=one|two"), {
        archiveDate: "",
        archiveUrl: "",
        originalUrl: "https://example.test/a?x=one%7Ctwo",
    });

    const entered =
        "https://web.archive.org/web/20240203040506/" +
        "https://example.test/a?x=one|two";
    assert.deepEqual(parseSourceUrl(entered), {
        archiveDate: "2024-02-03",
        archiveUrl:
            "https://web.archive.org/web/20240203040506/" +
            "https://example.test/a?x=one%7Ctwo",
        originalUrl: "https://example.test/a?x=one%7Ctwo",
    });
});

test("preserves a hash-routed Wayback target", () => {
    const entered =
        "https://web.archive.org/web/20240203040506/" +
        "https://example.test/#/article";
    assert.deepEqual(parseSourceUrl(entered), {
        archiveDate: "2024-02-03",
        archiveUrl: entered,
        originalUrl: "https://example.test/#/article",
    });
});

const testUrlNormalization = () => {
    const left = normalizeSourceUrl(
        "HTTPS://Example.Test:443/a?z=2&amp;a=1#section",
    );
    const right = normalizeSourceUrl("https://example.test/a?a=1&z=2");
    assert.notEqual(left, right);

    const repeatedLeft = normalizeSourceUrl(
        "https://example.test/a?tag=z&tag=a",
    );
    const repeatedRight = normalizeSourceUrl(
        "https://example.test/a?tag=a&tag=z",
    );
    assert.notEqual(repeatedLeft, repeatedRight);
    assert.notEqual(
        normalizeSourceUrl("https://example.test/a?id=1"),
        normalizeSourceUrl("https://example.test/a?id=2"),
    );
    assert.notEqual(
        normalizeSourceUrl("https://example.test/a?page=one"),
        normalizeSourceUrl("https://example.test/a?page=two"),
    );
};
test(
    "normalizes URL syntax but preserves meaningful queries",
    testUrlNormalization,
);

const testDraftParsing = () => {
    const draft = parseSourceDraft(
        "{{cite web|URL=https://example.test|title=Example|" +
            "author=作者<!-- !no-author # Sakusha -->|" +
            "publisher=会社<!-- !no-author -->|format=PDF|quote=}}",
    );
    const mainNames = draft.rows
        .filter((row) => row.main)
        .map((row) => row.name);
    assert.deepEqual(mainNames, [
        "author",
        "title",
        "url",
        "website",
        "publisher",
        "date",
        "access-date",
        "archive-url",
        "archive-date",
        "url-status",
        "language",
    ]);
    assert.equal(getRow(draft, "website").value, "");
    assert.equal(getRow(draft, "author").value, "作者");
    assert.equal(getRow(draft, "author").alias, "Sakusha");
    assert.equal(getRow(draft, "author").directive, "!no-author");
    assert.equal(getRow(draft, "publisher").value, "会社");
    assert.equal(getRow(draft, "publisher").directive, "!no-author");
    assert.equal(getRow(draft, "format").value, "PDF");
    assert.equal(getRow(draft, "format").main, false);
    assert.equal(getRow(draft, "quote").value, "");
    assert.equal(getRow(draft, "quote").main, false);

    const sentinel = parseSourceDraft(
        "{{cite web|title=__CF_SOURCE_MANAGER_EMPTY_0__}}",
    );
    assert.equal(
        getRow(sentinel, "title").value,
        "__CF_SOURCE_MANAGER_EMPTY_0__",
    );
};
test("seeds editable main fields and separates aliases", testDraftParsing);

test("splits a comma-delimited author into last and first fields", () => {
    const draft = parseSourceDraft(
        "{{cite web|author=Shinji, Noguchi|title=Example}}",
    );
    const author = getRow(draft, "author");
    author.alias = "Noguchi";
    author.directive = "!no-author";
    ensureNextAuthorDraftRows(draft);
    const index = draft.rows.indexOf(author);

    assert.equal(canSplitAuthorDraftRow(draft, index), true);
    assert.equal(splitAuthorDraftRow(draft, index), true);
    assert.equal(getRow(draft, "last").value, "Shinji");
    assert.equal(getRow(draft, "last").alias, "Noguchi");
    assert.equal(getRow(draft, "last").directive, "!no-author");
    assert.equal(getRow(draft, "first").value, "Noguchi");
    assert.equal(getRow(draft, "first").alias, "");
    assert.equal(getRow(draft, "author2").value, "");
    assert.match(
        serializeSourceDraft(draft, "inline"),
        /last = Shinji <!-- !no-author # Noguchi --> \| first = Noguchi/u,
    );
    const lastIndex = draft.rows.indexOf(getRow(draft, "last"));
    assert.equal(canJoinAuthorDraftRow(draft, lastIndex), true);
    assert.equal(joinAuthorDraftRow(draft, lastIndex), true);
    assert.equal(getRow(draft, "author").value, "Shinji, Noguchi");
    assert.equal(getRow(draft, "author").alias, "Noguchi");
    assert.equal(getRow(draft, "author").directive, "!no-author");
    assert.equal(
        draft.rows.some((row) => row.name === "first"),
        false,
    );
});

test("splits an English display name at its final word", () => {
    const draft = parseSourceDraft(
        "{{cite web|author=Tom G. Goodman|title=Example}}",
    );
    const index = draft.rows.indexOf(getRow(draft, "author"));

    assert.equal(splitAuthorDraftRow(draft, index), true);
    assert.equal(getRow(draft, "last").value, "Goodman");
    assert.equal(getRow(draft, "first").value, "Tom G.");
});

test("adds numbered author slots without duplicating them", () => {
    const draft = parseSourceDraft(
        "{{cite web|author1=Shinji, Noguchi|" +
            "author2=Tom G. Goodman|title=Example}}",
    );
    ensureNextAuthorDraftRows(draft);
    ensureNextAuthorDraftRows(draft);

    assert.equal(draft.rows.filter((row) => row.name === "author3").length, 1);
    assert.equal(
        splitAuthorDraftRow(
            draft,
            draft.rows.indexOf(getRow(draft, "author1")),
        ),
        true,
    );
    assert.equal(
        splitAuthorDraftRow(
            draft,
            draft.rows.indexOf(getRow(draft, "author2")),
        ),
        true,
    );
    assert.equal(getRow(draft, "last1").value, "Shinji");
    assert.equal(getRow(draft, "first1").value, "Noguchi");
    assert.equal(getRow(draft, "last2").value, "Goodman");
    assert.equal(getRow(draft, "first2").value, "Tom G.");
    assert.equal(
        joinAuthorDraftRow(draft, draft.rows.indexOf(getRow(draft, "last1"))),
        true,
    );
    assert.equal(getRow(draft, "author1").value, "Shinji, Noguchi");
});

test("retains structured author fields across template changes", () => {
    const draft = parseSourceDraft(
        "{{cite web|author=Tom G. Goodman|title=Example}}",
    );
    splitAuthorDraftRow(draft, draft.rows.indexOf(getRow(draft, "author")));

    const changed = changeSourceDraftTemplate(draft, "cite book");

    assert.equal(getRow(changed, "last").main, true);
    assert.equal(getRow(changed, "first").main, true);
    assert.equal(
        changed.rows.some((row) => row.name === "author"),
        false,
    );
});

test("structures blank and single names without overwriting existing rows", () => {
    const blank = createManualSourceDraft();
    const blankIndex = blank.rows.indexOf(getRow(blank, "author"));
    assert.equal(canSplitAuthorDraftRow(blank, blankIndex), true);
    assert.equal(splitAuthorDraftRow(blank, blankIndex), true);
    assert.equal(getRow(blank, "last").value, "");
    assert.equal(getRow(blank, "first").value, "");
    const blankLastIndex = blank.rows.indexOf(getRow(blank, "last"));
    assert.equal(joinAuthorDraftRow(blank, blankLastIndex), true);
    assert.equal(getRow(blank, "author").value, "");

    const single = parseSourceDraft(
        "{{cite web|author=Mononymous|title=Example}}",
    );
    const singleIndex = single.rows.indexOf(getRow(single, "author"));
    assert.equal(canSplitAuthorDraftRow(single, singleIndex), true);
    assert.equal(splitAuthorDraftRow(single, singleIndex), true);
    assert.equal(getRow(single, "last").value, "Mononymous");
    assert.equal(getRow(single, "first").value, "");

    const collision = parseSourceDraft(
        "{{cite web|author=Tom Goodman|title=Example}}",
    );
    collision.rows.push({
        alias: "",
        directive: "",
        main: false,
        name: "last",
        value: "",
    });
    assert.equal(canSplitAuthorDraftRow(collision, 0), false);
});

test("creates an offline magazine draft without requiring a URL", () => {
    const draft = createManualSourceDraft();
    const mainNames = draft.rows
        .filter((row) => row.main)
        .map((row) => row.name);

    assert.equal(draft.template, "cite magazine");
    assert.deepEqual(mainNames, [
        "author",
        "title",
        "magazine",
        "publisher",
        "date",
        "volume",
        "issue",
        "page",
        "pages",
        "location",
        "issn",
        "language",
        "url",
        "access-date",
        "archive-url",
        "archive-date",
        "url-status",
    ]);
    assert.ok(draft.rows.every((row) => row.value === ""));

    getRow(draft, "title").value = "Offline feature";
    getRow(draft, "magazine").value = "Example Monthly";
    getRow(draft, "date").value = "July 2026";
    getRow(draft, "pages").value = "12–17";
    const citation = serializeSourceDraft(draft, "inline");

    assert.match(citation, /^\{\{Cite magazine \|/u);
    assert.match(citation, /\| magazine = Example Monthly/u);
    assert.match(citation, /\| pages = 12–17/u);
    assert.doesNotMatch(citation, /\| url =/u);
});

test("seeds only common parameters supported by cite tweet", () => {
    const draft = createManualSourceDraft("Cite tweet");
    const mainNames = draft.rows
        .filter((row) => row.main)
        .map((row) => row.name);

    assert.deepEqual(mainNames, [
        "author",
        "user",
        "number",
        "date",
        "title",
        "language",
        "access-date",
        "link",
    ]);
    assert.doesNotMatch(mainNames.join(" "), /\b(?:url|website|publisher)\b/u);
});

test("seeds only parameters supported by each selected template", () => {
    for (const displayName of SUPPORTED_CITATION_TEMPLATES) {
        const name = normalizeTemplateName(displayName);
        const metadata = templateData[name];
        const supported = new Set([
            ...metadata.paramOrder,
            ...Object.keys(metadata.aliases),
            ...Object.values(metadata.aliases).flat(),
        ]);
        const draft = createManualSourceDraft(displayName);
        for (const row of draft.rows.filter((candidate) => candidate.main)) {
            assert.ok(supported.has(row.name), `${displayName}: ${row.name}`);
        }
    }
});

test("changes manual citation types without losing entered fields", () => {
    const draft = createManualSourceDraft();
    getRow(draft, "author").value = "作者";
    getRow(draft, "author").alias = "Sakusha";
    getRow(draft, "title").value = "Collected work";
    getRow(draft, "magazine").value = "Example Monthly";
    draft.rows.push({
        alias: "",
        directive: "",
        main: false,
        name: "quote",
        value: "Preserved note",
    });

    const changed = changeSourceDraftTemplate(draft, "Cite book");

    assert.equal(changed.template, "cite book");
    assert.equal(getRow(changed, "author").value, "作者");
    assert.equal(getRow(changed, "author").alias, "Sakusha");
    assert.equal(getRow(changed, "title").value, "Collected work");
    assert.equal(getRow(changed, "work").value, "Example Monthly");
    assert.equal(getRow(changed, "quote").value, "Preserved note");
    assert.equal(
        changed.rows.some((row) => row.name === "magazine"),
        false,
    );
    assert.ok(getRow(changed, "isbn").main);
});

test("preserves populated unsupported fields as extras on type changes", () => {
    const draft = createManualSourceDraft("Cite web");
    getRow(draft, "title").value = "Example tweet";
    getRow(draft, "url").value = "https://example.test/tweet";

    const changed = changeSourceDraftTemplate(draft, "Cite tweet");

    assert.equal(getRow(changed, "url").value, "https://example.test/tweet");
    assert.equal(getRow(changed, "url").main, false);
    assert.equal(
        changed.rows.some((row) => row.name === "website"),
        false,
    );
    assert.equal(
        changed.rows.some((row) => row.name === "publisher"),
        false,
    );
});

test("maps a periodical field when changing manual citation types", () => {
    const draft = createManualSourceDraft();
    getRow(draft, "title").value = "Print feature";
    getRow(draft, "magazine").value = "Example Monthly";

    const changed = changeSourceDraftTemplate(draft, "Cite web");

    assert.equal(getRow(changed, "website").value, "Example Monthly");
    assert.equal(
        changed.rows.some((row) => row.name === "magazine"),
        false,
    );
    assert.match(
        serializeSourceDraft(changed, "inline"),
        /\| website = Example Monthly/u,
    );
});

test("rejects colliding populated aliases instead of dropping one", () => {
    const draft = createManualSourceDraft();
    getRow(draft, "magazine").value = "Magazine A";
    draft.rows.push({
        alias: "",
        directive: "",
        main: false,
        name: "work",
        value: "Work B",
    });

    const changed = changeSourceDraftTemplate(draft, "Cite book");

    assert.equal(getRow(changed, "work").value, "Work B");
    assert.equal(getRow(changed, "magazine").value, "Magazine A");
    assert.throws(
        () => serializeSourceDraft(changed, "inline"),
        /magazine and work both map to work|work and magazine both map to work/u,
    );
});

const testDraftSerialization = () => {
    const draft = parseSourceDraft("{{cite web|title=Example}}");
    getRow(draft, "author").value = "作者";
    getRow(draft, "author").alias = "Sakusha";
    getRow(draft, "author").directive = "!no-author";
    getRow(draft, "url").value = "https://example.test";
    getRow(draft, "access-date").value = "June 7, 2025";

    const inline = serializeSourceDraft(draft, "inline");
    assert.equal(
        inline,
        "{{Cite web | author = 作者 <!-- !no-author # Sakusha --> | " +
            "title = Example | url = https://example.test | " +
            "access-date = 2025-06-07}}",
    );
    const block = serializeSourceDraft(draft);
    assert.match(block, /^\{\{Cite web\n  \| author =/u);
    assert.doesNotMatch(block, /\| website =/u);

    getRow(draft, "website").alias = "Ignored without a value";
    assert.doesNotMatch(serializeSourceDraft(draft, "inline"), /website/u);
};
test(
    "serializes populated source fields in both layouts",
    testDraftSerialization,
);

test("identifies fields actively forming a generated reference name", () => {
    const draft = parseSourceDraft(
        "{{cite web|author=Noguchi, Shinji|date=2007-06-18|" +
            "page=2|title=Long interview|website=Example}}",
    );
    const indexes = getSourceDraftCitationNameRows(draft);
    const names = draft.rows
        .filter((_row, index) => indexes.has(index))
        .map((row) => row.name);

    assert.deepEqual(names, ["author", "date", "page"]);
});

test("highlights eligible fallback name fields after directives", () => {
    const draft = parseSourceDraft(
        "{{cite web|author=Author<!-- !no-author -->|" +
            "website=Example Site|date=2025<!-- !no-date -->|year=2007|" +
            "page=1<!-- !no-part -->|pages=2–3|title=Example}}",
    );
    const indexes = getSourceDraftCitationNameRows(draft);
    const names = draft.rows
        .filter((_row, index) => indexes.has(index))
        .map((row) => row.name);

    assert.deepEqual(names, ["website", "year", "pages"]);
});

test("suggests creator aliases previously used in other source roles", () => {
    const sources = listExistingSources(
        '<ref name="Noguchi, 2007">{{Cite interview|' +
            "interviewer=野口伸二<!-- # Noguchi, Shinji -->|" +
            "date=2007|title=Interview}}</ref>",
    );
    const suggestions = findCreatorAliasSuggestions(sources, {
        alias: "",
        directive: "",
        main: false,
        name: "author2",
        value: "野口伸二",
    });

    assert.deepEqual(suggestions, [{ alias: "Noguchi, Shinji", count: 1 }]);
});

test("keeps conflicting creator alias suggestions explicit", () => {
    const sources = listExistingSources(
        [
            '<ref name="A">{{Cite web|author=',
            "[[野口伸二]]<!-- # Noguchi, Shinji -->|title=A}}</ref>",
            '<ref name="B">{{Cite web|author=',
            "野口伸二<!-- # Shinji Noguchi -->|title=B}}</ref>",
        ].join(""),
    );
    const suggestions = findCreatorAliasSuggestions(sources, {
        alias: "",
        directive: "",
        main: false,
        name: "translator-last",
        value: " 野口伸二 ",
    });

    assert.deepEqual(suggestions, [
        { alias: "Noguchi, Shinji", count: 1 },
        { alias: "Shinji Noguchi", count: 1 },
    ]);
});

const testExistingSourceListing = () => {
    const text = [
        "Lead.",
        '<references><ref name="A &amp; B" group="note">',
        "{{cite web|title=Example|url=https://example.test/a}}",
        "</ref></references>",
    ].join("");
    const [source] = listExistingSources(text);

    assert.equal(source.referenceName, "A & B");
    assert.equal(source.group, "note");
    assert.equal(source.title, "Example");
    assert.equal(source.url, "https://example.test/a");
    assert.equal(
        source.rawTemplate,
        text.slice(source.templateStart, source.templateEnd),
    );
    assert.equal(
        source.rawReference,
        text.slice(source.referenceStart, source.referenceEnd),
    );
    assert.equal(source.reuseText, '<ref name="A & B" group="note" />');
    assert.equal(buildExistingSourceReference(source), source.reuseText);
    assert.equal(
        buildExistingSourceReference(source, true),
        '<ref name="A & B" group="note" />',
    );
    assert.equal(
        buildExistingSourceReference(
            { group: "", rawReference: "", referenceName: "Plain" },
            true,
        ),
        "{{r|Plain}}",
    );
};
test(
    "lists source definitions with exact ranges and reuse tags",
    testExistingSourceListing,
);

test("filters existing sources by all entered keywords", () => {
    const sources = listExistingSources(
        [
            '<ref name="Alpha">',
            "{{cite web|author=Jane Doe|title=First report|" +
                "url=https://example.test/alpha|publisher=Example Press}}",
            "</ref>",
            '<ref name="Beta" group="note">',
            "{{cite book|author=John Roe|title=Second report|" +
                "url=https://books.test/beta|publisher=Other House}}",
            "</ref>",
        ].join(""),
    );

    assert.deepEqual(
        filterExistingSources(sources, "JANE press").map(
            (source) => source.referenceName,
        ),
        ["Alpha"],
    );
    assert.deepEqual(
        filterExistingSources(sources, "cite book NOTE").map(
            (source) => source.referenceName,
        ),
        ["Beta"],
    );
    assert.deepEqual(
        filterExistingSources(sources, "books second").map(
            (source) => source.referenceName,
        ),
        ["Beta"],
    );
    assert.deepEqual(filterExistingSources(sources, "report"), sources);
    assert.deepEqual(filterExistingSources(sources, "missing"), []);
    assert.equal(filterExistingSources(sources, "   "), sources);
});

test("inherits groups from references containers", () => {
    const text = [
        '<references group="note">',
        '<ref name="Grouped">',
        "{{cite web|title=Grouped|url=https://grouped.test}}",
        "</ref></references>",
    ].join("");
    const [source] = listExistingSources(text);

    assert.equal(source.group, "note");
    assert.equal(
        buildExistingSourceReference(source),
        '<ref name="Grouped" group="note" />',
    );
});

test("inherits groups from Reflist refs parameters", () => {
    const text = [
        "{{Reflist|group=note|refs=",
        '<ref name="Grouped">',
        "{{cite web|title=Grouped|url=https://grouped.test}}",
        "</ref>}}",
    ].join("");
    const [source] = listExistingSources(text);

    assert.equal(source.group, "note");
    assert.equal(
        buildExistingSourceReference(source),
        '<ref name="Grouped" group="note" />',
    );
});

test("lists compact R definitions for native reuse", () => {
    const open = "{" + "{";
    const text = [
        "Lead.",
        "<references>",
        open,
        "r|name='Compact'|ref=",
        open,
        "cite web|title=Compact|url=https://compact.test}}}}",
        "</references>",
    ].join("");
    const [source] = listExistingSources(text);

    assert.equal(source.referenceName, "Compact");
    assert.equal(source.url, "https://compact.test");
    assert.equal(source.reuseText, '<ref name="Compact" />');
});

const testUnnamedSourceReuse = () => {
    const text =
        "Text<ref>{{cite web|title=Example|url=https://example.test}}</ref>";
    const [source] = listExistingSources(text);
    assert.equal(source.referenceName, "");
    assert.equal(source.reuseText, source.rawReference);
};
test(
    "duplicates a full unnamed ref when it cannot be reused",
    testUnnamedSourceReuse,
);

const testProtectedSources = () => {
    const protectedTags = [
        "<!-- %s -->",
        "<nowiki>%s</nowiki>",
        "<pre>%s</pre>",
        "<source>%s</source>",
        "<syntaxhighlight>%s</syntaxhighlight>",
        "<math>%s</math>",
    ];
    const ref = "<ref>{{cite web|url=https://hidden.test|title=Hidden}}</ref>";
    const hidden = protectedTags.map((wrapper) => wrapper.replace("%s", ref));
    const visible =
        "<ref>{{cite web|url=https://visible.test|title=Visible}}</ref>";
    const sources = listExistingSources([...hidden, visible].join("\n"));
    assert.equal(sources.length, 1);
    assert.equal(sources[0].title, "Visible");

    const brokenExamples = [
        `<!-- <ref> -->${visible}`,
        `<nowiki><ref></nowiki>${visible}`,
    ];
    for (const source of brokenExamples) {
        assert.equal(listExistingSources(source)[0]?.title, "Visible");
    }
};
test("ignores sources in protected wikitext", testProtectedSources);

test("ignores citation examples in templatedata", () => {
    const example =
        '<ref name="Example">' +
        "{{cite web|url=https://example.test|title=Example}}" +
        "</ref>";
    const visible =
        '<ref name="Visible">' +
        "{{cite web|url=https://visible.test|title=Visible}}" +
        "</ref>";
    const sources = listExistingSources(
        `<templatedata>${example}</templatedata>${visible}`,
    );

    assert.equal(sources.length, 1);
    assert.equal(sources[0].referenceName, "Visible");
});

const testExistingSourceMatching = () => {
    const archive =
        "https://web.archive.org/web/20240203040506/" +
        "https://example.test/story?edition=one";
    const text =
        '<ref name="Story">{{cite web|title=Story|' +
        "url=https://example.test/story?edition=one&b=2&a=1|" +
        `archive-url=${archive}}}</ref>`;
    const original = findExistingSource(
        text,
        "https://example.test/story?edition=one&b=2&a=1#part",
    );
    const archived = findExistingSource(text, archive);
    const reordered = findExistingSource(
        text,
        "https://example.test/story?b=2&a=1&edition=one",
    );
    const different = findExistingSource(
        text,
        "https://example.test/story?edition=two&b=2&a=1",
    );
    const differentPage = findExistingSource(
        text,
        "https://example.test/story?edition=one&b=2&a=1&page=7",
    );
    assert.equal(original?.referenceName, "Story");
    assert.equal(archived?.referenceName, "Story");
    assert.equal(reordered, null);
    assert.equal(different, null);
    assert.equal(differentPage, null);
};
test(
    "matches original and Wayback URLs without false query matches",
    testExistingSourceMatching,
);

test("prefers a later reusable match over an earlier anonymous ref", () => {
    const url = "https://example.test/reused";
    const text = [
        `<ref>{{cite web|title=Anonymous|url=${url}}}</ref>`,
        '<ref name="Reusable">',
        `{{cite web|title=Reusable|url=${url}}}`,
        "</ref>",
    ].join("");

    const source = findExistingSource(text, url);
    assert.equal(source?.referenceName, "Reusable");
    assert.equal(source?.reuseText, '<ref name="Reusable" />');
});

const testExistingSourceReplacement = () => {
    const text =
        '<ref name="Old">Before {{cite web|title=Old|' +
        "url=https://example.test}} after</ref>";
    const [source] = listExistingSources(text);
    getRow(source.draft, "title").value = "New";
    getRow(source.draft, "publisher").value = "Publisher";
    const updated = replaceExistingSource(
        text,
        source,
        source.draft,
        "inline",
    );
    assert.equal(
        updated,
        '<ref name="Old">Before {{Cite web | title = New | ' +
            "url = https://example.test | publisher = Publisher}} after</ref>",
    );
    assert.throws(
        () => replaceExistingSource(`x${text}`, source, source.draft),
        /changed/u,
    );
};
test(
    "replaces only the selected citation template",
    testExistingSourceReplacement,
);
