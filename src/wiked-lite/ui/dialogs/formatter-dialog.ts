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

type FirstParameterMode = FirstParameterLayout | "preserve";
type FormatterDialogOperation = "format" | "save-settings";
type IndentationSelection = 0 | 1 | 2 | 3 | 4 | "preserve";
type SubsequentParameterMode = SubsequentParameterLayout | "preserve";

interface SelectMenuItem {
    label: string;
    value: IndentationSelection;
}

export interface FormatterDialogOptions {
    initialSelection: FormatterDialogSelection;
    notBrokenUrl: string;
    onClose(settings: EditorFeatureSettings): void;
    onError(error: unknown, operation: FormatterDialogOperation): void;
    onSave(selection: FormatterDialogSelection): Promise<void> | void;
    onSubmit(selection: FormatterDialogSelection): Promise<void>;
}

interface DialogBindings {
    applying: VueRef<boolean>;
    apply(): Promise<void>;
    characterWidthRatio: VueRef<CharacterWidthRatio>;
    error: VueRef<string>;
    firstParameterMode: VueRef<FirstParameterMode>;
    fullPageReferencePreviews: VueRef<boolean>;
    highlightMissing: VueRef<boolean>;
    indentation: VueRef<IndentationSelection>;
    indentationOptions: SelectMenuItem[];
    interfaceLocale: string;
    largeFont: VueRef<boolean>;
    markSettingsDirty(): void;
    msg: typeof msg;
    normalizeConversion: VueRef<boolean>;
    notBrokenSeparator: string;
    notBrokenUrl: string;
    onCancel(): void;
    onOpenChange(value: boolean): void;
    open: VueRef<boolean>;
    referencePreviews: VueRef<boolean>;
    resolveRedirects: VueRef<boolean>;
    resolveTemplateRedirects: VueRef<boolean>;
    saveCurrentSettings(): Promise<void>;
    savingSettings: VueRef<boolean>;
    settingsSaved: VueRef<boolean>;
    skipFirstLevelIndentation: VueRef<boolean>;
    smallReferenceText: VueRef<boolean>;
    subsequentParameterMode: VueRef<SubsequentParameterMode>;
    updateFirstParameterMode(value: FirstParameterMode): void;
    updateIndentation(value: IndentationSelection): void;
    updateSkipFirstLevelIndentation(value: boolean): void;
    updateSubsequentParameterMode(value: SubsequentParameterMode): void;
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
    const indentation = Vue.ref<IndentationSelection>(
        initial.formatter.indentBlockTemplates
            ? normalizeIndentation(initial.formatter.indentSpaces)
            : "preserve",
    );
    let lastIndentation = normalizeIndentation(initial.formatter.indentSpaces);
    const firstParameterMode = Vue.ref<FirstParameterMode>(
        initial.formatter.formatFirstParameter
            ? initial.formatter.firstParameterLayout
            : "preserve",
    );
    let lastFirstParameterLayout = initial.formatter.firstParameterLayout;
    const subsequentParameterMode = Vue.ref<SubsequentParameterMode>(
        initial.formatter.formatSubsequentParameters
            ? initial.formatter.subsequentParameterLayout
            : "preserve",
    );
    let lastSubsequentParameterLayout =
        initial.formatter.subsequentParameterLayout;
    const characterWidthRatio = Vue.ref<CharacterWidthRatio>(
        initial.formatter.characterWidthRatio,
    );
    const skipFirstLevelIndentation = Vue.ref(
        initial.formatter.skipFirstLevelIndentation === true,
    );
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
    let closed = false;

