import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { compileTemplate, parse } from "@vue/compiler-sfc";

import {
    createDefaultFormatterSettings,
    type EditorFeatureSettings,
    type FormatterSettings,
} from "wiked-lite/domain/formatter-settings.ts";
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
const indentationSelectPattern =
    /<cdx-select[\s\S]*?:aria-label="msg\('dialog\.indentation'\)"/u;
const controlDescriptionStylePattern = new RegExp(
    [
        "\\.wiked-lite-dialog ",
        "\\.wiked-lite-dialog__control-description\\s*",
        "\\{(?<declarations>[^}]*)\\}",
    ].join(""),
    "u",
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
    assert.match(source, /:close-button-label="msg\('dialog\.close'\)"/u);
    assert.match(source, /use-close-button/u);
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

test("uses direct Codex choices with only the intended dependencies", () => {
    assert.equal(template.match(/<cdx-select\b/gu)?.length, 1);
    assert.match(template, indentationSelectPattern);
    assert.equal(template.match(/<cdx-radio\b/gu)?.length, 9);
    assert.equal(template.match(/<cdx-checkbox\b/gu)?.length, 9);
    assert.equal(template.match(/<cdx-toggle-switch\b/gu)?.length ?? 0, 0);
    assert.equal(template.match(/<cdx-text-input\b/gu)?.length ?? 0, 0);
    assert.equal(template.match(/:is-fieldset="true"/gu)?.length, 5);
    for (const message of [
        "indentation",
        "firstParameterGroup",
        "subsequentParameterGroup",
        "characterWidth",
        "redirectScope",
    ]) {
        assert.match(
            template,
            new RegExp(`msg\\("dialog\\.${message}"\\)`, "u"),
        );
    }
    assert.equal(template.match(/input-value="preserve"/gu)?.length, 2);
    assert.equal(template.match(/input-value="compact"/gu)?.length, 2);
    assert.match(template, /input-value="align-values"/u);
    assert.match(template, /input-value="align-names"/u);
    assert.match(template, /input-value="align-names-and-values"/u);
    assert.match(template, /input-value="5:3"/u);
    assert.match(template, /input-value="2:1"/u);
    assert.match(
        template,
        /:disabled="indentation === 'preserve' \|\| indentation === 0"/u,
    );
    assert.match(template, /:disabled="!resolveRedirects"/u);
    assert.doesNotMatch(template, /!formatFirstParameter/u);
    assert.doesNotMatch(template, /!formatSubsequentParameters/u);
    assert.match(template, /<a\b[^>]*:href="notBrokenUrl"/u);
    assert.match(template, /target="_blank"/u);
    assert.match(template, /rel="noopener noreferrer"/u);
    assert.doesNotMatch(template, /v-html|CdxTooltip|v-tooltip/u);
});

test("associates checkbox descriptions and keeps notes flat", () => {
    assert.doesNotMatch(
        template,
        /dialog\.(?:intro|layout|advanced|enableParameterLayout)/u,
    );
    assert.equal(
        template.match(/class="wiked-lite-dialog__note"/gu)?.length,
        2,
    );
    assert.equal(template.match(/<template #description>/gu)?.length, 4);
    assert.equal(
        template.match(/class="wiked-lite-dialog__control-description"/gu)
            ?.length,
        4,
    );
    for (const [model, description] of [
        ["normalizeConversion", "normalizeConversionDescription"],
        ["smallReferenceText", "smallReferenceTextDescription"],
        ["highlightMissing", "highlightMissingDescription"],
        ["fullPageReferencePreviews", "fullPageReferencePreviewsDescription"],
    ]) {
        assert.match(template, describedCheckboxPattern(model, description));
    }
    assert.match(styles, /font-size: 0\.875em/u);
    assert.match(styles, /margin: 4px 0 12px/u);
    assert.doesNotMatch(styles, /margin-left|padding-left/u);
    const declarations = styles.match(controlDescriptionStylePattern)?.groups
        ?.declarations;
    assert.ok(declarations);
    assert.match(declarations, /font-size: 0\.875em;/u);
    assert.match(declarations, /line-height: 1\.4;/u);
});

function describedCheckboxPattern(model: string, description: string): RegExp {
    return new RegExp(
        [
            `<cdx-checkbox\\s+v-model="${model}"`,
            "(?:(?!</cdx-checkbox>)[\\s\\S])*?<template #description>",
            "\\s*<span\\s+class=",
            '"wiked-lite-dialog__control-description"\\s*>',
            `\\s*\\{\\{\\s*msg\\(\\s*"dialog\\.${description}"\\s*,?\\s*\\)`,
            "\\s*\\}\\}\\s*</span>\\s*</template>",
            "(?:(?!</cdx-checkbox>)[\\s\\S])*?</cdx-checkbox>",
        ].join(""),
        "u",
    );
}

test("loads direct choices and saves their formatter mapping", async () => {
    const settings = createConfiguredSettings();
    const saved: FormatterDialogSelection[] = [];
    const bindings = createFormatterDialogBindings(createVueHarness(), {
        initialSelection: settings,
        notBrokenUrl: "/wiki/WP:NOTBROKEN",
        onClose() {},
        onError(error) {
            assert.fail(`Unexpected settings error: ${String(error)}`);
        },
        onSave(selection) {
            saved.push(selection);
        },
        async onSubmit() {},
    });

    assertConfiguredBindings(bindings);
    bindings.updateFirstParameterMode("preserve");
    bindings.updateSubsequentParameterMode("preserve");
    bindings.updateIndentation(3);
    bindings.updateSkipFirstLevelIndentation(false);
    bindings.characterWidthRatio.value = "5:3";
    bindings.largeFont.value = false;
    bindings.smallReferenceText.value = true;
    bindings.markSettingsDirty();

    await bindings.saveCurrentSettings();

    assert.equal(bindings.settingsSaved.value, true);
    assert.deepEqual(saved, [createSavedSettings(settings)]);
    bindings.updateFirstParameterMode("compact");
    assert.equal(bindings.settingsSaved.value, false);
});

test("preserve modes retain their underlying formatter details", async () => {
    const settings = createConfiguredSettings();
    const saved: FormatterSettings[] = [];
    const bindings = createFormatterDialogBindings(createVueHarness(), {
        initialSelection: settings,
        notBrokenUrl: "/wiki/WP:NOTBROKEN",
        onClose() {},
        onError() {},
        onSave(selection) {
            saved.push(selection);
        },
        async onSubmit() {},
    });

    bindings.updateIndentation("preserve");
    bindings.updateFirstParameterMode("preserve");
    bindings.updateSubsequentParameterMode("preserve");
    await bindings.saveCurrentSettings();

    assert.equal(saved[0]?.formatter.indentBlockTemplates, false);
    assert.equal(saved[0]?.formatter.indentSpaces, 4);
    assert.equal(saved[0]?.formatter.formatFirstParameter, false);
    assert.equal(saved[0]?.formatter.firstParameterLayout, "compact");
    assert.equal(saved[0]?.formatter.formatSubsequentParameters, false);
    assert.equal(
        saved[0]?.formatter.subsequentParameterLayout,
        "align-names-and-values",
    );
    assert.equal(saved[0]?.formatter.skipFirstLevelIndentation, true);
});

// eslint-disable-next-line max-len
test("the indentation menu is limited to preserve and zero through four", () => {
    const settings = createConfiguredSettings();
    settings.formatter.indentSpaces = 8;
    const bindings = createFormatterDialogBindings(createVueHarness(), {
        initialSelection: settings,
        notBrokenUrl: "/wiki/WP:NOTBROKEN",
        onClose() {},
        onError() {},
        onSave() {},
        async onSubmit() {},
    });

    assert.deepEqual(
        bindings.indentationOptions.map((item) => item.value),
        ["preserve", 0, 1, 2, 3, 4],
    );
    assert.equal(bindings.indentation.value, 4);
});

test("defers display settings until cancel closes", async () => {
    const closedWith: EditorFeatureSettings[] = [];
    const bindings = createFormatterDialogBindings(createVueHarness(), {
        initialSelection: createConfiguredSettings(),
        notBrokenUrl: "/wiki/WP:NOTBROKEN",
        onClose(settings) {
            closedWith.push(settings);
        },
        onError() {},
        onSave() {},
        async onSubmit() {},
    });

    bindings.largeFont.value = false;
    bindings.smallReferenceText.value = true;
    bindings.markSettingsDirty();
    await bindings.saveCurrentSettings();
    assert.deepEqual(closedWith, []);

    bindings.onCancel();
    bindings.onOpenChange(false);
    assert.equal(bindings.open.value, false);
    assert.deepEqual(closedWith, [
        expectedFeatures({ largeFont: false, smallReferenceText: true }),
    ]);
});

test("a normal dialog dismissal applies display settings exactly once", () => {
    const closedWith: EditorFeatureSettings[] = [];
    const bindings = createFormatterDialogBindings(createVueHarness(), {
        initialSelection: createConfiguredSettings(),
        notBrokenUrl: "/wiki/WP:NOTBROKEN",
        onClose(settings) {
            closedWith.push(settings);
        },
        onError() {},
        onSave() {},
        async onSubmit() {},
    });

    bindings.referencePreviews.value = true;
    bindings.onOpenChange(false);
    bindings.onOpenChange(false);

    assert.deepEqual(closedWith, [
        expectedFeatures({ referencePreviews: true }),
    ]);
});

test("ignores busy dismissal and applies after success", async () => {
    const closedWith: EditorFeatureSettings[] = [];
    let finishFormatting = function finishNoop(): void {};
    const formatting = new Promise<void>((resolve) => {
        finishFormatting = resolve;
    });
    const bindings = createFormatterDialogBindings(createVueHarness(), {
        initialSelection: createDefaultFormatterSettings(),
        notBrokenUrl: "/wiki/WP:NOTBROKEN",
        onClose(settings) {
            closedWith.push(settings);
        },
        onError() {},
        onSave() {},
        onSubmit() {
            return formatting;
        },
    });

    bindings.highlightMissing.value = true;
    const applying = bindings.apply();
    assert.equal(bindings.applying.value, true);
    bindings.open.value = false;
    bindings.onOpenChange(false);
    assert.equal(bindings.open.value, true);
    assert.deepEqual(closedWith, []);

    finishFormatting();
    await applying;
    assert.equal(bindings.open.value, false);
    assert.deepEqual(closedWith, [
        {
            ...expectedDefaultFeatures(),
            highlightMissing: true,
        },
    ]);
});

test("reports failures without applying display features", async () => {
    const formatFailure = new Error("formatter failed");
    const storageFailure = new Error("storage failed");
    const reported: unknown[] = [];
    const closedWith: EditorFeatureSettings[] = [];
    const bindings = createFormatterDialogBindings(createVueHarness(), {
        initialSelection: createDefaultFormatterSettings(),
        notBrokenUrl: "/wiki/WP:NOTBROKEN",
        onClose(settings) {
            closedWith.push(settings);
        },
        onError(error, operation) {
            reported.push([error, operation]);
        },
        onSave() {
            throw storageFailure;
        },
        async onSubmit() {
            throw formatFailure;
        },
    });

    await bindings.apply();
    assert.equal(bindings.applying.value, false);
    assert.deepEqual(closedWith, []);
    assert.match(bindings.error.value, /formatting failed/u);

    await bindings.saveCurrentSettings();
    assert.equal(bindings.savingSettings.value, false);
    assert.equal(bindings.settingsSaved.value, false);
    assert.deepEqual(closedWith, []);
    assert.match(bindings.error.value, /could not be saved/u);
    assert.deepEqual(reported, [
        [formatFailure, "format"],
        [storageFailure, "save-settings"],
    ]);
});

function assertConfiguredBindings(
    bindings: ReturnType<typeof createFormatterDialogBindings>,
): void {
    assert.equal(bindings.firstParameterMode.value, "compact");
    assert.equal(
        bindings.subsequentParameterMode.value,
        "align-names-and-values",
    );
    assert.equal(bindings.characterWidthRatio.value, "2:1");
    assert.equal(bindings.indentation.value, 4);
    assert.equal(bindings.skipFirstLevelIndentation.value, true);
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
            indentSpaces: 3,
            skipFirstLevelIndentation: false,
        },
        largeFont: false,
        smallReferenceText: true,
    };
}

function expectedFeatures(
    overrides: Partial<EditorFeatureSettings>,
): EditorFeatureSettings {
    return {
        fullPageReferencePreviews: true,
        highlightMissing: true,
        largeFont: true,
        referencePreviews: false,
        smallReferenceText: false,
        ...overrides,
    };
}

function expectedDefaultFeatures(): EditorFeatureSettings {
    return {
        fullPageReferencePreviews: false,
        highlightMissing: false,
        largeFont: false,
        referencePreviews: true,
        smallReferenceText: true,
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
