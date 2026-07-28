import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "playwright/test";

test.describe.configure({ mode: "serial" });
test.setTimeout(120_000);
test.use({ navigationTimeout: 90_000 });

async function openFooter(page: Page) {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const footer = page.locator("footer[data-site-footer]");
  await expect(footer).toBeVisible({ timeout: 90_000 });
  await expect(footer).toHaveAttribute("data-interactive", "true", { timeout: 90_000 });
  await footer.scrollIntoViewIfNeeded();
  return footer;
}

test("storefront chrome uses the canonical woven logo", async ({ page }) => {
  const footer = await openFooter(page);
  await expect(footer.locator('[data-storefront-logo="woven"]')).toBeVisible();
  await expect(page.locator('[data-storefront-logo="woven"]')).toHaveCount(3);
  await expect(page.locator('svg[viewBox="0 0 612 792"]')).toHaveCount(0);
});

test("footer is fashion-led, semantic, and socially accessible", async ({ page }) => {
  const footer = await openFooter(page);
  await expect(footer).toBeVisible();
  await expect(footer.getByText("Style, selected", { exact: false })).toBeVisible();
  await expect(footer.getByRole("navigation", { name: "Discover" })).toBeVisible();
  await expect(footer.getByRole("navigation", { name: "Client services" })).toBeVisible();
  await expect(footer.getByText(/pre-owned|second-hand|thrift|used|pass it on/i)).toHaveCount(0);

  for (const platform of ["Instagram", "Facebook", "TikTok", "Pinterest", "YouTube"]) {
    const control = footer.getByRole("button", { name: `Follow Laitstyles on ${platform}` });
    await expect(control).toBeVisible();
    await expect(control.locator("svg")).toBeVisible();
    const box = await control.boundingBox();
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  }
});

test("footer catalogue links and client-service controls remain operable", async ({ page }) => {
  const footer = await openFooter(page);
  const deliveryControl = footer.getByRole("button", { name: "Delivery & returns" });
  await expect(deliveryControl).toBeVisible();
  await expect(deliveryControl).toBeEnabled();
  await deliveryControl.focus();
  await expect(deliveryControl).toBeFocused();

  const womenLink = footer.getByRole("link", { name: "Women" });
  await expect(womenLink).toHaveAttribute("href", "/products?category=Women");
  await womenLink.click();
  await expect(page).toHaveURL(/\/products\?category=Women/, { timeout: 45_000 });
});

for (const theme of ["light", "dark"] as const) {
  test(`footer remains readable and accessible in ${theme} theme`, async ({ page }) => {
    await page.addInitScript((nextTheme) => {
      window.localStorage.setItem("laitstyle-theme", nextTheme);
    }, theme);
    const footer = await openFooter(page);
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
        ),
      )
      .toBe(true);

    const contrast = await footer.evaluate((element) => {
      const parse = (value: string) => value.match(/[\d.]+/g)?.map(Number) ?? [];
      const rgb = (value: string) => {
        const [r, g, b] = parse(value);
        return [r, g, b].map((channel) => {
          const normalized = channel / 255;
          return normalized <= 0.03928
            ? normalized / 12.92
            : ((normalized + 0.055) / 1.055) ** 2.4;
        });
      };
      const luminance = (value: string) => {
        const [r, g, b] = rgb(value);
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };
      const style = getComputedStyle(element);
      const foreground = luminance(style.color);
      const background = luminance(style.backgroundColor);
      return (
        (Math.max(foreground, background) + 0.05) /
        (Math.min(foreground, background) + 0.05)
      );
    });
    expect(contrast).toBeGreaterThanOrEqual(4.5);

    const firstControl = footer.getByRole("button").first();
    await firstControl.focus();
    await expect(firstControl).toBeFocused();
    const audit = await new AxeBuilder({ page }).include("footer[data-site-footer]").analyze();
    const requiredViolations = audit.violations.filter(
      (violation) => violation.impact === "critical" || violation.impact === "serious",
    );
    expect(
      requiredViolations,
      `footer ${theme} accessibility violations: ${requiredViolations
        .map((violation) => `${violation.id}: ${violation.help}`)
        .join(", ")}`,
    ).toEqual([]);
  });
}

test("wide footer keeps the editorial split without overflow", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const footer = await openFooter(page);
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
      ),
    )
    .toBe(true);
  if (test.info().project.name === "desktop-chromium") {
    await footer.screenshot({ path: "test-results/storefront-footer-wide-desktop.png" });
  }
});
