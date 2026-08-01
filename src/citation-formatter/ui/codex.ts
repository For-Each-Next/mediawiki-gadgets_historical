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
    useToast: () => ToastController;
}

export interface ToastOptions {
    autoDismiss?: boolean | number;
}

export interface ToastController {
    clear: () => void;
    dismiss: (id: string) => void;
    error: (message: string, options?: ToastOptions) => string;
    info: (message: string, options?: ToastOptions) => string;
    success: (message: string, options?: ToastOptions) => string;
    warning: (message: string, options?: ToastOptions) => string;
}

export const TOAST_AUTO_DISMISS_MS = 4_000;

type ToastMethod = "error" | "info" | "success" | "warning";

function withToastAutoDismiss(
    options: ToastOptions | undefined,
): ToastOptions {
    return { ...options, autoDismiss: TOAST_AUTO_DISMISS_MS };
}

function createTrackedToastMethod(
    controller: ToastController,
    method: ToastMethod,
    track: (id: string) => string,
): ToastController[ToastMethod] {
    return function showToast(message, options): string {
        return track(
            controller[method](message, withToastAutoDismiss(options)),
        );
    };
}

/**
 * Scopes formatter toasts and gives each an exact lifetime.
 *
 * @param controller - Shared Codex toast controller.
 * @returns Dialog-scoped toast controller.
 */
export function createCitationFormatterToastController(
    controller: ToastController,
): ToastController {
    let active = true;
    const toastIds = new Set<string>();
    const track = function track(id: string): string {
        if (!active) {
            controller.dismiss(id);
            return id;
        }
        toastIds.add(id);
        return id;
    };
    return {
        clear() {
            active = false;
            for (const id of toastIds) {
                controller.dismiss(id);
            }
            toastIds.clear();
        },
        dismiss(id) {
            toastIds.delete(id);
            controller.dismiss(id);
        },
        error: createTrackedToastMethod(controller, "error", track),
        info: createTrackedToastMethod(controller, "info", track),
        success: createTrackedToastMethod(controller, "success", track),
        warning: createTrackedToastMethod(controller, "warning", track),
    };
}

export interface ResourceLoaderRequire {
    (module: "vue"): VueModule;
    (module: "@wikimedia/codex"): CodexComponents;
}

/**
 * Registers the Codex surface used by the formatter templates.
 *
 * @param app - App value.
 * @param Codex - Codex value.
 */
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
}
