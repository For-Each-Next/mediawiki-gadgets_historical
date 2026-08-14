/** Build-injected Codex formatter-dialog component. */

import type {
    FirstParameterLayout,
    SubsequentParameterLayout,
} from "#gadget/domain/formatter.ts";
import {
    getEditorFeatureSettings,
    type EditorFeatureSettings,
    type FormatterSettings,
} from "#gadget/domain/formatter-settings.ts";
import { interfaceLocale, msg } from "#gadget/i18n/index.ts";
import type { VueModule, VueRef } from "#gadget/ui/codex.ts";

export type FormatterDialogSelection = FormatterSettings;

type FormatterDialogOperation = "format" | "save-settings";

export interface FormatterDialogOptions {
    initialSelection: FormatterDialogSelection;
    notBrokenUrl: string;
    onClose(): void;
    onError(error: unknown, operation: FormatterDialogOperation): void;
    onFeatureChange(settings: EditorFeatureSettings): void;
    onSave(selection: FormatterDialogSelection): Promise<void> | void;
    onSubmit(selection: FormatterDialogSelection): Promise<void>;
}

type CharacterWidthRatio = "2:1" | "5:3";

interface DialogBindings {
    applying: VueRef<boolean>;
    apply(): Promise<void>;
    characterWidthRatio: VueRef<CharacterWidthRatio>;
    error: VueRef<string>;
    firstParameterLayout: VueRef<FirstParameterLayout>;
    fullPageReferencePreviews: VueRef<boolean>;
    highlightMissing: VueRef<boolean>;
    indentPipes: VueRef<boolean>;
    interfaceLocale: string;
    msg: typeof msg;
    notBrokenUrl: string;
    normalizeConversion: VueRef<boolean>;
    onCancel(): void;
    onOpenChange(value: boolean): void;
    open: VueRef<boolean>;
    referencePreviews: VueRef<boolean>;
    resolveRedirects: VueRef<boolean>;
    saveCurrentSettings(): Promise<void>;
    savingSettings: VueRef<boolean>;
    settingsSaved: VueRef<boolean>;
    subsequentParameterLayout: VueRef<SubsequentParameterLayout>;
    updateFullPageReferencePreviews(value: boolean): void;
    updateHighlightMissing(value: boolean): void;
    updateReferencePreviews(value: boolean): void;
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
    const applying = Vue.ref(false);
    const savingSettings = Vue.ref(false);
    const settingsSaved = Vue.ref(false);
    const error = Vue.ref("");
    const initial = options.initialSelection;
    const firstParameterLayout = Vue.ref<FirstParameterLayout>(
        initial.formatter.firstParameterLayout ?? "preserve",
    );
    const subsequentParameterLayout = Vue.ref<SubsequentParameterLayout>(
        initial.formatter.subsequentParameterLayout ?? "preserve",
    );
    const characterWidthRatio = Vue.ref<CharacterWidthRatio>(
        initial.formatter.fullWidthRatio === 2 ? "2:1" : "5:3",
    );
    const indentPipes = Vue.ref(initial.formatter.indentPipes === true);
    const normalizeConversion = Vue.ref(
        initial.formatter.normalizeConversion === true,
    );
    const resolveRedirects = Vue.ref(initial.resolveRedirects);
    const highlightMissing = Vue.ref(initial.highlightMissing);
    const referencePreviews = Vue.ref(initial.referencePreviews);
    const fullPageReferencePreviews = Vue.ref(
        initial.fullPageReferencePreviews,
    );
    function onCancel(): void {
        open.value = false;
        options.onClose();
    }
    function createSelection(): FormatterDialogSelection {
        return {
            fullPageReferencePreviews: fullPageReferencePreviews.value,
            formatter: {
                firstParameterLayout: firstParameterLayout.value,
                fullWidthRatio:
                    characterWidthRatio.value === "5:3" ? 5 / 3 : 2,
                indentPipes: indentPipes.value,
                normalizeConversion: normalizeConversion.value,
                subsequentParameterLayout: subsequentParameterLayout.value,
            },
            highlightMissing: highlightMissing.value,
            referencePreviews: referencePreviews.value,
            resolveRedirects: resolveRedirects.value,
        };
    }
    function updateFeature(
        setting: keyof EditorFeatureSettings,
        value: boolean,
    ): void {
        const target = {
            fullPageReferencePreviews,
            highlightMissing,
            referencePreviews,
        }[setting];
        target.value = value;
        settingsSaved.value = false;
        options.onFeatureChange(getEditorFeatureSettings(createSelection()));
    }
    async function apply(): Promise<void> {
        applying.value = true;
        error.value = "";
        settingsSaved.value = false;
        try {
            await options.onSubmit(createSelection());
            onCancel();
        } catch (caught) {
            options.onError(caught, "format");
            error.value = msg("feedback.failed");
            applying.value = false;
        }
    }
    async function saveCurrentSettings(): Promise<void> {
        savingSettings.value = true;
        settingsSaved.value = false;
        error.value = "";
        try {
            await options.onSave(createSelection());
            settingsSaved.value = true;
        } catch (caught) {
            options.onError(caught, "save-settings");
            error.value = msg("feedback.settingsSaveFailed");
        } finally {
            savingSettings.value = false;
        }
    }
    return {
        applying,
        apply,
        characterWidthRatio,
        error,
        firstParameterLayout,
        fullPageReferencePreviews,
        highlightMissing,
        indentPipes,
        interfaceLocale,
        msg,
        notBrokenUrl: options.notBrokenUrl,
        normalizeConversion,
        onCancel,
        onOpenChange(value) {
            if (!value) {
                onCancel();
            }
        },
        open,
        referencePreviews,
        resolveRedirects,
        saveCurrentSettings,
        savingSettings,
        settingsSaved,
        subsequentParameterLayout,
        updateFullPageReferencePreviews(value) {
            updateFeature("fullPageReferencePreviews", value);
        },
        updateHighlightMissing(value) {
            updateFeature("highlightMissing", value);
        },
        updateReferencePreviews(value) {
            updateFeature("referencePreviews", value);
        },
    };
}
