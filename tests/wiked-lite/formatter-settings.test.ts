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

test("formatter settings round trip through version-four storage", () => {
    const storage = new MemorySettingsStorage();
    const store = createFormatterSettingsStore(() => storage);
    const settings = createConfiguredSettings();

    assert.deepEqual(store.load(), createDefaultFormatterSettings());
    store.save(settings);

    assert.deepEqual(store.load(), settings);
    assert.deepEqual(
        JSON.parse(storage.getItem(FORMATTER_SETTINGS_STORAGE_KEY) ?? ""),
        { settings, version: 4 },
    );
});

test("saving an omitted optional flag persists an explicit false", () => {
    const storage = new MemorySettingsStorage();
    const store = createFormatterSettingsStore(() => storage);
    const settings = createConfiguredSettings();
    delete settings.formatter.skipFirstLevelIndentation;

    store.save(settings);

    const stored = JSON.parse(
        storage.getItem(FORMATTER_SETTINGS_STORAGE_KEY) ?? "",
    ) as { settings: FormatterSettings };
    assert.equal(stored.settings.formatter.skipFirstLevelIndentation, false);
    assert.equal(store.load().formatter.skipFirstLevelIndentation, false);
});

test("version-three settings migrate every choice", () => {
    const settings = createConfiguredSettings();
    const legacy = {
        ...settings,
        formatter: {
            ...settings.formatter,
            indentSpaces: 8,
            skipFirstLevelIndentation: undefined,
        },
    };
    const storage = new MemorySettingsStorage(
        JSON.stringify({ settings: legacy, version: 3 }),
        "wiked-lite.formatter-settings.v3",
    );

    assert.deepEqual(createFormatterSettingsStore(() => storage).load(), {
        ...settings,
        formatter: {
            ...settings.formatter,
            indentSpaces: 4,
            skipFirstLevelIndentation: false,
        },
    });
});

test("version-three indentation widths migrate into the dialog range", () => {
    for (let indentSpaces = 0; indentSpaces <= 8; indentSpaces += 1) {
        const settings = createConfiguredSettings();
        const legacy = {
            ...settings,
            formatter: {
                ...settings.formatter,
                indentSpaces,
                skipFirstLevelIndentation: undefined,
            },
        };
        const storage = new MemorySettingsStorage(
            JSON.stringify({ settings: legacy, version: 3 }),
            "wiked-lite.formatter-settings.v3",
        );

        assert.equal(
            createFormatterSettingsStore(() => storage).load().formatter
                .indentSpaces,
            Math.min(indentSpaces, 4),
        );
    }
});

test("version-two storage keys and envelopes remain ignored", () => {
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

test("invalid version-four settings fall back to defaults", () => {
    const invalidValues = [
        "{broken",
        ...createInvalidVersionFourSettings().map((settings) =>
            JSON.stringify({ settings, version: 4 }),
        ),
    ];

    for (const serialized of invalidValues) {
        const storage = new MemorySettingsStorage(serialized);
        const store = createFormatterSettingsStore(() => storage);

        assert.deepEqual(store.load(), createDefaultFormatterSettings());
    }
});

function createInvalidVersionFourSettings(): unknown[] {
    const valid = createConfiguredSettings();
    return [
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
            formatter: { ...valid.formatter, indentSpaces: 5 },
        },
        {
            ...valid,
            formatter: {
                ...valid.formatter,
                subsequentParameterLayout: "legacy-matrix",
            },
        },
        {
            ...valid,
            formatter: {
                ...valid.formatter,
                skipFirstLevelIndentation: undefined,
            },
        },
        { ...valid, smallReferenceText: undefined },
    ];
}

test("invalid version four does not resurrect version three", () => {
    const legacy = createConfiguredSettings();
    const storage = new MemorySettingsStorage(
        JSON.stringify({ settings: legacy, version: 3 }),
        "wiked-lite.formatter-settings.v3",
    );
    storage.setItem(FORMATTER_SETTINGS_STORAGE_KEY, "{broken");

    assert.deepEqual(
        createFormatterSettingsStore(() => storage).load(),
        createDefaultFormatterSettings(),
    );
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
            skipFirstLevelIndentation: true,
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
