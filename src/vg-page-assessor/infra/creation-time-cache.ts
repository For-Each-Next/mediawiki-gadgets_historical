/**
 * Stores disposable page-creation timestamps in browser local storage.
 */

import { logStep } from "#gadget/infra/logger.ts";

const CREATION_CACHE_KEY = "vg-page-assessor.creation-datetimes.v1";

export type CreationTimeCache = Record<string, string>;

export function readCreationTimeCache(): CreationTimeCache {
    try {
        const raw = globalThis.localStorage?.getItem(CREATION_CACHE_KEY);
        if (!raw) {
            return {};
        }

        const parsed: unknown = JSON.parse(raw);
        return isCreationTimeCache(parsed) ? parsed : {};
    } catch (error) {
        logStep("readCreationDateCache failed", { error });
        return {};
    }
}

export function writeCreationTimeCache(cache: CreationTimeCache): void {
    try {
        const storage = globalThis.localStorage;
        if (storage != null) {
            storage.setItem(CREATION_CACHE_KEY, JSON.stringify(cache));
        }

        logStep("writeCreationDateCache done", {
            size: Object.keys(cache).length,
        });
    } catch (error) {
        logStep("writeCreationDateCache failed", { error });
    }
}

export function normalizeCreationTimeCacheTitle(title: string): string {
    return String(title || "")
        .replace(/_/gu, " ")
        .trim();
}

function isCreationTimeCache(value: unknown): value is CreationTimeCache {
    if (value == null || typeof value !== "object" || Array.isArray(value)) {
        return false;
    }

    return Object.values(value).every((entry) => typeof entry === "string");
}
