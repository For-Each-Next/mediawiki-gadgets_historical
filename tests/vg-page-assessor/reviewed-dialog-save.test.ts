/**
 * Characterizes the reviewed-dialog save transaction.
 */

import assert from "node:assert/strict";
import test from "node:test";

import type {
    DialogSaveReview,
    DialogState,
    RegistrationSave,
} from "vg-page-assessor/contracts/dialog.ts";
import type { PreparedTalkEdit } from "vg-page-assessor/domain/types.ts";
import * as dialogSave from "vg-page-assessor/workflows/save-dialog.ts";

test("sequences registration before the reviewed talk source", async () => {
    const state = createDialogState("{{Old banner}}");
    const registration = createRegistrationSave();
    const phases: Array<string> = [];
    const writes: Array<string> = [];
    const savedTalkEdits: Array<PreparedTalkEdit> = [];
    const save = dialogSave.createReviewedDialogSaveWorkflow({
        getRegistrationSave() {
            return registration;
        },
        logStep() {},
        async saveRegistration(_api, value, summary) {
            assert.equal(value, registration);
            assert.match(summary, /Example game/u);
            writes.push("registration");
        },
        async saveTalkAssessment(_api, edit) {
            savedTalkEdits.push(edit);
            writes.push("talk-page");
            return edit.topSection;
        },
    });
    const review: DialogSaveReview = {
        listSummary: "",
        previewText: "  {{Reviewed banner}}\n",
        shouldRegister: true,
        summary: "",
    };

    const outcome = await save(state, review, function report(phase) {
        phases.push(phase);
    });

    assert.equal(outcome, "saved");
    assert.deepEqual(writes, ["registration", "talk-page"]);
    assert.deepEqual(phases, ["registration", "talk-page"]);
    assert.equal(savedTalkEdits[0]?.topSection, review.previewText);
    assert.match(savedTalkEdits[0]?.summary ?? "", /vg page assessor\.js/u);
});

test("registers before skipping an empty-importance-only edit", async () => {
    const state = createDialogState("{{WikiProject Video games|importance=}}");
    const phases: Array<string> = [];
    let registrationWrites = 0;
    let talkWrites = 0;
    const save = dialogSave.createReviewedDialogSaveWorkflow({
        getRegistrationSave: createRegistrationSave,
        logStep() {},
        async saveRegistration() {
            registrationWrites += 1;
        },
        async saveTalkAssessment() {
            talkWrites += 1;
            return "";
        },
    });

    const outcome = await save(
        state,
        {
            listSummary: "Reviewed list summary",
            previewText: "{{WikiProject Video games}}",
            shouldRegister: true,
            summary: "Reviewed talk summary",
        },
        function report(phase) {
            phases.push(phase);
        },
    );

    assert.equal(outcome, "unchanged");
    assert.equal(registrationWrites, 1);
    assert.equal(talkWrites, 0);
    assert.deepEqual(phases, ["registration"]);
});

function createRegistrationSave(): RegistrationSave {
    return {
        proposedText: "updated list",
        snapshot: {
            basetimestamp: "2026-07-29T00:00:00Z",
            starttimestamp: "2026-07-29T00:00:01Z",
            text: "old list",
        },
    };
}

function createDialogState(topSection: string): DialogState {
    return {
        api: {} as mw.Api,
        assessment: createAssessment(),
        creationTimes: new Map(),
        newPageList: createRegistrationSave().snapshot,
        page: {
            exists: true,
            starttimestamp: "2026-07-29T00:00:00Z",
            text: `${topSection}\n\n== Discussion ==\nBody`,
        },
        previewDirty: false,
        registration: createRegistrationResult(),
        subjectInfo: createSubjectInfo(),
        subjectTitle: "Example game",
        summaryDirty: false,
        talkTitle: "Talk:Example game",
    };
}

function createAssessment(): DialogState["assessment"] {
    return {
        className: "Unassessed",
        importance: "",
        maintenance: {
            cover: false,
            needsInfobox: false,
            reassess: false,
            screenshot: false,
        },
        otherProjects: {},
        taskForces: {},
    };
}

function createRegistrationResult(): NonNullable<DialogState["registration"]> {
    return {
        alreadyRegistered: false,
        changed: true,
        earliestDate: new Date("2026-07-29T00:00:00Z"),
        eligible: true,
        existing: null,
        proposedText: "updated list",
    };
}

function createSubjectInfo(): DialogState["subjectInfo"] {
    return {
        creationDate: new Date("2026-07-29T00:00:00Z"),
        isRedirect: false,
        listedTitle: "Example game",
        namespaceNumber: 0,
        targetTitle: "Example game",
    };
}
