/** Tests shared citation-domain parsing and encoding primitives. */

import assert from "node:assert/strict";
import test from "node:test";

import {
    isCalendarDayWithinUtcMonth,
    isGregorianCalendarDate,
} from "citation-formatter/domain/calendar-date.ts";
import {
    findCitationFormattingProtectedRanges,
    findCitationManagementProtectedRanges,
    findSourceDiscoveryProtectedRanges,
    isInWikitextRanges,
    maskWikitextRanges,
} from "citation-formatter/domain/protected-wikitext.ts";
import {
    decodeReferenceAttribute,
    escapeQuotedAttribute,
    escapeReferenceName,
    formatReferenceGroupAttribute,
    stripOptionalReferenceNameQuotes,
} from "citation-formatter/domain/ref-attributes.ts";

test("validates real Gregorian calendar days", () => {
    assert.equal(isGregorianCalendarDate(2024, 2, 29), true);
    assert.equal(isGregorianCalendarDate("2023", "02", "29"), false);
    assert.equal(isGregorianCalendarDate(2024, 13, 1), false);
    assert.equal(isGregorianCalendarDate(2024, 1, 0), false);
    assert.equal(isGregorianCalendarDate("0001", 1, 1), false);
    assert.equal(isCalendarDayWithinUtcMonth("0001", 1, 1), true);
});

test("keeps each citation workflow's protected-tag policy", () => {
    const text = [
        "before",
        "<!-- hidden -->",
        "<code>{{cite web|title=Code}}</code>",
        "<templatedata>{{cite web|title=Data}}</templatedata>",
        "after",
    ].join("");
    const codeOffset = text.indexOf("<code>");
    const templateDataOffset = text.indexOf("<templatedata>");
    const formatting = findCitationFormattingProtectedRanges(text);
    const management = findCitationManagementProtectedRanges(text);
    const discovery = findSourceDiscoveryProtectedRanges(text);

    assert.equal(isInWikitextRanges(codeOffset, formatting), true);
    assert.equal(isInWikitextRanges(codeOffset, management), false);
    assert.equal(isInWikitextRanges(templateDataOffset, formatting), false);
    assert.equal(isInWikitextRanges(templateDataOffset, discovery), true);

    const masked = maskWikitextRanges(text, discovery);
    assert.equal(masked.length, text.length);
    for (const [start, end] of discovery) {
        assert.equal(masked.slice(start, end), " ".repeat(end - start));
    }
});

test("preserves historical reference-attribute entity policies", () => {
    assert.equal(
        decodeReferenceAttribute("A&amp;B&#38;C&#x26;D&quot;"),
        'A&B&C&D"',
    );
    assert.equal(escapeQuotedAttribute('A&B"'), "A&amp;B&quot;");
    assert.equal(escapeReferenceName('A&amp;"'), "A&&quot;");
    assert.equal(escapeReferenceName('A&AMP;"'), "A&AMP;&quot;");
    assert.equal(
        escapeReferenceName('A&AMP;"', {
            caseInsensitiveAmpEntity: true,
        }),
        "A&&quot;",
    );
    assert.equal(
        formatReferenceGroupAttribute('note & "quote"'),
        ' group="note &amp; &quot;quote&quot;"',
    );
    assert.equal(stripOptionalReferenceNameQuotes(" 'Example' "), "Example");
});
