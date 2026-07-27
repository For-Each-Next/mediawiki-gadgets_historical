/**
 * Minimal MediaWiki Vue and Codex contracts used by Citation Formatter.
 */

export interface VueModule {
    computed: <T>(getter: () => T) => { readonly value: T };
    createMwApp: (component: unknown) => VueApp;
    defineComponent: (component: unknown) => unknown;
    ref: <T>(value: T) => { value: T };
}

interface VueApp {
    component: (name: string, component: unknown) => void;
    directive: (name: string, directive: unknown) => void;
    mount: (host: HTMLElement) => void;
    unmount: () => void;
}

export interface CodexComponents {
    CdxButton: unknown;
    CdxCard: unknown;
    CdxCheckbox: unknown;
    CdxCombobox: unknown;
    CdxDialog: unknown;
    CdxField: unknown;
    CdxIcon: unknown;
    CdxMessage: unknown;
    CdxProgressBar: unknown;
    CdxRadio: unknown;
    CdxSelect: unknown;
    CdxTab: unknown;
    CdxTable: unknown;
    CdxTabs: unknown;
    CdxTextArea: unknown;
    CdxTextInput: unknown;
    CdxToastContainer: unknown;
    CdxTooltip: unknown;
    useToast: () => ToastController;
}

interface ToastOptions {
    autoDismiss?: boolean | number;
}

export interface ToastController {
    error: (message: string, options?: ToastOptions) => void;
    info: (message: string, options?: ToastOptions) => void;
    success: (message: string, options?: ToastOptions) => void;
    warning: (message: string, options?: ToastOptions) => void;
}

export interface ResourceLoaderRequire {
    (module: "vue"): VueModule;
    (module: "@wikimedia/codex"): CodexComponents;
}

/** Registers the Codex surface used by the formatter templates. */
export function registerCitationFormatterComponents(
    app: VueApp,
    Codex: CodexComponents,
): void {
    app.component("CdxButton", Codex.CdxButton);
    app.component("CdxCard", Codex.CdxCard);
    app.component("CdxCheckbox", Codex.CdxCheckbox);
    app.component("CdxCombobox", Codex.CdxCombobox);
    app.component("CdxDialog", Codex.CdxDialog);
    app.component("CdxField", Codex.CdxField);
    app.component("CdxIcon", Codex.CdxIcon);
    app.component("CdxMessage", Codex.CdxMessage);
    app.component("CdxProgressBar", Codex.CdxProgressBar);
    app.component("CdxRadio", Codex.CdxRadio);
    app.component("CdxSelect", Codex.CdxSelect);
    app.component("CdxTab", Codex.CdxTab);
    app.component("CdxTable", Codex.CdxTable);
    app.component("CdxTabs", Codex.CdxTabs);
    app.component("CdxTextArea", Codex.CdxTextArea);
    app.component("CdxTextInput", Codex.CdxTextInput);
    app.component("CdxToastContainer", Codex.CdxToastContainer);
    app.directive("tooltip", Codex.CdxTooltip);
}
