/** Browser geometry and semantic checks for all gadget dialogs. */

import { readdir } from "node:fs/promises";
import { basename, join } from "node:path";

import {
    type BrowserContext,
    expect,
    type Locator,
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

test("wikEd footer changes at the 639px breakpoint", async ({ context }) => {
    const mobile = await inspectWikEdFooter(context, 639);
    const desktop = await inspectWikEdFooter(context, 640);

    expect(new Set(mobile.map((item) => item.top)).size).toBe(mobile.length);
    expect(new Set(desktop.map((item) => item.top)).size).toBe(1);
});

test("wikEd formatter restores explicitly saved settings", async ({
    page,
}) => {
    await loadStoryPage(page, "wiked-lite", "en");
    await mountStory(page, "wiked-formatter");
    const firstGroup = page.getByRole("group", {
        name: "First parameter alignment",
    });
    const laterGroup = page.getByRole("group", {
        name: "Following parameter alignment",
    });
    const compactFirst = firstGroup.locator(
        'input[name="first-parameter-layout"][value="compact"]',
    );
    const compactLater = laterGroup.locator(
        'input[name="subsequent-parameter-layout"][value="compact"]',
    );
    await compactFirst.check();
    await compactLater.check();
    await page.getByRole("button", { name: "Save current settings" }).click();
    await expect(
        page.getByText("Current formatter settings were saved."),
    ).toBeVisible();

    await mountStory(page, "wiked-formatter");

    await expect(compactFirst).toBeChecked();
    await expect(compactLater).toBeChecked();
});

test("wikEd saves checkboxes from the editor-display tab", async ({
    page,
}) => {
    await loadStoryPage(page, "wiked-lite", "en");
    await mountStory(page, "wiked-formatter");
    await page.getByRole("tab", { name: "Editor display" }).click();
    const missingLinks = page.getByRole("checkbox", {
        name: /Highlight links to nonexistent pages/u,
    });
    await missingLinks.check();
    await page.getByRole("button", { name: "Save current settings" }).click();

    await mountStory(page, "wiked-formatter");
    await page.getByRole("tab", { name: "Editor display" }).click();
    await expect(missingLinks).toBeChecked();
});

test("wikEd applies display checkboxes from the close button", async ({
    page,
}) => {
    await loadStoryPage(page, "wiked-lite", "en");
    await mountStory(page, "wiked-formatter");
    await page.getByRole("tab", { name: "Editor display" }).click();
    const missingLinks = page.getByRole("checkbox", {
        name: /Highlight links to nonexistent pages/u,
    });
    await missingLinks.check();
    await page.getByRole("button", { name: "Close" }).click();

    await mountStory(page, "wiked-formatter");
    await page.getByRole("tab", { name: "Editor display" }).click();
    await expect(missingLinks).toBeChecked();
});

test("wikEd associates smaller descriptions with checkboxes", async ({
    page,
}) => {
    await loadStoryPage(page, "wiked-lite", "en");
    await mountStory(page, "wiked-formatter");
    await page.getByRole("tab", { name: "Other formatting options" }).click();

    await verifyCheckboxDescription(
        page,
        "Format Chinese word-conversion rules",
        "Formats conversion rules in {{NoteTA}} and -{...}-.",
    );

    await page.getByRole("tab", { name: "Editor display" }).click();

    await verifyCheckboxDescription(
        page,
        "Show references and notes in small text",
        "Includes <ref>, {{efn}}, and similar content.",
    );
    await verifyCheckboxDescription(
        page,
        "Highlight links to nonexistent pages in red",
        "Checks links when enabled and after editing stops. " +
            "API requests run in the background.",
    );
    await verifyCheckboxDescription(
        page,
        "Use whole-page source for reference previews",
        "During section editing, loads the whole-page source " +
            "in the background.",
    );
});

async function verifyCheckboxDescription(
    page: Page,
    name: string,
    expectedDescription: string,
): Promise<void> {
    const checkbox = page.getByRole("checkbox", { exact: true, name });
    await expect(checkbox).toHaveAttribute("aria-describedby", /\S/u);
    const relationship = await inspectCheckboxDescription(checkbox);
    const usesSmallerText = await descriptionUsesSmallerText(checkbox);

    expect(relationship.texts).toContain(expectedDescription);
    expect(relationship.allDescriptionsInsideRoot).toBe(true);
    expect(usesSmallerText).toBe(true);
}

async function inspectCheckboxDescription(checkbox: Locator) {
    return checkbox.evaluate((input) => {
        const root = input.closest(".cdx-checkbox");
        const descriptionIds = (input.getAttribute("aria-describedby") ?? "")
            .split(/\s+/u)
            .filter(Boolean);
        const descriptions = descriptionIds.map((id) =>
            document.getElementById(id),
        );
        return {
            allDescriptionsInsideRoot:
                root !== null &&
                descriptions.length > 0 &&
                descriptions.every(
                    (description) =>
                        description !== null && root.contains(description),
                ),
            texts: descriptions.map(
                (description) => description?.textContent?.trim() ?? null,
            ),
        };
    });
}

async function descriptionUsesSmallerText(
    checkbox: Locator,
): Promise<boolean> {
    return checkbox.evaluate((input) => {
        const root = input.closest(".cdx-checkbox");
        const label = root?.querySelector<HTMLElement>(
            ".cdx-label__label__text",
        );
        const description = root?.querySelector<HTMLElement>(
            ".wiked-lite-dialog__control-description",
        );
        if (!label || !description) {
            return false;
        }
        const labelSize = Number.parseFloat(getComputedStyle(label).fontSize);
        const descriptionSize = Number.parseFloat(
            getComputedStyle(description).fontSize,
        );
        return descriptionSize < labelSize;
    });
}

test("wikEd exposes direct choices and retains redirect dependency", async ({
    page,
}) => {
    await loadStoryPage(page, "wiked-lite", "en");
    await mountStory(page, "wiked-formatter");
    await verifyIndentDependency(page);
    await verifyFirstLayoutDependency(page);
    await verifyRedirectDependency(page);
});

async function verifyIndentDependency(page: Page): Promise<void> {
    const indentation = page.getByRole("combobox", {
        name: "Block-template indentation",
    });
    const skipFirst = page.getByRole("checkbox", {
        name: "Do not indent the first level",
    });

    await expect(indentation).toHaveText(/Keep as is/u);
    await expect(skipFirst).toBeDisabled();
    await selectIndentation(page, indentation, "2");
    await expect(skipFirst).toBeEnabled();
    await skipFirst.check();
    await selectIndentation(page, indentation, "0");
    await expect(skipFirst).toBeDisabled();
    await expect(skipFirst).toBeChecked();
    await selectIndentation(page, indentation, "3");
    await expect(skipFirst).toBeEnabled();
    await expect(skipFirst).toBeChecked();
}

async function verifyFirstLayoutDependency(page: Page): Promise<void> {
    const group = page.getByRole("group", {
        name: "First parameter alignment",
    });
    const preserveFirst = group.locator(
        'input[name="first-parameter-layout"][value="preserve"]',
    );
    const compactFirst = group.locator(
        'input[name="first-parameter-layout"][value="compact"]',
    );

    await expect(preserveFirst).toBeChecked();
    await expect(compactFirst).toBeEnabled();
    await compactFirst.check();
    await expect(compactFirst).toBeChecked();
    await preserveFirst.check();
    await expect(preserveFirst).toBeChecked();
}

async function verifyRedirectDependency(page: Page): Promise<void> {
    await page.getByRole("tab", { name: "Other formatting options" }).click();
    const group = page.getByRole("group", { name: "Redirect tracing" });
    const redirects = group.getByRole("checkbox", {
        name: "Fix wikilink redirects",
    });
    const templateRedirects = group.getByRole("checkbox", {
        name: "Fix template redirects",
    });
    await expect(templateRedirects).toBeDisabled();
    await redirects.check();
    await templateRedirects.check();
    await redirects.uncheck();
    await expect(templateRedirects).toBeDisabled();
    await expect(templateRedirects).toBeChecked();
    await redirects.check();
    await expect(templateRedirects).toBeEnabled();
    await expect(templateRedirects).toBeChecked();
}

async function selectIndentation(
    page: Page,
    indentation: Locator,
    value: string,
): Promise<void> {
    await indentation.click();
    await page.getByRole("option", { exact: true, name: value }).click();
}

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

async function inspectWikEdFooter(
    context: BrowserContext,
    width: number,
): Promise<Array<{ top: number }>> {
    const page = await context.newPage();
    await page.setViewportSize({ height: 844, width });
    await loadStoryPage(page, "wiked-lite", "en");
    await mountStory(page, "wiked-formatter");
    const result = await page
        .locator(".wiked-lite-dialog__footer .cdx-button")
        .evaluateAll((buttons) =>
            buttons.map((button) => ({
                top: Math.round(button.getBoundingClientRect().top),
            })),
        );
    await page.close();
    return result;
}
