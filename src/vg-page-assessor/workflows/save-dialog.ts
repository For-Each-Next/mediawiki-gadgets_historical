/**
 * Sequences writes from the exact values reviewed in the dialog.
 */

import type {
    DialogSaveOutcome,
    DialogSaveReview,
    DialogState,
    RegistrationSave,
    ReportDialogSavePhase,
    SaveReviewedDialog,
    SaveTalkAssessment,
} from "#gadget/contracts/dialog.ts";
import {
    getTalkPageTopSection,
    isEmptyImportanceOnlyChange,
} from "#gadget/domain/assessment.ts";
import { buildNewPageListSummary } from "#gadget/i18n/index.ts";

const DEFAULT_EDIT_SUMMARY =
    "Tag project banners " +
    "[[:m:User:For Each ... Next/global.js/vg page assessor.js|🍄]]";

export interface ReviewedDialogSaveOperations {
    getRegistrationSave(state: DialogState): RegistrationSave | null;
    logStep(step: string, details?: unknown): void;
    saveRegistration(
        api: mw.Api,
        registration: RegistrationSave,
        summary: string,
    ): Promise<void>;
    saveTalkAssessment: SaveTalkAssessment;
}

/**
 * Composes the reviewed-dialog save transaction.
 *
 * @param operations - Operations value.
 * @returns Operation result.
 */
export function createReviewedDialogSaveWorkflow(
    operations: ReviewedDialogSaveOperations,
): SaveReviewedDialog {
    return saveReviewedDialog.bind(null, operations);
}

async function saveReviewedDialog(
    operations: ReviewedDialogSaveOperations,
    state: DialogState,
    review: DialogSaveReview,
    reportPhase: ReportDialogSavePhase,
): Promise<DialogSaveOutcome> {
    operations.logStep("saveDialog start");
    operations.logStep("saveDialog options", {
        listSummary: review.listSummary,
        previewLength: review.previewText.length,
        registration: summarizeRegistration(state),
        shouldRegister: review.shouldRegister,
        summary: review.summary,
    });

    await saveRegistration(operations, state, review, reportPhase);

    if (isUnchangedTalkReview(state, review.previewText)) {
        operations.logStep(
            "saveDialog skipping talk save: empty importance only",
        );
        return "unchanged";
    }

    reportPhase("talk-page");
    operations.logStep("saveDialog saving talk page");
    await operations.saveTalkAssessment(state.api, {
        summary: review.summary || DEFAULT_EDIT_SUMMARY,
        title: state.talkTitle,
        topSection: review.previewText,
    });
    operations.logStep("saveDialog done");

    return "saved";
}

async function saveRegistration(
    operations: ReviewedDialogSaveOperations,
    state: DialogState,
    review: DialogSaveReview,
    reportPhase: ReportDialogSavePhase,
): Promise<void> {
    const registration = operations.getRegistrationSave(state);

    if (!review.shouldRegister || registration == null) {
        return;
    }

    reportPhase("registration");
    operations.logStep("saveDialog saving new-page list");
    await operations.saveRegistration(
        state.api,
        registration,
        review.listSummary || buildDefaultRegistrationSummary(state),
    );
}

function buildDefaultRegistrationSummary(state: DialogState): string {
    const title = state.subjectInfo.listedTitle || state.subjectTitle;
    return buildNewPageListSummary(title, state.subjectInfo.creationDate);
}

function isUnchangedTalkReview(
    state: DialogState,
    previewText: string,
): boolean {
    const currentTopSection = getTalkPageTopSection(state.page.text);
    return isEmptyImportanceOnlyChange(currentTopSection, previewText);
}

function summarizeRegistration(state: DialogState): Record<string, unknown> {
    const registration = state.registration;

    return {
        alreadyRegistered: registration?.alreadyRegistered,
        changed: registration?.changed,
        earliestDate: registration?.earliestDate?.toISOString(),
        eligible: registration?.eligible,
        existing: registration?.existing,
        proposedLength: registration?.proposedText?.length,
    };
}
