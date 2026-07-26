import { expect, test, type Page, type TestInfo } from "playwright/test";

type Actor = "anonymous" | "customer" | "staff";
type Theme = "light" | "dark";
type VisualSurface = { actor: Actor; name: string; route: string };

const projectViewports: Record<string, { width: number; height: number }> = {
  "desktop-chromium": { width: 1280, height: 800 },
  "tablet-chromium": { width: 768, height: 1024 },
  "mobile-chromium": { width: 375, height: 812 },
};
const themes: readonly Theme[] = ["light", "dark"];

const anonymousSurfaces: readonly VisualSurface[] = [
  { actor: "anonymous", name: "storefront-shell-homepage", route: "/" },
  { actor: "anonymous", name: "catalogue", route: "/products" },
  { actor: "anonymous", name: "product-detail", route: "__PRODUCT_DETAIL__" },
  { actor: "anonymous", name: "cart", route: "/cart" },
  { actor: "anonymous", name: "checkout-presentation", route: "/checkout" },
];
const customerSurfaces: readonly VisualSurface[] = [
  { actor: "customer", name: "account", route: "/account" },
];
const staffSurfaces: readonly VisualSurface[] = [
  { actor: "staff", name: "admin-overview", route: "/admin" },
  { actor: "staff", name: "admin-products", route: "/admin/products" },
  { actor: "staff", name: "admin-inventory", route: "/admin/inventory" },
  { actor: "staff", name: "admin-orders", route: "/admin/orders" },
  { actor: "staff", name: "admin-holds", route: "/admin/holds" },
  { actor: "staff", name: "admin-returns", route: "/admin/returns" },
  { actor: "staff", name: "admin-customers", route: "/admin/customers" },
  { actor: "staff", name: "admin-settings", route: "/admin/settings" },
];

registerVisualMatrix("anonymous", anonymousSurfaces);
registerVisualMatrix("customer", customerSurfaces);
registerVisualMatrix("staff", staffSurfaces);

function registerVisualMatrix(actor: Actor, surfaces: readonly VisualSurface[]) {
  test.describe(`${actor} Phase 1-6 visual matrix`, () => {
    const storageState = actorStorageState(actor);
    if (actor !== "anonymous") {
      test.use({ storageState: storageState ?? { cookies: [], origins: [] } });
      test.beforeEach(() => {
        if (!storageState) {
          throw new Error(
            `PHASE_1_6_${actor.toUpperCase()}_STORAGE_STATE is required for ${actor} visual coverage.`,
          );
        }
      });
    }

    for (const surface of surfaces) {
      for (const theme of themes) {
        test(`${surface.name} ${theme}`, async ({ page }, testInfo) => {
          const sha = candidateSha();
          await applyThemeAndReducedMotion(page, theme);
          const route = await resolveRoute(page, surface.route);
          const response = await page.goto(route, { waitUntil: "domcontentloaded" });
          expect(response?.status() ?? 200).toBeLessThan(500);
          await expect(page.locator("body")).toBeVisible();
          await assertViewportAndPresentation(page, testInfo, theme);
          await page.screenshot({
            path: testInfo.outputPath(
              `${surface.name}-${testInfo.project.name}-${theme}-${sha}.png`,
            ),
            fullPage: false,
          });
        });
      }
    }
  });
}

async function resolveRoute(page: Page, route: string) {
  if (route !== "__PRODUCT_DETAIL__") return route;
  await page.goto("/products", { waitUntil: "domcontentloaded" });
  const href = await page.locator('a[href^="/products/"]').first().getAttribute("href");
  expect(href, "catalogue must expose a product-detail route").toBeTruthy();
  return href as string;
}

async function applyThemeAndReducedMotion(page: Page, theme: Theme) {
  await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
  await page.addInitScript((value) => localStorage.setItem("laitstyle-theme", value), theme);
}

async function assertViewportAndPresentation(page: Page, testInfo: TestInfo, theme: Theme) {
  expect(testInfo.project.name in projectViewports).toBe(true);
  expect(page.viewportSize()).toEqual(projectViewports[testInfo.project.name]);
  await expect
    .poll(() => page.evaluate(() => document.documentElement.classList.contains("dark")))
    .toBe(theme === "dark");
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
      ),
    )
    .toBe(true);
  expect(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(
    true,
  );
}

function candidateSha() {
  const sha = process.env.PHASE_1_6_SOURCE_SHA ?? "";
  if (!/^[a-f\d]{40}$/i.test(sha)) {
    throw new Error("PHASE_1_6_SOURCE_SHA must be the immutable 40-character candidate SHA.");
  }
  return sha.toLowerCase();
}

function actorStorageState(actor: Actor) {
  if (actor === "anonymous") return undefined;
  return process.env[`PHASE_1_6_${actor.toUpperCase()}_STORAGE_STATE`];
}
