/**
 * Characterizes the Vue/Codex assessment dialog presentation.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { compileTemplate, parse } from "@vue/compiler-sfc";
import { createLogger } from "@mediawiki-gadgets/shared/logging";

import projectConfig from "vg-page-assessor/config/project-config.ts";
import type {
    DialogSaveReview,
    DialogState,
    PageAssessorRuntime,
} from "vg-page-assessor/contracts/dialog.ts";
import * as assessment from "vg-page-assessor/domain/assessment.ts";
// eslint-disable-next-line max-len
import type { WikitextComparison } from "vg-page-assessor/domain/wikitext-comparison.ts";
import type { VueApp, VueModule, VueRef } from "vg-page-assessor/ui/codex.ts";
import {
    WIKITEXT_COMPARISON_STYLES,
    WIKITEXT_COMPARISON_TEMPLATE,
} from "vg-page-assessor/ui/components/wikitext-comparison.ts";
import { buildEditSummary } from "vg-page-assessor/ui/assessment-summary.ts";
import {
    CLASS_OPTIONS,
    KNOWN_CLASS_OPTIONS,
    includeAssessmentValue,
} from "vg-page-assessor/ui/assessment-options.ts";
import {
    ASSESSMENT_DIALOG_STYLES,
    ASSESSMENT_DIALOG_TEMPLATE,
    createAssessmentDialogBindings,
} from "vg-page-assessor/ui/dialogs/assessment-dialog.ts";

const dialogPath = fileURLToPath(
    new URL(
        "../../src/vg-page-assessor/ui/dialogs/assessment-dialog.vue",
        import.meta.url,
    ),
);
const comparisonPath = fileURLToPath(
    new URL(
        "../../src/vg-page-assessor/ui/components/wikitext-comparison.vue",
        import.meta.url,
    ),
);
const comparisonStylesPath = fileURLToPath(
    new URL(
        "../../src/vg-page-assessor/ui/components/wikitext-comparison.css",
        import.meta.url,
    ),
);

test("keeps the assessment dialog template-only and compilable", () => {
    const source = readFileSync(dialogPath, "utf8");
    const parsed = parse(source, { filename: dialogPath });
    const template = parsed.descriptor.template;

    assert.deepEqual(parsed.errors, []);
    assert.ok(template);
    assert.equal(parsed.descriptor.script, null);
    assert.deepEqual(parsed.descriptor.styles, []);
    assert.match(template.content, /^\s*<cdx-dialog\b/u);
    assert.match(template.content, /:title="subjectTitle"/u);
    assert.doesNotMatch(template.content, /\bv-html\b/u);
    assert.match(template.content, /<cdx-radio\b/u);
    assert.match(template.content, /<cdx-checkbox\b/u);
    assert.match(template.content, /<cdx-text-area\b/u);
    assert.match(template.content, /<cdx-progress-bar\s+v-if="saving"/u);
    assert.doesNotMatch(template.content, /registrationLoading/u);
    assert.match(template.content, /avgp-comparison-field/u);
    assert.equal(
        [...template.content.matchAll(/<wikitext-comparison\b/gu)].length,
        2,
    );
    assert.match(template.content, /v-if="!registrationEligible"/u);
    assert.match(template.content, /<cdx-checkbox\s+v-else/u);
    const compiled = compileTemplate({
        filename: dialogPath,
        id: "vg-page-assessor-assessment",
        source: template.content,
    });
    assert.deepEqual(compiled.errors, []);
});

test("keeps build-injected dialog assets safe in Node", () => {
    assert.equal(ASSESSMENT_DIALOG_TEMPLATE, "");
    assert.equal(ASSESSMENT_DIALOG_STYLES, "");
    assert.equal(WIKITEXT_COMPARISON_TEMPLATE, "");
    assert.equal(WIKITEXT_COMPARISON_STYLES, "");
});

test("hides non-default assessment classes unless they are current", () => {
    const hiddenValues = ["Substub", "D", "B+", "GA", "A", "AL", "FA", "FL"];

    assert.deepEqual(
        CLASS_OPTIONS.map((option) => option.value),
        ["Unassessed", "Stub", "Start", "C", "B", "SL", "List", "CL", "BL"],
    );

    for (const value of hiddenValues) {
        const options = includeAssessmentValue(
            CLASS_OPTIONS,
            value,
            KNOWN_CLASS_OPTIONS,
        );
        const localized = KNOWN_CLASS_OPTIONS.find(
            (option) => option.value === value,
        );

        assert.deepEqual(options.at(-1), localized);
    }
});

test("uses MediaWiki markup for wikitext comparisons", () => {
    const source = readFileSync(comparisonPath, "utf8");
    const parsed = parse(source, { filename: comparisonPath });
    const template = parsed.descriptor.template;

    assert.deepEqual(parsed.errors, []);
    assert.ok(template);
    assert.match(
        template.content,
        /<table class="diff avgp-comparison__table">/u,
    );
    assert.match(template.content, /'diff-deletedline':/u);
    assert.match(template.content, /'diff-addedline':/u);
    assert.match(template.content, /<del\b/u);
    assert.match(template.content, /<ins\b/u);
    assert.doesNotMatch(template.content, /<cdx-card\b/u);
    assert.match(template.content, /comparison\.rows/u);
    assert.match(template.content, /diffchange diffchange-inline/u);
    assert.doesNotMatch(template.content, /\bv-html\b/u);
    const compiled = compileTemplate({
        filename: comparisonPath,
        id: "vg-page-assessor-wikitext-comparison",
        source: template.content,
    });
    assert.deepEqual(compiled.errors, []);
});

test("leaves changed styles to MediaWiki and keeps omissions plain", () => {
    const source = readFileSync(comparisonStylesPath, "utf8");

    assert.match(source, /\.avgp-comparison__table\.diff/u);
    assert.match(source, /overflow-x:\s*auto/u);
    assert.match(source, /\.avgp-comparison__omitted\.diff-context\s*\{/u);
    assert.match(source, /background-color:\s*transparent/u);
    assert.match(source, /border:\s*0/u);
    assert.match(source, /overflow-wrap:\s*anywhere/u);
    assert.match(source, /white-space:\s*pre-wrap/u);
});

test(
    "submits the exact reviewed source through the injected workflow",
    submitReviewedSource,
);

async function submitReviewedSource(): Promise<void> {
    const state = createDialogState();
    const reviews: DialogSaveReview[] = [];
    const runtime = createRuntime(state, function capture(value) {
        reviews.push(value);
    });
    const bindings = createAssessmentDialogBindings(createVueHarness(), {
        currentNamespace: 0,
        onClose() {},
        runtime,
        state,
    });
    const reviewedSource = "  {{Reviewed banner}}\n";

    bindings.onPreviewInput(reviewedSource);
    bindings.onSummaryInput("  Reviewed summary  ");
    await bindings.onSave();

    const review = reviews[0];

    assert.ok(review);
    assert.equal(review.previewText, reviewedSource);
    assert.equal(review.summary, "Reviewed summary");
}

test("shows prepared registration on first render", showPreparedRegistration);

test("shows plain text when registration is ineligible", () => {
    const state = createDialogState();
    state.registration.eligible = false;
    const bindings = createAssessmentDialogBindings(createVueHarness(), {
        currentNamespace: 0,
        onClose() {},
        runtime: createRuntime(state),
        state,
    });

    assert.equal(bindings.registrationEligible.value, false);
    assert.match(bindings.registrationLabel.value, /2026/u);
});

test("reflects manual source values in assessment controls", () => {
    const state = createDialogState();
    const bindings = createAssessmentDialogBindings(createVueHarness(), {
        currentNamespace: 0,
        onClose() {},
        runtime: createRuntime(state),
        state,
    });
    const source = [
        "{{WikiProject banner shell|class=Future|1=",
        "{{WikiProject Video games|importance=Critical|Sega=yes}}",
        "}}",
    ].join("\n");

    bindings.onPreviewInput(source);

    assert.equal(bindings.previewText.value, source);
    assert.equal(bindings.assessment.className, "Future");
    assert.equal(bindings.assessment.importance, "Critical");
    assert.equal(bindings.assessment.taskForces.sega, true);
    assert.ok(
        bindings.classOptions.value.some(
            (option) => option.value === "Future",
        ),
    );
    assert.ok(
        bindings.importanceOptions.value.some(
            (option) => option.value === "Critical",
        ),
    );
});

test("applies a radio change to the current manual source", () => {
    const state = createDialogState();
    const bindings = createAssessmentDialogBindings(createVueHarness(), {
        currentNamespace: 0,
        onClose() {},
        runtime: createRuntime(state),
        state,
    });
    const source = [
        "{{DYKtalk|date=2026-07-26}}",
        "{{WikiProject banner shell|class=A|1=",
        "{{WikiProject Electronic games|MiHoYo=yes|importance=low}}",
        "{{WikiProject Fictional characters}}",
        "}}",
    ].join("\n");

    bindings.onPreviewInput(source);
    bindings.setClassName("B");

    assert.equal(bindings.assessment.className, "B");
    assert.match(bindings.previewText.value, /\|class=B/u);
    assert.doesNotMatch(bindings.previewText.value, /\|class=A/u);
    assert.match(bindings.previewText.value, /\{\{DYKtalk/u);
    assert.match(bindings.previewText.value, /importance=low/u);
    assert.match(bindings.previewText.value, /MiHoYo=yes/u);
    assert.match(
        bindings.previewText.value,
        /WikiProject Fictional characters/u,
    );
});

test("shows other projects found inside the existing shell", () => {
    const state = createDialogState();
    state.page.text = [
        "{{WikiProject banner shell|class=Start|1=",
        "{{WikiProject Video games}}",
        "{{WikiProject Role-playing games|importance=Low}}",
        "{{某某專題|foo=yes}}",
        "}}",
    ].join("\n");
    state.assessment = assessment.createDefaultAssessment(
        projectConfig,
        state.page.text,
    );
    const bindings = createAssessmentDialogBindings(createVueHarness(), {
        currentNamespace: 0,
        onClose() {},
        runtime: createRuntime(state),
        state,
    });
    const dynamicOptions = bindings.otherProjectOptions.filter((option) =>
        option.id.startsWith("existing:"),
    );

    assert.deepEqual(
        dynamicOptions.map((option) => option.label),
        ["Role-playing games", "某某"],
    );
    assert.ok(
        dynamicOptions.every(
            (option) => bindings.assessment.otherProjects[option.id],
        ),
    );
});

test("refreshes after the reviewed save completes", refreshAfterSave);

async function refreshAfterSave(): Promise<void> {
    const state = createDialogState();
    let refreshed = false;
    const bindings = createAssessmentDialogBindings(createVueHarness(), {
        currentNamespace: 0,
        onClose() {},
        onSaved() {
            refreshed = true;
        },
        runtime: createRuntime(state),
        state,
    });

    await bindings.onSave();
    await new Promise((resolve) => setTimeout(resolve, 650));

    assert.equal(refreshed, true);
}

function showPreparedRegistration(): void {
    const state = createDialogState();
    const bindings = createAssessmentDialogBindings(createVueHarness(), {
        currentNamespace: 0,
        onClose() {},
        runtime: createRuntime(state),
        state,
    });

    assert.equal(bindings.registrationDisabled.value, false);
    assert.equal(bindings.shouldRegister.value, true);
    assert.equal(bindings.showRegistrationPreview.value, true);
    assert.match(
        getComparisonText(bindings.talkComparison.value, "before"),
        /Old banner/u,
    );
    assert.match(
        getComparisonText(bindings.talkComparison.value, "after"),
        /WikiProject/u,
    );
}

function getComparisonText(
    comparison: WikitextComparison,
    side: "after" | "before",
): string {
    return comparison.rows
        .filter((row) => row.kind === "line")
        .map((row) =>
            row[side].segments.map((segment) => segment.text).join(""),
        )
        .join("\n");
}

test("summarizes selected assessment details with its source marker", () => {
    const selection = assessment.createDefaultAssessment(projectConfig);

    selection.className = "Start";
    selection.importance = "High";
    selection.taskForces.pokemon = true;

    const summary = buildEditSummary(selection);

    assert.match(summary, /Start-Class/u);
    assert.match(summary, /High-importance/u);
    assert.match(summary, /Pokemon/u);
    assert.match(summary, /\[\[:m:User:For Each \.\.\. Next/u);
});

function createVueHarness(): VueModule {
    return {
        computed<T>(getter: () => T): VueRef<T> {
            return {
                get value(): T {
                    return getter();
                },
                set value(_value: T) {},
            };
        },
        createMwApp(): VueApp {
            throw new Error("The presentation test does not mount Vue.");
        },
        defineComponent(component: unknown): unknown {
            return component;
        },
        onMounted() {},
        onUnmounted() {},
        reactive<T extends object>(value: T): T {
            return value;
        },
        ref<T>(value: T): VueRef<T> {
            return { value };
        },
    };
}

function createRuntime(
    state: DialogState,
    capture: (review: DialogSaveReview) => void = function noop() {},
): PageAssessorRuntime {
    return {
        createDialogPageContext() {
            return {
                api: state.api,
                pageName: state.subjectTitle,
                title: {} as mw.Title,
            };
        },
        async loadDialogState() {
            return state;
        },
        logger: createLogger("vg-page-assessor-test", { level: "silent" }),
        notify() {},
        async saveReviewedDialog(_state, review) {
            capture(review);
            return "saved";
        },
    };
}

function createDialogState(): DialogState {
    return {
        api: {} as mw.Api,
        assessment: assessment.createDefaultAssessment(projectConfig),
        creationTimes: new Map(),
        newPageList: {
            basetimestamp: "2026-07-29T00:00:00Z",
            starttimestamp: "2026-07-29T00:00:01Z",
            text: "Before",
        },
        page: {
            exists: true,
            starttimestamp: "2026-07-29T00:00:00Z",
            text: "{{Old banner}}\n\n== Discussion ==\nBody",
        },
        previewDirty: false,
        registration: {
            alreadyRegistered: false,
            changed: true,
            earliestDate: null,
            eligible: true,
            existing: null,
            proposedText: "After",
        },
        subjectInfo: {
            creationDate: new Date("2026-07-29T00:00:00Z"),
            isRedirect: false,
            listedTitle: "Example <game>",
            namespaceNumber: 0,
            targetTitle: "Example <game>",
        },
        subjectTitle: "Example <game>",
        summaryDirty: false,
        talkTitle: "Talk:Example <game>",
    };
}
