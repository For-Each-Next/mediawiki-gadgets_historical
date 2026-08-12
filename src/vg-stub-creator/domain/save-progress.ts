/**
 * Applies immutable state transitions to article-save progress.
 */

/**
 * Updates one progress row.
 *
 * @param progress - Save progress state.
 * @param id - Progress row ID.
 * @param status - New status.
 * @returns Updated progress state.
 */
export function updateSaveProgress(
    progress: any,
    id: string,
    status: string,
): any {
    const updateStep = function updateStep(step: { id: string }) {
        const matchesStep =
            step.id === id ||
            (id === "new-page-list" &&
                step.id?.endsWith(":register-new-page"));
        return matchesStep ? { ...step, status } : step;
    };

    return {
        ...progress,
        steps: progress.steps.map(updateStep),
    };
}
