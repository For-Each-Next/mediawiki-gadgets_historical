import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { compileTemplate, parse } from "@vue/compiler-sfc";

// eslint-disable-next-line max-len
import { createDefaultFormatterSettings } from "wiked-lite/domain/formatter-settings.ts";
import type { VueApp, VueModule } from "wiked-lite/ui/codex.ts";
import {
    createFormatterDialogBindings,
    type FormatterDialogSelection,
} from "wiked-lite/ui/dialogs/formatter-dialog.ts";

const dialogPath = fileURLToPath(
    new URL(
        "../../src/wiked-lite/ui/dialogs/formatter-dialog.vue",
        import.meta.url,
    ),
);
const template = await readFile(dialogPath, "utf8");
const styles = await readFile(
    new URL(
        "../../src/wiked-lite/ui/dialogs/formatter-dialog.css",
        import.meta.url,
    ),
    "utf8",
);

test("uses three tabs and a responsive custom footer", () => {
    const parsed = parse(template, { filename: dialogPath });
    const source = parsed.descriptor.template?.content;

    assert.deepEqual(parsed.errors, []);
    assert.ok(source);
    assert.equal(parsed.descriptor.script, null);
    assert.deepEqual(parsed.descriptor.styles, []);
    assert.match(source, /^\s*<cdx-dialog\b/u);
    assert.match(source, /:title="msg\('dialog\.title'\)"/u);
    assert.match(source, /:lang="interfaceLocale"/u);
    assert.equal(source.match(/<cdx-tab\b/gu)?.length, 3);
    assert.match(source, /name="block-templates"/u);
    assert.match(source, /name="other-formatting"/u);
    assert.match(source, /name="editor-display"/u);
    assert.match(source, /<template #footer>/u);
    assert.equal(source.match(/<cdx-button\b/gu)?.length, 3);
    assert.equal(source.match(/type="button"/gu)?.length, 3);
    assert.match(source, /action="progressive"/u);
    assert.match(source, /weight="primary"/u);
    assert.match(styles, /\.wiked-lite-dialog__footer/u);
    assert.match(styles, /max-width: 639px/u);

    const compiled = compileTemplate({
        filename: dialogPath,
        id: "wiked-lite-formatter",
        source,
    });
    assert.deepEqual(compiled.errors, []);
});

test("uses Codex controls with explicit dependent states", () => {
    assert.equal(template.match(/<cdx-text-input\b/gu)?.length, 1);
    assert.equal(template.match(/<cdx-toggle-switch\b/gu)?.length, 5);
    assert.equal(template.match(/:is-fieldset="true"/gu)?.length, 7);
    for (const message of [
        "indentation",
        "firstParameterGroup",
        "subsequentParameterGroup",
        "redirectScope",
    ]) {
        assert.match(
            template,
            new RegExp(`msg\\("dialog\\.${message}"\\)`, "u"),
        );
    }
    assert.equal(
        template.match(/msg\("dialog\.enableParameterLayout"\)/gu)?.length,
        2,
    );
    assert.doesNotMatch(template, /dialog\.layoutMode/u);
    assert.match(template, /input-type="number"/u);
    assert.match(template, /min="0"/u);
    assert.match(template, /max="8"/u);
    assert.match(template, /:disabled="!indentBlockTemplates"/u);
    assert.match(template, /:disabled="!formatFirstParameter"/u);
    assert.match(template, /:disabled="!formatSubsequentParameters"/u);
    assert.match(template, /:disabled="!resolveRedirects"/u);
    assert.match(template, /input-value="align-values"/u);
    assert.match(template, /input-value="align-names"/u);
    assert.match(template, /input-value="align-names-and-values"/u);
    assert.equal(template.match(/input-value="compact"/gu)?.length, 2);
    assert.doesNotMatch(template, /input-value="preserve"/u);
    assert.match(template, /characterWidthRatio === '5:3'/u);
    assert.match(template, /<a\b[^>]*:href="notBrokenUrl"/u);
    assert.match(template, /target="_blank"/u);
    assert.match(template, /rel="noopener noreferrer"/u);
    assert.doesNotMatch(template, /v-html|CdxTooltip|v-tooltip/u);
});

test("loads, remembers, and saves every formatter setting", async () => {
    const settings = createConfiguredSettings();
    const saved: FormatterDialogSelection[] = [];
    const featureChanges: unknown[] = [];
    const bindings = createFormatterDialogBindings(createVueHarness(), {
        initialSelection: settings,
        notBrokenUrl: "/wiki/WP:NOTBROKEN",
        onClose() {},
        onError(error) {
            assert.fail(`Unexpected settings error: ${String(error)}`);
        },
        onFeatureChange(selection) {
            featureChanges.push(selection);
        },
        onSave(selection) {
            saved.push(selection);
        },
        async onSubmit() {},
    });

    assertConfiguredBindings(bindings);
    changeSettings(bindings, featureChanges);

    await bindings.saveCurrentSettings();

    assert.equal(bindings.settingsSaved.value, true);
    assert.deepEqual(saved, [createSavedSettings(settings)]);
    bindings.formatFirstParameter.value = true;
    bindings.markSettingsDirty();
    assert.equal(bindings.settingsSaved.value, false);
});

function changeSettings(
    bindings: ReturnType<typeof createFormatterDialogBindings>,
    featureChanges: unknown[],
): void {
    bindings.formatFirstParameter.value = false;
    bindings.formatSubsequentParameters.value = false;
    assert.equal(bindings.firstParameterLayout.value, "compact");
    assert.equal(
        bindings.subsequentParameterLayout.value,
        "align-names-and-values",
    );

    bindings.updateCharacterWidthRatio(true);
    bindings.updateIndentSpaces(8);
    bindings.updateLargeFont(false);
    bindings.updateSmallReferenceText(true);

    assert.deepEqual(featureChanges, [
        expectedFeatures({ largeFont: false }),
        expectedFeatures({ largeFont: false, smallReferenceText: true }),
    ]);
}

function createSavedSettings(
    settings: FormatterDialogSelection,
): FormatterDialogSelection {
    return {
        ...settings,
        formatter: {
            ...settings.formatter,
            characterWidthRatio: "5:3",
            formatFirstParameter: false,
            formatSubsequentParameters: false,
            indentSpaces: 8,
        },
        largeFont: false,
        smallReferenceText: true,
    };
}

test("invalid indentation blocks formatting and saving", async () => {
    let submitted = false;
    let saved = false;
    const bindings = createFormatterDialogBindings(createVueHarness(), {
        initialSelection: createDefaultFormatterSettings(),
        notBrokenUrl: "/wiki/WP:NOTBROKEN",
        onClose() {},
        onError() {},
        onFeatureChange() {},
        onSave() {
            saved = true;
        },
        async onSubmit() {
            submitted = true;
        },
    });

    bindings.updateIndentBlockTemplates(true);
    for (const value of ["", -1, 1.5, 9]) {
        bindings.updateIndentSpaces(value);
        await bindings.apply();
        await bindings.saveCurrentSettings();
        assert.match(bindings.indentError.value, /integer from 0 through 8/u);
    }
    assert.equal(submitted, false);
    assert.equal(saved, false);

    bindings.updateIndentBlockTemplates(false);
    assert.equal(bindings.indentError.value, "");
    assert.equal(bindings.indentSpaces.value, 2);
    await bindings.saveCurrentSettings();
    assert.equal(saved, true);
});

test("busy formatting ignores dialog dismissal", async () => {
    let closed = false;
    let finishFormatting = function finishNoop(): void {};
    const formatting = new Promise<void>((resolve) => {
        finishFormatting = resolve;
    });
    const bindings = createFormatterDialogBindings(createVueHarness(), {
        initialSelection: createDefaultFormatterSettings(),
        notBrokenUrl: "/wiki/WP:NOTBROKEN",
        onClose() {
            closed = true;
        },
        onError() {},
        onFeatureChange() {},
        onSave() {},
        onSubmit() {
            return formatting;
        },
    });

    const applying = bindings.apply();
    assert.equal(bindings.applying.value, true);
    bindings.open.value = false;
    bindings.onOpenChange(false);
    assert.equal(bindings.open.value, true);
    assert.equal(closed, false);

    finishFormatting();
    await applying;
    assert.equal(bindings.open.value, false);
    assert.equal(closed, true);
});

test("reports formatter and storage failures without closing", async () => {
    const formatFailure = new Error("formatter failed");
    const storageFailure = new Error("storage failed");
    const reported: unknown[] = [];
    let closed = false;
    const bindings = createFormatterDialogBindings(createVueHarness(), {
        initialSelection: createDefaultFormatterSettings(),
        notBrokenUrl: "/wiki/WP:NOTBROKEN",
        onClose() {
            closed = true;
        },
        onError(error, operation) {
            reported.push([error, operation]);
        },
        onFeatureChange() {},
        onSave() {
            throw storageFailure;
        },
        async onSubmit() {
            throw formatFailure;
        },
    });

    await bindings.apply();
    assert.equal(bindings.applying.value, false);
    assert.equal(closed, false);
    assert.match(bindings.error.value, /formatting failed/u);

    await bindings.saveCurrentSettings();
    assert.equal(bindings.savingSettings.value, false);
    assert.equal(bindings.settingsSaved.value, false);
    assert.equal(closed, false);
    assert.match(bindings.error.value, /could not be saved/u);
    assert.deepEqual(reported, [
        [formatFailure, "format"],
        [storageFailure, "save-settings"],
    ]);
});

function assertConfiguredBindings(
    bindings: ReturnType<typeof createFormatterDialogBindings>,
): void {
    assert.equal(bindings.firstParameterLayout.value, "compact");
    assert.equal(
        bindings.subsequentParameterLayout.value,
        "align-names-and-values",
    );
    assert.equal(bindings.characterWidthRatio.value, "2:1");
    assert.equal(bindings.formatFirstParameter.value, true);
    assert.equal(bindings.formatSubsequentParameters.value, true);
    assert.equal(bindings.indentBlockTemplates.value, true);
    assert.equal(bindings.indentSpaces.value, 4);
    assert.equal(bindings.normalizeConversion.value, true);
    assert.equal(bindings.resolveRedirects.value, true);
    assert.equal(bindings.resolveTemplateRedirects.value, true);
    assert.equal(bindings.highlightMissing.value, true);
    assert.equal(bindings.largeFont.value, true);
    assert.equal(bindings.referencePreviews.value, false);
    assert.equal(bindings.smallReferenceText.value, false);
    assert.equal(bindings.fullPageReferencePreviews.value, true);
}

function createConfiguredSettings(): FormatterDialogSelection {
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

function expectedFeatures(
    overrides: Partial<{
        largeFont: boolean;
        smallReferenceText: boolean;
    }>,
): unknown {
    return {
        fullPageReferencePreviews: true,
        highlightMissing: true,
        largeFont: true,
        referencePreviews: false,
        smallReferenceText: false,
        ...overrides,
    };
}

function createVueHarness(): VueModule {
    return {
        createMwApp(): VueApp {
            throw new Error("The dialog test does not mount Vue.");
        },
        defineComponent(component: unknown): unknown {
            return component;
        },
        ref<T>(value: T) {
            return { value };
        },
    };
}
