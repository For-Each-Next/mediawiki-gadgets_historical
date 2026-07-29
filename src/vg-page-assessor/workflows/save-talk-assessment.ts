/**
 * Saves the exact reviewed talk-page top section.
 */

import {
    getTalkPageTopSection,
    isEmptyImportanceOnlyChange,
    updateTalkPageTopSection,
} from "#gadget/domain/assessment.ts";
import type { SaveTalkAssessment } from "#gadget/contracts/dialog.ts";
import type { PageSnapshot, PreparedTalkEdit } from "#gadget/domain/types.ts";

const MAX_EDIT_ATTEMPTS = 3;

interface TalkPageUpdate {
    newTopSection: string;
    text: string;
}

export interface TalkSaveAdapters {
    fetchPageText(api: mw.Api, title: string): Promise<PageSnapshot>;
    logStep(step: string, details?: unknown): void;
    postTalkPageEdit(
        api: mw.Api,
        page: PageSnapshot,
        edit: PreparedTalkEdit,
        text: string,
        attempt: number,
    ): Promise<void>;
}

export function createTalkSaveWorkflow(
    adapters: TalkSaveAdapters,
): SaveTalkAssessment {
    return saveTalkAssessment.bind(null, adapters);
}

async function saveTalkAssessment(
    adapters: TalkSaveAdapters,
    api: mw.Api,
    edit: PreparedTalkEdit,
): Promise<string> {
    for (let attempt = 1; attempt <= MAX_EDIT_ATTEMPTS; attempt += 1) {
        try {
            return await saveTalkAssessmentAttempt(
                adapters,
                api,
                edit,
                attempt,
            );
        } catch (error) {
            adapters.logStep("saveTalkAssessment caught error", {
                attempt,
                error,
                title: edit.title,
            });
            if (!isEditConflict(error) || attempt === MAX_EDIT_ATTEMPTS) {
                throw error;
            }
        }
    }

    throw new Error("Talk-page save attempts were exhausted.");
}

async function saveTalkAssessmentAttempt(
    adapters: TalkSaveAdapters,
    api: mw.Api,
    edit: PreparedTalkEdit,
    attempt: number,
): Promise<string> {
    adapters.logStep("saveTalkAssessment attempt start", {
        attempt,
        title: edit.title,
    });
    const page = await adapters.fetchPageText(api, edit.title);
    const update = buildTalkAssessmentUpdate(page, edit);

    if (shouldSkipTalkAssessmentSave(adapters, page, update, edit.title)) {
        return update.text;
    }

    await adapters.postTalkPageEdit(api, page, edit, update.text, attempt);
    return update.text;
}

function buildTalkAssessmentUpdate(
    page: PageSnapshot,
    edit: PreparedTalkEdit,
): TalkPageUpdate {
    return {
        newTopSection: edit.topSection.trimEnd(),
        text: updateTalkPageTopSection(page.text, edit.topSection),
    };
}

function shouldSkipTalkAssessmentSave(
    adapters: TalkSaveAdapters,
    page: PageSnapshot,
    update: TalkPageUpdate,
    title: string,
): boolean {
    const oldTopSection = getTalkPageTopSection(page.text);
    const emptyChange = isEmptyImportanceOnlyChange(
        oldTopSection,
        update.newTopSection,
    );
    const skip = page.exists && (update.text === page.text || emptyChange);

    if (skip) {
        adapters.logStep("saveTalkAssessment skipped: no effective change", {
            textChanged: update.text !== page.text,
            title,
        });
    }

    return skip;
}

export function isEditConflict(error: unknown): boolean {
    if (error === "editconflict") {
        return true;
    }
    if (error == null || typeof error !== "object") {
        return false;
    }

    const directCode = Reflect.get(error, "code");
    const nestedError = Reflect.get(error, "error");
    const nestedCode =
        nestedError != null && typeof nestedError === "object"
            ? Reflect.get(nestedError, "code")
            : undefined;
    return directCode === "editconflict" || nestedCode === "editconflict";
}
