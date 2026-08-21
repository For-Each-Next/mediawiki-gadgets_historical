import { expect, test, type Page } from "@playwright/test";

import { loadStoryPage } from "./support/page.ts";

const FORMER_HIGHLIGHT_LIMIT = 300_000;
const DEFAULT_HIGHLIGHT_LIMIT = 1_024_768;

test("long pages stay highlighted and follow native textarea updates", async ({
    page,
}) => {
    const sourceLength = FORMER_HIGHLIGHT_LIMIT + 64;
    await loadStoryPage(page, "wiked-lite", "en");
    await page.evaluate(
        async ({ length, tail }) => {
            await (globalThis as any).__wikedEditor.mountSparse(length, tail);
        },
        {
            length: sourceLength,
            tail: "{{Initial tail|key=value}}",
        },
    );

    const editor = page
        .frameLocator(".wiked-lite-frame")
        .locator(".wiked-lite-editor");
    const templateName = editor.locator(".wiked-lite-token--template-name");
    await expect(templateName).toHaveText("Initial tail");
    await expectEditorToBeLossless(page, sourceLength);

    await page.evaluate(
        ({ length, tail }) => {
            (globalThis as any).__wikedEditor.updateNativeSparse(length, tail);
        },
        {
            length: sourceLength,
            tail: "{{Updated tail|key=value}}",
        },
    );

    await expect(templateName).toHaveText("Updated tail");
    await expectEditorToBeLossless(page, sourceLength);
});

test("the default live-highlight cap keeps its exact boundary", async ({
    page,
}) => {
    await loadStoryPage(page, "wiked-lite", "en");
    await page.evaluate(
        async ({ length, tail }) => {
            await (globalThis as any).__wikedEditor.mountSparse(length, tail);
        },
        {
            length: DEFAULT_HIGHLIGHT_LIMIT,
            tail: "{{Default boundary|key=value}}",
        },
    );

    const editor = page
        .frameLocator(".wiked-lite-frame")
        .locator(".wiked-lite-editor");
    await expect(
        editor.locator(".wiked-lite-token--template-name"),
    ).toHaveText("Default boundary");
    await expectEditorToBeLossless(page, DEFAULT_HIGHLIGHT_LIMIT);

    await page.evaluate(
        ({ length, tail }) => {
            (globalThis as any).__wikedEditor.updateNativeSparse(length, tail);
        },
        {
            length: DEFAULT_HIGHLIGHT_LIMIT + 1,
            tail: "{{Default boundary|key=value}}",
        },
    );

    await expect(editor.locator("span")).toHaveCount(0);
    await expectEditorToBeLossless(page, DEFAULT_HIGHLIGHT_LIMIT + 1, 0);
});

test("an explicit live-highlight cap keeps its exact boundary", async ({
    page,
}) => {
    await loadStoryPage(page, "wiked-lite", "en");
    await page.evaluate(
        async ({ length, tail }) => {
            await (globalThis as any).__wikedEditor.mountSparse(
                length,
                tail,
                length,
            );
        },
        {
            length: FORMER_HIGHLIGHT_LIMIT,
            tail: "{{Boundary tail|key=value}}",
        },
    );

    const editor = page
        .frameLocator(".wiked-lite-frame")
        .locator(".wiked-lite-editor");
    await expect(
        editor.locator(".wiked-lite-token--template-name"),
    ).toHaveText("Boundary tail");
    await expectEditorToBeLossless(page, FORMER_HIGHLIGHT_LIMIT);

    await page.evaluate(
        ({ length, tail }) => {
            (globalThis as any).__wikedEditor.updateNativeSparse(length, tail);
        },
        {
            length: FORMER_HIGHLIGHT_LIMIT + 1,
            tail: "{{Boundary tail|key=value}}",
        },
    );

    await expect(editor.locator("span")).toHaveCount(0);
    await expectEditorToBeLossless(page, FORMER_HIGHLIGHT_LIMIT + 1, 0);
});

async function expectEditorToBeLossless(
    page: Page,
    length: number,
    childElementCount?: number,
): Promise<void> {
    const snapshot = await page.evaluate(() =>
        (globalThis as any).__wikedEditor.inspect(),
    );
    expect(snapshot).toMatchObject({
        editorLength: length,
        matchesNative: true,
        nativeLength: length,
        ...(childElementCount == null ? {} : { childElementCount }),
    });
}
