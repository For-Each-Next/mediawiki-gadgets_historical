/** Tests mapping live enwiki and zhwiki CS1 output to draft fields. */

import assert from "node:assert/strict";
import test from "node:test";

import { parseCs1ValidationResult } from "citation-formatter/domain/cs1-validation.ts";
import {
    parseSourceDraft,
    type SourceDraft,
} from "citation-formatter/domain/source-manager.ts";

function getRowIndex(draft: SourceDraft, name: string): number {
    const index = draft.rows.findIndex((row) => row.name === name);
    assert.notEqual(index, -1, `Missing ${name} row`);
    return index;
}

test("maps enwiki name-list and ignored-parameter errors", () => {
    const draft = parseSourceDraft(
        "{{cite web|last=Hatsushiba|first=Hiroya|" +
            "vauthors=Hicks, Jon|book-title=Collected interviews}}",
    );
    const html = [
        '<span class="cs1-visible-error citation-comment">',
        "More than one of author-name-list parameters specified",
        "</span>",
        '<span class="cs1-visible-error citation-comment">',
        "Unknown parameter <code>&#124;book-title=</code> ignored",
        "</span>",
    ].join("");

    const result = parseCs1ValidationResult(draft, html);

    assert.match(
        result.cellErrors.get(getRowIndex(draft, "last"))?.value ?? "",
        /author-name-list/u,
    );
    assert.match(
        result.cellErrors.get(getRowIndex(draft, "vauthors"))?.value ?? "",
        /author-name-list/u,
    );
    assert.match(
        result.cellErrors.get(getRowIndex(draft, "book-title"))?.name ?? "",
        /ignored/u,
    );
    assert.equal(result.issueCount, 2);
    assert.deepEqual(result.messages, []);
});

test("maps zhwiki citation-comment errors through local aliases", () => {
    const draft = parseSourceDraft(
        "{{cite web|title=示例|archive-url=https://archive.example|" +
            "vauthors=Hicks J|bad-param=value}}",
    );
    const html = [
        '<span style="font-size:100%" class="error citation-comment">' +
            "使用<code>&#124;archiveurl=</code>需要含有" +
            "<code>&#124;url=</code></span>",
        '<span class="error citation-comment">' +
            "已忽略未知参数<code>&#124;bad-param=</code></span>",
        '<span class="error citation-comment">温哥华格式错误</span>',
    ].join("");

    const result = parseCs1ValidationResult(draft, html, [
        "引文格式1维护：日期与年",
    ]);

    assert.match(
        result.cellErrors.get(getRowIndex(draft, "archive-url"))?.value ?? "",
        /archiveurl/u,
    );
    assert.match(
        result.cellErrors.get(getRowIndex(draft, "url"))?.value ?? "",
        /需要含有/u,
    );
    assert.match(
        result.cellErrors.get(getRowIndex(draft, "bad-param"))?.name ?? "",
        /未知参数/u,
    );
    assert.match(
        result.cellErrors.get(getRowIndex(draft, "vauthors"))?.value ?? "",
        /温哥华格式/u,
    );
    assert.deepEqual(result.messages, ["引文格式1维护：日期与年"]);
    assert.equal(result.issueCount, 4);
});
