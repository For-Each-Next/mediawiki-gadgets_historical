/**
 * Coordinates persistent article-save progress.
 */

import {
    SAVE_PROGRESS_STORAGE_KEY,
    readSaveProgress,
    storeSaveProgress,
} from "#gadget/infra/save/progress.ts";
import { updateSaveProgress } from "#gadget/support/save-progress.ts";

/**
 * Removes persisted save progress after every action completes.
 *
 * @param storage - Session storage implementation.
 */
export function clearSaveProgress(storage: Storage = sessionStorage): void {
    storage.removeItem(SAVE_PROGRESS_STORAGE_KEY);
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
    const steps: Array<{ id: string; status: string }> = progress.steps;
    const running = steps.find((step) => step.status === "running");
    const failed =
        running == null
            ? progress
            : updateSaveProgress(progress, running.id, "failed");

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
