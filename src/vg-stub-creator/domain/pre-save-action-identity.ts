/** Protects reviewed actions from checkpoint key collisions. */

import type { PreSaveAction } from "#gadget/domain/models.ts";

const RESERVED_OPERATION_IDS = new Set([
    "__proto__",
    "move",
    "new-page-list",
    "save",
]);

/** Error raised before ambiguous actions can be persisted or run. */
export class PreSaveActionIdentityError extends Error {
    readonly conflictingIds: string[];

    constructor(conflictingIds: string[]) {
        const ids = [...new Set(conflictingIds)].sort();
        super(
            "Selected follow-up actions must have unique, non-reserved IDs. " +
                `Conflicting IDs: ${ids.join(", ")}.`,
        );
        this.name = "PreSaveActionIdentityError";
        this.conflictingIds = ids;
    }
}

/**
 * Rejects actions that cannot own one unambiguous checkpoint key.
 */
export function assertUniqueSelectedActionIds(
    actions: readonly PreSaveAction[],
): void {
    const seen = new Set<string>();
    const conflicts: string[] = [];

    for (const action of actions) {
        if (!action.selected) {
            continue;
        }
        const id = action.id;
        if (id === "" || RESERVED_OPERATION_IDS.has(id) || seen.has(id)) {
            conflicts.push(id || "(empty)");
        }
        seen.add(id);
    }

    if (conflicts.length > 0) {
        throw new PreSaveActionIdentityError(conflicts);
    }
}
