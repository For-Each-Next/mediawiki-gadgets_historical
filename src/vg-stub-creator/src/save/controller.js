/* eslint-disable */

/**
 * Coordinates persistent article-save progress.
 */

import {
    createSaveProgress,
    readSaveProgress,
    storeSaveProgress,
    updateSaveProgress,
} from "./progress.js";

/**
 * Starts and renders persistent save progress.
 *
 * @param {string} title - Submitted article title.
 * @param {object} pending - Pending follow-up actions.
 * @returns {object} Started progress state.
 */
export function startSaveProgress(title, pending) {
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
 * @param {string} id - Progress row ID.
 * @param {string} status - New status.
 * @returns {object|undefined} Updated progress state.
 */
export function setSaveProgressStep(id, status) {
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
 * @param {Error} error - Save error.
 * @returns {object|undefined} Failed progress state.
 */
export function failSaveProgress(error) {
    const progress = readSaveProgress();

    if (progress == null) {
        return undefined;
    }

    progress.error = error.message || String(error);
    const running = progress.steps.find((step) => step.status === "running");
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
 * @param {Error|string} error - Save error report.
 * @returns {object|undefined} Reported progress state.
 */
export function reportSaveProgressError(error) {
    const progress = readSaveProgress();

    if (progress == null) {
        return undefined;
    }

    progress.error = error.message || String(error);
    storeSaveProgress(progress);
    return progress;
}
