/** Build globals and Vue template context for wikEd Lite. */

import type * as Dialog from "./ui/dialogs/formatter-dialog.ts";

type RawTemplateContext = ReturnType<
    typeof Dialog.createFormatterDialogBindings
>;
type TemplateContext = {
    [Key in keyof RawTemplateContext]: RawTemplateContext[Key] extends {
        value: infer Value;
    }
        ? Value
        : RawTemplateContext[Key];
};

declare global {
    const __WIKED_LITE_STYLES__: string;
    const __WIKED_LITE_FORMATTER_DIALOG_TEMPLATE__: string;
    const __WIKED_LITE_FORMATTER_DIALOG_STYLES__: string;

    interface Window {
        wikEd?: {
            useWikEd?: boolean;
        };
        wikEdLiteConfig?: {
            highlightDelay?: number;
            maxLiveHighlightLength?: number;
            referenceTooltipDelay?: number;
        };
    }
}

declare module "@vue/runtime-core" {
    interface ComponentCustomProperties extends TemplateContext {}
}

export {};
