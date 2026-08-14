/** Browser-local persistence for formatter dialog choices. */

import {
    createDefaultFormatterSettings,
    parseFormatterSettings,
    type FormatterSettings,
} from "#gadget/domain/formatter-settings.ts";

export const FORMATTER_SETTINGS_STORAGE_KEY =
    "wiked-lite.formatter-settings.v4";

const FORMATTER_SETTINGS_VERSION = 4;
const VERSION_THREE_STORAGE_KEY = "wiked-lite.formatter-settings.v3";

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
                return loadStoredFormatterSettings(getStorage());
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

function loadStoredFormatterSettings(
    storage: SettingsStorage | undefined,
): FormatterSettings {
    const serialized = storage?.getItem(FORMATTER_SETTINGS_STORAGE_KEY);
    if (serialized != null) {
        return (
            parseStoredFormatterSettings(JSON.parse(serialized)) ??
            createDefaultFormatterSettings()
        );
    }
    const legacy = storage?.getItem(VERSION_THREE_STORAGE_KEY);
    if (legacy == null) {
        return createDefaultFormatterSettings();
    }
    return (
        parseVersionThreeFormatterSettings(JSON.parse(legacy)) ??
        createDefaultFormatterSettings()
    );
}

function parseStoredFormatterSettings(
    value: unknown,
): FormatterSettings | undefined {
    if (
        !isStoredSettingsEnvelope(value, FORMATTER_SETTINGS_VERSION) ||
        !isRecord(value.settings) ||
        !isRecord(value.settings.formatter) ||
        typeof value.settings.formatter.skipFirstLevelIndentation !== "boolean"
    ) {
        return undefined;
    }
    return parseFormatterSettings(value.settings);
}

function parseVersionThreeFormatterSettings(
    value: unknown,
): FormatterSettings | undefined {
    if (
        !isStoredSettingsEnvelope(value, 3) ||
        !isRecord(value.settings) ||
        !isRecord(value.settings.formatter)
    ) {
        return undefined;
    }
    const indentSpaces = value.settings.formatter.indentSpaces;
    if (!isVersionThreeIndentSpaces(indentSpaces)) {
        return undefined;
    }
    return parseFormatterSettings({
        ...value.settings,
        formatter: {
            ...value.settings.formatter,
            indentSpaces: Math.min(indentSpaces, 4),
            skipFirstLevelIndentation: false,
        },
    });
}

function isStoredSettingsEnvelope(
    value: unknown,
    version: number,
): value is Record<string, unknown> & { settings: unknown } {
    return isRecord(value) && value.version === version && "settings" in value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value != null && !Array.isArray(value);
}

function isVersionThreeIndentSpaces(value: unknown): value is number {
    return Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 8;
}

function getLocalStorage(): Storage | undefined {
    try {
        return typeof localStorage === "undefined" ? undefined : localStorage;
    } catch {
        return undefined;
    }
}
