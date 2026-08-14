/** Browser-local persistence for formatter dialog choices. */

import {
    createDefaultFormatterSettings,
    parseFormatterSettings,
    type FormatterSettings,
} from "#gadget/domain/formatter-settings.ts";

export const FORMATTER_SETTINGS_STORAGE_KEY =
    "wiked-lite.formatter-settings.v2";

const LEGACY_FORMATTER_SETTINGS_STORAGE_KEY =
    "wiked-lite.formatter-settings.v1";
const FORMATTER_SETTINGS_VERSION = 2;

type SettingsStorage = Pick<Storage, "getItem" | "setItem">;

export interface FormatterSettingsStore {
    load(): FormatterSettings;
    save(settings: FormatterSettings): void;
}

/** Creates a formatter-settings store backed by browser storage. */
export function createFormatterSettingsStore(
    getStorage: () => SettingsStorage | undefined = getLocalStorage,
): FormatterSettingsStore {
    return {
        load() {
            try {
                const storage = getStorage();
                const serialized = storage?.getItem(
                    FORMATTER_SETTINGS_STORAGE_KEY,
                );
                if (serialized == null) {
                    return loadLegacySettings(storage);
                }
                return (
                    parseStoredFormatterSettings(JSON.parse(serialized)) ??
                    createDefaultFormatterSettings()
                );
            } catch {
                return createDefaultFormatterSettings();
            }
        },
        save(settings) {
            const validated = parseFormatterSettings(settings);
            if (validated == null) {
                throw new TypeError("Formatter settings are invalid.");
            }
            const storage = getStorage();
            if (storage == null) {
                throw new Error("Local storage is unavailable.");
            }
            storage.setItem(
                FORMATTER_SETTINGS_STORAGE_KEY,
                JSON.stringify({
                    settings: validated,
                    version: FORMATTER_SETTINGS_VERSION,
                }),
            );
        },
    };
}

function loadLegacySettings(
    storage: SettingsStorage | undefined,
): FormatterSettings {
    const serialized = storage?.getItem(LEGACY_FORMATTER_SETTINGS_STORAGE_KEY);
    if (serialized == null) {
        return createDefaultFormatterSettings();
    }
    const stored = parseStoredLegacySettings(JSON.parse(serialized));
    return stored ?? createDefaultFormatterSettings();
}

function parseStoredFormatterSettings(
    value: unknown,
): FormatterSettings | undefined {
    if (
        typeof value !== "object" ||
        value == null ||
        !("version" in value) ||
        value.version !== FORMATTER_SETTINGS_VERSION ||
        !("settings" in value)
    ) {
        return undefined;
    }
    return parseFormatterSettings(value.settings);
}

function parseStoredLegacySettings(
    value: unknown,
): FormatterSettings | undefined {
    if (
        typeof value !== "object" ||
        value == null ||
        !("version" in value) ||
        value.version !== 1 ||
        !("settings" in value)
    ) {
        return undefined;
    }
    const defaults = createDefaultFormatterSettings();
    return parseFormatterSettings({
        ...defaults,
        ...(isRecord(value.settings) ? value.settings : {}),
    });
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value != null && !Array.isArray(value);
}

function getLocalStorage(): Storage | undefined {
    try {
        return typeof localStorage === "undefined" ? undefined : localStorage;
    } catch {
        return undefined;
    }
}
