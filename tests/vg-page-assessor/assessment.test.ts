/**
 * Characterizes talk-page assessment transformations.
 */

import assert from "node:assert/strict";
import test from "node:test";

import projectConfig from "vg-page-assessor/config/project-config.ts";
import {
    createDefaultAssessment,
    getExistingOtherProjectOptions,
    getTalkPageTopSection,
    parseAssessment,
    previewTalkPageTopSection,
    updateTalkPageAssessment,
    updateTalkPageTopSection,
} from "vg-page-assessor/domain/assessment.ts";

test("preserves custom assessment values from recognizable source", () => {
    const source = [
        "{{WikiProject banner shell|class=Future|1=",
        "{{WikiProject Video games|importance=Critical}}",
        "}}",
    ].join("\n");
    const parsed = parseAssessment(projectConfig, source);

    assert.ok(parsed);
    assert.equal(parsed.className, "Future");
    assert.equal(parsed.importance, "Critical");
    assert.equal(parseAssessment(projectConfig, "{{Unmanaged}}"), null);
});

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

test("reassesses a shell after unmanaged lead templates in place", () => {
    const source = [
        "{{DYKtalk|date=2026-07-26}}",
        "{{WikiProject banner shell|class=Unassessed|1=",
        "{{WikiProject Electronic games|MiHoYo=yes|importance=low}}",
        "{{WikiProject Fictional characters}}",
        "}}",
        "{{Refideas|{{cite web|title=Source|url=https://example.com}}}}",
    ].join("\n");
    const assessment = createDefaultAssessment(projectConfig, source);

    assert.equal(assessment.className, "Unassessed");
    assert.equal(assessment.importance, "Low");
    assert.equal(assessment.taskForces.mihoyo, true);
    assert.equal(assessment.otherProjects.fictionalCharacters, true);

    assessment.className = "B";

    assert.equal(
        updateTalkPageAssessment(source, assessment, projectConfig),
        source.replace("class=Unassessed", "class=B"),
    );
});

test("adds controls for other conventional banners inside the shell", () => {
    const source = [
        "{{WikiProject banner shell|class=Start|1=",
        "{{WikiProject Video games|importance=Low}}",
        "{{WikiProject Role-playing games|importance=Low|custom=yes}}",
        "{{某某專題|foo=yes}}",
        "}}",
    ].join("\n");
    const options = getExistingOtherProjectOptions(source, projectConfig);
    const assessment = createDefaultAssessment(projectConfig, source);

    assert.deepEqual(
        options.map((option) => option.label),
        ["Role-playing games", "某某"],
    );
    assert.ok(options.every((option) => option.id.startsWith("existing:")));
    assert.ok(options.every((option) => assessment.otherProjects[option.id]));
    assert.equal(
        updateTalkPageAssessment(source, assessment, projectConfig),
        source,
    );

    assessment.otherProjects[options[0].id] = false;
    const result = updateTalkPageAssessment(source, assessment, projectConfig);

    assert.doesNotMatch(result, /WikiProject Role-playing games/u);
    assert.match(result, /\{\{某某專題\|foo=yes\}\}/u);
});

test("does not create dynamic controls for standalone templates", () => {
    const source = "{{WikiProject Role-playing games|importance=Low}}";

    assert.deepEqual(
        getExistingOtherProjectOptions(source, projectConfig),
        [],
    );
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
