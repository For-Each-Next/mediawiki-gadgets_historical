/** Shared browser host for production-component UI stories. */

import type { UiGadget, UiStory } from "./registry.ts";

interface MountedStory {
    app: { unmount(): void };
    proxy: Record<string, any>;
}

type StoryRenderer = (story: UiStory) => MountedStory | Promise<MountedStory>;

export function installStoryHost(
    gadget: UiGadget,
    stories: readonly UiStory[],
    render: StoryRenderer,
): void {
    let mounted: MountedStory | null = null;
    const mount = async function mountStory(id: string): Promise<void> {
        mounted?.app.unmount();
        mounted = null;
        document.querySelector("#ui-story-host")?.remove();
        const story = stories.find((item) => item.id === id);
        if (story == null) {
            throw new Error(`Unknown ${gadget} UI story: ${id}`);
        }
        mounted = await render(story);
        await settleUi();
        document.documentElement.dataset.uiStoryReady = id;
    };
    (globalThis as any).__gadgetUi = {
        gadget,
        inspect: inspectVisibleDialog,
        mount,
        stories: stories.map((story) => story.id),
    };
}

export function mountComponent(
    component: unknown,
    register: (app: any) => void,
): MountedStory {
    const Vue = getVue();
    const host = document.createElement("div");
    host.id = "ui-story-host";
    document.body.append(host);
    const app = Vue.createApp(component);
    register(app);
    const proxy = app.mount(host) as Record<string, any>;
    return { app, proxy };
}

export function addFixtureStyles(id: string, css: string): void {
    if (document.getElementById(id) != null) {
        return;
    }
    const style = document.createElement("style");
    style.id = id;
    style.textContent = css;
    document.head.append(style);
}

export function getCodex(): any {
    return (globalThis as any).codex;
}

export function getVue(): any {
    return (globalThis as any).Vue;
}

export async function settleUi(): Promise<void> {
    const Vue = getVue();
    await Vue.nextTick();
    await Vue.nextTick();
    await new Promise<void>((resolve) =>
        requestAnimationFrame(() => resolve()),
    );
}

function inspectVisibleDialog(
    expectedLocale: string,
    viewportWidth: number,
): string[] {
    const dialogs = [...document.querySelectorAll<HTMLElement>(".cdx-dialog")];
    const dialog = dialogs
        .filter((item) => item.getClientRects().length > 0)
        .at(-1);
    if (dialog == null) {
        return ["no visible Codex dialog"];
    }
    return [
        ...inspectBounds(dialog),
        ...inspectDialogSemantics(dialog, expectedLocale),
        ...inspectButtons(dialog, viewportWidth),
        ...inspectFormControls(dialog),
        ...inspectExternalLinks(dialog),
    ];
}

function inspectBounds(dialog: HTMLElement): string[] {
    const issues: string[] = [];
    const rect = dialog.getBoundingClientRect();
    if (rect.left < -1 || rect.right > window.innerWidth + 1) {
        issues.push("dialog extends beyond the horizontal viewport");
    }
    if (rect.top < -1 || rect.bottom > window.innerHeight + 1) {
        issues.push("dialog extends beyond the vertical viewport");
    }
    if (document.documentElement.scrollWidth > window.innerWidth + 1) {
        issues.push("page has horizontal overflow");
    }
    const body = dialog.querySelector<HTMLElement>(".cdx-dialog__body");
    if (body != null && body.scrollWidth > body.clientWidth + 1) {
        issues.push("dialog body has unclipped horizontal overflow");
    }
    return issues;
}

function inspectDialogSemantics(
    dialog: HTMLElement,
    expectedLocale: string,
): string[] {
    const issues: string[] = [];
    const title = dialog.querySelector(".cdx-dialog__header__title");
    if (title?.textContent?.trim() === "") {
        issues.push("dialog title is empty");
    }
    if (dialog.lang !== expectedLocale) {
        issues.push(`dialog lang is ${dialog.lang || "missing"}`);
    }
    return issues;
}

function inspectButtons(dialog: HTMLElement, width: number): string[] {
    const issues: string[] = [];
    const buttons = [
        ...dialog.querySelectorAll<HTMLButtonElement>("button"),
    ].filter(isVisibleElement);
    const primary = buttons.filter((button) =>
        button.classList.contains("cdx-button--weight-primary"),
    );
    if (primary.length > 1) {
        issues.push("dialog exposes more than one primary button");
    }
    if (buttons.some(hasUnsupportedNeutralAction)) {
        issues.push("button uses the unsupported neutral action value");
    }
    if (width <= 639) {
        inspectMobilePrimary(dialog, primary[0], issues);
    }
    return issues;
}

function hasUnsupportedNeutralAction(button: HTMLButtonElement): boolean {
    return button.classList.contains("cdx-button--action-neutral");
}

function inspectMobilePrimary(
    dialog: HTMLElement,
    primary: HTMLButtonElement | undefined,
    issues: string[],
): void {
    if (primary == null) {
        return;
    }
    const footer = primary.closest<HTMLElement>(".cdx-dialog__footer");
    if (footer == null) {
        return;
    }
    const primaryWidth = primary.getBoundingClientRect().width;
    const footerWidth = footer.getBoundingClientRect().width;
    if (primaryWidth < footerWidth * 0.8) {
        issues.push("mobile primary action is not full width");
    }
}

function inspectFormControls(dialog: HTMLElement): string[] {
    const selector = "input:not([type=hidden]), textarea, select";
    const controls = [
        ...dialog.querySelectorAll<HTMLInputElement>(selector),
    ].filter(isInteractiveVisibleElement);
    const unnamed = controls.find(
        (control) => getAccessibleName(control) === "",
    );
    if (unnamed != null) {
        const detail = [
            unnamed.tagName.toLowerCase(),
            unnamed.getAttribute("type") ?? "",
            unnamed.className,
        ].join(".");
        return [
            `visible form control is missing an accessible name: ${detail}`,
        ];
    }
    return [];
}

function isVisibleElement(element: Element): boolean {
    return element.getClientRects().length > 0;
}

function isInteractiveVisibleElement(element: Element): boolean {
    return isVisibleElement(element) && !element.closest("[aria-hidden=true]");
}

function getAccessibleName(element: HTMLElement): string {
    const labelledBy = element.getAttribute("aria-labelledby");
    const labelledText = labelledBy
        ?.split(/\s+/u)
        .map(getLabelledText)
        .join(" ");
    const labels =
        "labels" in element ? (element as HTMLInputElement).labels : null;
    const nativeLabels =
        labels == null ? "" : [...labels].map(getText).join(" ");
    return [
        element.getAttribute("aria-label"),
        labelledText,
        nativeLabels,
        element.getAttribute("title"),
    ]
        .join(" ")
        .trim();
}

function getLabelledText(id: string): string {
    return document.getElementById(id)?.textContent ?? "";
}

function getText(element: Element): string | null {
    return element.textContent;
}

function inspectExternalLinks(dialog: HTMLElement): string[] {
    const links = [
        ...dialog.querySelectorAll<HTMLAnchorElement>('a[target="_blank"]'),
    ];
    return links.some(isUnsafeExternalLink)
        ? ["external link is missing noopener/noreferrer"]
        : [];
}

function isUnsafeExternalLink(link: HTMLAnchorElement): boolean {
    const rel = new Set(link.rel.split(/\s+/u));
    return !rel.has("noopener") || !rel.has("noreferrer");
}
