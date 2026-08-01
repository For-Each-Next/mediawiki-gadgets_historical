/** Minimal Vue and Codex contracts used by wikEd Lite. */

export interface VueRef<T> {
    value: T;
}

export interface VueApp {
    component(name: string, component: unknown): void;
    mount(host: HTMLElement): void;
    unmount(): void;
}

export interface VueModule {
    createMwApp(component: unknown): VueApp;
    defineComponent(component: unknown): unknown;
    ref<T>(value: T): VueRef<T>;
}

export interface CodexComponents {
    CdxButton: unknown;
    CdxCheckbox: unknown;
    CdxDialog: unknown;
    CdxField: unknown;
    CdxMessage: unknown;
    CdxProgressBar: unknown;
    CdxTextInput: unknown;
}

export interface ResourceLoaderRequire {
    (module: "vue"): VueModule;
    (module: "@wikimedia/codex"): CodexComponents;
}

/**
 * Registers the small Codex component set used by the formatter.
 *
 * @param app - App value.
 * @param Codex - Codex value.
 */
export function registerFormatterComponents(
    app: VueApp,
    Codex: CodexComponents,
): void {
    app.component("CdxButton", Codex.CdxButton);
    app.component("CdxCheckbox", Codex.CdxCheckbox);
    app.component("CdxDialog", Codex.CdxDialog);
    app.component("CdxField", Codex.CdxField);
    app.component("CdxMessage", Codex.CdxMessage);
    app.component("CdxProgressBar", Codex.CdxProgressBar);
    app.component("CdxTextInput", Codex.CdxTextInput);
}
