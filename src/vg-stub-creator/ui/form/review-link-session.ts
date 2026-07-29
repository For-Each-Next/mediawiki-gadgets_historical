/**
 * Owns one dialog instance's review-link opening state.
 */

const REVIEW_LINKS_OPENED_STORAGE_KEY = "vg-stub-creator-review-links-opened";

export interface ReviewLinkSession {
    claim(): boolean;
}

/**
 * Creates an isolated one-shot review-link claim for a dialog instance.
 *
 * @param getStorage - Gets the current tab's storage.
 * @returns Per-instance review-link session.
 */
export function createReviewLinkSession(
    getStorage: () => Storage = () => sessionStorage,
): ReviewLinkSession {
    let claimed = false;

    return {
        claim() {
            if (claimed) {
                return false;
            }

            claimed = true;

            try {
                return claimReviewLinksOpening(getStorage());
            } catch {
                return true;
            }
        },
    };
}

/**
 * Claims the one-time review-link opening for the current tab.
 *
 * @param storage - Tab-scoped storage implementation.
 * @returns Whether the caller claimed the opening.
 */
export function claimReviewLinksOpening(storage: Storage): boolean {
    if (storage.getItem(REVIEW_LINKS_OPENED_STORAGE_KEY) !== null) {
        return false;
    }

    storage.setItem(REVIEW_LINKS_OPENED_STORAGE_KEY, "1");
    return true;
}
