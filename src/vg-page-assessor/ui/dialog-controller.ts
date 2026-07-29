/**
 * Coordinates dialog events with injected page-assessor operations.
 */

import type {
    DialogState,
    PageAssessorRuntime,
} from "#gadget/contracts/dialog.ts";
import {
    readAssessment,
    updateAssessmentPreview,
    updateAssessmentSummary,
    updateTalkSource,
} from "#gadget/ui/assessment-form.ts";
import { closeDialog, saveDialog } from "#gadget/ui/dialog-save.ts";
import {
    renderDialogMarkup,
    setDialogStatus,
} from "#gadget/ui/dialog-view.ts";
import { requireElement } from "#gadget/ui/form-elements.ts";
import {
    refreshRegistrationControls,
    updateRegistrationPreview,
} from "#gadget/ui/registration-panel.ts";
import { msg } from "#gadget/i18n/index.ts";
import * as html from "#shared/html";

/**
 * Creates a rendered and event-bound assessment dialog.
 */
export function createAssessmentDialog(
    state: DialogState,
    runtime: PageAssessorRuntime,
): HTMLDialogElement {
    const logStep = runtime.logStep.bind(runtime);

    runtime.logStep("buildDialog start");
    const dialog = document.createElement("dialog");
    const registerDefault = false;

    dialog.className = "avgp-dialog";
    html.replaceElementContent(
        dialog,
        renderDialogMarkup(state, registerDefault),
    );
    bindDialogEvents(dialog, state, runtime);
    refreshDialogPreview(dialog, state, logStep);
    runtime.logStep("buildDialog done", {
        registerDefault,
        registration: summarizeRegistration(state),
    });

    return dialog;
}

/**
 * Loads registration state after the dialog opens.
 */
export async function loadRegistrationPanel(
    dialog: HTMLDialogElement,
    state: DialogState,
    runtime: PageAssessorRuntime,
): Promise<void> {
    const logStep = runtime.logStep.bind(runtime);

    runtime.logStep("loadNewPageListState start");
    updateStatus(dialog, msg("registration.loadingList"), false, runtime);
    const currentNamespace = mw.config.get("wgNamespaceNumber");

    await runtime.loadRegistrationState(state, currentNamespace);
    refreshRegistrationControls(dialog, state, currentNamespace, logStep);
    updateStatus(dialog, "", false, runtime);
    runtime.logStep("loadNewPageListState done", {
        creationTimes: serializeCreationTimes(state.creationTimes),
        registration: summarizeRegistration(state),
    });
}

function bindDialogEvents(
    dialog: HTMLDialogElement,
    state: DialogState,
    runtime: PageAssessorRuntime,
): void {
    const changeHandler = handleDialogChange.bind(
        null,
        dialog,
        state,
        runtime,
    );
    dialog.addEventListener("change", changeHandler);

    const preview = requireElement(dialog, "[data-avgp-preview]");
    const previewHandler = handlePreviewInput.bind(
        null,
        dialog,
        state,
        runtime,
    );
    preview.addEventListener("input", previewHandler);

    const summary = requireElement(dialog, "[name='summary']");
    const summaryHandler = handleSummaryInput.bind(null, state, runtime);
    summary.addEventListener("input", summaryHandler);

    const cancel = requireElement(dialog, "[data-avgp-cancel]");
    const cancelHandler = handleDialogCancel.bind(null, dialog, runtime);
    cancel.addEventListener("click", cancelHandler);

    const save = requireElement(dialog, "[data-avgp-save]");
    const saveHandler = handleDialogSave.bind(null, dialog, state, runtime);
    save.addEventListener("click", saveHandler);
}

function handleDialogChange(
    dialog: HTMLDialogElement,
    state: DialogState,
    runtime: PageAssessorRuntime,
): void {
    const logStep = runtime.logStep.bind(runtime);

    runtime.logStep("dialog change");
    readAssessment(dialog, state.assessment, logStep);
    refreshDialogPreview(dialog, state, logStep);
}

function handlePreviewInput(
    dialog: HTMLElement,
    state: DialogState,
    runtime: PageAssessorRuntime,
): void {
    const logStep = runtime.logStep.bind(runtime);

    runtime.logStep("lead source edited");
    state.previewDirty = true;
    updateTalkSource(dialog, state, logStep);
}

function handleSummaryInput(
    state: DialogState,
    runtime: PageAssessorRuntime,
): void {
    runtime.logStep("assessment summary edited");
    state.summaryDirty = true;
}

function handleDialogCancel(
    dialog: HTMLDialogElement,
    runtime: PageAssessorRuntime,
): void {
    runtime.logStep("dialog cancelled");
    closeDialog(dialog);
}

function handleDialogSave(
    dialog: HTMLDialogElement,
    state: DialogState,
    runtime: PageAssessorRuntime,
): void {
    runtime.logStep("save button clicked");
    const handleError = handleDialogSaveError.bind(null, dialog, runtime);
    saveDialog(dialog, state, runtime).catch(handleError);
}

function handleDialogSaveError(
    dialog: HTMLDialogElement,
    runtime: PageAssessorRuntime,
    error: unknown,
): void {
    runtime.logStep("saveDialog failed", { error });
    updateStatus(dialog, getErrorMessage(error), true, runtime);
}

function refreshDialogPreview(
    dialog: HTMLElement,
    state: DialogState,
    logStep: PageAssessorRuntime["logStep"],
): void {
    updateAssessmentPreview(dialog, state, logStep);
    updateTalkSource(dialog, state, logStep);
    updateAssessmentSummary(dialog, state, logStep);
    updateRegistrationPreview(dialog, state, logStep);
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

function serializeCreationTimes(
    creationTimes: Map<string, Date>,
): Array<[string, string]> {
    const entries: Array<[string, string]> = [];

    for (const [title, date] of creationTimes) {
        entries.push([title, date.toISOString()]);
    }

    return entries;
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

function getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}
