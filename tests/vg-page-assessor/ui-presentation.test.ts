/**
 * Characterizes the Vue/Codex assessment dialog presentation.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { compileTemplate, parse } from "@vue/compiler-sfc";

import projectConfig from "vg-page-assessor/config/project-config.ts";
import type {
    DialogSaveReview,
    DialogState,
    PageAssessorRuntime,
} from "vg-page-assessor/contracts/dialog.ts";
import * as assessment from "vg-page-assessor/domain/assessment.ts";
import type { VueApp, VueModule, VueRef } from "vg-page-assessor/ui/codex.ts";
import { buildEditSummary } from "vg-page-assessor/ui/assessment-summary.ts";
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

test("loads registration through the injected workflow", loadRegistration);

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

async function loadRegistration(): Promise<void> {
    const state = createDialogState();
    const bindings = createAssessmentDialogBindings(createVueHarness(), {
        currentNamespace: 0,
        onClose() {},
        runtime: createRuntime(state),
        state,
    });

    await bindings.loadRegistration();

    assert.equal(bindings.registrationLoading.value, false);
    assert.equal(bindings.registrationDisabled.value, false);
    assert.equal(bindings.shouldRegister.value, true);
    assert.equal(bindings.showRegistrationPreview.value, true);
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
        async loadDialogState() {
            return state;
        },
        async loadRegistrationState(target) {
            target.newPageList = {
                basetimestamp: "2026-07-29T00:00:00Z",
                starttimestamp: "2026-07-29T00:00:01Z",
                text: "Before",
            };
            target.registration = {
                alreadyRegistered: false,
                changed: true,
                earliestDate: null,
                eligible: true,
                existing: null,
                proposedText: "After",
            };
            target.registrationLoading = false;
        },
        logStep() {},
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
        newPageList: null,
        page: {
            exists: true,
            starttimestamp: "2026-07-29T00:00:00Z",
            text: "{{Old banner}}\n\n== Discussion ==\nBody",
        },
        previewDirty: false,
        registration: null,
        registrationLoading: true,
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
