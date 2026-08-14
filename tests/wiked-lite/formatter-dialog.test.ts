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

test("uses the native Codex header and responsive action footer", () => {
    const parsed = parse(template, { filename: dialogPath });
    const descriptor = parsed.descriptor;
    const source = descriptor.template?.content;

    assert.deepEqual(parsed.errors, []);
    assert.ok(source);
    assert.equal(descriptor.script, null);
    assert.deepEqual(descriptor.styles, []);
    assert.match(source, /^\s*<cdx-dialog\b/u);
    assert.match(source, /:title="msg\('dialog\.title'\)"/u);
    assert.match(source, /:lang="interfaceLocale"/u);
    assert.equal(source.match(/:primary-action=/gu)?.length, 1);
    assert.equal(source.match(/:default-action=/gu)?.length, 1);
    assert.match(source, /actionType: 'progressive'/u);
    assert.match(source, /@primary="apply"/u);
    assert.match(source, /@default="onCancel"/u);
    assert.doesNotMatch(source, /#footer/u);
    assert.match(source, /<cdx-button\b/u);
    assert.match(source, /type="button"/u);
    const compiled = compileTemplate({
        filename: dialogPath,
        id: "wiked-lite-formatter",
        source,
    });

    assert.deepEqual(compiled.errors, []);
});

test("uses three Codex-owned option groups and a real policy link", () => {
    assert.match(template, /msg\("dialog\.layout"\)/u);
    assert.match(template, /msg\("dialog\.advanced"\)/u);
    assert.match(template, /msg\("dialog\.other"\)/u);
    assert.match(template, /input-value="5:3"/u);
    assert.match(template, /input-value="2:1"/u);
    assert.match(template, /input-value="align-separator"/u);
    assert.match(template, /input-value="align-columns"/u);
    assert.match(template, /input-value="align-columns-completely"/u);
    assert.equal(template.match(/input-value="compact"/gu)?.length, 2);
    assert.equal(template.match(/input-value="preserve"/gu)?.length, 2);
    assert.equal(template.match(/:inline="true"/gu)?.length, 2);
    assert.match(template, /dialog\.alignColumnsTooltip/u);
    assert.match(template, /dialog\.alignColumnsCompletelyTooltip/u);
    assert.match(template, /dialog\.characterRatioFiveToThreeTooltip/u);
    assert.match(template, /dialog\.characterRatioTwoToOneTooltip/u);
    assert.match(template, /subsequentParameterLayout !== 'align-columns'/u);
    assert.match(template, /:title=/u);
    assert.match(template, /<a\b[^>]*:href="notBrokenUrl"/u);
    assert.match(template, /target="_blank"/u);
    assert.match(template, /rel="noopener noreferrer"/u);
    assert.doesNotMatch(
        template,
        /\[\[WP:NOTBROKEN\]\]|v-html|CdxTooltip|v-tooltip/u,
    );
    assert.doesNotMatch(template, /cdx-text-input|sortCategories/u);
    assert.doesNotMatch(styles, /\b(?:gap|margin|padding)\b/u);
});

test("maps each character-width choice to its formatter ratio", async () => {
    const choices = [
        ["5:3", 5 / 3],
        ["2:1", 2],
    ] as const;

    for (const [choice, expectedRatio] of choices) {
        await assertCharacterWidthChoice(choice, expectedRatio);
    }
});

async function assertCharacterWidthChoice(
    choice: "2:1" | "5:3",
    expectedRatio: number,
): Promise<void> {
    const submissions: FormatterDialogSelection[] = [];
    let closed = false;
    const bindings = createFormatterDialogBindings(createVueHarness(), {
        initialSelection: createDefaultFormatterSettings(),
        notBrokenUrl: "/wiki/WP:NOTBROKEN",
        onClose() {
            closed = true;
        },
        onError(error) {
            assert.fail(`Unexpected formatter error: ${String(error)}`);
        },
        onSave() {},
        onSubmit(selection) {
            submissions.push(selection);
            return Promise.resolve();
        },
    });
    bindings.firstParameterLayout.value = "align-separator";
    bindings.subsequentParameterLayout.value = "align-columns-completely";
    bindings.characterWidthRatio.value = choice;

    await bindings.apply();

    assert.equal(closed, true);
    assert.equal(submissions[0]?.formatter.fullWidthRatio, expectedRatio);
    assert.equal(
        submissions[0]?.formatter.subsequentParameterLayout,
        "align-columns-completely",
    );
}

test("loads and saves every formatter choice without applying", async () => {
    const settings = createConfiguredSettings();
    const saved: FormatterDialogSelection[] = [];
    let submitted = false;
    let closed = false;
    const bindings = createFormatterDialogBindings(createVueHarness(), {
        initialSelection: settings,
        notBrokenUrl: "/wiki/WP:NOTBROKEN",
        onClose() {
            closed = true;
        },
        onError(error) {
            assert.fail(`Unexpected settings error: ${String(error)}`);
        },
        onSave(selection) {
            saved.push(selection);
        },
        async onSubmit() {
            submitted = true;
        },
    });

    assert.equal(bindings.firstParameterLayout.value, "compact");
    assert.equal(bindings.subsequentParameterLayout.value, "align-columns");
    assert.equal(bindings.characterWidthRatio.value, "2:1");
    assert.equal(bindings.indentPipes.value, true);
    assert.equal(bindings.normalizeConversion.value, true);
    assert.equal(bindings.resolveRedirects.value, true);
    assert.equal(bindings.highlightMissing.value, true);

    await bindings.saveCurrentSettings();

    assert.equal(submitted, false);
    assert.equal(closed, false);
    assert.equal(bindings.settingsSaved.value, true);
    assert.equal(bindings.savingSettings.value, false);
    assert.deepEqual(saved, [settings]);
});

function createConfiguredSettings(): FormatterDialogSelection {
    return {
        formatter: {
            firstParameterLayout: "compact",
            fullWidthRatio: 2,
            indentPipes: true,
            normalizeConversion: true,
            subsequentParameterLayout: "align-columns",
        },
        highlightMissing: true,
        resolveRedirects: true,
    };
}

test("reports formatter failures through the diagnostic port", async () => {
    const failure = new Error("formatter failed");
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
        onSave() {},
        async onSubmit() {
            throw failure;
        },
    });

    await bindings.apply();

    assert.deepEqual(reported, [[failure, "format"]]);
    assert.equal(
        bindings.error.value,
        "Wikitext formatting failed. Review the source and try again.",
    );
    assert.equal(bindings.applying.value, false);
    assert.equal(closed, false);
});

test("keeps the dialog open when settings cannot be saved", async () => {
    const failure = new Error("storage failed");
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
        onSave() {
            throw failure;
        },
        async onSubmit() {},
    });

    await bindings.saveCurrentSettings();

    assert.deepEqual(reported, [[failure, "save-settings"]]);
    assert.equal(
        bindings.error.value,
        "Formatter settings could not be saved in this browser.",
    );
    assert.equal(bindings.settingsSaved.value, false);
    assert.equal(bindings.savingSettings.value, false);
    assert.equal(closed, false);
});

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
