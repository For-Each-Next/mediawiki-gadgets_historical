/** Build-injected Codex formatter-dialog component. */

import type { FormatterOptions } from "#gadget/domain/formatter.ts";
import { interfaceLocale, msg } from "#gadget/i18n/index.ts";
import type { VueModule, VueRef } from "#gadget/ui/codex.ts";

export interface FormatterDialogSelection {
    formatter: FormatterOptions;
    highlightMissing: boolean;
    resolveRedirects: boolean;
}

export interface FormatterDialogOptions {
    onClose(): void;
    onSubmit(selection: FormatterDialogSelection): Promise<void>;
}

type CharacterWidthRatio = "1:2" | "3:5";

interface DialogBindings {
    alignEquals: VueRef<boolean>;
    apply(): Promise<void>;
    characterWidthRatio: VueRef<CharacterWidthRatio>;
    error: VueRef<string>;
    highlightMissing: VueRef<boolean>;
    indentPipes: VueRef<boolean>;
    interfaceLocale: string;
    msg: typeof msg;
    normalizeConversion: VueRef<boolean>;
    onCancel(): void;
    onOpenChange(value: boolean): void;
    open: VueRef<boolean>;
    resolveRedirects: VueRef<boolean>;
    saving: VueRef<boolean>;
}

export const FORMATTER_DIALOG_TEMPLATE =
    typeof __WIKED_LITE_FORMATTER_DIALOG_TEMPLATE__ === "undefined"
        ? ""
        : __WIKED_LITE_FORMATTER_DIALOG_TEMPLATE__;

export const FORMATTER_DIALOG_STYLES =
    typeof __WIKED_LITE_FORMATTER_DIALOG_STYLES__ === "undefined"
        ? ""
        : __WIKED_LITE_FORMATTER_DIALOG_STYLES__;

/**
 * Creates the formatter dialog mounted by the editor adapter.
 *
 * @param Vue - Vue value.
 * @param options - Operation options.
 * @returns Created the formatter dialog mounted by the editor adapter.
 */
export function createFormatterDialogComponent(
    Vue: VueModule,
    options: FormatterDialogOptions,
): unknown {
    function setup(): DialogBindings {
        return createFormatterDialogBindings(Vue, options);
    }
    return Vue.defineComponent({
        name: "WikEdLiteFormatterDialog",
        setup,
        template: FORMATTER_DIALOG_TEMPLATE,
    });
}

// eslint-disable-next-line max-lines-per-function
export function createFormatterDialogBindings(
    Vue: VueModule,
    options: FormatterDialogOptions,
): DialogBindings {
    const open = Vue.ref(true);
    const saving = Vue.ref(false);
    const error = Vue.ref("");
    const indentPipes = Vue.ref(true);
    const alignEquals = Vue.ref(false);
    const characterWidthRatio = Vue.ref<CharacterWidthRatio>("1:2");
    const normalizeConversion = Vue.ref(false);
    const resolveRedirects = Vue.ref(false);
    const highlightMissing = Vue.ref(false);
    function onCancel(): void {
        open.value = false;
        options.onClose();
    }
    async function apply(): Promise<void> {
        saving.value = true;
        error.value = "";
        try {
            await options.onSubmit({
                formatter: {
                    alignEquals: alignEquals.value,
                    fullWidthRatio:
                        characterWidthRatio.value === "3:5" ? 5 / 3 : 2,
                    indentPipes: indentPipes.value,
                    normalizeConversion: normalizeConversion.value,
                },
                highlightMissing: highlightMissing.value,
                resolveRedirects: resolveRedirects.value,
            });
            onCancel();
        } catch (caught) {
            console.error("wikEd Lite formatting failed", caught);
            error.value = msg("feedback.failed");
            saving.value = false;
        }
    }
    return {
        alignEquals,
        apply,
        characterWidthRatio,
        error,
        highlightMissing,
        indentPipes,
        interfaceLocale,
        msg,
        normalizeConversion,
        onCancel,
        onOpenChange(value) {
            if (!value) {
                onCancel();
            }
        },
        open,
        resolveRedirects,
        saving,
    };
}
