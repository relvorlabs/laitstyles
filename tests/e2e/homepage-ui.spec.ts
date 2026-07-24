import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type TestInfo } from "playwright/test";

const THEME_STORAGE_KEY = "laitstyle-theme";

function monitorRuntime(page: Page) {
  const errors: string[] = [];
  const appOrigin = new URL(process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000").origin;

  page.on("pageerror", (error) => {
    errors.push(`Page error: ${error.message}`);
  });

  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(`Console error: ${message.text()}`);
    }
  });

  page.on("response", (response) => {
    const responseUrl = new URL(response.url());
    if (responseUrl.origin === appOrigin && response.status() >= 500) {
      errors.push(`HTTP ${response.status()}: ${response.request().method()} ${response.url()}`);
    }
  });

  return errors;
}

async function expectNoHorizontalOverflow(page: Page) {
  const overflowPixels = await page.evaluate(() => {
    const viewportWidth = document.documentElement.clientWidth;
    const documentWidth = Math.max(
      document.documentElement.scrollWidth,
      document.body.scrollWidth,
    );

    return documentWidth - viewportWidth;
  });

  expect.soft(overflowPixels, `Homepage exceeds the viewport by ${overflowPixels}px`).toBeLessThanOrEqual(1);
}

async function expectNoContrastViolations(page: Page, theme: "light" | "dark") {
  const results = await new AxeBuilder({ page }).withRules(["color-contrast"]).analyze();

  expect.soft(
    results.violations,
    `${theme} theme contrast violations:\n${results.violations
      .map((violation) => `${violation.help}: ${violation.nodes.length} node(s)`) 
      .join("\n")}`,
  ).toEqual([]);
}

async function attachScreenshot(page: Page, testInfo: TestInfo, name: string) {
  await testInfo.attach(`${name}-${testInfo.project.name}`, {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });
}

test("homepage is responsive, themed, accessible and interactive", async ({ page }, testInfo) => {
  const runtimeErrors = monitorRuntime(page);

  await page.addInitScript((storageKey) => {
    window.localStorage.setItem(storageKey, "light");
  }, THEME_STORAGE_KEY);

  await page.goto("/", { waitUntil: "domcontentloaded" });

  await expect(page).toHaveTitle(/Laitstyles/i);
  await expect(page.locator("#header")).toBeVisible();
  await expect(page.locator("#homeView")).toBeVisible();
  await expect(page.getByRole("heading", { name: /Wear it now\. Keep it longer\./i })).toBeVisible();
  await expect(page.locator("footer")).toBeVisible();
  await expect(page.locator("html")).not.toHaveClass(/dark/);

  await expectNoHorizontalOverflow(page);
  await expectNoContrastViolations(page, "light");
  await attachScreenshot(page, testInfo, "homepage-light");

  const announcement = page.locator("#utility");
  if (await announcement.isVisible()) {
    await page.getByRole("button", { name: "Dismiss announcement" }).click();
    await expect(announcement).toBeHidden();
  }

  let darkThemeButton = page.locator('button[aria-label="Use dark theme"]:visible').first();
  if ((await darkThemeButton.count()) === 0) {
    await page.getByRole("button", { name: "Open navigation" }).click();
    await expect(page.getByRole("dialog", { name: "Navigation" })).toBeVisible();
    darkThemeButton = page.locator('button[aria-label="Use dark theme"]:visible').first();
  }

  await expect(darkThemeButton).toBeEnabled();
  await darkThemeButton.click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await expect.poll(() => page.evaluate((storageKey) => localStorage.getItem(storageKey), THEME_STORAGE_KEY)).toBe(
    "dark",
  );

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator("#homeView")).toBeVisible();
  await expect(page.locator("html")).toHaveClass(/dark/);

  await expectNoHorizontalOverflow(page);
  await expectNoContrastViolations(page, "dark");
  await attachScreenshot(page, testInfo, "homepage-dark");

  await page.getByRole("button", { name: "Shop new arrivals" }).click();
  await expect(page.locator("#shopView")).toBeVisible();
  await expect(page.locator("#shopTitle")).toContainText(/new arrivals/i);
  await expect(page.locator("#shopGrid")).toBeVisible();
  await attachScreenshot(page, testInfo, "homepage-shop-result");

  await page.getByRole("button", { name: "Home", exact: true }).click();
  await expect(page.locator("#homeView")).toBeVisible();

  expect.soft(runtimeErrors, runtimeErrors.join("\n")).toEqual([]);
});
