/** Browser geometry and semantic checks for all gadget dialogs. */

import { readdir } from "node:fs/promises";
import { basename, join } from "node:path";

import {
    type BrowserContext,
    expect,
    type Page,
    test,
} from "@playwright/test";

// noinspection ES6PreferShortImport -- Node ESM requires index.ts.
import { discoverGadgetPackages } from "../../scripts/workspace/index.ts";

import {
    UI_LOCALES,
    UI_STORIES,
    UI_VIEWPORTS,
    type UiGadget,
    type UiStory,
} from "./browser/registry.ts";
import { loadStoryPage, mountStory } from "./support/page.ts";

const gadgets = [...new Set(UI_STORIES.map((story) => story.gadget))];

test("registers every discovered production dialog", async () => {
    const dialogs = new Set(
        UI_STORIES.map((story) => `${story.gadget}:${story.dialog}`),
    );
    expect(dialogs).toEqual(new Set(await discoverDialogKeys()));
    expect(dialogs.size).toBe(17);
});

async function discoverDialogKeys(): Promise<string[]> {
    const packages = await discoverGadgetPackages(
        new URL("../../", import.meta.url).pathname,
    );
    const groups = await Promise.all(packages.map(discoverPackageDialogs));
    return groups.flat();
}

async function discoverPackageDialogs(
    gadget: Awaited<ReturnType<typeof discoverGadgetPackages>>[number],
): Promise<string[]> {
    const directory = join(gadget.directory, "ui/dialogs");
    const entries = await readdir(directory, { withFileTypes: true });
    return entries
        .filter(
            (entry) => entry.isFile() && entry.name.endsWith("-dialog.vue"),
        )
        .map((entry) => {
            const dialog = basename(entry.name, "-dialog.vue");
            return `${gadget.directoryName}:${dialog}`;
        });
}

for (const locale of UI_LOCALES) {
    for (const [viewportName, viewport] of Object.entries(UI_VIEWPORTS)) {
        test(`${locale} dialogs fit the ${viewportName} viewport`, async ({
            context,
        }) => {
            const failures = await inspectAllStories(
                context,
                locale,
                viewport,
            );
            expect(failures).toEqual([]);
        });
    }
}

test("all dialogs remain contained at 320 CSS pixels", async ({ context }) => {
    const failures = await inspectAllStories(context, "en", {
        height: 720,
        width: 320,
    });
    expect(failures).toEqual([]);
});

test("custom Citation footer changes at the 639px breakpoint", async ({
    context,
}) => {
    const mobile = await inspectCitationFooter(context, 639);
    const desktop = await inspectCitationFooter(context, 640);

    const mobileWidths = mobile.map((item) => item.width);
    expect(Math.max(...mobileWidths) - Math.min(...mobileWidths)).toBeLessThan(
        2,
    );
    expect(new Set(mobile.map((item) => item.top)).size).toBe(mobile.length);
    expect(new Set(desktop.map((item) => item.top)).size).toBe(1);
});

async function inspectAllStories(
    context: BrowserContext,
    locale: string,
    viewport: { height: number; width: number },
): Promise<Array<{ issues: string[]; story: string }>> {
    const failures: Array<{ issues: string[]; story: string }> = [];
    for (const gadget of gadgets) {
        for (const story of storiesFor(gadget)) {
            const page = await context.newPage();
            const runtimeIssues = monitorPage(page);
            await page.setViewportSize(viewport);
            await loadStoryPage(page, gadget, locale);
            await mountStory(page, story.id);
            const issues = [
                ...(await inspectStory(page, locale, viewport.width)),
                ...runtimeIssues,
            ];
            if (issues.length > 0) {
                failures.push({ issues, story: story.id });
            }
            await page.close();
        }
    }
    return failures;
}

function monitorPage(page: Page): string[] {
    const issues: string[] = [];
    page.on("pageerror", (error) => {
        issues.push(`page error: ${error.message}`);
    });
    page.on("console", (message) => {
        if (message.type() === "warning" || message.type() === "error") {
            const text = message.text();
            if (!isKnownDetachedMenuDiagnostic(text)) {
                issues.push(`browser ${message.type()}: ${text}`);
            }
        }
    });
    page.on("request", (request) => {
        if (/^https?:/u.test(request.url())) {
            issues.push(`unexpected network request: ${request.url()}`);
        }
    });
    return issues;
}

function isKnownDetachedMenuDiagnostic(message: string): boolean {
    return (
        message.includes("Cannot read properties of null") &&
        message.includes("parentElement") &&
        message.includes("codex.umd.cjs")
    );
}

function storiesFor(gadget: UiGadget): readonly UiStory[] {
    return UI_STORIES.filter((story) => story.gadget === gadget);
}

async function inspectStory(
    page: Page,
    locale: string,
    viewportWidth: number,
): Promise<string[]> {
    return page.evaluate(
        ({ expectedLocale, width }) =>
            (globalThis as any).__gadgetUi.inspect(expectedLocale, width),
        { expectedLocale: locale, width: viewportWidth },
    );
}

async function inspectCitationFooter(
    context: BrowserContext,
    width: number,
): Promise<Array<{ top: number; width: number }>> {
    const page = await context.newPage();
    await page.setViewportSize({ height: 844, width });
    await loadStoryPage(page, "citation-formatter", "en");
    await mountStory(page, "citation-close-confirmation");
    const result = await page
        .locator(
            ".cf-source-manager__confirmation-dialog " +
                ".cf-source-manager__footer-actions .cdx-button",
        )
        .evaluateAll((buttons) =>
            buttons.map((button) => {
                const rect = button.getBoundingClientRect();
                return {
                    top: Math.round(rect.top),
                    width: Math.round(rect.width),
                };
            }),
        );
    await page.close();
    return result;
}
