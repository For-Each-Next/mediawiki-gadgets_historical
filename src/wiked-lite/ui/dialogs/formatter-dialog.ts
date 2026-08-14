/** Build-injected Codex formatter-dialog component. */

import type {
    CharacterWidthRatio,
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

type IndentSpacesValue = number | string;

interface DialogBindings {
    applying: VueRef<boolean>;
    apply(): Promise<void>;
    characterWidthRatio: VueRef<CharacterWidthRatio>;
    error: VueRef<string>;
    firstParameterLayout: VueRef<FirstParameterLayout>;
    formatFirstParameter: VueRef<boolean>;
    formatSubsequentParameters: VueRef<boolean>;
    fullPageReferencePreviews: VueRef<boolean>;
    highlightMissing: VueRef<boolean>;
    indentBlockTemplates: VueRef<boolean>;
    indentError: VueRef<string>;
    indentSpaces: VueRef<IndentSpacesValue>;
    interfaceLocale: string;
    largeFont: VueRef<boolean>;
    markSettingsDirty(): void;
    msg: typeof msg;
    notBrokenSeparator: string;
    notBrokenUrl: string;
    normalizeConversion: VueRef<boolean>;
    onCancel(): void;
    onOpenChange(value: boolean): void;
    open: VueRef<boolean>;
    referencePreviews: VueRef<boolean>;
    resolveRedirects: VueRef<boolean>;
    resolveTemplateRedirects: VueRef<boolean>;
    saveCurrentSettings(): Promise<void>;
    savingSettings: VueRef<boolean>;
    settingsSaved: VueRef<boolean>;
    smallReferenceText: VueRef<boolean>;
    subsequentParameterLayout: VueRef<SubsequentParameterLayout>;
    updateFullPageReferencePreviews(value: boolean): void;
    updateCharacterWidthRatio(value: boolean): void;
    updateHighlightMissing(value: boolean): void;
    updateIndentBlockTemplates(value: boolean): void;
    updateIndentSpaces(value: IndentSpacesValue): void;
    updateLargeFont(value: boolean): void;
    updateReferencePreviews(value: boolean): void;
    updateSmallReferenceText(value: boolean): void;
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
        initial.formatter.firstParameterLayout,
    );
    const subsequentParameterLayout = Vue.ref<SubsequentParameterLayout>(
        initial.formatter.subsequentParameterLayout,
    );
    const characterWidthRatio = Vue.ref<CharacterWidthRatio>(
        initial.formatter.characterWidthRatio,
    );
    const formatFirstParameter = Vue.ref(
        initial.formatter.formatFirstParameter,
    );
    const formatSubsequentParameters = Vue.ref(
        initial.formatter.formatSubsequentParameters,
    );
    const indentBlockTemplates = Vue.ref(
        initial.formatter.indentBlockTemplates,
    );
    const indentSpaces = Vue.ref<IndentSpacesValue>(
        initial.formatter.indentSpaces,
    );
    let lastValidIndentSpaces = initial.formatter.indentSpaces;
    const indentError = Vue.ref("");
    const normalizeConversion = Vue.ref(initial.formatter.normalizeConversion);
    const resolveRedirects = Vue.ref(initial.resolveRedirects);
    const resolveTemplateRedirects = Vue.ref(initial.resolveTemplateRedirects);
    const highlightMissing = Vue.ref(initial.highlightMissing);
    const largeFont = Vue.ref(initial.largeFont);
    const referencePreviews = Vue.ref(initial.referencePreviews);
    const smallReferenceText = Vue.ref(initial.smallReferenceText);
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
                characterWidthRatio: characterWidthRatio.value,
                firstParameterLayout: firstParameterLayout.value,
                formatFirstParameter: formatFirstParameter.value,
                formatSubsequentParameters: formatSubsequentParameters.value,
                indentBlockTemplates: indentBlockTemplates.value,
                indentSpaces: Number(indentSpaces.value),
                normalizeConversion: normalizeConversion.value,
                subsequentParameterLayout: subsequentParameterLayout.value,
            },
            highlightMissing: highlightMissing.value,
            largeFont: largeFont.value,
            referencePreviews: referencePreviews.value,
            resolveRedirects: resolveRedirects.value,
            resolveTemplateRedirects: resolveTemplateRedirects.value,
            smallReferenceText: smallReferenceText.value,
        };
    }
    function updateFeature(
        setting: keyof EditorFeatureSettings,
        value: boolean,
    ): void {
        const target = {
            fullPageReferencePreviews,
            highlightMissing,
            largeFont,
            referencePreviews,
            smallReferenceText,
        }[setting];
        target.value = value;
        settingsSaved.value = false;
        options.onFeatureChange(getEditorFeatureSettings(createSelection()));
    }
    function markSettingsDirty(): void {
        settingsSaved.value = false;
    }
    async function apply(): Promise<void> {
        if (!validateIndentSpaces(indentSpaces.value, indentError)) {
            return;
        }
        applying.value = true;
        error.value = "";
        settingsSaved.value = false;
        try {
            await options.onSubmit(createSelection());
            applying.value = false;
            onCancel();
        } catch (caught) {
            options.onError(caught, "format");
            error.value = msg("feedback.failed");
            applying.value = false;
        }
    }
    async function saveCurrentSettings(): Promise<void> {
        if (!validateIndentSpaces(indentSpaces.value, indentError)) {
            return;
        }
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
        formatFirstParameter,
        formatSubsequentParameters,
        fullPageReferencePreviews,
        highlightMissing,
        indentBlockTemplates,
        indentError,
        indentSpaces,
        interfaceLocale,
        largeFont,
        markSettingsDirty,
        msg,
        notBrokenUrl: options.notBrokenUrl,
        notBrokenSeparator: interfaceLocale === "en" ? " " : "",
        normalizeConversion,
        onCancel,
        onOpenChange(value) {
            if (value) {
                return;
            }
            if (applying.value || savingSettings.value) {
                open.value = true;
                return;
            }
            onCancel();
        },
        open,
        referencePreviews,
        resolveRedirects,
        resolveTemplateRedirects,
        saveCurrentSettings,
        savingSettings,
        settingsSaved,
        smallReferenceText,
        subsequentParameterLayout,
        updateCharacterWidthRatio(value) {
            characterWidthRatio.value = value ? "5:3" : "2:1";
            settingsSaved.value = false;
        },
        updateFullPageReferencePreviews(value) {
            updateFeature("fullPageReferencePreviews", value);
        },
        updateHighlightMissing(value) {
            updateFeature("highlightMissing", value);
        },
        updateIndentBlockTemplates(value) {
            indentBlockTemplates.value = value;
            if (
                !value &&
                !validateIndentSpaces(indentSpaces.value, indentError)
            ) {
                indentSpaces.value = lastValidIndentSpaces;
                indentError.value = "";
            }
            markSettingsDirty();
        },
        updateIndentSpaces(value) {
            indentSpaces.value = value;
            if (validateIndentSpaces(value, indentError)) {
                lastValidIndentSpaces = Number(value);
            }
            markSettingsDirty();
        },
        updateLargeFont(value) {
            updateFeature("largeFont", value);
        },
        updateReferencePreviews(value) {
            updateFeature("referencePreviews", value);
        },
        updateSmallReferenceText(value) {
            updateFeature("smallReferenceText", value);
        },
    };
}

function validateIndentSpaces(
    value: IndentSpacesValue,
    error: VueRef<string>,
): boolean {
    const number = value === "" ? Number.NaN : Number(value);
    const valid = Number.isInteger(number) && number >= 0 && number <= 8;
    error.value = valid ? "" : msg("feedback.invalidIndent");
    return valid;
}
