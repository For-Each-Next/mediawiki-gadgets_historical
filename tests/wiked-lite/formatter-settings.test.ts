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

test("formatter settings round trip through version-three storage", () => {
    const storage = new MemorySettingsStorage();
    const store = createFormatterSettingsStore(() => storage);
    const settings = createConfiguredSettings();

    assert.deepEqual(store.load(), createDefaultFormatterSettings());
    store.save(settings);

    assert.deepEqual(store.load(), settings);
    assert.deepEqual(
        JSON.parse(storage.getItem(FORMATTER_SETTINGS_STORAGE_KEY) ?? ""),
        { settings, version: 3 },
    );
});

test("old storage keys and envelope versions are ignored", () => {
    const defaults = createDefaultFormatterSettings();
    const legacy = createConfiguredSettings();
    const oldKeyStorage = new MemorySettingsStorage(
        JSON.stringify({ settings: legacy, version: 2 }),
        "wiked-lite.formatter-settings.v2",
    );
    const oldEnvelopeStorage = new MemorySettingsStorage(
        JSON.stringify({ settings: legacy, version: 2 }),
    );

    assert.deepEqual(
        createFormatterSettingsStore(() => oldKeyStorage).load(),
        defaults,
    );
    assert.deepEqual(
        createFormatterSettingsStore(() => oldEnvelopeStorage).load(),
        defaults,
    );
});

test("invalid version-three settings fall back to defaults", () => {
    const valid = createConfiguredSettings();
    const invalidSettings = [
        {
            ...valid,
            formatter: { ...valid.formatter, indentSpaces: -1 },
        },
        {
            ...valid,
            formatter: { ...valid.formatter, indentSpaces: 1.5 },
        },
        {
            ...valid,
            formatter: { ...valid.formatter, indentSpaces: 9 },
        },
        {
            ...valid,
            formatter: {
                ...valid.formatter,
                subsequentParameterLayout: "legacy-matrix",
            },
        },
        { ...valid, smallReferenceText: undefined },
    ];
    const invalidValues = [
        "{broken",
        ...invalidSettings.map((settings) =>
            JSON.stringify({ settings, version: 3 }),
        ),
    ];

    for (const serialized of invalidValues) {
        const storage = new MemorySettingsStorage(serialized);
        const store = createFormatterSettingsStore(() => storage);

        assert.deepEqual(store.load(), createDefaultFormatterSettings());
    }
});

test("unavailable storage never blocks formatter defaults", () => {
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

function createConfiguredSettings(): FormatterSettings {
    return {
        fullPageReferencePreviews: true,
        formatter: {
            characterWidthRatio: "2:1",
            firstParameterLayout: "compact",
            formatFirstParameter: true,
            formatSubsequentParameters: true,
            indentBlockTemplates: true,
            indentSpaces: 4,
            normalizeConversion: true,
            subsequentParameterLayout: "align-names-and-values",
        },
        highlightMissing: true,
        largeFont: true,
        referencePreviews: false,
        resolveRedirects: true,
        resolveTemplateRedirects: true,
        smallReferenceText: false,
    };
}

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
