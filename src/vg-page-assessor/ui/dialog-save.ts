/**
 * Captures reviewed form values and presents save workflow progress.
 */

import type {
    DialogSavePhase,
    DialogSaveReview,
    DialogState,
    PageAssessorRuntime,
} from "#gadget/contracts/dialog.ts";
import { msg } from "#gadget/i18n/index.ts";
import { readAssessment } from "#gadget/ui/assessment-form.ts";
import { setDialogStatus } from "#gadget/ui/dialog-view.ts";
import { requireElement } from "#gadget/ui/form-elements.ts";
import * as registration from "#gadget/ui/registration-panel.ts";

const DIALOG_CLOSE_DELAY_MS = 600;

/**
 * Invokes the save workflow with the exact reviewed form values.
 */
export async function saveDialog(
    dialog: HTMLDialogElement,
    state: DialogState,
    runtime: PageAssessorRuntime,
): Promise<void> {
    const logStep = runtime.logStep.bind(runtime);
    const review = readDialogSaveReview(dialog);

    readAssessment(dialog, state.assessment, logStep);
    const reportPhase = showSavePhase.bind(null, dialog, runtime);
    const outcome = await runtime.saveReviewedDialog(
        state,
        review,
        reportPhase,
    );

    const status =
        outcome === "unchanged"
            ? "Skipped unchanged assessment."
            : msg("dialog.saved");
    updateStatus(dialog, status, false, runtime);
    scheduleDialogClose(dialog);
}

/**
 * Closes and removes a dialog immediately.
 */
export function closeDialog(dialog: {
    close: () => void;
    remove: () => void;
}): void {
    dialog.close();
    dialog.remove();
}

function readDialogSaveReview(dialog: HTMLDialogElement): DialogSaveReview {
    const register =
        dialog.querySelector<HTMLInputElement>("[name='register']");
    const preview = requireElement<HTMLTextAreaElement>(
        dialog,
        "[data-avgp-preview]",
    );
    const summary = requireElement<HTMLInputElement>(
        dialog,
        "[name='summary']",
    );
    const listSummary = requireElement<HTMLInputElement>(
        dialog,
        "[name='listSummary']",
    );

    return {
        listSummary: listSummary.value.trim(),
        previewText: preview.value,
        shouldRegister: registration.isRegistrationCheckboxSelected(register),
        summary: summary.value.trim(),
    };
}

function showSavePhase(
    dialog: HTMLDialogElement,
    runtime: PageAssessorRuntime,
    phase: DialogSavePhase,
): void {
    const text =
        phase === "registration"
            ? "Updating new-page list..."
            : "Saving talk page...";
    updateStatus(dialog, text, false, runtime);
}

function scheduleDialogClose(dialog: HTMLDialogElement): void {
    const close = closeDialog.bind(null, dialog);
    setTimeout(close, DIALOG_CLOSE_DELAY_MS);
}

function updateStatus(
    root: HTMLElement,
    text: string,
    isError: boolean,
    runtime: PageAssessorRuntime,
): void {
    setDialogStatus(root, text, isError);
    runtime.logStep("status updated", { isError, text });
}
