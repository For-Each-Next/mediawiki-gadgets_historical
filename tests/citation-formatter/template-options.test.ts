/**
 * Tests citation-template selector tiers and important-template icons.
 */

import assert from "node:assert/strict";
import test from "node:test";

import * as templates from "citation-formatter/domain/templates.ts";
import {
    CITATION_TEMPLATE_DEFINITIONS,
    CITATION_TEMPLATE_OPTIONS,
} from "citation-formatter/ui/citation-template-options.ts";
import { cdxIconNewspaper } from "@wikimedia/codex-icons";

test("orders citation templates by importance and specificity", () => {
    const expectedNames = CITATION_TEMPLATE_DEFINITIONS.map(
        (definition) => definition.name,
    );

    assert.deepEqual(
        CITATION_TEMPLATE_OPTIONS.map((option) => option.label),
        expectedNames,
    );
    assert.deepEqual(
        new Set(expectedNames),
        new Set(templates.SUPPORTED_CITATION_TEMPLATES),
    );
});

test("classifies tweet and AV media templates as normal special", () => {
    const normalTemplateNames = [
        "Cite tweet",
        "Cite AV media",
        "Cite AV media notes",
    ];

    for (const name of normalTemplateNames) {
        const definition = CITATION_TEMPLATE_DEFINITIONS.find(
            (candidate) => candidate.name === name,
        );
        const option = CITATION_TEMPLATE_OPTIONS.find(
            (candidate) => candidate.label === name,
        );

        assert.equal(definition?.importance, "normal");
        assert.equal(definition?.type, "special");
        assert.equal(option?.icon, undefined);
    }
});

test("shows icons only for important templates", () => {
    for (const definition of CITATION_TEMPLATE_DEFINITIONS) {
        const option = CITATION_TEMPLATE_OPTIONS.find(
            (candidate) => candidate.label === definition.name,
        );
        assert.equal(
            option?.icon != null,
            definition.importance === "important",
        );
    }
});

test("uses a newspaper icon for Cite news", () => {
    const citeNews = CITATION_TEMPLATE_OPTIONS.find(
        (option) => option.label === "Cite news",
    );

    assert.deepEqual(citeNews?.icon, cdxIconNewspaper);
});
