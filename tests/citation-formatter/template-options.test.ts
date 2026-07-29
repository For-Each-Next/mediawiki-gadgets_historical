/**
 * Tests citation-template selector tiers and important-template icons.
 */

import assert from "node:assert/strict";
import test from "node:test";

import * as templates from "citation-formatter/domain/templates.ts";
import {
    CITATION_TEMPLATE_OPTIONS,
    CITATION_TEMPLATE_TIERS,
} from "citation-formatter/ui/citation-template-options.ts";
import { cdxIconNewspaper } from "@wikimedia/codex-icons";

test("orders citation templates by importance and specificity", () => {
    const expectedNames = [
        ...CITATION_TEMPLATE_TIERS.importantSpecial,
        ...CITATION_TEMPLATE_TIERS.importantGeneral,
        ...CITATION_TEMPLATE_TIERS.normalSpecial,
        ...CITATION_TEMPLATE_TIERS.normalGeneral,
    ];

    assert.deepEqual(
        CITATION_TEMPLATE_OPTIONS.map((option) => option.label),
        expectedNames,
    );
    assert.deepEqual(
        new Set(expectedNames),
        new Set(templates.SUPPORTED_CITATION_TEMPLATES),
    );
});

test("classifies tweet and AV media templates as important general", () => {
    const normalImportantNames = [
        "Cite tweet",
        "Cite AV media",
        "Cite AV media notes",
    ];
    const importantGeneralNames = new Set<string>(
        CITATION_TEMPLATE_TIERS.importantGeneral,
    );
    const importantSpecialNames = new Set<string>(
        CITATION_TEMPLATE_TIERS.importantSpecial,
    );

    for (const name of normalImportantNames) {
        assert.ok(importantGeneralNames.has(name));
        assert.ok(!importantSpecialNames.has(name));
    }
});

test("shows icons only for important templates", () => {
    const importantNames = new Set<string>([
        ...CITATION_TEMPLATE_TIERS.importantSpecial,
        ...CITATION_TEMPLATE_TIERS.importantGeneral,
    ]);

    for (const option of CITATION_TEMPLATE_OPTIONS) {
        assert.equal(option.icon != null, importantNames.has(option.label));
    }
});

test("uses a newspaper icon for Cite news", () => {
    const citeNews = CITATION_TEMPLATE_OPTIONS.find(
        (option) => option.label === "Cite news",
    );

    assert.deepEqual(citeNews?.icon, cdxIconNewspaper);
});
