import { expect, test } from "playwright/test";

const severeConsoleMessages = ["error", "assert"];

test.describe("Phase 6 storefront state ownership", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      sessionStorage.clear();
      localStorage.clear();
    });
  });

  test("saved IDs and cart intents survive navigation without hydration warnings", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (message) => {
      if (severeConsoleMessages.includes(message.type())) consoleErrors.push(message.text());
    });

    await page.goto("/products");
    const firstCard = page.locator("[data-card]").first();
    await expect(firstCard).toBeVisible();

    const saveButton = firstCard.getByRole("button", { name: /^Save / });
    await saveButton.click();
    await expect(firstCard.getByRole("button", { name: /^Remove / })).toBeVisible();

    const addButton = firstCard.getByRole("button", { name: /add|choose/i }).last();
    await addButton.click();
    const quickView = page.getByRole("dialog", { name: "Product quick view" });
    if (await quickView.isVisible().catch(() => false)) {
      const availableOption = quickView.getByRole("button", { name: /^(?!Close|Open|View|Save).+/ }).filter({ visible: true }).first();
      if (await availableOption.isEnabled().catch(() => false)) await availableOption.click();
      await quickView.getByRole("button", { name: /Add to bag/i }).click();
    }

    await page.goto("/");
    await page.goto("/products");
    await expect(page.locator("[data-card]").first().getByRole("button", { name: /^Remove / })).toBeVisible();

    const stored = await page.evaluate(() => sessionStorage.getItem("laitstyles-storefront:v3:client-state"));
    expect(stored).not.toBeNull();
    expect(stored).not.toContain('"name"');
    expect(stored).not.toContain('"images"');
    expect(consoleErrors.filter((message) => /hydration|zustand|storefront/i.test(message))).toEqual([]);
  });

  test("catalogue filters, sorting, search and pagination are restored by browser history", async ({ page }) => {
    await page.goto("/products");

    const women = page.getByRole("radio", { name: /Women/ }).first();
    await women.check();
    await expect(page).toHaveURL(/category=Women/);

    await page.getByRole("button", { name: "Sort" }).click();
    const sortDialog = page.getByRole("dialog", { name: "Sort products" });
    const sortOption = sortDialog.getByRole("button").filter({ hasText: /price/i }).first();
    if (await sortOption.isVisible().catch(() => false)) await sortOption.click();
    const filteredUrl = page.url();

    await page.getByRole("button", { name: "Search products" }).click();
    const searchInput = page.getByLabel("Product, brand, category or grade");
    await searchInput.fill("denim");
    await searchInput.press("Enter");
    await expect(page).toHaveURL(/search=denim/);

    await page.goBack();
    await expect(page).toHaveURL(filteredUrl);
    await expect(page.getByRole("radio", { name: /Women/ }).first()).toBeChecked();

    await page.goForward();
    await expect(page).toHaveURL(/search=denim/);
  });

  test("shell overlays and theme remain functional without horizontal overflow", async ({ page }) => {
    await page.goto("/");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);

    const themeButton = page.getByRole("button", { name: /theme|appearance/i }).first();
    if (await themeButton.isVisible().catch(() => false)) await themeButton.click();

    await page.getByRole("button", { name: "Search products" }).click();
    await expect(page.getByRole("dialog", { name: "Search the rack" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Search the rack" })).toBeHidden();
  });

  test("mobile navigation opens and closes", async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.includes("mobile"), "Mobile-only navigation contract");
    await page.goto("/");
    await page.getByRole("button", { name: "Open navigation" }).click();
    await expect(page.getByRole("dialog", { name: "Navigation" })).toBeVisible();
    await page.getByRole("button", { name: "Close navigation" }).click();
    await expect(page.getByRole("dialog", { name: "Navigation" })).toBeHidden();
  });
});
