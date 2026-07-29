/**
 * Characterizes assessor dialog presentation after the UI split.
 */

import assert from "node:assert/strict";
import test from "node:test";

import projectConfig from "vg-page-assessor/config/project-config.ts";
import type { DialogState } from "vg-page-assessor/contracts/dialog.ts";
import * as assessment from "vg-page-assessor/domain/assessment.ts";
import { buildEditSummary } from "vg-page-assessor/ui/assessment-summary.ts";
import { renderDialogMarkup } from "vg-page-assessor/ui/dialog-view.ts";

test("renders escaped dialog content and loading registration state", () => {
    const markup = renderDialogMarkup(createDialogState(), false);

    assert.match(markup, /Example &lt;game&gt;/u);
    assert.match(markup, /\bdata-avgp-preview\b/u);
    assert.match(markup, /\bdata-avgp-current-source\b/u);
    assert.match(markup, /avgp-register-loading/u);
    assert.match(markup, /name="className"/u);
    assert.match(markup, /name="importance"/u);
});

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

function createDialogState(): DialogState {
    return {
        api: {} as mw.Api,
        assessment: assessment.createDefaultAssessment(projectConfig),
        creationTimes: new Map(),
        newPageList: null,
        page: {
            exists: true,
            starttimestamp: "2026-07-29T00:00:00Z",
            text: "",
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