    function createSelection(): FormatterDialogSelection {
        const selectedIndentation = indentation.value;
        const selectedFirstMode = firstParameterMode.value;
        const selectedSubsequentMode = subsequentParameterMode.value;
        return {
            fullPageReferencePreviews: fullPageReferencePreviews.value,
            formatter: {
                characterWidthRatio: characterWidthRatio.value,
                firstParameterLayout:
                    selectedFirstMode === "preserve"
                        ? lastFirstParameterLayout
                        : selectedFirstMode,
                formatFirstParameter: selectedFirstMode !== "preserve",
                formatSubsequentParameters:
                    selectedSubsequentMode !== "preserve",
                indentBlockTemplates: selectedIndentation !== "preserve",
                indentSpaces:
                    selectedIndentation === "preserve"
                        ? lastIndentation
                        : selectedIndentation,
                normalizeConversion: normalizeConversion.value,
                skipFirstLevelIndentation: skipFirstLevelIndentation.value,
                subsequentParameterLayout:
                    selectedSubsequentMode === "preserve"
                        ? lastSubsequentParameterLayout
                        : selectedSubsequentMode,
            },
            highlightMissing: highlightMissing.value,
            largeFont: largeFont.value,
            referencePreviews: referencePreviews.value,
            resolveRedirects: resolveRedirects.value,
            resolveTemplateRedirects: resolveTemplateRedirects.value,
            smallReferenceText: smallReferenceText.value,
        };
    }
    function markSettingsDirty(): void {
        settingsSaved.value = false;
    }
    function closeDialog(): void {
        if (closed) {
            return;
        }
        closed = true;
        open.value = false;
        options.onClose(getEditorFeatureSettings(createSelection()));
    }
    function onCancel(): void {
        if (applying.value || savingSettings.value) {
            return;
        }
        closeDialog();
    }
    async function apply(): Promise<void> {
        if (applying.value || savingSettings.value || closed) {
            return;
        }
        applying.value = true;
        error.value = "";
        settingsSaved.value = false;
        try {
            await options.onSubmit(createSelection());
        } catch (caught) {
            options.onError(caught, "format");
            error.value = msg("feedback.failed");
            applying.value = false;
            return;
        }
        applying.value = false;
        closeDialog();
    }
    async function saveCurrentSettings(): Promise<void> {
        if (applying.value || savingSettings.value || closed) {
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
        firstParameterMode,
        fullPageReferencePreviews,
        highlightMissing,
        indentation,
        indentationOptions: createIndentationOptions(),
        interfaceLocale,
        largeFont,
        markSettingsDirty,
        msg,
        normalizeConversion,
        notBrokenUrl: options.notBrokenUrl,
        notBrokenSeparator: interfaceLocale === "en" ? " " : "",
        onCancel,
        onOpenChange(value) {
            if (value) {
                return;
            }
            if (applying.value || savingSettings.value) {
                open.value = true;
                return;
            }
            closeDialog();
        },
        open,
        referencePreviews,
        resolveRedirects,
        resolveTemplateRedirects,
        saveCurrentSettings,
        savingSettings,
        settingsSaved,
        skipFirstLevelIndentation,
        smallReferenceText,
        subsequentParameterMode,
        updateFirstParameterMode(value) {
            firstParameterMode.value = value;
            if (value !== "preserve") {
                lastFirstParameterLayout = value;
            }
            markSettingsDirty();
        },
        updateIndentation(value) {
            indentation.value = value;
            if (value !== "preserve") {
                lastIndentation = value;
            }
            markSettingsDirty();
        },
        updateSkipFirstLevelIndentation(value) {
            skipFirstLevelIndentation.value = value;
            markSettingsDirty();
        },
        updateSubsequentParameterMode(value) {
            subsequentParameterMode.value = value;
            if (value !== "preserve") {
                lastSubsequentParameterLayout = value;
            }
            markSettingsDirty();
        },
    };
}

function createIndentationOptions(): SelectMenuItem[] {
    return [
        { label: msg("dialog.preserve"), value: "preserve" },
        { label: "0", value: 0 },
        { label: "1", value: 1 },
        { label: "2", value: 2 },
        { label: "3", value: 3 },
        { label: "4", value: 4 },
    ];
}

function normalizeIndentation(value: number): 0 | 1 | 2 | 3 | 4 {
    return Math.max(0, Math.min(4, value)) as 0 | 1 | 2 | 3 | 4;
}
