/**
 * Coordinates persistent article-save progress.
 */

import {
    createSaveProgress,
    readSaveProgress,
    storeSaveProgress,
    updateSaveProgress,
} from "./progress.ts";


/**
 * Starts and renders persistent save progress.
 *
 * @param title - Submitted article title.
 * @param pending - Pending follow-up actions.
 * @returns Started progress state.
 */
export function startSaveProgress(title: string, pending: any): any {
    const progress = createSaveProgress(
        title,
        pending.actions || [],
        pending.move || {},
        pending.registration || {},
        pending.progressGroups || [],
    );
    const started = updateSaveProgress(progress, "save", "running");

    storeSaveProgress(started);
    return started;
}


/**
 * Updates and renders one save progress row.
 *
 * @param id - Progress row ID.
 * @param status - New status.
 * @returns Updated progress state.
 */
export function setSaveProgressStep(
    id: string,
    status: string,
): any | undefined {
    const progress = readSaveProgress();

    if (progress == null) {
        return undefined;
    }

    const updated = updateSaveProgress(progress, id, status);

    storeSaveProgress(updated);
    return updated;
}


/**
 * Stores a progress failure and keeps the layer visible.
 *
 * @param error - Save error.
 * @returns Failed progress state.
 */
export function failSaveProgress(error: Error): any | undefined {
    const progress = readSaveProgress();

    if (progress == null) {
        return undefined;
    }

    progress.error = error instanceof Error ? error.message : String(error);
    const running = progress.steps.find((step) => step.status === "running");
    const failed = selectValue(
        running == null,
        function trueBranch() {
            return progress;
        },
        function falseBranch() {
            return updateSaveProgress(progress, running.id, "failed");
        },
    );

    storeSaveProgress(failed);
    return failed;
}


/**
 * Stores a non-fatal progress error and keeps completed rows visible.
 *
 * @param error - Save error report.
 * @returns Reported progress state.
 */
export function reportSaveProgressError(
    error: Error | string,
): any | undefined {
    const progress = readSaveProgress();

    if (progress == null) {
        return undefined;
    }

    progress.error = error instanceof Error ? error.message : String(error);
    storeSaveProgress(progress);
    return progress;
}


/**
 * Selects a lazily evaluated value for a condition.
 *
 * @param condition - Condition to evaluate.
 * @param trueBranch - Branch used when the condition is
 * true.
 * @param falseBranch - Branch used when the condition is
 * false.
 * @returns Value returned by the selected branch.
 */
function selectValue(
    condition: unknown,
    trueBranch: (...args: any[]) => any,
    falseBranch: (...args: any[]) => any,
): any {
    if (condition) {
        return trueBranch();
    }

    return falseBranch();
}
