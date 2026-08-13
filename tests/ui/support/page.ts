/** Loads Vue, Codex, and one bundled gadget story into Playwright. */

import { resolve } from "node:path";

import type { Page, Route } from "@playwright/test";

import { buildStoryBundle } from "./bundle.ts";
import type { UiGadget } from "../browser/registry.ts";

export const WORKSPACE_ROOT = resolve(
    new URL("../../../", import.meta.url).pathname,
);

export async function loadStoryPage(
    page: Page,
    gadget: UiGadget,
    locale: string,
    workspaceRoot: string = WORKSPACE_ROOT,
): Promise<void> {
    await page.route(/^https?:/u, blockLiveRequest);
    await page.setContent(createDocument(locale));
    await installMediaWikiFixture(page, locale);
    await page.addStyleTag({
        path: resolve(
            WORKSPACE_ROOT,
            "node_modules/@wikimedia/codex/dist/codex.style.css",
        ),
    });
    await page.addStyleTag({ content: UI_STABILITY_CSS });
    await page.addScriptTag({
        path: resolve(
            WORKSPACE_ROOT,
            "node_modules/vue/dist/vue.global.prod.js",
        ),
    });
    await page.addScriptTag({
        path: resolve(
            WORKSPACE_ROOT,
            "node_modules/@wikimedia/codex/dist/codex.umd.cjs",
        ),
    });
    await page.evaluate(prepareVue);
    const bundle = await buildStoryBundle(workspaceRoot, gadget);
    await page.addScriptTag({ content: bundle });
}

async function blockLiveRequest(route: Route): Promise<void> {
    await route.abort();
}

export async function mountStory(page: Page, id: string): Promise<void> {
    await page.evaluate(async (storyId) => {
        await (globalThis as any).__gadgetUi.mount(storyId);
    }, id);
    await page.locator(`[data-ui-story-ready="${id}"]`).waitFor();
    await page.locator(".cdx-dialog").first().waitFor();
}

function createDocument(locale: string): string {
    return [
        "<!doctype html>",
        `<html lang="${locale}">`,
        '<head><meta charset="utf-8"></head>',
        '<body><main id="content"></main></body></html>',
    ].join("");
}

async function installMediaWikiFixture(
    page: Page,
    locale: string,
): Promise<void> {
    await page.evaluate((language) => {
        const values: Record<string, unknown> = {
            wgDBname: "zhwiki",
            wgPageName: "Example_game",
            wgUserLanguage: language,
            wgWikiID: "zhwiki",
        };
        (globalThis as any).mw = {
            config: { get: (key: string) => values[key] },
            loader: {
                async using() {
                    throw new Error(
                        "Live ResourceLoader is disabled in UI tests.",
                    );
                },
            },
            util: {
                addCSS(css: string) {
                    const style = document.createElement("style");
                    style.textContent = css;
                    document.head.append(style);
                    return { ownerNode: style };
                },
                getUrl(title: string) {
                    return `/wiki/${encodeURIComponent(title)}`;
                },
            },
        };
    }, locale);
}

function prepareVue(): void {
    const Vue = (globalThis as any).Vue;
    Vue.createMwApp = Vue.createApp;
}

const UI_STABILITY_CSS = `
*, *::before, *::after {
    animation: none !important;
    caret-color: transparent !important;
    scroll-behavior: auto !important;
    transition: none !important;
}
`;
