import { expect, test } from "@playwright/test";

import { loadStoryPage } from "./support/page.ts";

test("an above popup stays open during upward pointer travel", async ({
    page,
}) => {
    await page.setViewportSize({ height: 700, width: 800 });
    await loadStoryPage(page, "wiked-lite", "en");
    await page.evaluate(() => (globalThis as any).__wikedTooltip.mount());

    const reference = page.locator("[data-reference]");
    const popup = page.locator(".wiked-lite-tooltip");
    await reference.hover();
    await expect(popup).toHaveClass(/wiked-lite-tooltip--above/u);
    const referenceBox = await reference.boundingBox();
    const popupBox = await popup.boundingBox();
    expect(referenceBox).not.toBeNull();
    expect(popupBox).not.toBeNull();
    if (referenceBox == null || popupBox == null) {
        return;
    }

    const pointerX = referenceBox.x + referenceBox.width / 2;
    await page.mouse.move(pointerX, referenceBox.y - 5);
    await page.waitForTimeout(450);
    await expect(popup).not.toHaveClass(/wiked-lite-tooltip--closing/u);

    await page.mouse.move(pointerX, popupBox.y + 20);
    await page.waitForTimeout(450);
    await expect(popup).toBeVisible();

    await page.mouse.move(10, 10);
    await expect(popup).toHaveCount(0, { timeout: 1_000 });
});

test("reference previews can be disabled and re-enabled", async ({ page }) => {
    await loadStoryPage(page, "wiked-lite", "en");
    await page.evaluate(() => (globalThis as any).__wikedTooltip.mount());
    const reference = page.locator("[data-reference]");
    const popup = page.locator(".wiked-lite-tooltip");

    await page.evaluate(() => (globalThis as any).__wikedTooltip.disable());
    await reference.hover();
    await expect(popup).toHaveCount(0);

    await page.mouse.move(10, 10);
    await page.evaluate(() => (globalThis as any).__wikedTooltip.enable());
    await reference.hover();
    await expect(popup).toBeVisible();
});

test("section previews fall back to whole-page source", async ({ page }) => {
    await loadStoryPage(page, "wiked-lite", "en");
    await page.evaluate(() =>
        (globalThis as any).__wikedTooltip.mountFallback(),
    );

    await page.locator("[data-reference]").hover();
    await expect(page.getByText("Whole page citation")).toBeVisible();
});
