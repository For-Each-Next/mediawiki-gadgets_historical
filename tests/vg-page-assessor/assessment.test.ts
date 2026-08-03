/**
 * Characterizes talk-page assessment transformations.
 */

import assert from "node:assert/strict";
import test from "node:test";

import projectConfig from "vg-page-assessor/config/project-config.ts";
import {
    createDefaultAssessment,
    getTalkPageTopSection,
    previewTalkPageTopSection,
    updateTalkPageAssessment,
    updateTalkPageTopSection,
} from "vg-page-assessor/domain/assessment.ts";

test("preserves unmanaged banners and talk-page discussion content", () => {
    const source = [
        "{{WikiProject banner shell|class=B|1=",
        "{{WikiProject Anime}}",
        "{{WikiProject Video games|importance=Low|Sega=yes}}",
        "}}",
        "{{Unmanaged banner|custom=yes}}",
        "",
        "== Discussion ==",
        "Keep this discussion exactly.",
    ].join("\n");
    const assessment = createDefaultAssessment(projectConfig);

    assessment.className = "Start";
    assessment.importance = "Mid";
    assessment.taskForces.pokemon = true;

    const result = updateTalkPageAssessment(source, assessment, projectConfig);

    assert.match(result, /\{\{WikiProject Anime\}\}/u);
    assert.match(result, /\{\{Unmanaged banner\|custom=yes\}\}/u);
    assert.match(
        result,
        /\{\{WikiProject Video games\|importance=Mid\|Pokemon=yes\}\}/u,
    );
    assert.doesNotMatch(result, /Sega=yes/u);
    assert.equal(
        result.slice(result.indexOf("== Discussion ==")),
        "== Discussion ==\nKeep this discussion exactly.",
    );
});

test("recognizes zhwiki template namespace aliases", () => {
    const source = [
        "{{T:WikiProject banner shell|class=B|1=",
        "{{樣板:WikiProject Anime}}",
        "{{模板:WikiProject Video games|importance=Low|Sega=yes}}",
        "}}",
        "",
        "== Discussion ==",
        "Body",
    ].join("\n");
    const assessment = createDefaultAssessment(projectConfig);

    assessment.className = "C";
    assessment.importance = "High";
    const result = updateTalkPageAssessment(source, assessment, projectConfig);

    assert.match(result, /\{\{樣板:WikiProject Anime\}\}/u);
    assert.match(result, /\{\{WikiProject Video games\|importance=High\}\}/u);
    assert.doesNotMatch(result, /Sega=yes/u);
});

test("preview is exactly the transformed talk-page top section", () => {
    const source = [
        "{{WikiProject Anime}}",
        "",
        "== Discussion ==",
        "Body",
    ].join("\n");
    const assessment = createDefaultAssessment(projectConfig);

    assessment.className = "C";
    assessment.importance = "High";
    const transformed = updateTalkPageAssessment(
        source,
        assessment,
        projectConfig,
    );

    assert.equal(
        previewTalkPageTopSection(source, assessment, projectConfig),
        getTalkPageTopSection(transformed),
    );
});

test("replaces only the reviewed top section", () => {
    const current = [
        "{{Old banner}}",
        "",
        "== Discussion ==",
        "Concurrent body",
    ].join("\n");
    const reviewed = "{{Reviewed banner}}\n{{Second reviewed banner}}";

    assert.equal(
        updateTalkPageTopSection(current, reviewed),
        [
            "{{Reviewed banner}}",
            "{{Second reviewed banner}}",
            "",
            "== Discussion ==",
            "Concurrent body",
        ].join("\n"),
    );
});

test("preserves reviewed top-section whitespace exactly", () => {
    const current = "Old lead\n\n== Discussion ==\nBody";
    const reviewed = "  {{Reviewed banner}}\n\n\n";

    assert.equal(
        updateTalkPageTopSection(current, reviewed),
        `${reviewed}== Discussion ==\nBody`,
    );
    assert.equal(
        updateTalkPageTopSection("Old page without headings", reviewed),
        reviewed,
    );
});
