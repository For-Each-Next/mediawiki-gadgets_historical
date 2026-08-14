import assert from "node:assert/strict";
import test from "node:test";

import {
    createFormatterSettingsStore,
    FORMATTER_SETTINGS_STORAGE_KEY,
} from "wiked-lite/adapters/storage/formatter-settings.ts";
import {
    createDefaultFormatterSettings,
    type FormatterSettings,
} from "wiked-lite/domain/formatter-settings.ts";

test("formatter settings round trip through versioned local storage", () => {
    const storage = new MemorySettingsStorage();
    const store = createFormatterSettingsStore(() => storage);
    const settings: FormatterSettings = {
        fullPageReferencePreviews: true,
        formatter: {
            firstParameterLayout: "align-separator",
            fullWidthRatio: 2,
            indentPipes: true,
            normalizeConversion: true,
            subsequentParameterLayout: "align-columns-completely",
        },
        highlightMissing: true,
        referencePreviews: false,
        resolveRedirects: true,
    };

    assert.deepEqual(store.load(), createDefaultFormatterSettings());
    store.save(settings);

    assert.deepEqual(store.load(), settings);
    assert.deepEqual(
        JSON.parse(storage.getItem(FORMATTER_SETTINGS_STORAGE_KEY) ?? ""),
        { settings, version: 2 },
    );
});

test("version-one formatter settings migrate editor defaults", () => {
    const defaults = createDefaultFormatterSettings();
    const legacy = {
        formatter: {
            ...defaults.formatter,
            indentPipes: true,
        },
        highlightMissing: true,
        resolveRedirects: true,
    };
    const storage = new MemorySettingsStorage(
        JSON.stringify({ settings: legacy, version: 1 }),
        "wiked-lite.formatter-settings.v1",
    );

    assert.deepEqual(createFormatterSettingsStore(() => storage).load(), {
        ...defaults,
        formatter: legacy.formatter,
        highlightMissing: true,
        resolveRedirects: true,
    });
});

test("invalid formatter settings fall back to defaults", () => {
    const validSettings = createDefaultFormatterSettings();
    const invalidValues = [
        "{broken",
        JSON.stringify({ settings: validSettings, version: 2 }),
        JSON.stringify({
            settings: {
                ...validSettings,
                formatter: {
                    ...validSettings.formatter,
                    subsequentParameterLayout: "legacy-matrix",
                },
            },
            version: 1,
        }),
        JSON.stringify({
            settings: {
                ...validSettings,
                formatter: {
                    ...validSettings.formatter,
                    fullWidthRatio: 1,
                },
            },
            version: 1,
        }),
    ];

    for (const serialized of invalidValues) {
        const storage = new MemorySettingsStorage(serialized);
        const store = createFormatterSettingsStore(() => storage);

        assert.deepEqual(store.load(), createDefaultFormatterSettings());
    }
});

test("unavailable storage never blocks formatting defaults", () => {
    const unavailable = createFormatterSettingsStore(() => undefined);
    const inaccessible = createFormatterSettingsStore(() => {
        throw new Error("storage denied");
    });

    assert.deepEqual(unavailable.load(), createDefaultFormatterSettings());
    assert.deepEqual(inaccessible.load(), createDefaultFormatterSettings());
    assert.throws(
        () => unavailable.save(createDefaultFormatterSettings()),
        /unavailable/u,
    );
    assert.throws(
        () => inaccessible.save(createDefaultFormatterSettings()),
        /storage denied/u,
    );
});

class MemorySettingsStorage {
    private readonly values = new Map<string, string>();

    constructor(
        value: string | null = null,
        key = FORMATTER_SETTINGS_STORAGE_KEY,
    ) {
        if (value != null) {
            this.values.set(key, value);
        }
    }

    getItem(key: string): string | null {
        return this.values.get(key) ?? null;
    }

    setItem(key: string, value: string): void {
        this.values.set(key, value);
    }
}
