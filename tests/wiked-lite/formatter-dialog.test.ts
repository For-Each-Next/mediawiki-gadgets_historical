import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import type { VueApp, VueModule } from "../../src/wiked-lite/ui/codex.ts";
import {
    createFormatterDialogBindings,
    type FormatterDialogSelection,
} from "../../src/wiked-lite/ui/dialogs/formatter-dialog.ts";

const template = await readFile(
    new URL(
        "../../src/wiked-lite/ui/dialogs/formatter-dialog.vue",
        import.meta.url,
    ),
    "utf8",
);
const styles = await readFile(
    new URL(
        "../../src/wiked-lite/ui/dialogs/formatter-dialog.css",
        import.meta.url,
    ),
    "utf8",
);

test("uses Codex-owned layout for nested character-width choices", () => {
    assert.match(template, /<template #custom-input>/u);
    assert.match(template, /:disabled="!alignEquals"/u);
    assert.match(template, /input-value="1:2"/u);
    assert.match(template, /input-value="3:5"/u);
    assert.equal(template.match(/:inline="true"/gu)?.length, 2);
    assert.match(template, /:primary-action=/u);
    assert.match(template, /:default-action=/u);
    assert.doesNotMatch(template, /cdx-text-input|sortCategories/u);
    assert.doesNotMatch(styles, /\b(?:gap|margin|padding)\b/u);
});

test("maps each character-width choice to its formatter ratio", async () => {
    const choices = [
        ["1:2", 2],
        ["3:5", 5 / 3],
    ] as const;

    for (const [choice, expectedRatio] of choices) {
        const submissions: FormatterDialogSelection[] = [];
        let closed = false;
        const bindings = createFormatterDialogBindings(createVueHarness(), {
            onClose() {
                closed = true;
            },
            onError(error) {
                assert.fail(`Unexpected formatter error: ${String(error)}`);
            },
            onSubmit(selection) {
                submissions.push(selection);
                return Promise.resolve();
            },
        });

        bindings.alignEquals.value = true;
        bindings.characterWidthRatio.value = choice;
        await bindings.apply();

        assert.equal(closed, true);
        assert.deepEqual(submissions, [
            {
                formatter: {
                    alignEquals: true,
                    fullWidthRatio: expectedRatio,
                    indentPipes: true,
                    normalizeConversion: false,
                },
                highlightMissing: false,
                resolveRedirects: false,
            },
        ]);
    }
});

test("reports formatter failures through the diagnostic port", async () => {
    const failure = new Error("formatter failed");
    const reported: unknown[] = [];
    let closed = false;
    const bindings = createFormatterDialogBindings(createVueHarness(), {
        onClose() {
            closed = true;
        },
        onError(error) {
            reported.push(error);
        },
        async onSubmit() {
            throw failure;
        },
    });

    await bindings.apply();

    assert.deepEqual(reported, [failure]);
    assert.equal(
        bindings.error.value,
        "Wikitext formatting failed. Review the source and try again.",
    );
    assert.equal(bindings.saving.value, false);
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
