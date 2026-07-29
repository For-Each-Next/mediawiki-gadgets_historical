/**
 * Contracts shared by composition, dialog UI, and workflows.
 */

import type {
    Assessment,
    NewPageListSnapshot,
    PageSnapshot,
    PreparedTalkEdit,
    RegistrationResult,
    SubjectPageInfo,
} from "#gadget/domain/types.ts";

export interface DialogState {
    api: mw.Api;
    assessment: Assessment;
    creationTimes: Map<string, Date>;
    newPageList: NewPageListSnapshot | null;
    page: PageSnapshot;
    previewDirty: boolean;
    registration: RegistrationResult | null;
    registrationLoading: boolean;
    subjectInfo: SubjectPageInfo;
    subjectTitle: string;
    summaryDirty: boolean;
    talkTitle: string;
}

export interface RegistrationSave {
    proposedText: string;
    snapshot: NewPageListSnapshot;
}

export interface DialogStateWorkflow {
    loadDialogState(api: mw.Api, currentTitle: mw.Title): Promise<DialogState>;
    loadRegistrationState(
        state: DialogState,
        currentNamespace: number,
    ): Promise<void>;
}

export interface DialogWorkflow extends DialogStateWorkflow {
    getRegistrationSave(state: DialogState): RegistrationSave | null;
    saveRegistration(
        api: mw.Api,
        registration: RegistrationSave,
        summary: string,
    ): Promise<void>;
}

export interface DialogSaveReview {
    listSummary: string;
    previewText: string;
    shouldRegister: boolean;
    summary: string;
}

export type DialogSavePhase = "registration" | "talk-page";
export type DialogSaveOutcome = "saved" | "unchanged";
export type ReportDialogSavePhase = (phase: DialogSavePhase) => void;

export type SaveTalkAssessment = (
    api: mw.Api,
    edit: PreparedTalkEdit,
) => Promise<string>;

export type SaveReviewedDialog = (
    state: DialogState,
    review: DialogSaveReview,
    reportPhase: ReportDialogSavePhase,
) => Promise<DialogSaveOutcome>;

export interface PageAssessorRuntime extends DialogStateWorkflow {
    logStep(step: string, details?: unknown): void;
    saveReviewedDialog: SaveReviewedDialog;
}
