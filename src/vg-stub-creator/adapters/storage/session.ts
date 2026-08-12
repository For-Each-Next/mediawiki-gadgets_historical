/** Stores recoverable Stub Creator browser sessions. */

import type {
    MovedEditSession,
    PendingSaveDraft,
    PendingSaveOperationStatus,
    PendingSaveSession,
    PreviewFormSession,
} from "#gadget/contracts/application.ts";
// eslint-disable-next-line max-len
import { assertUniqueSelectedActionIds } from "#gadget/domain/pre-save-action-identity.ts";

const MOVE_TEXT_STORAGE_KEY = "vg-stub-creator-move-text";
export const PENDING_SAVE_STORAGE_KEY = "vg-stub-creator-pending-save";
export const PENDING_SAVE_VERSION = 1;
const PREVIEW_FORM_STORAGE_KEY = "vg-stub-creator-preview-form";

/**
 * Reads the save checkpoint for either side of a reviewed move.
 */
export function getPendingSaveData(
    page: string,
    storage: Storage = sessionStorage,
): PendingSaveSession | undefined {
    const pending = readPendingSaveValue(storage);
    if (pending == null || !matchesPendingTitle(pending, page)) {
        return undefined;
    }
    return pending;
}

/**
 * Writes a checkpoint before any reviewed write is dispatched.
 */
export function storePendingSaveData(
    draft: PendingSaveDraft,
    storage: Storage = sessionStorage,
): PendingSaveSession {
    assertUniqueSelectedActionIds(draft.actions);
    const pending: PendingSaveSession = {
        ...draft,
        actions: draft.actions.map((action) => ({ ...action })),
        move: { ...draft.move },
        operations: createPendingOperations(draft),
        version: PENDING_SAVE_VERSION,
    };
    storage.setItem(PENDING_SAVE_STORAGE_KEY, JSON.stringify(pending));
    return pending;
}

/** Records whether one checkpointed operation is safe to resume. */
export function setPendingSaveOperationStatus(
    id: string,
    status: PendingSaveOperationStatus,
    storage: Storage = sessionStorage,
): PendingSaveSession | undefined {
    const pending = readPendingSaveValue(storage);
    if (pending == null || !Object.hasOwn(pending.operations, id)) {
        return pending;
    }
    const updated: PendingSaveSession = {
        ...pending,
        operations: { ...pending.operations, [id]: status },
    };
    storage.setItem(PENDING_SAVE_STORAGE_KEY, JSON.stringify(updated));
    return updated;
}

/** Clears the reviewed-save checkpoint. */
export function clearPendingSaveData(storage: Storage = sessionStorage): void {
    storage.removeItem(PENDING_SAVE_STORAGE_KEY);
}

/** Stores generated text for a target-page editing session. */
export function storeMovedEdit(
    pending: MovedEditSession,
    storage: Storage = sessionStorage,
): void {
    storage.setItem(MOVE_TEXT_STORAGE_KEY, JSON.stringify(pending));
}

/** Gets moved editing data matching the current page. */
export function getMovedEdit(
    page: string,
    storage: Storage = sessionStorage,
): MovedEditSession | undefined {
    return readMatchingSessionValue<MovedEditSession>(
        storage,
        MOVE_TEXT_STORAGE_KEY,
        page,
    );
}

/** Clears moved editing data. */
export function clearMovedEdit(storage: Storage = sessionStorage): void {
    storage.removeItem(MOVE_TEXT_STORAGE_KEY);
}

/** Stores the form values used for a MediaWiki preview. */
export function storePreviewFormData(
    form: PreviewFormSession["form"],
    title: string,
    storage: Storage = sessionStorage,
): void {
    storage.setItem(PREVIEW_FORM_STORAGE_KEY, JSON.stringify({ form, title }));
}

/** Gets preview form data matching the current page. */
export function getPreviewFormData(
    page: string,
    storage: Storage = sessionStorage,
): PreviewFormSession | undefined {
    return readMatchingSessionValue<PreviewFormSession>(
        storage,
        PREVIEW_FORM_STORAGE_KEY,
        page,
    );
}

/** Clears stored preview form data. */
export function clearPreviewFormData(storage: Storage = sessionStorage): void {
    storage.removeItem(PREVIEW_FORM_STORAGE_KEY);
}

/** Normalizes page titles for session matching. */
export function normalizePageTitle(title: unknown): string {
    return String(title || "")
        .trim()
        .replace(/_/gu, " ");
}

function createPendingOperations(
    draft: PendingSaveDraft,
): Record<string, PendingSaveOperationStatus> {
    const operations: Record<string, PendingSaveOperationStatus> = {
        save: "pending",
    };
    if (draft.move.enabled === true) {
        operations.move = "pending";
    }
    for (const action of draft.actions) {
        if (action.selected) {
            operations[action.id] = "pending";
        }
    }
    if (draft.registration?.enabled === true) {
        operations["new-page-list"] = "pending";
    }
    return operations;
}

function readPendingSaveValue(
    storage: Storage,
): PendingSaveSession | undefined {
    const value = readSessionValue(storage, PENDING_SAVE_STORAGE_KEY);
    if (!isPendingSaveSession(value)) {
        if (value !== undefined) {
            storage.removeItem(PENDING_SAVE_STORAGE_KEY);
        }
        return undefined;
    }
    return value;
}

function matchesPendingTitle(
    pending: PendingSaveSession,
    page: string,
): boolean {
    const pageTitle = normalizePageTitle(page);
    const sourceTitle = normalizePageTitle(pending.title);
    const moveTitle = normalizePageTitle(pending.move.to);
    return (
        pageTitle === sourceTitle ||
        (moveTitle !== "" && pageTitle === moveTitle)
    );
}

function isPendingSaveSession(value: unknown): value is PendingSaveSession {
    if (!isRecord(value) || value.version !== PENDING_SAVE_VERSION) {
        return false;
    }
    if (
        typeof value.title !== "string" ||
        !Array.isArray(value.actions) ||
        !isRecord(value.move) ||
        !isRecord(value.operations)
    ) {
        return false;
    }
    return Object.values(value.operations).every(isPendingOperationStatus);
}

function isPendingOperationStatus(
    value: unknown,
): value is PendingSaveOperationStatus {
    return ["confirmed", "pending", "running", "uncertain"].includes(
        String(value),
    );
}

function readMatchingSessionValue<T extends { title: string }>(
    storage: Storage,
    key: string,
    page: string,
): T | undefined {
    const value = readSessionValue(storage, key);
    if (!isRecord(value) || typeof value.title !== "string") {
        return undefined;
    }
    if (normalizePageTitle(value.title) !== normalizePageTitle(page)) {
        return undefined;
    }
    return value as T;
}

function readSessionValue(storage: Storage, key: string): unknown {
    const item = storage.getItem(key);
    if (item == null) {
        return undefined;
    }
    try {
        return JSON.parse(item) as unknown;
    } catch {
        storage.removeItem(key);
        return undefined;
    }
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return value != null && typeof value === "object" && !Array.isArray(value);
}
