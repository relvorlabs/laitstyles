import { expect, test, type Locator, type Page } from "playwright/test";

const STATE_KEY = "laitstyles-storefront:v3:client-state";

type StoredState = {
  version: number;
  cart: Array<{ productId: string; variantId: string | null; quantity: number }>;
  saved: string[];
  holds: Array<{ productId: string; expiresAt: number }>;
};

async function firstAddableCard(page: Page) {
  await page.goto("/products", { waitUntil: "domcontentloaded" });
  await expect.poll(() => page.locator("[data-card]").count()).toBeGreaterThan(0);

  const cardId = await page.locator("[data-card]").evaluateAll((cards) => {
    const card = cards.find((candidate) => {
      const buttons = [...candidate.querySelectorAll("button")];
      const action = buttons.at(-1);
      const label = action?.textContent?.replace(/\s+/g, " ").trim() ?? "";
      return Boolean(action && !action.disabled && !/Select size|Sold|Reserved/i.test(label));
    });
    return card?.getAttribute("data-card") ?? null;
  });

  expect(cardId, "the seeded catalogue must expose an addable non-variant product").toBeTruthy();
  return page.locator(`[data-card="${cardId}"]`);
}

async function cardProduct(card: Locator) {
  const id = await card.getAttribute("data-card");
  const name = (await card.locator("h3").innerText()).trim();
  if (!id) throw new Error("Expected product card id");
  return { id, name };
}

async function storedState(page: Page): Promise<StoredState> {
  return page.evaluate((key) => {
    const serialized = window.sessionStorage.getItem(key);
    if (!serialized) throw new Error(`Missing ${key}`);
    return JSON.parse(serialized) as StoredState;
  }, STATE_KEY);
}

async function waitForState(page: Page, predicate: (state: StoredState) => boolean) {
  await expect.poll(async () => predicate(await storedState(page))).toBe(true);
}

test("cart and saved state survive navigation and reload without catalogue payloads", async ({ page }) => {
  const card = await firstAddableCard(page);
  const product = await cardProduct(card);

  await card.getByRole("button", { name: `Save ${product.name}` }).click();
  await card.locator("button").last().click();

  await waitForState(
    page,
    (state) => state.saved.includes(product.id) && state.cart.some((line) => line.productId === product.id),
  );

  const firstSnapshot = await storedState(page);
  expect(firstSnapshot.version).toBe(3);
  expect(firstSnapshot.saved).toContain(product.id);
  expect(firstSnapshot.cart).toContainEqual({
    productId: product.id,
    variantId: null,
    quantity: 1,
  });
  expect(JSON.stringify(firstSnapshot)).not.toMatch(/images|imageUrl|price|name|brand|description/);

  const bagButton = page.getByRole("button", { name: /Bag, 1 item/ });
  await expect(bagButton).toBeVisible();
  await bagButton.click();
  await expect(page.getByRole("heading", { name: "Your bag" })).toBeVisible();
  await expect(page.getByText(product.name, { exact: true }).first()).toBeVisible();

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByRole("button", { name: /Bag, 1 item/ })).toBeVisible();
  await waitForState(page, (state) => state.saved.includes(product.id));

  await page.goto("/cart", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Your bag" })).toBeVisible();
  await expect(page.getByText(product.name, { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Remove" }).click();
  await expect(page.getByRole("heading", { name: "Your bag is waiting" })).toBeVisible();
  await waitForState(page, (state) => state.cart.length === 0);
});

test("desktop and tablet holds use the canonical expiry record", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile-chromium", "The card hold affordance is intentionally hover-only on mobile.");

  const card = await firstAddableCard(page);
  const product = await cardProduct(card);
  await card.hover();
  await card.getByRole("button", { name: "Hold piece" }).click();

  await expect(card.getByText(/Held · \d{2}:\d{2}/)).toBeVisible();
  await waitForState(
    page,
    (state) =>
      state.holds.some(
        (hold) => hold.productId === product.id && hold.expiresAt > Date.now(),
      ),
  );

  const beforeReload = await storedState(page);
  const expiry = beforeReload.holds.find((hold) => hold.productId === product.id)?.expiresAt;
  expect(expiry).toBeGreaterThan(Date.now());

  await page.reload({ waitUntil: "domcontentloaded" });
  const reloadedCard = page.locator(`[data-card="${product.id}"]`);
  await expect(reloadedCard.getByText(/Held · \d{2}:\d{2}/)).toBeVisible();
  expect((await storedState(page)).holds.find((hold) => hold.productId === product.id)?.expiresAt).toBe(expiry);

  await reloadedCard.hover();
  await reloadedCard.getByRole("button", { name: "Release hold" }).click();
  await waitForState(page, (state) => !state.holds.some((hold) => hold.productId === product.id));
});

test("URL-driven sign-in opens the canonical dialog and removes transport params", async ({ page }) => {
  await page.goto("/products?auth=signin&next=/account", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByLabel("Password")).toBeVisible();
  await expect.poll(() => new URL(page.url()).searchParams.has("auth")).toBe(false);
  expect(new URL(page.url()).searchParams.has("next")).toBe(false);

  await page.getByRole("button", { name: "Sign in", exact: true }).last().click();
  await expect(page.getByText("Enter a valid email address")).toBeVisible();
  await expect(page.getByText("Enter your password")).toBeVisible();
});
