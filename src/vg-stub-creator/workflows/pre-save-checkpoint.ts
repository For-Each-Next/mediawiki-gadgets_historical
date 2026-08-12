/** Selects only safely resumable operations from a save checkpoint. */

import type {
    PendingSaveResume,
    PendingSaveSession,
} from "#gadget/contracts/application.ts";
// eslint-disable-next-line max-len
import { assertUniqueSelectedActionIds } from "#gadget/domain/pre-save-action-identity.ts";

/**
 * Builds recovery without replaying confirmed or ambiguous writes.
 */
export function preparePendingSaveResume(
    pending: PendingSaveSession,
): PendingSaveResume {
    assertUniqueSelectedActionIds(pending.actions);
    const confirmedActions = pending.actions.filter((action) =>
        hasOperationStatus(action, pending, "confirmed"),
    );
    const actions = pending.actions
        .filter((action) => hasOperationStatus(action, pending, "pending"))
        .map((action) => ({ ...action, selected: true }));
    const blockedOperationIds = Object.entries(pending.operations)
        .filter(isBlockedOperation)
        .map(([id]) => id);
    if (pending.operations.save !== "confirmed") {
        blockedOperationIds.unshift("save");
    }
    const moveConfirmed = pending.operations.move === "confirmed";
    const title = moveConfirmed
        ? normalizeTitle(pending.move.to) || pending.title
        : pending.title;
    const move = {
        ...pending.move,
        enabled: pending.operations.move === "pending",
    };
    const registration = {
        ...pending.registration,
        enabled: pending.operations["new-page-list"] === "pending",
    };
    return {
        actions,
        blockedOperationIds: [...new Set(blockedOperationIds)],
        confirmedActions,
        move,
        registration,
        title,
    };
}

function hasOperationStatus(
    action: PendingSaveSession["actions"][number],
    pending: PendingSaveSession,
    status: PendingSaveSession["operations"][string],
): boolean {
    return action.selected && pending.operations[action.id] === status;
}

function isBlockedOperation(
    entry: [string, PendingSaveSession["operations"][string]],
): boolean {
    return entry[1] === "running" || entry[1] === "uncertain";
}

function normalizeTitle(value: unknown): string {
    return String(value ?? "")
        .trim()
        .replace(/_/gu, " ");
}
