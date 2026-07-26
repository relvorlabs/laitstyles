import { expect, test, type Page } from "playwright/test";
import { expectNoRequiredAxeViolations } from "./support/accessibility";

type Actor = "anonymous" | "customer" | "staff";
type AccessibilitySurface = {
  actor: Actor;
  name: string;
  route: string;
  open?: (page: Page) => Promise<void>;
};

const anonymousSurfaces: readonly AccessibilitySurface[] = [
  { actor: "anonymous", name: "storefront-shell", route: "/" },
  { actor: "anonymous", name: "homepage", route: "/" },
  { actor: "anonymous", name: "catalogue", route: "/products" },
  { actor: "anonymous", name: "cart", route: "/cart" },
  { actor: "anonymous", name: "checkout-presentation", route: "/checkout" },
  {
    actor: "anonymous",
    name: "search-overlay",
    route: "/",
    open: async (page) => {
      await page.getByRole("button", { name: "Search products" }).click();
      await expect(page.getByRole("dialog", { name: "Search the rack" })).toBeVisible();
    },
  },
  {
    actor: "anonymous",
    name: "auth-dialog",
    route: "/?auth=signin&next=/account",
    open: async (page) => {
      await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
    },
  },
];

const customerSurfaces: readonly AccessibilitySurface[] = [
  { actor: "customer", name: "account", route: "/account" },
];

const staffSurfaces: readonly AccessibilitySurface[] = [
  { actor: "staff", name: "admin-overview", route: "/admin" },
  { actor: "staff", name: "admin-products", route: "/admin/products" },
  { actor: "staff", name: "admin-inventory", route: "/admin/inventory" },
  { actor: "staff", name: "admin-orders", route: "/admin/orders" },
  { actor: "staff", name: "admin-holds", route: "/admin/holds" },
  { actor: "staff", name: "admin-returns", route: "/admin/returns" },
  { actor: "staff", name: "admin-customers", route: "/admin/customers" },
  { actor: "staff", name: "admin-settings", route: "/admin/settings" },
];

registerActorMatrix("anonymous", anonymousSurfaces);
registerActorMatrix("customer", customerSurfaces);
registerActorMatrix("staff", staffSurfaces);

test.describe("anonymous product detail", () => {
  test("PDP has no serious or critical Axe violation", async ({ page }) => {
    await page.goto("/products", { waitUntil: "domcontentloaded" });
    const href = await page.locator('a[href^="/products/"]').first().getAttribute("href");
    expect(href, "catalogue must expose a product-detail route").toBeTruthy();
    await page.goto(href as string, { waitUntil: "domcontentloaded" });
    await expectNoRequiredAxeViolations(page, {
      route: href as string,
      surface: "product-detail",
    });
  });
});

function registerActorMatrix(actor: Actor, surfaces: readonly AccessibilitySurface[]) {
  test.describe(`${actor} accessibility matrix`, () => {
    const storageState = actorStorageState(actor);
    if (actor !== "anonymous") {
      test.use({ storageState: storageState ?? { cookies: [], origins: [] } });
      test.beforeEach(() => {
        if (!storageState) {
          throw new Error(
            `PHASE_1_6_${actor.toUpperCase()}_STORAGE_STATE is required for ${actor} accessibility coverage.`,
          );
        }
      });
    }

    for (const surface of surfaces) {
      test(`${surface.name} has no serious or critical Axe violation`, async ({ page }) => {
        const response = await page.goto(surface.route, { waitUntil: "domcontentloaded" });
        expect(response?.status() ?? 200).toBeLessThan(500);
        await surface.open?.(page);
        await expectNoRequiredAxeViolations(page, {
          route: surface.route,
          surface: surface.name,
        });
      });
    }
  });
}

function actorStorageState(actor: Actor) {
  if (actor === "anonymous") return undefined;
  return process.env[`PHASE_1_6_${actor.toUpperCase()}_STORAGE_STATE`];
}
