/* eslint-disable */

/**
 * Coordinates persistent article-save progress.
 */

import {
    createSaveProgress,
    readSaveProgress,
    renderSaveProgress,
    storeSaveProgress,
    updateSaveProgress,
} from "./progress.js";

/**
 * Starts and renders persistent save progress.
 *
 * @param {string} title - Submitted article title.
 * @param {object} pending - Pending follow-up actions.
 * @returns {void}
 */
export function startSaveProgress(title, pending) {
    const progress = createSaveProgress(
        title,
        pending.actions || [],
        pending.move || {},
        pending.registration || {},
    );

    storeSaveProgress(updateSaveProgress(progress, "save", "running"));
    renderStoredSaveProgress();
}

/**
 * Updates and renders one save progress row.
 *
 * @param {string} id - Progress row ID.
 * @param {string} status - New status.
 * @returns {void}
 */
export function setSaveProgressStep(id, status) {
    const progress = readSaveProgress();

    if (progress == null) {
        return;
    }

    storeSaveProgress(updateSaveProgress(progress, id, status));
    renderStoredSaveProgress();
}

/**
 * Stores a progress failure and keeps the layer visible.
 *
 * @param {Error} error - Save error.
 * @returns {void}
 */
export function failSaveProgress(error) {
    const progress = readSaveProgress();

    if (progress == null) {
        return;
    }

    progress.error = error.message || String(error);
    const running = progress.steps.find((step) => step.status === "running");
    const failed =
        running == null
            ? progress
            : updateSaveProgress(progress, running.id, "failed");

    storeSaveProgress(failed);
    renderSaveProgress(failed);
}

/**
 * Renders stored save progress when available.
 *
 * @returns {void}
 */
export function renderStoredSaveProgress() {
    const progress = readSaveProgress();

    if (progress != null) {
        renderSaveProgress(progress);
    }
}
